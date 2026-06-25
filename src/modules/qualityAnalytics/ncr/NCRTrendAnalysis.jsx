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


export default function NCRTrendAnalysis() {
  const categories = [
    { label: "Sample Labeling", count: 18, pct: 45, cumPct: 45 },
    { label: "Transit Delay", count: 12, pct: 30, cumPct: 75 },
    { label: "IQC Outliers", count: 6, pct: 15, cumPct: 90 },
    { label: "Reporting Errors", count: 4, pct: 10, cumPct: 100 }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>Pareto Analysis (80/20 Rule)</h3>
      <p style={S.subtitle}>Focusing corrective efforts on the 20% key failure causes</p>

      <div style={{ marginTop: 20 }}>
        <svg viewBox="0 0 500 160" style={{ width: "100%", height: 140 }}>
          {categories.map((c, i) => {
            const x = 50 + i * 110;
            const h = (c.count / 20) * 100;
            const y = 120 - h;
            
            const lineY = 120 - (c.cumPct / 100) * 100;
            
            return (
              <g key={i}>
                <rect x={x - 20} y={y} width="40" height={h} fill="#0D9488" rx={4} />
                <text x={x} y={y - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0D9488">{c.count}</text>
                
                <circle cx={x} cy={lineY} r="4" fill="#EF4444" />
                {i > 0 && (
                  <line x1={50 + (i - 1) * 110} y1={120 - (categories[i-1].cumPct / 100) * 100} x2={x} y2={lineY} stroke="#EF4444" strokeWidth={1.5} />
                )}
                
                <text x={x} y="140" textAnchor="middle" fontSize="8.5" fill="#475569">{c.label}</text>
                <text x={x} y={lineY - 8} textAnchor="middle" fontSize="8" fill="#EF4444" fontWeight="bold">{c.cumPct}%</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}