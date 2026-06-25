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


export default function WestgardAnalysis({ analyte }) {
  const violations = [
    { date: "2026-06-18", rule: "1-3s", level: "Level 3", value: "106.2 mg/dL", status: "Closed (CAPA-2026-12)", action: "Recalibrated and rerun control." },
    { date: "2026-06-14", rule: "2-2s", level: "Level 1", value: "68.5 mg/dL", status: "Closed", action: "Replaced reagent cartridge." }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>Westgard Rules Violations & Troubleshooting</h3>
      <p style={S.subtitle}>Real-time compliance evaluations for {analyte}</p>
      
      <table style={{ ...S.table, marginTop: 14 }}>
        <thead>
          <tr>
            <th style={S.th}>Date</th>
            <th style={S.th}>Rule Violation</th>
            <th style={S.th}>Control Level</th>
            <th style={S.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {violations.map((v, i) => (
            <tr key={i}>
              <td style={S.td}>{v.date}</td>
              <td style={S.td}><strong style={{ color: "#EF4444" }}>{v.rule}</strong></td>
              <td style={S.td}>{v.level} ({v.value})</td>
              <td style={S.td}>
                <span style={S.badge("#E6F4EA", "#137333")}>{v.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}