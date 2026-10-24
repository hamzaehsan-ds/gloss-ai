# GlossAI

GlossAI is a small full-stack project that combines a Python backend with a Next.js frontend to explore AI-powered glossary and knowledge workflows. The project is organized into two main parts:

- `api/` — Python service built with LangChain and local model integration
- `web/` — Next.js frontend for the user experience

## Overview

This repository is designed as a starter application for experimenting with AI-assisted glossary or concept lookup flows. The backend can serve responses backed by an LLM or local model stack, while the frontend provides an interactive interface for users to explore content.

## Project structure

```text
.
├── README.md
├── AGENTS.md
├── api/
│   ├── app/
│   ├── data/
│   ├── README.md
│   ├── pyproject.toml
│   ├── uv.lock
│   └── .env.example
├── web/
│   ├── app/
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
└── .gitignore
```

## Tech stack

- Python 3.13+
- FastAPI-style app structure in the API layer
- LangChain + Ollama integration
- Next.js 15 app router
- React 19
- TypeScript

## Prerequisites

Before running the app, make sure you have:

- Python 3.13 or newer
- `uv` installed for the backend
- Node.js 18+ and npm for the frontend
- An Ollama-compatible model available locally if you want to use the LLM workflow

## Getting started

### 1) Backend

```bash
cd api
uv sync
cp .env.example .env
uv run python -m app.main
```

If you are using the local model stack, make sure your environment variables and model configuration match your local setup.

### 2) Frontend

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Environment variables

The API includes an example environment file at `api/.env.example`. Copy it to `api/.env` and fill in any required secrets or model settings before running the application.

## Notes

This repository is a clean starting point for building AI-powered interactive experiences, glossary tools, or knowledge-based workflows. It is intentionally lightweight and easy to extend.

## License

This project is currently provided as a source project without a specific license file. If you plan to share or distribute it publicly, consider adding an explicit license such as MIT.
