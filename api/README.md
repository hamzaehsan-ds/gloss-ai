# GlossAI

## Run the local API

The API checks the glossary first. When no matching glossary term is available, it uses the configured local Ollama model to answer.

Requirements:

- Python 3.13+
- [`uv`](https://docs.astral.sh/uv/)
- Ollama running locally with `gemma4:e4b` installed

Start the service:

```bash
uv sync
uv run uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. The web app sends unmatched questions to `POST /api/explain`. The default model is `gemma4:e4b`; set `OLLAMA_MODEL` to select another installed model.