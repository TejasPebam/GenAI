import os
import shutil
import tempfile
from pathlib import Path
from typing import List

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from git import Repo

app = FastAPI(title="Local GitHub Repository Code Explainer")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct")

SOURCE_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
    ".cs", ".go", ".rs", ".php", ".rb", ".kt", ".kts", ".swift", ".dart",
    ".html", ".css", ".scss", ".sql", ".sh", ".bat", ".ipynb"
}
EXCLUDED_DIRS = {
    ".git", "node_modules", "venv", ".venv", "env", "__pycache__",
    "dist", "build", ".idea", ".vscode", "target"
}
MAX_FILE_CHARS = 12000
MAX_TOTAL_CHARS = 70000

class ExplainRequest(BaseModel):
    repo_url: HttpUrl

class ExplainResponse(BaseModel):
    explanation: str
    files: List[str]
    technologies: List[str]


def clone_repo(repo_url: str, target: str) -> None:
    try:
        Repo.clone_from(repo_url, target, depth=1)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not clone repository: {exc}")


def collect_source_files(root: str) -> List[Path]:
    results: List[Path] = []
    root_path = Path(root)
    for path in root_path.rglob("*"):
        if not path.is_file():
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in SOURCE_EXTENSIONS:
            results.append(path)
    return sorted(results, key=lambda p: str(p).lower())


def read_code(files: List[Path], root: str) -> tuple[str, List[str]]:
    chunks = []
    relative_names = []
    total = 0

    for path in files:
        try:
            code = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if not code.strip():
            continue
        code = code[:MAX_FILE_CHARS]
        rel = str(path.relative_to(root)).replace("\\", "/")
        block = f"\n===== FILE: {rel} =====\n{code}\n"
        remaining = MAX_TOTAL_CHARS - total
        if remaining <= 0:
            break
        chunks.append(block[:remaining])
        relative_names.append(rel)
        total += len(block)

    return "".join(chunks), relative_names


def detect_technologies(files: List[str]) -> List[str]:
    technologies = []
    joined = " ".join(files).lower()
    checks = [
        ("Python", ".py"),
        ("JavaScript", ".js"),
        ("TypeScript", ".ts"),
        ("Java", ".java"),
        ("C/C++", ".cpp"),
        ("Go", ".go"),
        ("Rust", ".rs"),
        ("PHP", ".php"),
        ("Ruby", ".rb"),
        ("Kotlin", ".kt"),
        ("Swift", ".swift"),
        ("Dart", ".dart"),
        ("HTML", ".html"),
        ("CSS", ".css"),
        ("SQL", ".sql"),
        ("Shell", ".sh"),
    ]
    for name, ext in checks:
        if ext in joined:
            technologies.append(name)
    return technologies or ["Unknown / mixed"]


def build_prompt(code: str, files: List[str], technologies: List[str]) -> str:
    file_list = "\n".join(f"- {f}" for f in files[:80])
    tech_list = ", ".join(technologies)
    return f"""You are a codebase explainer for college students.
Explain the GitHub repository below using SIMPLE, EASY English.
Do not invent features that are not supported by the supplied files.

Return exactly these sections:

Project Overview
Write 3-5 simple sentences about what the project appears to do.

Main Features
Give 3-6 bullet points.

Main Technologies
Give the important languages/frameworks/libraries you can infer from the code.

How It Works
Explain the likely flow from user input/frontend to backend/data/output in simple steps.

Important Files
Give the most important files and one short line describing each.

Student Summary
Give a 2-3 sentence summary suitable for explaining the project to a faculty member.

Detected technologies from file extensions: {tech_list}

Repository files:
{file_list}

Repository source code:
{code}
"""


def ask_ollama(prompt: str) -> str:
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=180,
        )
        response.raise_for_status()
        data = response.json()
        answer = data.get("response", "").strip()
        if not answer:
            raise ValueError("Ollama returned an empty response")
        return answer
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=503,
            detail="Local LLM is not reachable. Start Ollama and make sure the selected model is installed."
        ) from exc
    except (ValueError, KeyError) as exc:
        raise HTTPException(status_code=502, detail=f"Invalid response from local LLM: {exc}") from exc


@app.get("/")
def root():
    return {"message": "Local GitHub Repository Code Explainer API is running"}


@app.post("/explain", response_model=ExplainResponse)
def explain_repository(request: ExplainRequest):
    temp_dir = tempfile.mkdtemp(prefix="repo_explainer_")
    try:
        clone_repo(str(request.repo_url), temp_dir)
        source_files = collect_source_files(temp_dir)
        if not source_files:
            raise HTTPException(status_code=422, detail="No supported source-code files were found.")

        code, files = read_code(source_files, temp_dir)
        technologies = detect_technologies(files)
        prompt = build_prompt(code, files, technologies)
        explanation = ask_ollama(prompt)
        return ExplainResponse(
            explanation=explanation,
            files=files,
            technologies=technologies,
        )
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
