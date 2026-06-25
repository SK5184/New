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


export default function LeveyJenningsChart({ analyte }) {
  const controlData = [98, 101, 99, 100, 102, 97, 103, 105, 99, 101, 100, 98, 99, 101, 102];
  const mean = 100;
  const sd = 2;

  const maxVal = mean + 4 * sd;
  const minVal = mean - 4 * sd;

  const points = controlData.map((val, idx) => {
    const x = 50 + idx * 30;
    const y = 140 - ((val - minVal) / (maxVal - minVal)) * 100;
    return { x, y, val };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  return (
    <div style={S.card}>
      <h3 style={S.title}>Levey-Jennings Control Chart — {analyte} Level 2</h3>
      <p style={S.subtitle}>Consolidated control run data points relative to standard limits</p>

      <div style={{ marginTop: 20 }}>
        <svg viewBox="0 0 520 180" style={{ width: "100%", height: 160 }}>
          {/* Target / Mean line */}
          <line x1="40" y1="90" x2="490" y2="90" stroke="#0D9488" strokeWidth={1.5} />
          <text x="500" y="93" fontSize="9.5" fill="#0D9488" fontWeight="bold">Mean</text>

          {/* SD Grid Lines */}
          {[-3, -2, -1, 1, 2, 3].map((sVal) => {
            const val = mean + sVal * sd;
            const y = 90 - (sVal * 100) / 8;
            return (
              <g key={sVal}>
                <line x1="40" y1={y} x2="490" y2={y} stroke={Math.abs(sVal) >= 3 ? "#EF4444" : Math.abs(sVal) >= 2 ? "#F59E0B" : "#E2E8F0"} strokeWidth={1} strokeDasharray="3,3" />
                <text x="35" y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8">{sVal} SD</text>
              </g>
            );
          })}

          {/* Connected run line */}
          <path d={pathD} fill="none" stroke="#475569" strokeWidth={1.5} />

          {/* Control Run Points */}
          {points.map((p, i) => {
            const dev = Math.abs(p.val - mean) / sd;
            const ptColor = dev >= 3 ? "#EF4444" : dev >= 2 ? "#F59E0B" : "#475569";
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={dev >= 2 ? 5 : 3.5} fill={ptColor} stroke="#FFF" strokeWidth={1} />
                <text x={p.x} y="160" textAnchor="middle" fontSize="8" fill="#94A3B8">#{i + 1}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}