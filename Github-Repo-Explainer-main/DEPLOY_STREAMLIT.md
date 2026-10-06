# Streamlit Cloud Deployment

## Required settings

Repository: `piyushT3003/Github-Repo-Explainer`
Branch: `main`
Entrypoint: `streamlit_app.py`

Python 3.12 is recommended.

## Important architecture change

The deployed app no longer starts FastAPI or loads the ML model during
Streamlit startup.

FastAPI starts only after the user clicks **Explain Repository**.
The Hugging Face model is also loaded lazily on the first analysis request.

This avoids failing Streamlit's startup health check while heavy ML assets
are loading.

## Cloud model

The cloud deployment uses:

`HuggingFaceTB/SmolLM2-135M-Instruct`

This is a 135M-parameter instruction model and is substantially lighter than
the previous 0.5B configuration. It is loaded with Hugging Face Transformers
only when an explanation is requested.

The local Windows version still defaults to:

`Ollama → Qwen 2.5 3B`

## No API key

No cloud LLM API key is required.

## Dependencies

- Streamlit
- FastAPI
- Pydantic
- Uvicorn
- GitPython
- Hugging Face Transformers
- PyTorch

Git is installed as a Linux system package through `packages.txt`.
