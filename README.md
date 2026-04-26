## It was difficult for us to upload such a large project file through github or submission portal. Here is the full project in the drive link: 

# AI Scientist Demo (Protocol Crystallization)

AI Scientist Demo is a full-stack app that turns a hypothesis into a confidence-scored experiment plan with safety checks, literature grounding, editable document output, and DOCX export.

## What This Project Includes

1. Input validator
2. Safety gate
3. Parallel literature probe (Semantic Scholar + arXiv + OpenAlex)
4. Protocol graph builder + plan synthesis
5. Confidence-scored streamed UI
6. Scientist feedback loop
7. Optional LLM synthesis (OpenAI/Anthropic) with template fallback
8. Doc Studio for editing and export

## Run On Any PC (Windows, macOS, Linux)

### 1) Install Required Software

- Python `3.10+`
- Node.js `20+` (npm included)
- Git (recommended)
- Optional: Docker Desktop

Quick checks:

```bash
python --version
node --version
npm --version
```

### 2) Clone and Open Project

```bash
git clone <your-repo-url>
cd ai-scientist-demo
```

## Backend Setup (Terminal 1)

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

### macOS/Linux (bash/zsh)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

Backend health check:

- [http://localhost:8003/api/health](http://localhost:8003/api/health)

## Frontend Setup (Terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Open:

- [http://localhost:5173](http://localhost:5173)

## Optional Environment Variables (LLM)

If you want real LLM generation instead of template mode:

### Windows (PowerShell)

```powershell
$env:OPENAI_API_KEY="your_key"
$env:OPENAI_MODEL="gpt-4o-mini"
# or
$env:ANTHROPIC_API_KEY="your_key"
$env:ANTHROPIC_MODEL="claude-3-5-sonnet-latest"
```

### macOS/Linux

```bash
export OPENAI_API_KEY="your_key"
export OPENAI_MODEL="gpt-4o-mini"
# or
export ANTHROPIC_API_KEY="your_key"
export ANTHROPIC_MODEL="claude-3-5-sonnet-latest"
```

## One-Command Run With Docker

```bash
docker compose up --build
```

Then open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend health: [http://localhost:8003/api/health](http://localhost:8003/api/health)

## First-Time Usage Flow

1. Open the app in browser.
2. Paste a hypothesis including intervention, outcome, threshold, and control.
3. Click **Generate experiment plan**.
4. Review validator, safety, literature, and generated sections.
5. Switch to **Doc Studio** to edit proposal content.
6. Click **Export to .docx** to download final document.

## Troubleshooting

- **Port already in use:** change backend port and set frontend API URL.
  - Example frontend env: `VITE_API_URL=http://localhost:8004`
- **CORS/API errors:** ensure backend is running before frontend.
- **npm not found:** reinstall Node.js from [https://nodejs.org](https://nodejs.org).
- **Python venv activation blocked on Windows:** run PowerShell as admin once:
  - `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Deployment Notes

- Frontend: Vercel / Netlify
- Backend: Render / Railway / Fly.io
- Set `VITE_API_URL` in frontend environment to deployed backend URL
