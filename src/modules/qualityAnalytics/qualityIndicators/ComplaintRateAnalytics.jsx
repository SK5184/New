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


export default function ComplaintRateAnalytics() {
  const complaints = [
    { month: "Jan", rate: 0.12 },
    { month: "Feb", rate: 0.08 },
    { month: "Mar", rate: 0.15 },
    { month: "Apr", rate: 0.05 },
    { month: "May", rate: 0.04 },
    { month: "Jun", rate: 0.02 }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>Monthly Customer Complaint Ratio (%)</h3>
      <p style={S.subtitle}>Percent of patient complaints relative to total sample throughput</p>

      <div style={{ marginTop: 20 }}>
        <svg viewBox="0 0 500 120" style={{ width: "100%", height: 100 }}>
          {complaints.map((c, i) => {
            const x = 50 + i * 80;
            const h = (c.rate / 0.2) * 80;
            const y = 90 - h;
            return (
              <g key={i}>
                <rect x={x - 12} y={y} width="24" height={h} fill="#0D9488" rx={4} />
                <text x={x} y={y - 6} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#0D9488">{c.rate}%</text>
                <text x={x} y="110" textAnchor="middle" fontSize="9" fill="#94A3B8">{c.month}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}