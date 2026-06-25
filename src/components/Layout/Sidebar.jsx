// Sidebar.jsx  (updated — React Router aware)
// MBL QMS — Navigation sidebar
// Reads from AuthContext for role-based filtering
// Uses navigate prop from AppRoutes for URL-based routing

import { useAuth } from "../context/AuthContext";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", icon: "🏠", label: "Dashboard" },
    ],
  },
  {
    label: "Quality management",
    items: [
      { key: "kpi",             icon: "📊", label: "KPI dashboard" },
      { key: "ncr",             icon: "⚠",  label: "NCR / CAPA" },
      { key: "documents",       icon: "📄", label: "Document control" },
      { key: "audit",           icon: "📋", label: "Internal audit" },
      { key: "risk",            icon: "⚡", label: "Risk management" },
      { key: "changecontrol",   icon: "🔄", label: "Change control" },
      { key: "mrm",             icon: "🗂",  label: "Management review" },
      { key: "correctedreports",icon: "📝", label: "Corrected reports" },
    ],
  },
  {
    label: "Laboratory",
    items: [
      { key: "samples",     icon: "🧪", label: "Sample management" },
      { key: "iqc",         icon: "📈", label: "IQC / EQA" },
      { key: "temperature", icon: "🌡", label: "Temperature log" },
      { key: "inventory",   icon: "🧴", label: "Inventory" },
      { key: "collection",  icon: "🏥", label: "Collection centres" },
      { key: "reports",     icon: "📝", label: "Report errors" },
    ],
  },
  {
    label: "Departments",
    items: [
      { key: "flowcyto",    icon: "🔬", label: "Flow Cytometry" },
      { key: "microbiology",icon: "🦠", label: "Microbiology" },
      { key: "haematology", icon: "🩸", label: "Haematology" },
      { key: "biochemistry",icon: "⚗",  label: "Biochemistry" },
    ],
  },
  {
    label: "Equipment",
    items: [
      { key: "equipment",   icon: "⚙",  label: "Biomedical Eng." },
      { key: "breakdown",   icon: "⚠",  label: "Breakdown workflow" },
      { key: "equipmentlog",icon: "📋", label: "Equipment log" },
    ],
  },
  {
    label: "People",
    items: [
      { key: "training",    icon: "🎓", label: "Training & competency" },
      { key: "feedback",    icon: "👥", label: "Customer feedback" },
      { key: "complaints",  icon: "💬", label: "Complaints" },
      { key: "meetings",    icon: "📅", label: "Meetings / MOM" },
      { key: "vendors",     icon: "🚚", label: "Vendor management" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "users",        icon: "🔐", label: "User management" },
      { key: "amendment",    icon: "✏",  label: "Record amendments" },
      { key: "biosafety",    icon: "🦠", label: "Biosafety log" },
      { key: "suppliers",    icon: "🚚", label: "Supplier register" },
      { key: "masterdata",   icon: "🗄",  label: "Master data" },
      { key: "accesscontrol",icon: "🛡",  label: "Access control" },
    ],
  },
  {
    label: "ISO 27001",
    items: [
      { key: "assets",       icon: "🗄",  label: "Asset register" },
      { key: "infosec",      icon: "🔒", label: "Info sec policy" },
      { key: "secincidents", icon: "🚨", label: "Security incidents" },
      { key: "accesslog",    icon: "📜", label: "Access log" },
      { key: "dataretention",icon: "🗃",  label: "Data retention" },
    ],
  },
];

const ROLE_COLORS = {
  "Quality Manager":   { bg: "#E1F5EE", color: "#085041" },
  "HOD":               { bg: "#E6F1FB", color: "#0C447C" },
  "Admin":             { bg: "#EEEDFE", color: "#3C3489" },
  "Assistant Admin":   { bg: "#EEEDFE", color: "#534AB7" },
  "Managing Director": { bg: "#FCEBEB", color: "#791F1F" },
  "BME":               { bg: "#FAEEDA", color: "#633806" },
  "IT Manager":        { bg: "#F1EFE8", color: "#444441" },
};

export default function Sidebar({ activePage, setActivePage }) {
  const { canAccess, name, dept, role, logout, isSuperAdmin } = useAuth();

  const rc = ROLE_COLORS[role] || { bg: "#F1EFE8", color: "#5F5E5A" };

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: "#fff",
      borderRight: "0.5px solid #E0DDD6",
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
      overflow: "hidden",
    }}>

      {/* Logo */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "0.5px solid #E0DDD6",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: "#0A0F0D",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#1D9E75", flexShrink: 0,
        }}>M</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A", letterSpacing: "-0.01em" }}>
            MBL QMS
          </div>
          <div style={{ fontSize: 10, color: "#5DCAA5" }}>ISO 15189 : 2022</div>
        </div>
      </div>

      {/* User chip */}
      <div style={{
        padding: "10px 14px",
        borderBottom: "0.5px solid #E0DDD6",
        background: "#FAFAF8",
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A", marginBottom: 2 }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: "#888780", marginBottom: 6 }}>
          {dept}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 10,
            background: rc.bg, color: rc.color, fontWeight: 500,
          }}>
            {role}
          </span>
          {isSuperAdmin && (
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 10,
              background: "#EEEDFE", color: "#3C3489", fontWeight: 500,
            }}>
              Super admin
            </span>
          )}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {NAV_SECTIONS.map(section => {
          const allowed = section.items.filter(i => canAccess(i.key));
          if (allowed.length === 0) return null;
          return (
            <div key={section.label} style={{ marginBottom: 4 }}>
              <div style={{
                padding: "6px 16px 3px",
                fontSize: 10, fontWeight: 500,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: "#B4B2A9",
              }}>
                {section.label}
              </div>
              {allowed.map(item => {
                const active = activePage === item.key;
                return (
                  <div
                    key={item.key}
                    onClick={() => setActivePage(item.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "7px 16px",
                      cursor: "pointer", fontSize: 13,
                      color: active ? "#0F6E56" : "#5F5E5A",
                      background: active ? "#E1F5EE" : "transparent",
                      borderLeft: active ? "2px solid #0F6E56" : "2px solid transparent",
                      fontWeight: active ? 500 : 400,
                      transition: "all 0.1s",
                    }}
                    onMouseOver={e => { if (!active) e.currentTarget.style.background = "#F7F6F2"; }}
                    onMouseOut={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: "0.5px solid #E0DDD6", padding: "8px 0" }}>
        <div
          onClick={() => setActivePage("help")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 16px", cursor: "pointer",
            fontSize: 13, color: "#888780",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#F7F6F2"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>❓</span>
          Help
        </div>
        <div
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 16px", cursor: "pointer",
            fontSize: 13, color: "#A32D2D",
          }}
          onMouseOver={e => e.currentTarget.style.background = "#FFF5F5"}
          onMouseOut={e => e.currentTarget.style.background = "transparent"}
        >
          <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>🚪</span>
          Sign out
        </div>
      </div>

    </div>
  );
}
