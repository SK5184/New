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


export default function CalibrationAnalysis() {
  const list = [
    { code: "EQ-B-042", name: "Cobas c311 Biochemistry Analyzer", due: "2026-06-24", drift: "Within limits", status: "Due soon" },
    { code: "EQ-H-002", name: "Sysmex XN-1000 CBC Analyzer", due: "2026-07-15", drift: "0.2% drift", status: "Calibrated" }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>Equipment Calibration Timeline & Drift</h3>
      <p style={S.subtitle}>Ensuring metrological traceability under ISO 15189 §6.4.2</p>

      <table style={{ ...S.table, marginTop: 14 }}>
        <thead>
          <tr>
            <th style={S.th}>Equipment ID</th>
            <th style={S.th}>Analyzer Name</th>
            <th style={S.th}>Calibration Due Date</th>
            <th style={S.th}>Drift Audit</th>
            <th style={S.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {list.map((l, i) => (
            <tr key={i}>
              <td style={S.td}><code>{l.code}</code></td>
              <td style={S.td}><strong>{l.name}</strong></td>
              <td style={S.td}>{l.due}</td>
              <td style={S.td}>{l.drift}</td>
              <td style={S.td}>
                <span style={S.badge(l.status === "Calibrated" ? "#E6F4EA" : "#FFF3CD", l.status === "Calibrated" ? "#137333" : "#854F0B")}>
                  {l.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}