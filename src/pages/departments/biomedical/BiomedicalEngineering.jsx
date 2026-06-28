import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import BreakdownWorkflow from "../../BreakdownWorkflow";
import EquipmentSelection from "./EquipmentSelection";
import EquipmentVerification from "./EquipmentVerification";
import EquipmentValidation from "./EquipmentValidation";
import EquipmentCalibration from "./EquipmentCalibration";
import EquipmentManuals from "./EquipmentManuals";
import EquipmentTraining from "./EquipmentTraining";
import PreventiveMaintenance from "./PreventiveMaintenance";
import EquipmentDecommission from "./EquipmentDecommission";
import EquipmentRecords from "./EquipmentRecords";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";

const TABS = [
  { key: "breakdown", label: "Breakdown Dashboard", icon: "⚠" },
  { key: "selection", label: "Equipment Selection", icon: "🔍" },
  { key: "verification", label: "Verification IQ/OQ/PQ", icon: "✅" },
  { key: "validation", label: "Validation", icon: "📋" },
  { key: "calibration", label: "Calibration", icon: "⚖" },
  { key: "temp_master", label: "Environmental & Temp Master", icon: "🌡️" },
  { key: "manuals", label: "IFUs & Manuals", icon: "📖" },
  { key: "training", label: "Training & Auth", icon: "🎓" },
  { key: "preventive", label: "Preventive Maint.", icon: "🔧" },
  { key: "decommission", label: "Decommission/Recall", icon: "🚫" },
  { key: "records", label: "Equipment Records", icon: "🗂" },
  { key: "roster", label: "Weekly Duty Roster", icon: "📅" }
];

export default function BiomedicalEngineering({ role, userName }) {
  const [activeTab, setActiveTab] = useState("breakdown");
  const [openCount, setOpenCount] = useState(0);

  // Load open breakdown count for badge
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "actionRequests"),
            where("addressedDepartment", "==", "Biomedical"),
            where("status", "==", "Open"))
        );
        setOpenCount(snap.size);
      } catch (e) {
        console.warn("Could not fetch action requests count from Firestore.", e);
      }
    };
    load();
  }, []);

  const renderContent = () => {
    const props = { role, userName };
    switch (activeTab) {
      case "breakdown":
        return <BreakdownWorkflow dept="Biomedical Engineering" role={role || "BME"} userName={userName || ""} />;
      case "selection":
        return <EquipmentSelection {...props} />;
      case "verification":
        return <EquipmentVerification {...props} />;
      case "validation":
        return <EquipmentValidation {...props} />;
      case "calibration":
        return <EquipmentCalibration {...props} />;
      case "temp_master":
        return <TemperatureDashboard department={null} />;
      case "manuals":
        return <EquipmentManuals {...props} />;
      case "training":
        return <EquipmentTraining {...props} />;
      case "preventive":
        return <PreventiveMaintenance {...props} />;
      case "decommission":
        return <EquipmentDecommission {...props} />;
      case "records":
        return <EquipmentRecords {...props} />;
      case "roster":
        return <WeeklyDutyRoster department="Biomedical Engineering" role={role} userName={userName} />;
      default:
        return <BreakdownWorkflow dept="Biomedical Engineering" role={role || "BME"} userName={userName || ""} />;
    }
  };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={{
        background: "#fff", borderBottom: "0.5px solid #E0DDD6",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: "#854F0B",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#FAEEDA", fontSize: 16,
        }}>⚙</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>
            Biomedical Engineering
          </div>
          <div style={{ fontSize: 11, color: "#888780" }}>
            ISO 15189:2022 §6.4 · Equipment management
          </div>
        </div>
        {openCount > 0 && (
          <span style={{
            marginLeft: "auto", fontSize: 11, padding: "4px 12px",
            borderRadius: 20, background: "#FCEBEB", color: "#A32D2D",
            border: "0.5px solid #E24B4A", fontWeight: 500,
          }}>
            ⚠ {openCount} open breakdown{openCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Tabs — scrollable */}
      <div style={{
        background: "#fff", borderBottom: "0.5px solid #E0DDD6",
        padding: "0 20px", display: "flex", overflowX: "auto",
        gap: 0, WebkitOverflowScrolling: "touch",
      }}>
        {TABS.map(t => {
          const active = activeTab === t.key;
          return (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "9px 14px", fontSize: 12, whiteSpace: "nowrap",
                fontWeight: active ? 500 : 400,
                color: active ? "#0F6E56" : "#888780",
                cursor: "pointer", background: "none", border: "none",
                borderBottom: active ? "2px solid #0F6E56" : "2px solid transparent",
                display: "flex", alignItems: "center", gap: 5,
                position: "relative",
              }}>
              <span>{t.icon}</span>
              {t.label}
              {t.key === "breakdown" && openCount > 0 && (
                <span style={{
                  fontSize: 9, padding: "1px 5px", borderRadius: 10,
                  background: "#FCEBEB", color: "#A32D2D", fontWeight: 600,
                }}>{openCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}