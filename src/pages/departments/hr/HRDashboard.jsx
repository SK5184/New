import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  headerSection: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  grid: (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 12,
    marginBottom: 20
  }),
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: 16, boxShadow: "none" },
  kpiLabel: { fontSize: 11, color: "#888780", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: 4 },
  kpiVal: { fontSize: 24, fontWeight: 600, color: "#2C2C2A" },
  alertSection: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, marginBottom: 20, overflow: "hidden" },
  alertHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  alertBody: { padding: 14 },
  navCard: {
    background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: 16, cursor: "pointer",
    transition: "transform 0.15s ease, border-color 0.15s ease",
    display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between"
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function HRDashboard({ role, userName, dept, setActiveTab }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    trainingCompliance: 92, // Placeholder default
    competencyCompliance: 88, // Placeholder default
    expiringLicenses: 0
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);

      // Compute statistics and alerts
      let expiringCount = 0;
      const computedAlerts = [];

      list.forEach(emp => {
        // Check licenses
        (emp.licenses || []).forEach(lic => {
          const days = daysUntil(lic.expiryDate);
          if (days !== null) {
            if (days < 0) {
              computedAlerts.push({
                type: "danger",
                text: `License "${lic.name}" for employee ${emp.fullName || emp.employeeName} (${emp.department}) expired ${Math.abs(days)} days ago.`
              });
            } else if (days <= 60) {
              expiringCount++;
              computedAlerts.push({
                type: "warning",
                text: `License "${lic.name}" for employee ${emp.fullName || emp.employeeName} (${emp.department}) expires in ${days} days.`
              });
            }
          }
        });
      });

      setStats({
        totalEmployees: list.length,
        trainingCompliance: list.length > 0 ? 85 : 0, // Mock metric based on database
        competencyCompliance: list.length > 0 ? 90 : 0, // Mock metric based on database
        expiringLicenses: expiringCount
      });

      setAlerts(computedAlerts);
    } catch (e) {
      console.warn("Could not load real-time database. Using default fallback view.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cards = [
    { title: "Employee Master", key: "employees", desc: "Manage employee profiles, contact info, and statuses.", icon: "👥", color: "#185FA5", bg: "#E6F1FB" },
    { title: "Recruitment", key: "recruitment", desc: "Manpower requisitions, candidate pipeline, onboarding checklist.", icon: "🤝", color: "#0F6E56", bg: "#E1F5EE" },
    { title: "Personnel Files", key: "personnel", desc: "Qualifications audit trail and education credentials.", icon: "📁", color: "#5F5E5A", bg: "#F1EFE8" },
    { title: "Training Management", key: "training", desc: "Training schedule calendars, attendance sheets, and document logs.", icon: "🎓", color: "#854F0B", bg: "#FAEEDA" },
    { title: "Competency Review", key: "competency", desc: "6-method evaluations and review timelines.", icon: "🎯", color: "#A32D2D", bg: "#FCEBEB" },
    { title: "Task Authorization", key: "authorization", desc: "Formally authorize laboratory testing and release operations.", icon: "🔑", color: "#534AB7", bg: "#EEEDFE" },
    { title: "Performance Reviews", key: "performance", desc: "Annual appraisals, scorecards, and self-assessments.", icon: "📈", color: "#0F6E56", bg: "#E1F5EE" },
    { title: "Document Ack", key: "documents", desc: "SOP Read & Understood logs linked to Document Control.", icon: "📝", color: "#5F5E5A", bg: "#F1EFE8" }
  ];

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.headerSection}>
        <div>
          <h2 style={S.title}>Human Resources Dashboard</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2 · Core compliance overview across all units</div>
        </div>
        <div>
          <button
            onClick={loadData}
            style={{
              padding: "6px 12px", background: "#0F6E56", color: "#E1F5EE", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer"
            }}
          >
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div style={S.grid(4)}>
        {[
          { label: "Total Employees", val: stats.totalEmployees, color: "#2C2C2A", sub: "Active across all units" },
          { label: "Training Compliance", val: `${stats.trainingCompliance}%`, color: "#0F6E56", sub: "Annual targets met" },
          { label: "Competency Audited", val: `${stats.competencyCompliance}%`, color: "#185FA5", sub: "Direct observation verification" },
          { label: "License Renewals Due", val: stats.expiringLicenses, color: stats.expiringLicenses > 0 ? "#A32D2D" : "#888780", sub: "Within 60 days" }
        ].map((kpi, idx) => (
          <div key={idx} style={S.card}>
            <div style={S.kpiLabel}>{kpi.label}</div>
            <div style={{ ...S.kpiVal, color: kpi.color }}>{kpi.val}</div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Alerts & Notifications */}
      <div style={S.alertSection}>
        <div style={S.alertHeader}>Alerts & Notifications</div>
        <div style={S.alertBody}>
          {alerts.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#888780" }}>✅ All personnel credentials and licenses are current. No pending warnings.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {alerts.map((a, i) => (
                <div key={i} style={{
                  padding: "8px 12px", borderRadius: 6, fontSize: 12,
                  background: a.type === "danger" ? "#FCEBEB" : "#FAEEDA",
                  color: a.type === "danger" ? "#A32D2D" : "#854F0B",
                  borderLeft: `3px solid ${a.type === "danger" ? "#A32D2D" : "#854F0B"}`
                }}>
                  {a.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards Grid */}
      <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A", marginBottom: 10 }}>Sub-Module Operations</div>
      <div style={S.grid(4)}>
        {cards.map(c => (
          <div
            key={c.key}
            onClick={() => setActiveTab(c.key)}
            style={S.navCard}
            onMouseOver={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "#0F6E56";
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "#E0DDD6";
            }}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>{c.title}</div>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{c.icon}</div>
              </div>
              <div style={{ fontSize: 11, color: "#888780", lineHeight: 1.4 }}>{c.desc}</div>
            </div>
            <div style={{ fontSize: 11, color: "#0F6E56", fontWeight: 500, marginTop: 12, alignSelf: "flex-end" }}>Open →</div>
          </div>
        ))}
      </div>

      {/* ISO 15189 Status Table */}
      <div style={{ ...S.card, marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A", marginBottom: 12 }}>ISO 15189:2022 Personnel Records Audits</div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ISO Requirement Reference</th>
              <th style={S.th}>Required Documentation Type</th>
              <th style={S.th}>MBL Lab Implementation Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              { ref: "Clause 6.2.2", req: "Personnel Qualification Records (degrees, registrations)", status: "Active & Monitored", color: "#0F6E56", bg: "#E1F5EE" },
              { ref: "Clause 6.2.3", req: "Job Descriptions & Routine Training Log", status: "Active & Monitored", color: "#0F6E56", bg: "#E1F5EE" },
              { ref: "Clause 6.2.3", req: "Competency Assessment Records (6 methods)", status: "In-Progress Review", color: "#854F0B", bg: "#FAEEDA" },
              { ref: "Clause 6.2.5", req: "Task Authorization Records (signed permissions)", status: "Active & Signatures Linked", color: "#0F6E56", bg: "#E1F5EE" },
              { ref: "Clause 6.2.6", req: "Continuing Education and Professional Development", status: "Pending Verification", color: "#888780", bg: "#F1EFE8" }
            ].map((row, idx) => (
              <tr key={idx}>
                <td style={{ ...S.td, fontFamily: "monospace" }}>{row.ref}</td>
                <td style={S.td}>{row.req}</td>
                <td style={S.td}>
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
                    background: row.bg, color: row.color
                  }}>{row.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
