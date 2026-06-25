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


export default function PurchaseStoreReports() {
  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>ISO 15189 compliance KPI Reports (REP/19)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §8.9 · Monthly management review performance metrics</div>
        </div>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Supplier Compliance Rate</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0", color: "#10B981" }}>98.5%</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Target &gt;95% · Compliant with SOP/PUR/02</div>
        </div>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Temp Excursion Events</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0", color: "#EF4444" }}>0</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>All store fridges within limits (2-8°C)</div>
        </div>
        <div style={S.card}>
          <strong style={{ fontSize: 13, color: "#64748B" }}>Stockout Rate (Critical Items)</strong>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0", color: "#10B981" }}>0%</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>Continuous supply of essential CBC reagents</div>
        </div>
      </div>

      <div style={S.card}>
        <h4 style={{ margin: "0 0 16px" }}>Monthly Quality Indicator Summary Table</h4>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Quality Indicator</th>
              <th style={S.th}>April 2026</th>
              <th style={S.th}>May 2026</th>
              <th style={S.th}>June 2026</th>
              <th style={S.th}>Target Limit</th>
              <th style={S.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={S.td}>Percentage of delayed supplier shipments</td>
              <td style={S.td}>1.2%</td>
              <td style={S.td}>0.8%</td>
              <td style={S.td}>1.5%</td>
              <td style={S.td}>&lt; 5.0%</td>
              <td style={S.td}><span style={S.badge("#E6F4EA", "#137333")}>Met</span></td>
            </tr>
            <tr>
              <td style={S.td}>Percentage of material rejection at entry gate</td>
              <td style={S.td}>0%</td>
              <td style={S.td}>2.1%</td>
              <td style={S.td}>0%</td>
              <td style={S.td}>&lt; 3.0%</td>
              <td style={S.td}><span style={S.badge("#E6F4EA", "#137333")}>Met</span></td>
            </tr>
            <tr>
              <td style={S.td}>Calibration compliance frequency</td>
              <td style={S.td}>100%</td>
              <td style={S.td}>100%</td>
              <td style={S.td}>100%</td>
              <td style={S.td}>100%</td>
              <td style={S.td}><span style={S.badge("#E6F4EA", "#137333")}>Met</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}