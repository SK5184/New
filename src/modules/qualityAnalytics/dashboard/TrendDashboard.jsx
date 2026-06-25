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


export default function TrendDashboard() {
  const timeline = [
    { month: "Jan", score: 91.2 },
    { month: "Feb", score: 91.8 },
    { month: "Mar", score: 92.5 },
    { month: "Apr", score: 92.1 },
    { month: "May", score: 92.4 },
    { month: "Jun", score: 93.6 }
  ];

  const maxVal = 100;
  const minVal = 80;

  const points = timeline.map((t, idx) => {
    const x = 50 + idx * 80;
    const y = 140 - ((t.score - minVal) / (maxVal - minVal)) * 100;
    return { x, y, ...t };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  return (
    <div style={S.card}>
      <h3 style={S.title}>6-Month Quality Score Timeline</h3>
      <p style={S.subtitle}>Consolidated intelligence score trends</p>

      <div style={{ marginTop: 20 }}>
        <svg viewBox="0 0 500 180" style={{ width: "100%", height: 160 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = 40 + ratio * 100;
            const val = maxVal - ratio * (maxVal - minVal);
            return (
              <g key={i}>
                <line x1="40" y1={y} x2="460" y2={y} stroke="#F1F5F9" strokeWidth={1} />
                <text x="30" y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8">{val}%</text>
              </g>
            );
          })}

          {/* Line path */}
          <path d={pathD} fill="none" stroke="#0D9488" strokeWidth={2.5} />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="#0D9488" stroke="#FFF" strokeWidth={1.5} />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#0F172A">{p.score}%</text>
              <text x={p.x} y="160" textAnchor="middle" fontSize="9" fill="#94A3B8">{p.month}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}