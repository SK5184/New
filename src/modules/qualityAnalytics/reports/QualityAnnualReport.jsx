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


export default function QualityAnnualReport() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid #0D9488", paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <strong style={{ fontSize: 14, color: "#0F172A" }}>Annual Quality System Performance Review</strong>
          <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Annual continual improvement audit report</div>
        </div>
        <button style={S.btn()} onClick={() => window.print()}>Print Annual Report</button>
      </div>

      <div style={{ marginTop: 14 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#0F172A" }}>Executive Summary</h4>
        <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>
          Over the past 12 months, MBL Laboratories has executed its Quality System in full compliance with ISO 15189:2022 guidelines. Pre-examination sample rejections remained below the 1.0% limit, and overall patient Turnaround Time compliance averaged 95.5%. Internal audits were successfully completed across all 30 departments, and the Management Review agenda was executed.
        </p>
      </div>
    </div>
  );
}