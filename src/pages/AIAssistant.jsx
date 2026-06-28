import { useState } from "react";

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello. I am the QMS AI Gowri. How can I help you today?"
    }
  ]);

  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      sender: "user",
      text: input
    };

    const aiMessage = {
      sender: "ai",
      text: "AI integration will be connected later."
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
      aiMessage
    ]);

    setInput("");
  };

  return (
    <div className="container-fluid p-4">
      <h2>QMS AI Gowri</h2>

      <div
        className="border rounded p-3 mb-3"
        style={{
          height: "500px",
          overflowY: "auto",
          background: "#f8f9fa"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-2 ${
              msg.sender === "user"
                ? "text-end"
                : "text-start"
            }`}
          >
            <span
              className={`badge ${
                msg.sender === "user"
                  ? "bg-primary"
                  : "bg-success"
              }`}
            >
              {msg.sender === "user"
                ? "You"
                : "AI"}
            </span>

            <div>{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="input-group">
        <input
          className="form-control"
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          placeholder="Ask the AI..."
        />

        <button
          className="btn btn-primary"
          onClick={handleSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}