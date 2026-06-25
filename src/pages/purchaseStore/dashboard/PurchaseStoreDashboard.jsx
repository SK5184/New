import React from "react";

const S = {
  wrap: { padding: 20, fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh" },
  card: { background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 18, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 500, color: "#475569" },
  input: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0F6E56", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "opacity 0.2s" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F1F5F9", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  modal: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalContent: { background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }
};


export default function PurchaseStoreDashboard({ setTab }) {
  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Purchase & Store Command Dashboard</h2>
          <div style={S.subtitle}>ISO 15189:2022 Compliance Console · R/MBL/PUR</div>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Total Reagents Lot</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0" }}>14 Lots</div>
          <button style={{ ...S.btn("#EFF6FF", "#1E40AF"), padding: "4px 8px", fontSize: 11 }} onClick={() => setTab("reagents")}>View Register</button>
        </div>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Approved Suppliers</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0" }}>8 Registered</div>
          <button style={{ ...S.btn("#EFF6FF", "#1E40AF"), padding: "4px 8px", fontSize: 11 }} onClick={() => setTab("suppliers")}>View Register</button>
        </div>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Active Purchase Orders</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0" }}>5 Issued</div>
          <button style={{ ...S.btn("#EFF6FF", "#1E40AF"), padding: "4px 8px", fontSize: 11 }} onClick={() => setTab("pos")}>View Orders</button>
        </div>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Store temperature</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0", color: "#10B981" }}>4.2°C</div>
          <button style={{ ...S.btn("#EFF6FF", "#1E40AF"), padding: "4px 8px", fontSize: 11 }} onClick={() => setTab("temperature")}>View Temperature</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={S.card}>
          <h4 style={{ margin: "0 0 12px" }}>ISO 15189:2022 Quick Compliance Index</h4>
          <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "#475569" }}>
            <li><strong>§6.6.1:</strong> Suppliers Evaluation is active (SUP/02 annual evaluation).</li>
            <li><strong>§6.6.3:</strong> Incoming shipment verifications checklist enabled (MA/05 checklist).</li>
            <li><strong>§8.5:</strong> Order Cancellations mapped automatically to Risk Log register.</li>
            <li><strong>§6.5:</strong> Calibration standards and traceability certifications database linked.</li>
          </ul>
        </div>
        <div style={S.card}>
          <h4 style={{ margin: "0 0 12px" }}>Urgent Compliance Notifications</h4>
          <div style={{ padding: "8px 12px", background: "#FEF3C7", borderLeft: "4px solid #F59E0B", borderRadius: 4, fontSize: 12, marginBottom: 8, color: "#92400E" }}>
            ⚠️ <strong>Calibration due:</strong> Incubator cabinet #2 calibration expires in 12 days.
          </div>
          <div style={{ padding: "8px 12px", background: "#EFF6FF", borderLeft: "4px solid #3B82F6", borderRadius: 4, fontSize: 12, color: "#1E40AF" }}>
            ℹ️ <strong>Stock replenishment:</strong> 2 Consumables items have fallen below safety reorder level.
          </div>
        </div>
      </div>
    </div>
  );
}