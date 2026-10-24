"use client";

import { FormEvent, useState } from "react";
import { glossaryData, type GlossaryEntry } from "../data/glossary";

const glossary = glossaryData.entries as GlossaryEntry[];
const starterQuestions = [
  "What is RAG in simple words?",
  "How does an LLM work?",
  "Why is human-in-the-loop important?",
  "What does a vector database do?",
];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  entry?: GlossaryEntry & { source?: string };
};

type ExplanationResponse = GlossaryEntry & {
  source: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "does",
  "explain",
  "how",
  "in",
  "is",
  "me",
  "of",
  "please",
  "tell",
  "the",
  "to",
  "what",
  "when",
  "why",
  "with",
  "words",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findBestMatch(question: string) {
  const queryWords = new Set(
    normalize(question)
      .split(" ")
      .filter((word) => word && !stopWords.has(word)),
  );

  let bestMatch: GlossaryEntry | undefined;
  let bestScore = 0;

  for (const entry of glossary) {
    const termWords = normalize(`${entry.term} ${entry.id}`).split(" ");
    const score = termWords.filter(
      (word) => word && !stopWords.has(word) && queryWords.has(word),
    ).length;

    if (score > bestScore) {
      bestMatch = entry;
      bestScore = score;
    }
  }

  return bestMatch;
}

function isExplanationResponse(value: unknown): value is ExplanationResponse {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const quiz = result.quiz;

  return (
    typeof result.id === "string" &&
    typeof result.term === "string" &&
    typeof result.simple === "string" &&
    typeof result.mental_model === "string" &&
    typeof result.real_world_example === "string" &&
    typeof result.source === "string" &&
    typeof quiz === "object" &&
    quiz !== null &&
    typeof (quiz as Record<string, unknown>).question === "string" &&
    Array.isArray((quiz as Record<string, unknown>).options) &&
    typeof (quiz as Record<string, unknown>).answer === "string"
  );
}

export default function Home() {
  const [activeTerm, setActiveTerm] = useState<GlossaryEntry>(glossary[0]);
  const [input, setInput] = useState("What is RAG in simple words?");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Here is a sample AI Glossary explanation:",
      entry: glossary[0],
    },
  ]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState("Awaiting your review");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    const match = findBestMatch(question);
    const userMessageId = Date.now();
    setMessages((previous) => [
      ...previous,
      { id: userMessageId, role: "user", content: question },
    ]);
    setInput("");
    setSelectedAnswer(null);
    setApprovalStatus("Awaiting your review");

    if (match) {
      setActiveTerm(match);
      setMessages((previous) => [
        ...previous,
        { id: userMessageId + 1, role: "assistant", content: "Here’s the glossary-backed explanation.", entry: match },
      ]);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const detail =
          typeof payload === "object" &&
          payload !== null &&
          "detail" in payload &&
          typeof payload.detail === "string"
            ? payload.detail
            : `The explanation service returned an error (${response.status}).`;
        throw new Error(detail);
      }
      if (!isExplanationResponse(payload)) {
        throw new Error("The explanation service returned an invalid response.");
      }

      setActiveTerm(payload);
      setMessages((previous) => [
        ...previous,
        {
          id: userMessageId + 1,
          role: "assistant",
          content:
            payload.source === "AI Glossary"
              ? "I found a matching definition in the glossary and asked the local model to explain it."
              : "No glossary entry matched, so your local Ollama model answered from its knowledge.",
          entry: payload,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The explanation service failed for an unknown reason.";
      setMessages((previous) => [
        ...previous,
        {
          id: userMessageId + 1,
          role: "assistant",
          content: `Could not get an answer: ${message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="glossai-app">
      <aside className="left-rail panel">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-name">GlossAI</div>
            <small>Student glossary</small>
          </div>
        </div>

        <div className="rail-section">
          <div className="section-heading">Topics</div>
          <div className="topic-list">
            {glossary.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`topic-button ${activeTerm.id === entry.id ? "selected" : ""}`}
                onClick={() => setActiveTerm(entry)}
              >
                <span>{entry.term}</span>
                <small>{entry.id}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="rail-section stats-rail">
          <div className="mini-stat-box">
            <span>Streak</span>
            <strong>18 days</strong>
          </div>
          <div className="mini-stat-box accent-mint">
            <span>XP</span>
            <strong>1,240</strong>
          </div>
          <div className="mini-stat-box accent-peach">
            <span>Credits</span>
            <strong>24</strong>
          </div>
        </div>
      </aside>

      <section className="chat-panel panel">
        <header className="chat-header">
          <div>
            <div className="section-heading muted">AI Term Explainer Agent</div>
            <h1>Ask GlossAI</h1>
          </div>

          <div className="header-pills">
            <span className="pill pill-violet">Safe mode</span>
            <span className="pill pill-soft">Student mode</span>
          </div>
        </header>

        <div className="source-banner">
          <div className="source-options" aria-label="Knowledge source availability">
            <span className="source-choice active">AI Glossary · first choice</span>
            <span className="source-choice">Ollama · local fallback</span>
            <span className="source-choice unavailable" title="Web search is not configured">
              Web search · not connected
            </span>
          </div>
          <span className="source-badge">Data: AI Glossary · {glossaryData.source.name}</span>
        </div>

        <div className="chat-window" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              <div className="avatar" aria-hidden="true">
                {message.role === "assistant" ? "G" : "S"}
              </div>
              <div className={`message-bubble ${message.entry ? "structured-answer" : ""}`}>
                <p className="message-copy">{message.content}</p>
                {message.entry && (
                  <div className="answer-fields">
                    <div className="answer-source">
                      <span>Source:</span>
                      {message.entry.source === "AI Glossary" ||
                      message.entry.source === undefined ? (
                        <a
                          href={glossaryData.source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          AI Glossary
                        </a>
                      ) : (
                        <strong>{message.entry.source}</strong>
                      )}
                    </div>
                    <div className="answer-field">
                      <span>Term</span>
                      <strong>{message.entry.term}</strong>
                    </div>
                    <div className="answer-field">
                      <span>Simple</span>
                      <p>{message.entry.simple}</p>
                    </div>
                    <div className="answer-field">
                      <span>Mental model</span>
                      <p>{message.entry.mental_model}</p>
                    </div>
                    <div className="answer-field">
                      <span>Real-world problem</span>
                      <p>{message.entry.real_world_example}</p>
                    </div>
                    <div className="answer-field answer-quiz">
                      <span>Quiz</span>
                      <strong>{message.entry.quiz.question}</strong>
                      <p>{message.entry.quiz.options.join(" · ")}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="prompt-row">
          {starterQuestions.map((prompt) => (
            <button key={prompt} type="button" className="prompt-pill" onClick={() => setInput(prompt)}>
              {prompt}
            </button>
          ))}
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <label htmlFor="question-input" className="sr-only">
            Ask a question to GlossAI
          </label>
          <textarea
            id="question-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="Ask a question about AI, learning, or a glossary term..."
          />
          <div className="composer-actions">
            <span className="micro-copy" role="status">
              {isLoading
                ? "Checking glossary, then asking local Ollama..."
                : "Glossary first · local Ollama fallback"}
            </span>
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? "Thinking..." : "Ask GlossAI"}
            </button>
          </div>
        </form>
      </section>

      <aside className="right-rail panel">
        <div className="card-header">
          <div className="section-heading">AI Glossary data</div>
          <span className="pill pill-mint">Verified source</span>
        </div>

        <div className="concept-card">
          <h2>{activeTerm.term}</h2>
          <div className="field-label">Simple</div>
          <p>{activeTerm.simple}</p>
        </div>

        <div className="insight-card">
          <div className="section-heading">Mental model</div>
          <p>{activeTerm.mental_model}</p>
        </div>

        <div className="insight-card example-card">
          <div className="section-heading">Real-world problem</div>
          <p>{activeTerm.real_world_example}</p>
        </div>

        <div className="approval-card">
          <div className="section-heading">Human-in-the-loop review</div>
          <p>Check this explanation before relying on it for study or assignments.</p>
          <div className="approval-actions">
            <button
              type="button"
              className="approve-button"
              onClick={() => setApprovalStatus("Marked as helpful")}
            >
              Helpful
            </button>
            <button
              type="button"
              className="revise-button"
              onClick={() => setApprovalStatus("Feedback noted for review")}
            >
              Needs review
            </button>
          </div>
          <div className="review-status" role="status">{approvalStatus}</div>
        </div>

        <div className="quiz-card">
          <div className="section-heading">Quick quiz</div>
          <h3>{activeTerm.quiz.question}</h3>
          <div className="quiz-list">
            {activeTerm.quiz.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`quiz-option ${selectedAnswer === option ? "selected" : ""}`}
                onClick={() => setSelectedAnswer(option)}
                aria-pressed={selectedAnswer === option}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="quiz-feedback" aria-live="polite">
            {selectedAnswer === null
              ? "Choose an answer to get feedback."
              : selectedAnswer === activeTerm.quiz.answer
                ? "Correct. You’ve got the key idea."
                : "Not quite. Review the simple explanation and try again."}
          </div>
        </div>

        <div className="guardrails-note">
          <div className="section-heading">Guardrails</div>
          <p>Answers use the selected source, stay educational, and show uncertainty when a term is not found.</p>
        </div>

        <div className="badge-stack">
          <div className="badge-pill violet">Fast learner</div>
          <div className="badge-pill mint">Fact checker</div>
          <div className="badge-pill peach">Deep focus</div>
        </div>
      </aside>

      <div className="phone-row" aria-label="Mobile previews">
        <div className="phone-shell">
          <div className="phone-topbar">
            <span className="phone-dot" />
            <span className="phone-dot" />
            <span className="phone-dot" />
          </div>
          <div className="phone-card">
            <div className="phone-header">
              <span className="tiny-tag">AI coach</span>
              <span className="tiny-tag soft">AI Glossary</span>
            </div>
            <h4>{activeTerm.term}</h4>
            <p>{activeTerm.simple}</p>
            <div className="mobile-example-label">Mental model</div>
            <p>{activeTerm.mental_model}</p>
            <div className="progress-track">
              <span style={{ width: "78%" }} />
            </div>
          </div>
        </div>

        <div className="phone-shell">
          <div className="phone-topbar">
            <span className="phone-dot" />
            <span className="phone-dot" />
            <span className="phone-dot" />
          </div>
          <div className="phone-card">
            <div className="phone-header">
              <span className="tiny-tag">Progress</span>
            </div>
            <h4>Today</h4>
            <div className="mini-progress">
              <label>Recall</label>
              <div className="mini-track"><span style={{ width: "81%" }} /></div>
            </div>
            <div className="mini-progress">
              <label>Accuracy</label>
              <div className="mini-track"><span style={{ width: "72%" }} /></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
