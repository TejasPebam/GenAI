# MINI PROJECT REPORT
# Local GitHub Repository Code Explainer

## 1. Objective

The objective is to build a local GenAI application that accepts a GitHub
repository URL and generates a simple-language explanation of the codebase.

## 2. Problem Statement

GitHub repositories can contain many files and technologies. Beginners may
find it difficult to understand what a project does and how its components
work together.

## 3. Proposed Solution

The application accepts a public GitHub repository URL using a Streamlit
frontend. FastAPI receives and validates the URL. GitPython is used as the
primary repository cloning mechanism. If system Git is unavailable, a public
GitHub archive fallback keeps the application runnable. Python filters and
extracts relevant repository files. A structured prompt is sent to a local
Qwen 2.5 3B model through Ollama. The generated explanation is returned by
FastAPI and displayed in Streamlit.

## 4. Core Flow

GitHub Repository
→ Code Processing
→ Local LLM
→ FastAPI Backend
→ Streamlit Frontend
→ Explanation

## 5. Technology Stack

### Local GenAI
- Python
- Hugging Face Transformers
- Qwen 2.5 3B
- Ollama local inference

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

## 6. Application Features

- Accept public GitHub repository URL.
- Clone/acquire repository locally.
- Detect relevant source-code and repository files.
- Filter binary, dependency, cache and build files.
- Extract file contents.
- Send repository content to the local LLM.
- Generate simple-language project explanation.
- Show repository metadata.
- Show repository file structure.
- Show file contents.
- Show AI-generated explanation.
- Show analysis summary.

## 7. UI/UX

The application follows a glossy red and starry-black glassmorphism style.

It includes:

- 3D card/object motion.
- Hover lift and glow.
- Entrance reveal animations.
- Button and navigation microinteractions.
- Animated star-field/parallax-style background motion.
- Smooth repository-analysis loader.

Pages:

1. Home
2. Explain Repository
3. Repository Information
4. Code Structure
5. File Viewer
6. AI Explanation
7. Summary

## 8. System Architecture

```text
User
 |
 v
Streamlit Frontend
 |
 v
FastAPI Backend
 |
 +----------> GitHub API
 |                |
 |                v
 |       Default Branch
 |
 +----------> GitPython clone
 |                |
 |       fallback if necessary
 |                |
 +----------> GitHub archive
                  |
                  v
            Local Repository
                  |
                  v
            File Filtering
                  |
                  v
             Code Context
                  |
                  v
             Prompt Builder
                  |
                  v
          Ollama / Qwen 2.5 3B
                  |
                  v
         Generated Explanation
                  |
                  v
              Streamlit
```

## 9. Workflow

1. User enters a public GitHub repository URL.
2. Streamlit sends it to FastAPI.
3. Pydantic validates the URL.
4. Repository metadata is retrieved.
5. Default branch is determined.
6. GitPython attempts to clone the repository.
7. If system Git is unavailable, the repository archive is downloaded.
8. Repository files are extracted locally.
9. Irrelevant and binary files are skipped.
10. Relevant files are read and size-limited.
11. A structured prompt is created.
12. Ollama runs the Qwen 2.5 3B model locally.
13. The model generates the explanation.
14. FastAPI returns the result.
15. Streamlit displays the explanation.

## 10. Local GenAI

Ollama runs Qwen 2.5 3B locally by default. This avoids the need for a paid
cloud LLM API key.

A Hugging Face Transformers adapter is also included as an optional local
inference path.

## 11. Key Requirement

The repository explanation is generated dynamically by the local LLM. It is
not hard-coded.

## 12. Limitations

- Public repositories only.
- Large repositories are truncated to keep local inference practical.
- Local hardware affects inference time.
- Very complex repositories may benefit from RAG in future.

## 13. Future Scope

- Private repository authentication.
- RAG for large repositories.
- Function-level explanation.
- Interactive codebase Q&A.
- Dependency visualization.
- Docker packaging.

## 14. Conclusion

The Local GitHub Repository Code Explainer demonstrates an end-to-end local
GenAI workflow combining repository processing, a local open-source LLM,
FastAPI and Streamlit. It provides a beginner-friendly explanation of a
GitHub repository while maintaining the requested local-inference approach.
