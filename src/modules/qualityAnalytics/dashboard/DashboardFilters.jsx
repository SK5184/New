import React, { useState } from "react";

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


export default function DashboardFilters() {
  const [dept, setDept] = useState("All Departments");
  const [range, setRange] = useState("Past 6 Months");

  return (
    <div style={{ ...S.card, padding: "12px 20px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>Filter Scope:</span>
        <select value={dept} onChange={(e) => setDept(e.target.value)} style={{ padding: "6px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFF", color: "#1E293B", outline: "none" }}>
          <option value="All Departments">All Departments</option>
          <option value="Microbiology">Microbiology</option>
          <option value="Biochemistry">Biochemistry</option>
          <option value="Haematology">Haematology</option>
          <option value="Serology">Serology</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "#64748B" }}>Time Frame:</span>
        <select value={range} onChange={(e) => setRange(e.target.value)} style={{ padding: "6px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFF", color: "#1E293B", outline: "none" }}>
          <option value="Current Month">Current Month</option>
          <option value="Past 3 Months">Past 3 Months</option>
          <option value="Past 6 Months">Past 6 Months</option>
          <option value="Current Year">Current Year</option>
        </select>
      </div>

      <button style={{ ...S.btn(), padding: "6px 14px", fontSize: 12, marginLeft: "auto" }} onClick={() => alert("Scope settings synchronized.")}>Apply Filter Scope</button>
    </div>
  );
}