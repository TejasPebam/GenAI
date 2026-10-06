import html
import os
from datetime import datetime

import requests
import streamlit as st

BACKEND_URL = "http://127.0.0.1:8001"

UI_PROVIDER = "huggingface" if os.getenv("STREAMLIT_CLOUD") else "ollama"
UI_MODEL = os.getenv("HF_MODEL", "HuggingFaceTB/SmolLM2-135M-Instruct") if os.getenv("STREAMLIT_CLOUD") else os.getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct")

st.set_page_config(
    page_title="RepoLens — Local GitHub Code Explainer",
    page_icon="⌘",
    layout="wide",
    initial_sidebar_state="expanded",
)

for key, default in {
    "page": "Home",
    "repo_url": "",
    "analysis": None,
    "home_repo_url": "",
}.items():
    st.session_state.setdefault(key, default)

st.markdown(
    """
<style>
:root{
    --bg:#07101f;
    --bg-2:#0b162b;
    --panel:rgba(13,26,47,.78);
    --panel-2:rgba(19,35,61,.68);
    --line:rgba(143,182,255,.14);
    --line-strong:rgba(103,232,249,.34);
    --text:#f5f8ff;
    --muted:#91a3be;
    --cyan:#67e8f9;
    --blue:#60a5fa;
    --violet:#a78bfa;
    --green:#55e7ae;
    --shadow:0 28px 80px rgba(0,0,0,.35);
}

html,body,[class*="css"]{
    font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}

.stApp{
    color:var(--text);
    background:
      radial-gradient(circle at 83% 9%, rgba(96,165,250,.17), transparent 26%),
      radial-gradient(circle at 14% 72%, rgba(167,139,250,.12), transparent 27%),
      linear-gradient(145deg,#050b17,#081326 48%,#07101f);
    overflow-x:hidden;
}

.stApp::before{
    content:"";
    position:fixed;
    inset:0;
    pointer-events:none;
    opacity:.42;
    background-image:
      linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),
      linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px);
    background-size:38px 38px;
    mask-image:linear-gradient(to bottom,black 0%,transparent 82%);
}

@keyframes reveal{
    from{opacity:0;transform:translateY(16px)}
    to{opacity:1;transform:translateY(0)}
}

@keyframes float{
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-8px)}
}

@keyframes pulse{
    0%,100%{box-shadow:0 0 0 0 rgba(103,232,249,.04)}
    50%{box-shadow:0 0 0 16px rgba(103,232,249,0)}
}

@keyframes spin{to{transform:rotate(360deg)}}

section[data-testid="stSidebar"]{
    background:linear-gradient(180deg,rgba(5,13,27,.97),rgba(7,16,31,.98));
    border-right:1px solid rgba(143,182,255,.11);
}

.sidebar-brand{
    display:flex;
    align-items:center;
    gap:10px;
    padding:4px 4px 18px;
    font-size:19px;
    font-weight:800;
    letter-spacing:-.4px;
}

.brand-mark{
    width:34px;height:34px;border-radius:11px;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,#1d4ed8,#7c3aed);
    border:1px solid rgba(255,255,255,.14);
    box-shadow:0 0 28px rgba(96,165,250,.25);
}

.brand-accent{color:var(--cyan)}

.sidebar-caption{
    color:#667994;
    font-size:10px;
    letter-spacing:1.8px;
    text-transform:uppercase;
    margin:2px 0 10px 4px;
}

.status-pill{
    position:fixed;
    top:14px;right:22px;z-index:999;
    padding:8px 12px;border-radius:999px;
    color:#dcecff;
    background:rgba(8,18,34,.76);
    border:1px solid var(--line);
    backdrop-filter:blur(18px);
    box-shadow:0 10px 30px rgba(0,0,0,.18);
    font-size:11px;
}

.status-dot{
    margin-left:8px;
    color:var(--green);
    font-weight:700;
}

.nav-note{
    margin-top:18px;
    padding:14px;
    border-radius:16px;
    border:1px solid var(--line);
    background:linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.015));
}

.nav-note .mini{
    color:#70829c;font-size:10px;letter-spacing:1.4px;margin-bottom:8px
}

.nav-note .line{font-size:11px;color:#c4d2e8;margin:6px 0}

.hero-shell,.glass-card,.feature-card,.metric-card,.workflow-card,.side-panel{
    border:1px solid var(--line);
    background:
      linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018)),
      var(--panel);
    backdrop-filter:blur(18px);
    -webkit-backdrop-filter:blur(18px);
    box-shadow:var(--shadow);
    border-radius:22px;
    animation:reveal .55s ease both;
}

.hero-shell{
    position:relative;
    min-height:470px;
    padding:42px;
    overflow:hidden;
}

.hero-shell::after{
    content:"";
    position:absolute;
    width:430px;height:430px;right:-145px;bottom:-210px;
    border-radius:50%;
    background:radial-gradient(circle,rgba(103,232,249,.19),transparent 68%);
    animation:pulse 4s ease-in-out infinite;
}

.eyebrow{
    display:inline-flex;align-items:center;gap:8px;
    padding:7px 11px;border-radius:999px;
    border:1px solid rgba(103,232,249,.21);
    background:rgba(103,232,249,.055);
    color:#c6fbff;
    font-size:10px;font-weight:700;letter-spacing:1.3px;
    text-transform:uppercase;
}

.hero-title{
    margin:20px 0 12px;
    max-width:700px;
    font-size:52px;line-height:1.03;
    font-weight:850;
    letter-spacing:-2.4px;
}

.hero-title span{
    color:var(--cyan);
    text-shadow:0 0 28px rgba(103,232,249,.14);
}

.hero-subtitle{
    max-width:640px;
    color:#aebed3;
    font-size:15px;
    line-height:1.7;
}

.trust-row{
    display:flex;flex-wrap:wrap;gap:8px;
    margin-top:24px;
}

.trust-chip{
    padding:7px 10px;border-radius:999px;
    border:1px solid var(--line);
    background:rgba(255,255,255,.028);
    color:#b9c7da;
    font-size:10px;
}

.hero-input{
    margin-top:26px;
    padding:14px;
    border-radius:18px;
    border:1px solid rgba(96,165,250,.22);
    background:rgba(4,11,23,.58);
    box-shadow:inset 0 1px rgba(255,255,255,.04);
}

.hero-input-label{
    margin-bottom:8px;
    color:#8ea2bd;
    font-size:10px;
    text-transform:uppercase;
    letter-spacing:1.3px;
}

.visual-panel{
    min-height:470px;
    padding:26px;
    display:flex;
    flex-direction:column;
    justify-content:center;
}

.visual-title{
    font-size:12px;color:#8ea2bd;
    letter-spacing:1.2px;text-transform:uppercase
}

.visual-main{
    margin:11px 0 20px;
    font-size:23px;font-weight:800;letter-spacing:-.6px
}

.pipeline{
    display:flex;flex-direction:column;gap:11px
}

.pipeline-step{
    display:flex;align-items:center;gap:12px;
    padding:13px 14px;
    border-radius:15px;
    border:1px solid rgba(255,255,255,.07);
    background:rgba(255,255,255,.025);
}

.pipeline-step.active{
    border-color:rgba(103,232,249,.25);
    background:linear-gradient(90deg,rgba(103,232,249,.08),rgba(96,165,250,.03));
}

.pipeline-num{
    width:34px;height:34px;border-radius:10px;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(135deg,rgba(96,165,250,.2),rgba(167,139,250,.19));
    border:1px solid rgba(145,184,255,.15);
    color:#dcecff;font-weight:800;font-size:11px;
}

.pipeline-text b{font-size:12px}
.pipeline-text span{display:block;color:#788ca7;font-size:10px;margin-top:3px}

.section-kicker{
    margin:28px 0 10px;
    color:#6f84a1;font-size:10px;letter-spacing:1.7px;
    text-transform:uppercase;font-weight:700
}

.feature-card{
    min-height:166px;
    padding:19px;
    box-shadow:0 20px 45px rgba(0,0,0,.2);
}

.feature-card:hover,.metric-card:hover,.workflow-card:hover,.glass-card:hover{
    transform:translateY(-3px);
    border-color:rgba(103,232,249,.25);
    transition:.2s ease;
}

.feature-icon{
    width:40px;height:40px;border-radius:12px;
    display:flex;align-items:center;justify-content:center;
    background:linear-gradient(145deg,rgba(96,165,250,.16),rgba(167,139,250,.11));
    border:1px solid rgba(128,175,255,.17);
    font-size:17px;
}

.feature-title{
    margin-top:12px;font-size:14px;font-weight:800
}

.feature-text{
    margin-top:5px;color:#8295af;
    font-size:11px;line-height:1.55
}

.section-title{
    margin:6px 0 13px;font-size:18px;font-weight:800
}

.page-title{
    margin:7px 0 5px;font-size:31px;font-weight:850;letter-spacing:-1px
}

.page-subtitle{
    margin-bottom:22px;color:var(--muted);font-size:13px
}

.metric-card{
    min-height:124px;padding:18px
}

.metric-value{
    margin-top:7px;font-size:25px;font-weight:850;letter-spacing:-.8px
}

.metric-label{margin-top:3px;color:#8395ad;font-size:10px}

.info-row{
    display:grid;grid-template-columns:145px 1fr;
    gap:10px;padding:9px 0;
    border-bottom:1px solid rgba(255,255,255,.06);
    font-size:12px
}

.info-label{color:#7d91ac}
.info-value{overflow-wrap:anywhere}

.tree{
    padding:17px 18px;border-radius:15px;
    border:1px solid rgba(255,255,255,.06);
    background:#07111f;
    color:#c9d6e8;
    font-family:"SFMono-Regular",Consolas,monospace;
    font-size:12px;line-height:1.75;
    max-height:520px;overflow:auto
}

.workflow-card{
    min-height:148px;padding:18px;
    box-shadow:0 18px 45px rgba(0,0,0,.18);
}

.workflow-num{
    color:var(--cyan);font-size:11px;font-weight:800;
    letter-spacing:1px
}

.workflow-title{
    margin-top:8px;font-size:13px;font-weight:800
}

.workflow-text{
    margin-top:5px;color:#8195af;font-size:11px;line-height:1.5
}

.explanation-box{
    padding:22px;border-radius:17px;
    border:1px solid rgba(103,232,249,.2);
    background:linear-gradient(145deg,rgba(103,232,249,.045),rgba(255,255,255,.018));
    box-shadow:inset 4px 0 #67e8f9, inset 0 1px rgba(255,255,255,.035);
    animation:reveal .6s ease both;
}

.badge{
    display:inline-block;padding:5px 9px;border-radius:999px;
    background:rgba(85,231,174,.08);
    border:1px solid rgba(85,231,174,.2);
    color:#68efbd;font-size:10px
}

.small-muted{color:#8195af;font-size:11px}

.footer-line{
    margin-top:34px;padding-top:14px;
    border-top:1px solid rgba(255,255,255,.07);
    color:#667991;font-size:10px;text-align:center
}

.smooth-loader{
    padding:30px;text-align:center;
    border-radius:18px;
    border:1px solid rgba(103,232,249,.2);
    background:rgba(255,255,255,.025);
    animation:reveal .3s ease both
}

.loader-ring{
    width:44px;height:44px;margin:0 auto 12px;border-radius:50%;
    border:3px solid rgba(255,255,255,.08);
    border-top-color:var(--cyan);
    border-right-color:var(--violet);
    animation:spin .85s linear infinite
}

div.stButton>button,div.stDownloadButton>button{
    border-radius:12px !important;
    border:1px solid rgba(103,232,249,.26) !important;
    background:linear-gradient(135deg,#2563eb,#7c3aed) !important;
    color:#fff !important;
    font-weight:800 !important;
    box-shadow:0 10px 28px rgba(62,93,255,.18) !important;
    transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease !important;
}

div.stButton>button:hover,div.stDownloadButton>button:hover{
    transform:translateY(-2px) !important;
    border-color:rgba(160,225,255,.55) !important;
    box-shadow:0 14px 35px rgba(62,93,255,.28) !important;
}

div.stButton>button:active,div.stDownloadButton>button:active{
    transform:translateY(1px) !important;
}

div[data-baseweb="input"]>div,div[data-baseweb="select"]>div{
    background:rgba(255,255,255,.035) !important;
    border-color:rgba(143,182,255,.15) !important;
    border-radius:12px !important;
}

input,textarea{color:#f5f8ff !important}

.stCodeBlock{border:1px solid rgba(255,255,255,.07);border-radius:14px}

@media (max-width:1000px){
    .hero-title{font-size:37px}
    .hero-shell,.visual-panel{min-height:auto}
    .hero-shell{padding:28px}
    .status-pill{right:10px;top:8px}
}
</style>
""",
    unsafe_allow_html=True,
)


