// PhlebotomyDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Phlebotomy Dashboard
// Reusable Weekly Duty Roster Integrated

import { useState } from "react";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 260, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#065F46" : "#5F5E5A",
    background: active ? "#ECFDF5" : "transparent",
    borderLeft: active ? "4px solid #10B981" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B4B2A9" }
};

export default function PhlebotomyDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("roster");

  return (
    <div style={S.wrap}>
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>Phlebotomy</div>
          <div style={{ fontSize: 9.5, color: "#10B981", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
        </div>
        <div style={S.sectionHeader}>General & Personnel</div>
        <div style={S.navItem(activeTab === "roster")} onClick={() => setActiveTab("roster")}>
          <span>📅</span> <span>Weekly Duty Roster</span>
        </div>
        <div style={S.sectionHeader}>Equipment & Logs</div>
        <div style={S.navItem(activeTab === "phleb_temp_monitoring")} onClick={() => setActiveTab("phleb_temp_monitoring")}>
          <span>🌡️</span> <span>Temperature & Humidity Monitoring</span>
        </div>
      </div>
      <div style={S.content}>
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Phlebotomy" role={role} userName={userName} />
        )}
        {activeTab === "phleb_temp_monitoring" && (
          <TemperatureDashboard department="Phlebotomy" />
        )}
      </div>
    </div>
  );
}
