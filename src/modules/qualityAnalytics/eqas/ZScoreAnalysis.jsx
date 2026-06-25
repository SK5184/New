import React from "react";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh", color: "#1E293B" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 16, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 11, color: "#64748B", marginTop: 4 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 600, color: "#475569" },
  input: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0D9488", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s", outline: "none" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F8FAFC", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  isoBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E0F2FE", color: "#0369A1", border: "0.5px solid #7DD3FC", fontWeight: 500 }
};


export default function ZScoreAnalysis({ analyte }) {
  const scores = [
    { cycle: "Cycle 1", score: 0.2 },
    { cycle: "Cycle 2", score: -0.5 },
    { cycle: "Cycle 3", score: 1.1 },
    { cycle: "Cycle 4", score: -0.1 },
    { cycle: "Cycle 5", score: 0.8 }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>PT Survey Z-Score Historical Plot</h3>
      <p style={S.subtitle}>Target range: Z-score &lt; 2.0 (Acceptable)</p>

      <div style={{ marginTop: 20 }}>
        <svg viewBox="0 0 400 100" style={{ width: "100%", height: 100 }}>
          {/* Target range lines */}
          <line x1="30" y1="50" x2="370" y2="50" stroke="#0D9488" strokeWidth={1} />
          <line x1="30" y1="20" x2="370" y2="20" stroke="#F59E0B" strokeWidth={0.8} strokeDasharray="2,2" />
          <line x1="30" y1="80" x2="370" y2="80" stroke="#F59E0B" strokeWidth={0.8} strokeDasharray="2,2" />

          {scores.map((s, i) => {
            const x = 50 + i * 70;
            const y = 50 - s.score * 20;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r="4" fill="#0D9488" />
                <line x1={x} y1="50" x2={x} y2={y} stroke="#0D9488" strokeWidth={1.5} />
                <text x={x} y={y - 8} textAnchor="middle" fontSize="8" fill="#1E293B" fontWeight="bold">{s.score}</text>
                <text x={x} y="95" textAnchor="middle" fontSize="8" fill="#94A3B8">{s.cycle}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}