import { useEffect, useRef, useState } from "react";
import { FaPaperPlane, FaRobot, FaTrash, FaUser } from "react-icons/fa";
import api from "../services/api";
import { todayDateKey } from "../utils/nutritionTracking";

const suggestions = [
  "What are some affordable vegetarian protein sources?",
  "How do protein, carbs, and fats differ?",
  "Suggest a balanced Indian breakfast.",
];

const welcomeMessage = {
  role: "assistant",
  text: "Hi! Ask me about nutrition, food groups, or everyday meal ideas. I can use your saved diet, allergy, restriction, and health-goal preferences when relevant.",
};

export default function NutritionChat() {
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const sendMessage = async (value) => {
    const message = value.trim();
    if (!message || sending) return;

    const history = messages.slice(-8).map(({ role, text }) => ({ role, text }));
    setMessages((current) => [...current, { role: "user", text: message }]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const response = await api.post("/chat", { message, history, trackingDate: todayDateKey() });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: response.data.reply },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  const startNewChat = () => {
    setMessages([welcomeMessage]);
    setInput("");
    setError("");
  };

  return (
    <div className="nutrition-chat">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Nutrition Chat</h2>
          <p className="text-muted mb-0">
            Clear, practical nutrition education tailored to your saved food preferences.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={startNewChat}
          disabled={sending || messages.length === 1}
        >
          <FaTrash className="me-2" aria-hidden="true" />
          New chat
        </button>
      </div>

      <section
        className="card-soft p-0 overflow-hidden"
        aria-label="Nutrition assistant conversation"
      >
        <div className="nutrition-chat-messages p-3 p-md-4" aria-live="polite">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`d-flex gap-2 mb-3 ${message.role === "user" ? "justify-content-end" : ""}`}
            >
              {message.role === "assistant" && (
                <span className="nutrition-chat-avatar assistant" aria-hidden="true">
                  <FaRobot />
                </span>
              )}
              <div
                className={`nutrition-chat-bubble ${message.role === "user" ? "user" : "assistant"}`}
              >
                <div className="small fw-semibold mb-1">
                  {message.role === "user" ? "You" : "NutriGuide"}
                </div>
                <div className="nutrition-chat-text">{message.text}</div>
              </div>
              {message.role === "user" && (
                <span className="nutrition-chat-avatar user" aria-hidden="true">
                  <FaUser />
                </span>
              )}
            </div>
          ))}
          {sending && (
            <div className="d-flex gap-2 mb-3" role="status" aria-label="Assistant is responding">
              <span className="nutrition-chat-avatar assistant" aria-hidden="true">
                <FaRobot />
              </span>
              <div className="nutrition-chat-bubble assistant text-muted">
                <span className="spinner-border spinner-border-sm me-2" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <div className="alert alert-danger mx-3 mb-3" role="alert">
            {error}
          </div>
        )}

        <form className="border-top p-3" onSubmit={handleSubmit}>
          <label className="visually-hidden" htmlFor="nutrition-chat-input">
            Your nutrition question
          </label>
          <div className="d-flex align-items-end gap-2">
            <textarea
              id="nutrition-chat-input"
              className="form-control"
              rows="2"
              maxLength="1500"
              placeholder="Ask a nutrition question..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(event);
                }
              }}
              disabled={sending}
            />
            <button
              type="submit"
              className="btn btn-primary"
              aria-label="Send message"
              disabled={sending || !input.trim()}
            >
              <FaPaperPlane aria-hidden="true" />
            </button>
          </div>
          <div className="form-text text-end">Enter to send | Shift+Enter for a new line</div>
        </form>
      </section>

      {messages.length === 1 && (
        <div className="d-flex flex-wrap gap-2 mt-3" aria-label="Suggested questions">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => sendMessage(suggestion)}
              disabled={sending}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
