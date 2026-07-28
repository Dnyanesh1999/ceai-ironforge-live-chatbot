import { useEffect, useRef, useState } from "react";
import MessageContent from "./MessageContent";

const STARTER_PROMPTS = [
  "Inspect IF-1702 and tell me if anything looks wrong.",
  "Which steel parts are available under €100?",
  "Find a lower-carbon production window for IF-1501.",
];

const API_BASE = (
  import.meta.env.VITE_API_BASE ||
  (location.hostname === "localhost"
    ? "http://localhost:3000"
    : "https://ceai-ironforge-live-chatbot.vercel.app")
).replace(/\/$/, "");

const INITIAL_MESSAGE = {
  role: "assistant",
  content:
    "Ask me about a part, price, lead time, material, availability, or a lower-carbon production window. I’ll check the live source when you ask.",
};

export default function ChatWorkspace({ onActivity, onReset, onSources }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const submit = async (event, directPrompt) => {
    event?.preventDefault();
    const value = String(directPrompt ?? input).trim();
    if (!value || loading) return;

    const nextMessages = [...messages, { role: "user", content: value }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);
    onActivity({
      status: "running",
      prompt: value,
      startedAt: new Date().toISOString(),
    });
    if (textAreaRef.current) textAreaRef.current.style.height = "auto";

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The live request could not be completed.");
      setMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
      onSources(payload.sources ?? []);
      onActivity({
        status: "complete",
        completedAt: new Date().toISOString(),
        sourceCount: payload.sources?.length ?? 0,
        tools: payload.toolCalls?.map((tool) => tool.name) ?? [],
      });
    } catch (requestError) {
      setError(requestError.message);
      onActivity({
        status: "error",
        completedAt: new Date().toISOString(),
        message: requestError.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  const resizeInput = (event) => {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
  };

  const resetConversation = () => {
    if (loading) return;
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setError("");
    setLoading(false);
    onReset();
    textAreaRef.current?.focus();
  };

  return (
    <section className="chat-workspace" id="assistant" aria-labelledby="assistant-title">
      <div className="chat-intro">
        <span className="section-index">01 / ASSISTANT</span>
        <h1 id="assistant-title">Ask ForgeLine</h1>
        <p>Live parts intelligence, grounded at the moment you ask.</p>
      </div>

      <div className="ai-disclosure">
        <span className="disclosure-mark">AI</span>
        <p>You’re speaking with an AI assistant. Live source data may contain errors.</p>
      </div>

      <div className="conversation" aria-live="polite">
        {messages.map((message, index) => (
          <article className={`message message-${message.role}`} key={`${message.role}-${index}`}>
            <div className="message-meta">
              <span>{message.role === "assistant" ? "FORGELINE" : "YOU"}</span>
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <MessageContent content={message.content} />
          </article>
        ))}

        {loading && (
          <article className="message message-assistant loading-message" aria-label="ForgeLine is checking live sources">
            <div className="message-meta"><span>FORGELINE</span><span>LIVE</span></div>
            <div className="typing">
              <span />
              <span />
              <span />
              <p>Checking live sources</p>
            </div>
          </article>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="starter-prompts" aria-label="Example questions">
          <span>START WITH A VERIFIED CHECK</span>
          {STARTER_PROMPTS.map((prompt, index) => (
            <button
              type="button"
              disabled={loading}
              onClick={(event) => submit(event, prompt)}
              key={prompt}
            >
              <span className="prompt-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="prompt-copy">{prompt}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="request-error" role="alert">
          <span>LIVE CHECK FAILED</span>
          <p>{error} No business value has been guessed or reused.</p>
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <div className="composer-head">
          <label htmlFor="message">Ask ForgeLine</label>
          {messages.length > 1 ? (
            <button
              className="session-reset"
              type="button"
              disabled={loading}
              onClick={resetConversation}
            >
              New check
            </button>
          ) : (
            <span>LIVE MCP</span>
          )}
        </div>
        <div className="composer-row">
          <span className="composer-glyph" aria-hidden="true">+</span>
          <textarea
            ref={textAreaRef}
            id="message"
            value={input}
            onChange={resizeInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about parts, stock, lead times or carbon intensity…"
            rows="1"
            disabled={loading}
            maxLength="4000"
          />
          <button
            className="send-button"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label={loading ? "Checking live sources" : "Send message"}
          >
            {loading ? (
              <span className="send-loader" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
        <div className="composer-note">
          <span>ENTER TO SEND · SHIFT + ENTER FOR A NEW LINE</span>
          <span>{input.length ? `${input.length} / 4000` : "LIVE DATA · NO CHAT STORAGE"}</span>
        </div>
      </form>
    </section>
  );
}
