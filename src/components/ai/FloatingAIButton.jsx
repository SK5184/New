import { useNavigate } from "react-router-dom";

export default function FloatingAIButton() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/ai-assistant")}
      style={{
        position: "fixed",
        bottom: "25px",
        right: "25px",
        width: "65px",
        height: "65px",
        borderRadius: "50%",
        border: "none",
        background: "#1D9E75",
        color: "#fff",
        fontSize: "28px",
        cursor: "pointer",
        zIndex: 9999,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      }}
    >
      🤖
    </button>
  );
  
}
