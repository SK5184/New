import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import KPIEntry from "./KPIEntry";
import KPIAnalytics from "./KPIAnalytics";
import KPIMasterControl from "./KPIMasterControl";

const DEPARTMENTS = [
  "Microbiology",
  "Serology",
  "Histopathology & Cytopathology",
  "Flow Cytometry",
  "Cytogenetics",
  "Biochemistry",
  "Haematology",
  "Clinical Pathology",
  "Molecular Biology",
  "Molecular Genetics"
];

export default function QualityKPIView() {
  const { dept, role } = useAuth();

  // Roles permission check
  const isQM = role === "Quality Manager";
  const isQE = role === "Quality Executive";
  const isMD = role === "Managing Director" || role === "Deputy Director";
  const isERP = role === "Admin" || role === "Assistant Admin" || dept === "ERP Administration";

  const showAnalytics = isQM || isQE || isMD || isERP;
  const showMasterControl = isQM || isMD || isERP;

  // Tabs selection
  const [activeTab, setActiveTab] = useState(showAnalytics ? "analytics" : "entry");

  const S = {
    wrap: {
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: "#F7F6F2",
      minHeight: "100vh",
      padding: 0,
    },
    topbar: {
      background: "#fff",
      borderBottom: "0.5px solid #E0DDD6",
      padding: "12px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
    },
    logoIcon: {
      width: 32, height: 32, borderRadius: 8,
      background: "#0F6E56",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#E1F5EE", fontSize: 16, flexShrink: 0,
    },
    isoBadge: {
      fontSize: 11, padding: "3px 10px", borderRadius: 20,
      background: "#E1F5EE", color: "#085041",
      border: "0.5px solid #5DCAA5",
      fontWeight: 500
    },
    tabs: {
      background: "#fff",
      borderBottom: "0.5px solid #E0DDD6",
      padding: "0 20px",
      display: "flex",
      gap: 4
    },
    tab: (active) => ({
      padding: "12px 18px",
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      color: active ? "#0F6E56" : "#888780",
      cursor: "pointer",
      background: "none",
      border: "none",
      borderBottom: active ? "2.5px solid #0F6E56" : "2.5px solid transparent",
      outline: "none",
      transition: "all 0.15s ease"
    }),
    content: {
      padding: "16px 20px",
      maxWidth: 1200,
      margin: "0 auto"
    }
  };

  return (
    <div style={S.wrap}>
      {/* Top Banner */}
      <div style={S.topbar} className="no-print">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={S.logoIcon}>📊</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#2C2C2A" }}>
              Quality indicators Dashboard
            </div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>
              ISO 15189:2022 §7.5 – §7.8 &nbsp;·&nbsp; 15 indicators monitoring console
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={S.isoBadge}>ISO 15189 : 2022 Compliance</span>
        </div>
      </div>

      {/* Gated Tab Headers */}
      {showAnalytics && (
        <div style={S.tabs} className="no-print">
          <button
            style={S.tab(activeTab === "analytics")}
            onClick={() => setActiveTab("analytics")}
          >
            📊 Comparative Analytics
          </button>
          <button
            style={S.tab(activeTab === "entry")}
            onClick={() => setActiveTab("entry")}
          >
            📝 Monthly Data Entry
          </button>
          {showMasterControl && (
            <button
              style={S.tab(activeTab === "master")}
              onClick={() => setActiveTab("master")}
            >
              🛡️ Master Control Toggles
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div style={S.content}>
        {activeTab === "analytics" && showAnalytics && <KPIAnalytics />}
        {activeTab === "entry" && <KPIEntry />}
        {activeTab === "master" && showMasterControl && <KPIMasterControl />}
      </div>
    </div>
  );
}
