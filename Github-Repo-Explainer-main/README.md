# RepoLens — Local GitHub Repository Code Explainer

## Redesign

This version keeps the original repository analysis and local-LLM engine, but introduces a new RepoLens brand, navy/cyan/violet visual system, homepage-first repository analysis, visual pipeline, stronger information hierarchy, and responsive glass-style cards.

## Objective

Build a local GenAI application that accepts a public GitHub repository URL and generates a simple-language explanation of the codebase.

## Required Flow

GitHub Repository
→ Repository Processing
→ Code Extraction
→ Local LLM
→ FastAPI Backend
→ Streamlit Frontend
→ Explanation

## Technology Stack

### Local GenAI
- Python
- Hugging Face Transformers
- One small open-source LLM
- Ollama local inference (default)
- Default local model: Qwen 2.5 3B

A Hugging Face Transformers local-inference adapter is also included and can
be enabled with:

```powershell
$env:LLM_PROVIDER="huggingface"
```

The optional Hugging Face adapter uses:

```text
Qwen/Qwen2.5-0.5B-Instruct
```

and requires a local PyTorch installation.

### Backend
- FastAPI
- Pydantic
- Uvicorn

### Repository Processing
- GitPython
- Python
- Basic file handling

### Frontend
- Streamlit

## Repository Acquisition

GitPython is the primary repository-cloning implementation.

```python
git.Repo.clone_from(...)
```

The analyzer does **not require a GitHub API key**. Repository acquisition uses
direct Git operations. If Git is unavailable, it falls back to the public
GitHub codeload ZIP endpoint. GitHub REST metadata is optional; rate-limit
responses such as HTTP 403 no longer stop the code analysis.

## UI

RepoLens uses a redesigned blue/cyan developer-tool interface with:

- Dark navy workspace background
- Cyan, blue and violet gradient accents
- Glass-style repository panels
- Homepage repository analyzer above the fold
- Visual GitHub → Files → Local AI → Results pipeline
- Feature and workflow cards
- Cleaner navigation and analysis result views
- Responsive layout for smaller screens
- Smooth entrance, hover and loading interactions

Pages:

1. Home
2. Explain Repository
3. Repository Information
4. Code Structure
5. File Viewer
6. AI Explanation
7. Summary

These pages present the same project workflow; no unrelated product features
are included.

## Ports

- FastAPI: `http://127.0.0.1:8001`
- Streamlit: normally `http://localhost:8501`
- Ollama: `http://127.0.0.1:11434`

Port 8000 is intentionally unused.

## Setup

```powershell
.\setup.bat
```

Make sure the local model exists:

```powershell
ollama pull qwen2.5:3b
```

## Run

Terminal 1:

```powershell
.\run_backend.bat
```

Terminal 2:

```powershell
.\run_frontend.bat
```

Open:

```text
http://localhost:8501
```

## Test

Example public repository:

```text
https://github.com/octocat/Hello-World
```

A normal source-code repository is recommended for demonstrating code
explanation.

## API

FastAPI documentation:

```text
http://127.0.0.1:8001/docs
```

Health:

```text
http://127.0.0.1:8001/health
```

## API Keys

No cloud LLM API key is required.

The LLM explanation is generated locally using Ollama by default.

## Important Notes

- Public GitHub repositories are supported.
- Binary files, dependency folders, caches and build folders are skipped.
- Large repositories are limited before local LLM inference.
- The explanation is generated dynamically and is not hard-coded.

## Streamlit Community Cloud

For deployment on Streamlit Community Cloud, use `streamlit_app.py` as the
entrypoint. Cloud mode starts the FastAPI service inside the same Streamlit
process and switches local inference to Hugging Face Transformers with
`Qwen/Qwen2.5-0.5B-Instruct`, because a cloud worker cannot reach Ollama on a
personal computer.

See `DEPLOY_STREAMLIT.md` for the deployment steps.

## Deploying on Streamlit Community Cloud

Use `streamlit_app.py` as the Community Cloud entrypoint. The entrypoint starts the FastAPI backend on loopback within the same cloud worker and selects the Hugging Face Transformers provider with `Qwen/Qwen2.5-0.5B-Instruct` for cloud-local inference. The regular local run still uses Ollama + Qwen 2.5 3B.

Required deployment files:

- `streamlit_app.py`
- `requirements.txt`
- `packages.txt`
- `.streamlit/config.toml`
- `backend/`
- `frontend/`

No secrets are required for the default cloud mode.


### Local Ollama model

The local default is `qwen2.5:3b-instruct`. You can override it with `OLLAMA_MODEL`.
If the configured Qwen tag is not installed, RepoLens can use an installed tag with the same model family.