def status():
    if os.getenv("STREAMLIT_CLOUD"):
        st.markdown(
            '<div class="status-pill">⌘ Local AI · SmolLM2 135M'
            '<span class="status-dot">● Ready</span></div>',
            unsafe_allow_html=True,
        )
        return

    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=4)
        data = response.json()
        model = data.get("model", "qwen2.5:3b-instruct")
        provider = data.get("provider", "ollama")
        online = data.get("status") == "ok"
    except requests.RequestException:
        model = "qwen2.5:3b-instruct"
        provider = "ollama"
        online = False

    label = "Online" if online else "Offline"

    st.markdown(
        f'<div class="status-pill">⌘ {html.escape(str(provider))} · '
        f'{html.escape(str(model))}'
        f'<span class="status-dot">● {label}</span></div>',
        unsafe_allow_html=True,
    )


def sidebar():
    st.markdown(
        """
        <div class="sidebar-brand">
          <div class="brand-mark">⌘</div>
          Repo<span class="brand-accent">Lens</span>
        </div>
        <div class="sidebar-caption">LOCAL CODE INTELLIGENCE</div>
        """,
        unsafe_allow_html=True,
    )

    items = [
        ("Home", "⌂"),
        ("Explain Repository", "↗"),
        ("Repository Info", "◫"),
        ("Code Structure", "⌗"),
        ("File Viewer", "▤"),
        ("AI Explanation", "✦"),
        ("Summary", "◈"),
    ]

    for name, icon in items:
        if st.button(
            f"{icon}  {name}",
            key=f"nav_{name}",
            use_container_width=True,
        ):
            st.session_state.page = name
            st.rerun()

    st.markdown(
        f"""
        <div class="nav-note">
          <div class="mini">LOCAL STACK</div>
          <div class="line">🟢 {html.escape(UI_PROVIDER.title())}</div>
          <div class="line">🟢 {html.escape(UI_MODEL)}</div>
          <div class="line">🟢 No API key</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def card(inner: str):
    st.markdown(
        '<div class="glass-card" style="padding:20px;">'
        + inner.replace("\n", "")
        + "</div>",
        unsafe_allow_html=True,
    )


def format_number(value):
    try:
        return f"{int(value or 0):,}"
    except (ValueError, TypeError):
        return "0"


def format_date(value):
    if not value:
        return "N/A"
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime("%d %b %Y")
    except Exception:
        return str(value)


def go_to_explain():
    st.session_state.page = "Explain Repository"
    st.rerun()


def require_analysis():
    if st.session_state.analysis:
        return True

    st.info("Analyze a repository first from **Explain Repository**.")
    if st.button("Open Repository Analyzer  →", type="primary"):
        go_to_explain()
    return False


def run_analysis():
    cloud_starter = globals().get("start_backend")

    if cloud_starter is not None and os.getenv("STREAMLIT_CLOUD"):
        try:
            cloud_starter()
        except Exception as exc:
            st.error(f"Could not start the internal FastAPI service. {exc}")
            return

    holder = st.empty()
    holder.markdown(
        '<div class="smooth-loader"><div class="loader-ring"></div>'
        '<div style="font-weight:800">Reading the repository…</div>'
        '<div class="small-muted" style="margin-top:6px">'
        'Fetching → Filtering → Understanding → Explaining'
        '</div></div>',
        unsafe_allow_html=True,
    )

    try:
        response = requests.post(
            f"{BACKEND_URL}/explain",
            json={"repo_url": st.session_state.repo_url.strip()},
            timeout=600,
        )

        holder.empty()

        if not response.ok:
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            if "GitHub API returned HTTP 403" in str(detail):
                st.warning(
                    "GitHub metadata is rate-limited, but RepoLens can still analyze the public repository. "
                    "Restart the backend if you are running an older build."
                )
            else:
                st.error(detail)
            return

        st.session_state.analysis = response.json()
        st.session_state.page = "AI Explanation"
        st.rerun()

    except requests.RequestException as exc:
        holder.empty()
        st.error(
            "Could not connect to the local FastAPI backend on port 8001. "
            f"Error: {exc}"
        )


def analyze_from_home():
    url = st.session_state.home_repo_url.strip()
    if not url:
        st.warning("Paste a public GitHub repository URL first.")
        return
    st.session_state.repo_url = url
    run_analysis()


with st.sidebar:
    sidebar()

status()
page = st.session_state.page

if page == "Home":
    st.markdown('<div class="section-kicker">Repository intelligence, without the cloud</div>', unsafe_allow_html=True)

    left, right = st.columns([1.36, .84], gap="large")

    with left:
        st.markdown(
            """
            <div class="hero-shell">
              <div class="eyebrow">✦ LOCAL GENAI WORKSPACE</div>
              <div class="hero-title">
                Understand any GitHub repo.<br>
                <span>Without reading every file.</span>
              </div>
              <div class="hero-subtitle">
                RepoLens downloads a public repository, filters the useful code,
                sends the relevant context to your local model, and turns the
                codebase into a beginner-friendly explanation.
              </div>

              <div class="trust-row">
                <div class="trust-chip">NO API KEY</div>
                <div class="trust-chip">PUBLIC GITHUB REPOS</div>
                <div class="trust-chip">LOCAL INFERENCE</div>
                <div class="trust-chip">FASTAPI + STREAMLIT</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="hero-input">', unsafe_allow_html=True)
        st.markdown('<div class="hero-input-label">Repository URL</div>', unsafe_allow_html=True)

        st.text_input(
            "Repository URL",
            placeholder="https://github.com/username/repository",
            label_visibility="collapsed",
            key="home_repo_url",
        )

        c1, c2 = st.columns([1.7, 1])
        with c1:
            if st.button("Analyze Repository  →", type="primary", use_container_width=True):
                analyze_from_home()
        with c2:
            if st.button("Try Example", use_container_width=True):
                st.session_state.home_repo_url = "https://github.com/psf/requests"
                st.session_state.repo_url = st.session_state.home_repo_url
                st.rerun()

        st.markdown('</div>', unsafe_allow_html=True)

        if st.session_state.analysis:
            data = st.session_state.analysis
            st.markdown('<div class="small-muted" style="margin:12px 2px 0;">Last analyzed: '
                        + html.escape(data["full_name"])
                        + ' · '
                        + str(data["files_analyzed"])
                        + ' readable files</div>', unsafe_allow_html=True)

    with right:
        st.markdown(
            """
            <div class="visual-panel glass-card">
              <div class="visual-title">What happens behind the screen</div>
              <div class="visual-main">A simple path from repo to explanation.</div>

              <div class="pipeline">
                <div class="pipeline-step active">
                  <div class="pipeline-num">01</div>
                  <div class="pipeline-text"><b>GitHub</b><span>Fetch public repository</span></div>
                </div>
                <div class="pipeline-step">
                  <div class="pipeline-num">02</div>
                  <div class="pipeline-text"><b>Code Filter</b><span>Keep useful source & config files</span></div>
                </div>
                <div class="pipeline-step">
                  <div class="pipeline-num">03</div>
                  <div class="pipeline-text"><b>Local AI</b><span>Ollama + Qwen explain the code</span></div>
                </div>
                <div class="pipeline-step">
                  <div class="pipeline-num">04</div>
                  <div class="pipeline-text"><b>Results</b><span>Overview, features, flow & key files</span></div>
                </div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown('<div class="section-kicker">Why this version feels different</div>', unsafe_allow_html=True)

    features = [
        ("⌁", "Repository-aware", "The explanation is built from the actual files in the repository, not a generic template."),
        ("◫", "Readable insights", "See the repository metadata, file tree, source files and AI explanation in separate views."),
        ("✦", "Private by design", "The default local flow uses Ollama, so there is no cloud LLM API key to paste into the app."),
        ("↗", "Beginner-friendly", "The prompt asks the model to explain the project in simple language without inventing functionality."),
    ]

    cols = st.columns(4, gap="medium")
    for col, (icon, title, body) in zip(cols, features):
        with col:
            st.markdown(
                f"""
                <div class="feature-card">
                  <div class="feature-icon">{icon}</div>
                  <div class="feature-title">{title}</div>
                  <div class="feature-text">{body}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    st.markdown('<div class="section-kicker">The workflow</div>', unsafe_allow_html=True)
    workflow = [
        ("01", "Paste a GitHub URL", "Start with any public repository you want to understand."),
        ("02", "Extract useful files", "The processor skips binaries, caches, dependencies and oversized files."),
        ("03", "Generate the explanation", "Your local LLM receives bounded repository context and explains it."),
        ("04", "Explore the result", "Move through metadata, structure, file viewer, explanation and summary."),
    ]

    cols = st.columns(4, gap="medium")
    for col, (num, title, body) in zip(cols, workflow):
        with col:
            st.markdown(
                f"""
                <div class="workflow-card">
                  <div class="workflow-num">{num} / STEP</div>
                  <div class="workflow-title">{title}</div>
                  <div class="workflow-text">{body}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

elif page == "Explain Repository":
    st.markdown('<div class="page-title">Explain a GitHub Repository</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="page-subtitle">Paste a public repository URL and let the local AI build a practical codebase explanation.</div>',
        unsafe_allow_html=True,
    )

    card(
        '<div class="section-title">Repository URL</div>'
        '<div class="small-muted">Example: https://github.com/username/repository</div>'
    )

    st.session_state.repo_url = st.text_input(
        "Repository URL",
        value=st.session_state.repo_url,
        placeholder="https://github.com/username/repository",
        label_visibility="collapsed",
    )

    c1, c2 = st.columns([1, 1])
    with c1:
        if st.button("Explain Repository  →", type="primary", use_container_width=True):
            if not st.session_state.repo_url.strip():
                st.warning("Please enter a public GitHub repository URL.")
            else:
                run_analysis()
    with c2:
        if st.button("Load Example Repository", use_container_width=True):
            st.session_state.repo_url = "https://github.com/psf/requests"
            st.rerun()

    st.markdown('<div class="section-kicker">How it works</div>', unsafe_allow_html=True)
    steps = [
        ("01", "Download", "Fetch the repository with GitPython, with an archive fallback."),
        ("02", "Process", "Read supported source, config and documentation files."),
        ("03", "Explain", "Generate an explanation through the configured local LLM."),
        ("04", "Explore", "Inspect the result across dedicated project views."),
    ]
    cols = st.columns(4, gap="medium")
    for col, (num, title, body) in zip(cols, steps):
        with col:
            st.markdown(
                f"""
                <div class="workflow-card">
                  <div class="workflow-num">{num} / STEP</div>
                  <div class="workflow-title">{title}</div>
                  <div class="workflow-text">{body}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

elif page == "Repository Info":
    if require_analysis():
        data = st.session_state.analysis

        st.markdown('<div class="page-title">Repository Information</div>', unsafe_allow_html=True)
        st.markdown('<div class="page-subtitle">Metadata collected from the analyzed GitHub repository.</div>', unsafe_allow_html=True)

        left, right = st.columns([.8, 1.5], gap="large")
        with left:
            card(
                '<div style="font-size:42px;">⌘</div>'
                '<div style="font-size:21px;font-weight:850;margin-top:8px;">'
                + html.escape(data["repository"])
                + "</div>"
                '<div class="small-muted" style="margin-top:7px;">'
                + html.escape(data["description"])
                + "</div>"
                '<div style="margin-top:12px;"><span class="badge">Public repository</span></div>'
            )
            st.link_button("View on GitHub ↗", data["html_url"], use_container_width=True)

        with right:
            rows = [
                ("Full name", data["full_name"]),
                ("Default branch", data["default_branch"]),
                ("Description", data["description"]),
                ("Stars", format_number(data["stars"])),
                ("Forks", format_number(data["forks"])),
                ("Primary language", data["language"]),
                ("Acquisition", data["acquisition_method"]),
                ("Last updated", format_date(data["updated_at"])),
            ]
            info = "".join(
                '<div class="info-row"><div class="info-label">'
                + html.escape(str(label))
                + '</div><div class="info-value">'
                + html.escape(str(value))
                + "</div></div>"
                for label, value in rows
            )
            card('<div class="section-title">Repository details</div>' + info)

elif page == "Code Structure":
    if require_analysis():
        data = st.session_state.analysis

        st.markdown('<div class="page-title">Repository Structure</div>', unsafe_allow_html=True)
        st.markdown('<div class="page-subtitle">A quick tree of the files included in the analysis.</div>', unsafe_allow_html=True)

        tree = '<div class="tree"><b>📁 ' + html.escape(data["repository"]) + '/</b><br>'
        for index, item in enumerate(data["files"]):
            prefix = "└── " if index == len(data["files"]) - 1 else "├── "
            tree += prefix + "📄 " + html.escape(item["path"]) + "<br>"
        tree += "</div>"

        st.markdown(tree, unsafe_allow_html=True)
        st.markdown(
            '<div class="small-muted" style="margin-top:10px;">'
            + str(data["files_analyzed"])
            + " readable files · "
            + str(data["source_files"])
            + " source files · "
            + format_number(data["lines_of_code"])
            + " source lines</div>",
            unsafe_allow_html=True,
        )

elif page == "File Viewer":
    if require_analysis():
        data = st.session_state.analysis

        st.markdown('<div class="page-title">File Viewer</div>', unsafe_allow_html=True)
        st.markdown('<div class="page-subtitle">Inspect the exact file contents that were sent into the analysis context.</div>', unsafe_allow_html=True)

        names = [item["path"] for item in data["files"]]
        if not names:
            st.info("No readable files are available.")
        else:
            selected = st.selectbox("Select file", names)
            chosen = next(item for item in data["files"] if item["path"] == selected)
            language = chosen["extension"].lstrip(".") or "text"
            st.code(chosen["content"], language=language)

elif page == "AI Explanation":
    if require_analysis():
        data = st.session_state.analysis

        st.markdown('<div class="page-title">AI Generated Explanation</div>', unsafe_allow_html=True)
        st.markdown(
            '<div class="page-subtitle">Generated from the analyzed repository using the configured local model.</div>',
            unsafe_allow_html=True,
        )

        left, right = st.columns([5, 1], gap="medium")
        with left:
            card(
                '<div style="font-size:17px;font-weight:850;">'
                + html.escape(data["full_name"])
                + "</div>"
                '<div class="small-muted" style="margin-top:5px;">'
                + str(data["files_analyzed"])
                + " readable files · "
                + str(data["source_files"])
                + " source files</div>"
            )

        with right:
            st.download_button(
                "Download",
                data["explanation"],
                file_name=f'{data["repository"]}_explanation.txt',
                mime="text/plain",
                use_container_width=True,
            )

        st.markdown('<div class="explanation-box">', unsafe_allow_html=True)
        st.markdown(data["explanation"])
        st.markdown('</div>', unsafe_allow_html=True)

elif page == "Summary":
    if require_analysis():
        data = st.session_state.analysis

        st.markdown('<div class="page-title">Analysis Summary</div>', unsafe_allow_html=True)
        st.markdown('<div class="page-subtitle">The most useful facts from the current repository analysis.</div>', unsafe_allow_html=True)

        metrics = [
            ("📄", format_number(data["files_analyzed"]), "Readable Files"),
            ("⌗", format_number(data["source_files"]), "Source Files"),
            ("✦", data["language"], "Primary Language"),
            ("◈", data["repo_type"], "Repository Type"),
        ]
        columns = st.columns(4, gap="medium")
        for col, (icon, value, label) in zip(columns, metrics):
            with col:
                st.markdown(
                    f"""
                    <div class="metric-card">
                      <div>{icon}</div>
                      <div class="metric-value">{html.escape(str(value))}</div>
                      <div class="metric-label">{html.escape(label)}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

        snapshot = [
            ("Repository", data["full_name"]),
            ("Default branch", data["default_branch"]),
            ("Source lines", format_number(data["lines_of_code"])),
            ("Stars", format_number(data["stars"])),
            ("Forks", format_number(data["forks"])),
        ]
        info = "".join(
            '<div class="info-row"><div class="info-label">'
            + html.escape(str(label))
            + '</div><div class="info-value">'
            + html.escape(str(value))
            + "</div></div>"
            for label, value in snapshot
        )

        st.markdown('<div class="section-kicker">Repository snapshot</div>', unsafe_allow_html=True)
        card(info)

st.markdown(
    f'<div class="footer-line">RepoLens · Local GenAI · FastAPI · Streamlit · {html.escape(UI_PROVIDER.title())} · {html.escape(UI_MODEL)}</div>',
    unsafe_allow_html=True,
)
