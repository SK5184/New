import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import HRAnalytics from "./HRAnalytics";
import HRDashboard from "./HRDashboard";
import EmployeeMaster from "./EmployeeMaster";
import Recruitment from "./RecruitmentOnboarding";
import PersonnelFiles from "./PersonnelFiles";
import TrainingManagement from "./TrainingManagement";
import CompetencyManagement from "./CompetencyManagement";
import AuthorizationPrivileges from "./AuthorizationPrivileges";
import PerformanceManagement from "./PerformanceManagement";
import AttendanceLeave from "./AttendanceLeave";
import HealthSafety from "./HealthSafety";
import DocumentAcknowledgement from "./DocumentAcknowledgement";
import ReportsAnalytics from "./ReportsAnalytics";
import ContinuingEducation from "./ContinuingEducation";
import CorrectiveActionsStaff from "./CorrectiveActionsStaff";
import ISO15189ComplianceRecords from "./ISO15189ComplianceRecords";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 230, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 8, padding: "7.5px 16px", cursor: "pointer", fontSize: 12.5,
    color: active ? "#0F6E56" : "#5F5E5A",
    background: active ? "#E1F5EE" : "transparent",
    borderLeft: active ? "3.5px solid #0F6E56" : "3.5px solid transparent",
    fontWeight: active ? 500 : 400,
    transition: "all 0.1s ease"
  }),
  sectionHeader: { padding: "10px 16px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B4B2A9" }
};

const MENU = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", icon: "📊", label: "HR Dashboard" },
      { key: "employees", icon: "👥", label: "Employee Master" },
      { key: "roster", icon: "📅", label: "Weekly Duty Roster" }
    ]
  },
  {
    label: "Operations",
    items: [
      { key: "recruitment", icon: "🤝", label: "Recruitment" },
      { key: "personnel", icon: "📁", label: "Personnel Files" },
      { key: "training", icon: "🎓", label: "Training Management" },
      { key: "education", icon: "📘", label: "Continuing Education" },
      { key: "competency", icon: "🎯", label: "Competency Review" },
      { key: "authorization", icon: "🔑", label: "Task Authorization" },
      { key: "performance", icon: "📈", label: "Performance Appraisals" }
    ]
  },
  {
    label: "Compliance & Safety",
    items: [
      { key: "attendance", icon: "📅", label: "Attendance & Leave" },
      { key: "health", icon: "🏥", label: "Health & Safety" },
      { key: "documents", icon: "📝", label: "Doc Acknowledgement" },
      { key: "corrective", icon: "🛠️", label: "Staff CAPA" },
      { key: "reports", icon: "📉", label: "Reports & Analytics" },
      { key: "compliance", icon: "🛡️", label: "ISO 15189 Records" },
      { key: "assessor_analytics", icon: "🔬", label: "NABL Assessor Analytics" }
    ]
  }
];

export default function HumanResourceDashboard() {
  const { name, role, dept } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hrFlags, setHrFlags] = useState({});
  const [loadingFlags, setLoadingFlags] = useState(true);

  useEffect(() => {
    async function loadFlags() {
      try {
        const snap = await getDoc(doc(db, "appSettings", "hrToggles"));
        if (snap.exists()) {
          setHrFlags(snap.data());
        }
      } catch (err) {
        console.warn("Failed to load HR toggles:", err);
      } finally {
        setLoadingFlags(false);
      }
    }
    loadFlags();
  }, []);

  const authProps = { role, userName: name, dept };

  const filteredMenu = MENU.map(section => {
    const allowedItems = section.items.filter(item => hrFlags[item.key] !== false);
    return { ...section, items: allowedItems };
  }).filter(section => section.items.length > 0);

  const renderContent = () => {
    if (loadingFlags) return <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "#888780" }}>Loading configurations...</div>;
    switch (activeTab) {
      case "dashboard":
        return <HRDashboard {...authProps} setActiveTab={setActiveTab} />;
      case "employees":
        return <EmployeeMaster {...authProps} />;
      case "roster":
        return <WeeklyDutyRoster department="Human Resource" role={role} userName={name} />;
      case "recruitment":
        return <Recruitment {...authProps} />;
      case "personnel":
        return <PersonnelFiles {...authProps} />;
      case "training":
        return <TrainingManagement {...authProps} />;
      case "education":
        return <ContinuingEducation {...authProps} />;
      case "competency":
        return <CompetencyManagement {...authProps} />;
      case "authorization":
        return <AuthorizationPrivileges {...authProps} />;
      case "performance":
        return <PerformanceManagement {...authProps} />;
      case "attendance":
        return <AttendanceLeave {...authProps} />;
      case "health":
        return <HealthSafety {...authProps} />;
      case "documents":
        return <DocumentAcknowledgement {...authProps} />;
      case "corrective":
        return <CorrectiveActionsStaff {...authProps} />;
      case "reports":
        return <ReportsAnalytics {...authProps} />;
      case "compliance":
        return <ISO15189ComplianceRecords {...authProps} />;
      case "assessor_analytics":
        return <HRAnalytics {...authProps} />;
      default:
        return <HRDashboard {...authProps} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div style={S.wrap}>
      {/* Local Department Navigation Sidebar */}
      <div style={S.sidebar}>
        {/* Module Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "#0F6E56", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>🧑‍💼</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>HR Department</div>
              <div style={{ fontSize: 10, color: "#888780" }}>ISO 15189:2022 §6.2</div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, padding: "8px 0" }}>
          {filteredMenu.map(section => (
            <div key={section.label} style={{ marginBottom: 12 }}>
              <div style={S.sectionHeader}>{section.label}</div>
              {section.items.map(item => {
                const active = activeTab === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    style={S.navItem(active)}
                    onMouseOver={e => { if (!active) e.currentTarget.style.background = "#F7F6F2"; }}
                    onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Main View Area */}
      <div style={S.content}>
        {renderContent()}
      </div>
    </div>
  );
}