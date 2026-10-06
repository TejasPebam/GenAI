import os
from functools import lru_cache

import requests

OLLAMA_URL = os.getenv(
    "OLLAMA_URL",
    "http://127.0.0.1:11434/api/generate",
)
OLLAMA_TAGS_URL = os.getenv(
    "OLLAMA_TAGS_URL",
    "http://127.0.0.1:11434/api/tags",
)

LLM_PROVIDER = os.getenv(
    "LLM_PROVIDER",
    "huggingface" if os.getenv("STREAMLIT_CLOUD") else "ollama",
).lower()

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "qwen2.5:3b-instruct",
)

# Small CPU-friendly model for Streamlit Community Cloud.
# 135M parameters keeps inference far below the memory footprint of the
# 0.5B Qwen cloud configuration that was causing the app to disappear.
HF_MODEL = os.getenv(
    "HF_MODEL",
    "HuggingFaceTB/SmolLM2-135M-Instruct",
)


def available_ollama_models() -> list[str]:
    try:
        response = requests.get(
            f"{OLLAMA_URL}/api/tags",
            timeout=5
        )
        response.raise_for_status()

        return [
            item.get("name", "").strip()
            for item in response.json().get("models", [])
            if item.get("name")
        ]
    except (requests.RequestException, ValueError):
        return []

def ollama_model_for_use() -> str:
    """Use the configured model, or fall back to an installed tagged variant."""
    models = available_ollama_models()
    if OLLAMA_MODEL in models:
        return OLLAMA_MODEL

    base = OLLAMA_MODEL.split(":", 1)[0]
    matching = [name for name in models if name.split(":", 1)[0] == base]
    if matching:
        return matching[0]

    return OLLAMA_MODEL


def ollama_is_available() -> bool:
    return ollama_model_for_use() in available_ollama_models()


def local_model_name() -> str:
    if LLM_PROVIDER == "huggingface":
        return HF_MODEL
    return ollama_model_for_use()


def build_prompt(data: dict) -> str:
    source_sections = []

    for item in data["files"]:
        source_sections.append(
            f"\n--- FILE: {item['path']} ---\n"
            f"{item['content']}\n"
            f"--- END FILE ---"
        )

    # Keep cloud prompt deliberately bounded for low-memory CPU inference.
    repository_context = "".join(source_sections)[:18000]

    return f"""
You are a senior software engineer explaining a GitHub repository to a beginner.

Repository: {data["full_name"]}
Description: {data["description"]}
Primary language: {data["language"]}

README:
{data.get("readme", "")[:6000]}

REPOSITORY FILES:
{repository_context}

Generate an accurate explanation using ONLY the supplied repository content.
Do not invent functionality.

Use exactly these sections:

## PROJECT OVERVIEW
Explain what the repository does in 3-5 simple sentences.

## MAIN FEATURES
Give 3-7 bullet points.

## MAIN TECHNOLOGIES
List important languages, frameworks, libraries, databases and tools visible
in the repository.

## HOW IT WORKS
Explain the flow from input/request to output based only on the supplied files.

## IMPORTANT FILES
List important files and their purpose.

## SIMPLE ARCHITECTURE
Explain how the major components interact.

Keep the explanation beginner-friendly and concise.
""".strip()


@lru_cache(maxsize=1)
def _hf_components():
    """
    Lazy-load the local Hugging Face model ONLY when an explanation is requested.
    This prevents model loading during Streamlit health checks/startup.
    """
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError as exc:
        raise RuntimeError(
            "Hugging Face local inference requires torch and transformers."
        ) from exc

    # Restrict CPU parallelism to reduce memory/CPU spikes on Community Cloud.
    try:
        torch.set_num_threads(1)
        torch.set_num_interop_threads(1)
    except RuntimeError:
        pass

    tokenizer = AutoTokenizer.from_pretrained(HF_MODEL)

    model = AutoModelForCausalLM.from_pretrained(
        HF_MODEL,
        dtype=torch.float32,
        low_cpu_mem_usage=False,
    )

    model.eval()
    return tokenizer, model, torch


def _explain_with_hugging_face(prompt: str) -> str:
    tokenizer, model, torch = _hf_components()

    # Use the model's chat template when available.
    messages = [
        {
            "role": "system",
            "content": (
                "You explain software repositories accurately and simply. "
                "Do not invent features."
            ),
        },
        {
            "role": "user",
            "content": prompt,
        },
    ]

    if hasattr(tokenizer, "apply_chat_template"):
        rendered = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
    else:
        rendered = (
            "System: Explain software repositories accurately and simply.\n\n"
            f"User:\n{prompt}\n\nAssistant:"
        )

    inputs = tokenizer(
        rendered,
        return_tensors="pt",
        truncation=True,
        max_length=2048,
    )

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=220,
            do_sample=False,
            use_cache=True,
        )

    new_tokens = output_ids[0][inputs["input_ids"].shape[1]:]
    text = tokenizer.decode(
        new_tokens,
        skip_special_tokens=True,
    ).strip()

    if not text:
        raise RuntimeError(
            "Hugging Face local inference returned no generated text."
        )

    return text


def _explain_with_ollama(prompt: str) -> str:
    payload = {
        "model": ollama_model_for_use(),
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
        },
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=300,
        )
    except requests.RequestException as exc:
        raise RuntimeError(
            f"Cannot connect to Ollama. Make sure an Ollama model is installed."
        ) from exc

    if response.status_code != 200:
        raise RuntimeError(
            f"Ollama returned HTTP {response.status_code}: "
            f"{response.text[:500]}"
        )

    try:
        result = response.json()
    except ValueError as exc:
        raise RuntimeError("Ollama returned an invalid response.") from exc

    explanation = result.get("response", "").strip()

    if not explanation:
        raise RuntimeError("Ollama returned an empty explanation.")

    return explanation


def explain_repository(data: dict) -> str:
    prompt = build_prompt(data)

    if LLM_PROVIDER == "huggingface":
        return _explain_with_hugging_face(prompt)

    return _explain_with_ollama(prompt)
