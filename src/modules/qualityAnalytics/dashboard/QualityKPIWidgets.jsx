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


export default function QualityKPIWidgets() {
  const kpis = [
    { name: "Sample Rejection Rate", phase: "Pre-Analytical", val: "0.82%", limit: "≤ 1.0%", status: "compliant" },
    { name: "Turnaround Time (TAT) Breach", phase: "Post-Analytical", val: "4.5%", limit: "≤ 5.0%", status: "compliant" },
    { name: "Westgard IQC Violations", phase: "Analytical", val: "2 runs", limit: "0 runs", status: "warning" },
    { name: "Critical Result Notification", phase: "Post-Analytical", val: "98.5%", limit: "≥ 99.0%", status: "warning" },
    { name: "Incorrect Patient ID errors", phase: "Pre-Analytical", val: "0 cases", limit: "0 cases", status: "compliant" }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>Essential Quality Indicators (ISO 15189 §7.6)</h3>
      <p style={S.subtitle}>Consolidated phase-wise compliance stats</p>
      
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{k.name}</span>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Phase: {k.phase} · Limit: {k.limit}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.status === "compliant" ? "#0D9488" : "#F59E0B" }}>{k.val}</span>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", color: k.status === "compliant" ? "#0D9488" : "#D97706", marginTop: 2 }}>{k.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}