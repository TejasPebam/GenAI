import requests
import streamlit as st

st.set_page_config(page_title="GitHub Code Explainer", page_icon="🤖", layout="wide")

API_URL = "http://127.0.0.1:8000"

st.title("🤖 Local GitHub Repository Code Explainer")
st.caption("Clone a GitHub repository and get a simple explanation using a local LLM.")

repo_url = st.text_input(
    "GitHub Repository URL",
    placeholder="https://github.com/username/repository"
)

if st.button("Explain this GitHub Repository", type="primary"):
    if not repo_url.strip():
        st.warning("Please enter a GitHub repository URL.")
    elif "github.com/" not in repo_url:
        st.warning("Please enter a valid GitHub repository URL.")
    else:
        with st.spinner("Cloning repository, reading code, and asking the local LLM..."):
            try:
                response = requests.post(
                    f"{API_URL}/explain",
                    json={"repo_url": repo_url.strip()},
                    timeout=240,
                )
                if response.ok:
                    data = response.json()
                    st.success("Repository explained successfully.")

                    left, right = st.columns(2)
                    with left:
                        st.subheader("Detected Technologies")
                        for tech in data.get("technologies", []):
                            st.write(f"• {tech}")
                    with right:
                        st.subheader("Source Files")
                        st.write(f"{len(data.get('files', []))} relevant file(s) found")

                    st.divider()
                    st.subheader("Project Explanation")
                    st.markdown(data.get("explanation", "No explanation returned."))

                    with st.expander("Show scanned files"):
                        for name in data.get("files", []):
                            st.code(name)
                else:
                    try:
                        detail = response.json().get("detail", response.text)
                    except Exception:
                        detail = response.text
                    st.error(detail)
            except requests.RequestException:
                st.error("Cannot connect to the FastAPI backend. Start backend.py first.")

st.divider()
st.markdown("**Architecture:** GitHub → GitPython → Code Extraction → Ollama (Local LLM) → FastAPI → Streamlit")
