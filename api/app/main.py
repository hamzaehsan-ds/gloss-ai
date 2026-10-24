import json
import os
import re
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field


BASE_DIR = Path(__file__).resolve().parent.parent
GLOSSARY_FILE = BASE_DIR / "data" / "glossary.json"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")


def load_glossary() -> dict[str, str]:
    with GLOSSARY_FILE.open(encoding="utf-8") as file:
        data = json.load(file)
    return {key.lower(): value for key, value in data.items()}


GLOSSARY = load_glossary()


class ExplanationRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)


class QuizQuestion(BaseModel):
    question: str
    options: list[str] = Field(min_length=2, max_length=5)
    answer: str


class TermExplanation(BaseModel):
    id: str
    term: str
    simple: str
    mental_model: str
    real_world_example: str
    quiz: QuizQuestion
    source: str


app = FastAPI(title="GlossAI Term Explainer")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def find_glossary_definition(question: str) -> tuple[str, str] | None:
    normalized_question = re.sub(r"[^a-z0-9]+", " ", question.lower()).strip()
    matches = [
        (term, definition)
        for term, definition in GLOSSARY.items()
        if re.search(
            rf"\b{re.escape(re.sub(r'[^a-z0-9]+', ' ', term).strip())}\b",
            normalized_question,
        )
    ]
    return max(matches, key=lambda match: len(match[0])) if matches else None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": OLLAMA_MODEL}


@app.post("/api/explain", response_model=TermExplanation)
def explain_term(request: ExplanationRequest) -> TermExplanation:
    glossary_match = find_glossary_definition(request.question)
    source = "AI Glossary" if glossary_match else f"Ollama ({OLLAMA_MODEL})"
    glossary_context = (
        f"Glossary term: {glossary_match[0]}\nDefinition: {glossary_match[1]}"
        if glossary_match
        else "No matching glossary entry was found. Answer from your own model knowledge."
    )

    model = ChatOllama(model=OLLAMA_MODEL, temperature=0).with_structured_output(
        TermExplanation
    )
    messages = [
        SystemMessage(
            content=(
                "You are GlossAI, a careful AI term explainer for students. "
                "Use the provided glossary definition as the factual source when present; "
                "otherwise answer using your own knowledge and say when something is uncertain. "
                "Do not claim to have searched the web. Keep the explanation beginner-friendly. "
                "Return one short sentence for simple, one everyday analogy for mental_model, "
                "one concrete real-world problem for real_world_example, and a short quiz with "
                "three choices and the correct answer. Only provide educational information."
            )
        ),
        HumanMessage(
            content=(
                f"Student question: {request.question}\n\n"
                f"Knowledge source: {source}\n{glossary_context}"
            )
        ),
    ]

    try:
        result = model.invoke(messages)
    except (httpx.ConnectError, httpx.TimeoutException) as error:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Could not connect to Ollama at http://localhost:11434. "
                f"Start Ollama and ensure model '{OLLAMA_MODEL}' is available."
            ),
        ) from error

    if isinstance(result, TermExplanation):
        result.source = source
        result.id = glossary_match[0] if glossary_match else re.sub(
            r"[^a-z0-9]+", "-", result.term.lower()
        ).strip("-")
        return result

    return TermExplanation.model_validate(
        {
            **result,
            "source": source,
            "id": glossary_match[0]
            if glossary_match
            else re.sub(r"[^a-z0-9]+", "-", result["term"].lower()).strip("-"),
        }
    )
