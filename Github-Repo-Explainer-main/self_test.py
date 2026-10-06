
from pathlib import Path
import ast
import tempfile
from unittest.mock import patch

project_root = Path(__file__).resolve().parent

for path in project_root.rglob("*.py"):
    if "__pycache__" in path.parts:
        continue
    ast.parse(
        path.read_text(encoding="utf-8"),
        filename=str(path),
    )

from backend.repo_processor import parse_github_url, _read_files
from backend.llm import build_prompt

owner, repo = parse_github_url(
    "https://github.com/octocat/Hello-World.git"
)
assert owner == "octocat"
assert repo == "Hello-World"

with tempfile.TemporaryDirectory() as tmp:
    repo_dir = Path(tmp) / "repo"
    repo_dir.mkdir()

    (repo_dir / "README").write_text(
        "Hello World!",
        encoding="utf-8",
    )
    (repo_dir / "main.py").write_text(
        "print('ok')",
        encoding="utf-8",
    )
    (repo_dir / "image.png").write_bytes(
        b"binary",
    )
    (repo_dir / ".git").mkdir()
    (repo_dir / ".git" / "hidden.py").write_text(
        "ignored",
        encoding="utf-8",
    )

    data = _read_files(repo_dir)

    paths = {
        item["path"]
        for item in data["files"]
    }

    assert "README" in paths
    assert "main.py" in paths
    assert "image.png" not in paths
    assert ".git/hidden.py" not in paths
    assert data["source_files"] == 1

prompt = build_prompt({
    "full_name": "demo/repository",
    "description": "Demo repository",
    "language": "Python",
    "readme": "Demo",
    "files": [{
        "path": "main.py",
        "content": "print('ok')",
    }],
})

for section in [
    "PROJECT OVERVIEW",
    "MAIN FEATURES",
    "MAIN TECHNOLOGIES",
    "HOW IT WORKS",
    "IMPORTANT FILES",
    "SIMPLE ARCHITECTURE",
]:
    assert section in prompt

from fastapi.testclient import TestClient
from backend.main import app

mock_analysis = {
    "repository": "demo",
    "owner": "test",
    "full_name": "test/demo",
    "html_url": "https://github.com/test/demo",
    "default_branch": "main",
    "description": "Demo",
    "stars": 0,
    "forks": 0,
    "language": "Python",
    "updated_at": None,
    "repo_type": "Code",
    "acquisition_method": "GitPython clone",
    "readme": "Demo",
    "files": [{
        "path": "main.py",
        "content": "print('ok')",
        "extension": ".py",
        "is_source": True,
        "lines": 1,
    }],
    "files_analyzed": 1,
    "source_files": 1,
    "lines_of_code": 1,
}

with patch(
    "backend.main.analyze_repository",
    return_value=mock_analysis.copy(),
), patch(
    "backend.main.explain_repository",
    return_value="## PROJECT OVERVIEW\nThis is a demo.",
):
    client = TestClient(app)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"

    response = client.post(
        "/explain",
        json={
            "repo_url": "https://github.com/test/demo",
        },
    )

    assert response.status_code == 200
    assert response.json()["repository"] == "demo"
    assert "PROJECT OVERVIEW" in response.json()["explanation"]

ui = (project_root / "frontend" / "app.py").read_text(
    encoding="utf-8"
)

for marker in [
    "Home",
    "Explain Repository",
    "Repository Info",
    "Code Structure",
    "File Viewer",
    "AI Explanation",
    "Summary",
    "pipeline",
    "workflow-card",
    "reveal",
    "smooth-loader",
    "RepoLens",
]:
    assert marker in ui or marker.lower() in ui.lower()

entry = (project_root / "streamlit_app.py").read_text(
    encoding="utf-8"
)

assert "def start_backend()" in entry
assert "FastAPI starts lazily" in entry or "starts FastAPI" in entry
assert "SmolLM2-135M-Instruct" in entry

print("ALL SELF-TESTS PASSED")
