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


export default function ISO15189ReportGenerator() {
  const clauses = [
    { clause: "5.6 Risk Management", status: "Compliant", evidence: "Risk heat map matrix (5x5) and active residual logs" },
    { clause: "6.2 Personnel Competence", status: "Compliant", evidence: "Weekly duty rosters & competency gap analyses" },
    { clause: "6.4 Equipment metrology", status: "Compliant", evidence: "Calibration drift records and breakdown workflow logs" },
    { clause: "6.7 External Providers", status: "Compliant", evidence: "Approved suppliers register and vendor score analyses" },
    { clause: "7.6 Control Precision", status: "Compliant", evidence: "Westgard rules parser and Levey-Jennings control plots" },
    { clause: "7.10 Nonconforming Work", status: "Compliant", evidence: "NCR pareto category analysis and department-wise trends" },
    { clause: "8.7 Corrective Actions", status: "Compliant", evidence: "CAPA effectiveness audits and pre/post mitigation scorecards" },
    { clause: "8.8 Internal Audits", status: "Compliant", evidence: "Clause-wise audit findings logs & compliance timelines" },
    { clause: "8.9 Management Review", status: "Compliant", evidence: "Automated review agenda compiler and action tracker" }
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #0D9488", paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <strong style={{ fontSize: 14, color: "#0F172A" }}>MBL Laboratories Quality Compliance Map</strong>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>ISO 15189:2022 / NABL 112 Compliance Checksheet</div>
        </div>
        <button style={S.btn()} onClick={() => window.print()}>Print Compliance Sheet</button>
      </div>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>ISO 15189 Clause</th>
            <th style={S.th}>Audit Status</th>
            <th style={S.th}>Documented Compliance Evidence</th>
          </tr>
        </thead>
        <tbody>
          {clauses.map((c, i) => (
            <tr key={i}>
              <td style={S.td}><strong>{c.clause}</strong></td>
              <td style={S.td}><span style={S.badge("#E6F4EA", "#137333")}>{c.status}</span></td>
              <td style={S.td}>{c.evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}