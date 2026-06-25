import { useState } from "react";
import PhlebotomyDashboard from "../phlebotomy/PhlebotomyDashboard";
import ReceptionDashboard from "../reception/ReceptionDashboard";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: {
    background: "#fff", borderBottom: "0.5px solid #E0DDD6",
    padding: "10px 20px", display: "flex", alignItems: "center", justifyItems: "center", gap: 14,
  },
  switcher: { display: "flex", background: "#F7F6F2", border: "0.5px solid #E0DDD6", borderRadius: 8, padding: 3, gap: 4 },
  switchBtn: (active) => ({
    padding: "6px 14px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500,
    background: active ? "#0F6E56" : "transparent",
    color: active ? "#fff" : "#5F5E5A",
    cursor: "pointer", transition: "all 0.15s ease"
  })
};

export default function SampleCollectionCenterDashboard({ role, userName }) {
  const [mode, setMode] = useState("phlebotomy"); // 'phlebotomy' | 'reception' | 'roster'

  return (
    <div style={S.wrap}>
      {/* Dynamic Top Switcher Bar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13 }}>🏥</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>Sample Collection Centre</div>
            <div style={{ fontSize: 10, color: "#888780" }}>ISO 15189:2022 §7.3 · Pre-examination Console</div>
          </div>
        </div>

        {/* View Selection Mode */}
        <div style={{ marginLeft: "auto" }}>
          <div style={S.switcher}>
            <button style={S.switchBtn(mode === "phlebotomy")} onClick={() => setMode("phlebotomy")}>💉 Phlebotomy Desk</button>
            <button style={S.switchBtn(mode === "reception")} onClick={() => setMode("reception")}>📞 Reception Desk</button>
            <button style={S.switchBtn(mode === "roster")} onClick={() => setMode("roster")}>📅 Center Roster</button>
          </div>
        </div>
      </div>

      {/* Render subcomponents based on selected mode */}
      <div>
        {mode === "phlebotomy" && (
          <PhlebotomyDashboard role={role} userName={userName} />
        )}
        {mode === "reception" && (
          <ReceptionDashboard role={role} userName={userName} />
        )}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Sample Collection Centre" role={role} userName={userName} />
        )}
      </div>
    </div>
  );
}