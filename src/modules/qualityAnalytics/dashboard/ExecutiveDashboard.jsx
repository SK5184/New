import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import QualityKPIWidgets from "./QualityKPIWidgets";
import TrendDashboard from "./TrendDashboard";
import DashboardFilters from "./DashboardFilters";

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


export default function ExecutiveDashboard({ setTab }) {
  const [stats, setStats] = useState({
    qualityScore: 92.4,
    ncrCount: 0,
    capaCount: 0,
    auditFindings: 0,
    activeRisks: 0,
    complaintCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const ncrSnap = await getDocs(collection(db, "ncr"));
        const capaSnap = await getDocs(collection(db, "capa"));
        const complaintSnap = await getDocs(collection(db, "complaints"));
        setStats({
          qualityScore: 93.6,
          ncrCount: ncrSnap.size,
          capaCount: capaSnap.size,
          auditFindings: 3,
          activeRisks: 4,
          complaintCount: complaintSnap.size
        });
      } catch (e) {
        console.warn(e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Quality Intelligence Executive Dashboard</h2>
          <div style={S.subtitle}>ISO 15189:2022 Central Command Console & Compliance Overview</div>
        </div>
        <span style={S.isoBadge}>ISO 15189:2022 §8.9 Review Inputs</span>
      </div>

      <DashboardFilters />

      <div style={S.grid(4)}>
        <div style={S.card}>
          <div style={{ fontSize: 11, color: "#64748B" }}>Consolidated Quality Score</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0D9488", marginTop: 6 }}>{stats.qualityScore}%</div>
          <div style={{ fontSize: 10.5, color: "#10B981", marginTop: 4 }}>↑ 1.2% from last month</div>
        </div>
        <div style={S.card} onClick={() => setTab("ncr")} style={{ ...S.card, cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: "#64748B" }}>Active Non-Conformities (NCR)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#EF4444", marginTop: 6 }}>{stats.ncrCount}</div>
          <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 4 }}>ISO 15189 §7.10 register</div>
        </div>
        <div style={S.card} onClick={() => setTab("capa")} style={{ ...S.card, cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: "#64748B" }}>Corrective Action Plans (CAPA)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#F59E0B", marginTop: 6 }}>{stats.capaCount}</div>
          <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 4 }}>ISO 15189 §8.7 actions</div>
        </div>
        <div style={S.card} onClick={() => setTab("risk")} style={{ ...S.card, cursor: "pointer" }}>
          <div style={{ fontSize: 11, color: "#64748B" }}>Active Risk Matrices</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#6366F1", marginTop: 6 }}>{stats.activeRisks}</div>
          <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 4 }}>ISO 15189 §8.5 risk points</div>
        </div>
      </div>

      <div style={S.grid(2)}>
        <TrendDashboard />
        <QualityKPIWidgets />
      </div>
    </div>
  );
}