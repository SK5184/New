import React, { useState } from "react";
import ISO15189ReportGenerator from "./ISO15189ReportGenerator";
import QualityMonthlyReport from "./QualityMonthlyReport";
import QualityAnnualReport from "./QualityAnnualReport";
import { db } from "../../../firebase";
import { doc, setDoc } from "firebase/firestore";

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


export default function NABLReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState("monthly");

  const handleSeedData = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, "complaints", "COMP-2026-01"), {
        patient: "Vikram Malhotra",
        category: "TAT Delay",
        details: "Report delay on HbA1c test run.",
        status: "Resolved",
        createdAt: new Date()
      });
      await setDoc(doc(db, "ncr", "NCR-2026-01"), {
        description: "Incorrect sample volume received for Glucose test",
        department: "Biochemistry",
        actionProposed: "Re-train phlebotomy staff on volume markings",
        status: "Open",
        isoClause: "Clause 7.2",
        createdAt: new Date()
      });
      await setDoc(doc(db, "capa", "CAPA-2026-01"), {
        source: "NCR-2026-01",
        details: "Phlebotomist training completed on volume checks.",
        status: "Open",
        createdAt: new Date()
      });
      alert("Mock operational and compliance records successfully seeded!");
    } catch (err) {
      console.error(err);
      alert("Failed to seed mock data.");
    }
    setLoading(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>NABL Compliance & Quality Audit Report Generator</h2>
          <div style={S.subtitle}>Print-ready report sheets conforming to ISO 15189 compliance guidelines</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btn("#64748B", "#FFF")} onClick={handleSeedData} disabled={loading}>
            {loading ? "Seeding..." : "⚡ Seed Assessment Mock Data"}
          </button>
        </div>
      </div>

      <div style={{ ...S.card, padding: "12px 20px", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>Select Document Format:</span>
        <button style={S.btn(selectedReport === "monthly" ? "#0D9488" : "#F1F5F9", selectedReport === "monthly" ? "#FFF" : "#475569")} onClick={() => setSelectedReport("monthly")}>Monthly Quality Bulletin</button>
        <button style={S.btn(selectedReport === "annual" ? "#0D9488" : "#F1F5F9", selectedReport === "annual" ? "#FFF" : "#475569")} onClick={() => setSelectedReport("annual")}>Annual Quality Review</button>
        <button style={S.btn(selectedReport === "iso" ? "#0D9488" : "#F1F5F9", selectedReport === "iso" ? "#FFF" : "#475569")} onClick={() => setSelectedReport("iso")}>ISO 15189 Compliance Matrix</button>
      </div>

      <div style={S.card}>
        {selectedReport === "monthly" && <QualityMonthlyReport />}
        {selectedReport === "annual" && <QualityAnnualReport />}
        {selectedReport === "iso" && <ISO15189ReportGenerator />}
      </div>
    </div>
  );
}