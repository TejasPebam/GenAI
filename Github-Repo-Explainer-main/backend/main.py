from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from .repo_processor import analyze_repository
from .llm import explain_repository, LLM_PROVIDER, local_model_name

app = FastAPI(
    title="Local GitHub Repository Code Explainer",
    version="3.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExplainRequest(BaseModel):
    repo_url: HttpUrl


@app.get("/")
def root():
    return {
        "message": "Local GitHub Repository Code Explainer API",
        "docs": "/docs",
        "health": "/health",
        "provider": LLM_PROVIDER,
        "model": local_model_name(),
    }


@app.get("/health")
def health():
    # Keep health checks lightweight. Do not import torch/Transformers or
    # load model weights here. Cloud startup should only verify the API process.
    return {
        "status": "ok",
        "provider": LLM_PROVIDER,
        "model": local_model_name(),
    }


@app.post("/explain")
def explain(request: ExplainRequest):
    try:
        data = analyze_repository(str(request.repo_url))
        data["explanation"] = explain_repository(data)
        return data
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected server error: {exc}",
        )
