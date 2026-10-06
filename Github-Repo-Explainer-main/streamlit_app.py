import os
from pathlib import Path
from threading import Thread
import time

import requests
import streamlit as st
import uvicorn

# Cloud mode: use a lightweight local Transformers model and start FastAPI
# only when the user requests an analysis, not during Streamlit startup.
os.environ.setdefault("STREAMLIT_CLOUD", "1")
os.environ.setdefault("LLM_PROVIDER", "huggingface")
os.environ.setdefault(
    "HF_MODEL",
    "HuggingFaceTB/SmolLM2-135M-Instruct",
)

BACKEND_URL = "http://127.0.0.1:8001"


@st.cache_resource(show_spinner=False)
def start_backend():
    config = uvicorn.Config(
        "backend.main:app",
        host="127.0.0.1",
        port=8001,
        log_level="warning",
    )

    server = uvicorn.Server(config)
    thread = Thread(
        target=server.run,
        daemon=True,
    )
    thread.start()

    last_error = None

    for _ in range(80):
        try:
            response = requests.get(
                f"{BACKEND_URL}/health",
                timeout=1,
            )

            if response.ok:
                return server

        except requests.RequestException as exc:
            last_error = exc

        time.sleep(0.25)

    raise RuntimeError(
        "Could not start the internal FastAPI service. "
        f"{last_error or ''}"
    )


# The Streamlit frontend is the entrypoint.
# FastAPI starts lazily when Explain Repository is clicked.
app_path = (
    Path(__file__).parent
    / "frontend"
    / "app.py"
)

exec(
    compile(
        app_path.read_text(encoding="utf-8"),
        str(app_path),
        "exec",
    ),
    globals(),
)
