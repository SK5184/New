// QualityDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Quality Control Cockpit
// Only accessible to Quality HOD, Quality Managers, Quality Executives, MD, and ERP Admin

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import SampleRejectionDashboard from "../SampleRejection/SampleRejectionDashboard";
import RetentionDashboard from "../../quality/RetentionDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F2FAF7", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #A7F3D0", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#065F46" : "#4B5563",
    background: active ? "#D1FAE5" : "transparent",
    borderLeft: active ? "4px solid #059669" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#34D399" },
  card: { background: "#fff", border: "0.5px solid #A7F3D0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(5, 150, 105, 0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #A7F3D0", background: "#E6FDF5", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#065F46" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #34D399", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#065F46", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#059669", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.2s ease"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #A7F3D0", color: "#065F46", fontWeight: 500, textAlign: "left", background: "#E6FDF5" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #D1FAE5", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#065F46", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Staff" },
  { key: "auth_matrix", label: "Authorization Matrix", icon: "🔑", cat: "General & Staff" },

  { key: "capa_summary", label: "CAPA Control Center", icon: "🛡️", cat: "Quality Compliance" },
  { key: "audit_summary", label: "Audit Schedule Logs", icon: "📋", cat: "Quality Compliance" },
  { key: "ncr_summary", label: "Non-Conformances (NCR)", icon: "⚠️", cat: "Quality Compliance" },
  { key: "sample_rejection_mgmt", label: "Sample Rejection Master", icon: "❌", cat: "Quality Compliance" },
  { key: "sample_retention_control", label: "Sample Retention Master", icon: "🗑️", cat: "Quality Compliance" },
  
  { key: "doc_control", label: "Document Approvals", icon: "📄", cat: "Standard Documents" },
  { key: "complaints_feedback", label: "Feedback & Complaints", icon: "🗣️", cat: "Standard Documents" }
];

export default function QualityDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Weekly Date State
  

  // State hooks for summaries
  const [capas, setCapas] = useState([]);
  const [audits, setAudits] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [docsList, setDocsList] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);

  // Forms
  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
  });

  // KPI highlights
  const [qcMetrics, setQcMetrics] = useState({
    pendingCapa: 0,
    openNcr: 0,
    docUnderReview: 0,
    auditFindingCount: 0
  });

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      // Feature toggles
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());

      // HR Employees
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Fetch CAPAs
      const capaSnap = await getDocs(collection(db, "capa"));
      const capaData = capaSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCapas(capaData);

      // Fetch NCRs
      const ncrSnap = await getDocs(collection(db, "ncr"));
      const ncrData = ncrSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNcrs(ncrData);

      // Mock lists for audits, doc controls, and complaints
      setAudits([
        { id: "AUD-102", type: "Internal Audit", dept: "Microbiology", date: "2026-06-15", auditor: "Dr. Anita Roy", findings: "1 minor (temperature log gap)", status: "Completed" },
        { id: "AUD-103", type: "External NABL Audit", dept: "All Labs", date: "2026-07-10", auditor: "Dr. N. K. Sharma", findings: "Pending", status: "Scheduled" },
        { id: "AUD-104", type: "InfoSec ISO 27001", dept: "Information Technology", date: "2026-06-16", auditor: "S. Rajan", findings: "0 findings", status: "Completed" }
      ]);

      setDocsList([
        { code: "SOP-BIO-012", title: "Lot-to-Lot Reagent Verification", ver: "2.1", dept: "Biochemistry", status: "Approved", owner: "HOD Biochemistry" },
        { code: "SOP-IT-004", title: "Offsite Backup Encryption Protocol", ver: "1.0", dept: "Information Technology", status: "Under Review", owner: "IT Manager" },
        { code: "POL-QMS-001", title: "MBL Laboratory Quality Manual", ver: "4.0", dept: "Quality", status: "Approved", owner: "Quality HOD" }
      ]);

      setFeedbacks([
        { date: "2026-06-17", patient: "Rajesh G.", source: "Front Office Desk", score: "5/5", notes: "Quick collection response." },
        { date: "2026-06-16", patient: "Nisha Patel", source: "Call Centre", score: "3/5", notes: "Report delay on special test." },
        { date: "2026-06-17", patient: "Amit Verma", source: "Online Portal", score: "4/5", notes: "Good LIMS tracking." }
      ]);

      // Calculate simple counts
      setQcMetrics({
        pendingCapa: capaData.filter(c => c.status === "Open").length,
        openNcr: ncrData.filter(n => n.status === "Open").length,
        docUnderReview: 1, // mock
        auditFindingCount: 1 // mock
      });

    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabRecords = useCallback(async () => {
    try {
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Quality"), where("featureKey", "==", `quality_${activeTab}`), orderBy("createdAt", "desc")));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (e) {
      console.warn(e);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTabRecords();
  }, [loadTabRecords]);

  // Save Roster
  ;

  // Submit Generic Log Entry
  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Quality",
        featureKey: `quality_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Quality Team",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: genericForm.inspector,
          val: genericForm.val,
          status: genericForm.status,
          remarks: genericForm.remarks
        }
      });
      alert("Verification record successfully saved.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`quality_${item.key}`] !== false);
  const categories = ["General & Staff", "Quality Compliance", "Standard Documents"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #A7F3D0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>Quality Operations</div>
          <div style={{ fontSize: 9.5, color: "#059669", marginTop: 2, fontWeight: 500 }}>ISO 15189 compliance Center</div>
        </div>
        {categories.map(cat => {
          const items = visibleItems.filter(i => i.cat === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div style={S.sectionHeader}>{cat}</div>
              {items.map(item => (
                <div
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setLogs([]); }}
                  style={S.navItem(activeTab === item.key)}
                >
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Main Work Area */}
      <div style={S.content}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#065F46", fontSize: 13 }}>Loading Quality configurations...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#065F46", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Quality Department Console"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#4B5563" }}>
                  Active Module: ISO 15189 Quality Management System | Coordinator: {userName || "Quality Manager"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#D1FAE5", borderRadius: 8, border: "0.5px solid #A7F3D0", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#065F46" }}>ISO 15189 & 27001 Active</span>
              </div>
            </div>

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Quality" role={role} userName={userName} />
        )}

            {/* Authorization Matrix */}
            {activeTab === "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Responsibility & Authorization Matrix</div></div>
                <div style={S.cardBody}>
                  <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#4B5563" }}>
                    Quality department staff authorization rules under ISO 15189:2022.
                  </p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Role / Category</th>
                        <th style={S.th}>Authorized Duties</th>
                        <th style={S.th}>Access Level</th>
                        <th style={S.th}>Audit Requirements</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={S.td}><strong>Quality Manager</strong></td>
                        <td style={S.td}>Approve SOP documents, sign-off on MRM minutes, close CAPAs, audit scheduling</td>
                        <td style={S.td}>Approve & Sign</td>
                        <td style={S.td}>Quarterly review</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>Quality Executive</strong></td>
                        <td style={S.td}>Draft SOP documents, log NCR investigations, check temperature/checklists exceptions</td>
                        <td style={S.td}>Write & Verify logs</td>
                        <td style={S.td}>Weekly check-off</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CAPA Control Center */}
            {activeTab === "capa_summary" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Central Corrective & Preventive Actions (CAPA) Register</div></div>
                <div style={S.cardBody}>
                  <div style={S.grid(3)}>
                    <div style={{ background: "#E6FDF5", padding: 12, borderRadius: 8, border: "0.5px solid #A7F3D0" }}>
                      <span style={{ fontSize: 11, color: "#065F46" }}>Open CAPA Requests</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 4 }}>{qcMetrics.pendingCapa}</div>
                    </div>
                    <div style={{ background: "#E6FDF5", padding: 12, borderRadius: 8, border: "0.5px solid #A7F3D0" }}>
                      <span style={{ fontSize: 11, color: "#065F46" }}>Completed CAPAs</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 4 }}>{capas.filter(c => c.status === "Closed").length}</div>
                    </div>
                    <div style={{ background: "#E6FDF5", padding: 12, borderRadius: 8, border: "0.5px solid #A7F3D0" }}>
                      <span style={{ fontSize: 11, color: "#065F46" }}>Total Registered Actions</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#059669", marginTop: 4 }}>{capas.length}</div>
                    </div>
                  </div>

                  <table style={{ ...S.table, marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Source</th>
                        <th style={S.th}>Details / Action</th>
                        <th style={S.th}>Registered By</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capas.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#065F46" }}>No active CAPAs found.</td>
                        </tr>
                      ) : (
                        capas.map(capa => (
                          <tr key={capa.id}>
                            <td style={S.td}><strong>{capa.source}</strong></td>
                            <td style={S.td}>{capa.details}</td>
                            <td style={S.td}>{capa.createdBy}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: capa.status === "Open" ? "#FEE2E2" : "#D1FAE5",
                                color: capa.status === "Open" ? "#991B1B" : "#065F46"
                              }}>
                                {capa.status || "Open"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audit Schedules */}
            {activeTab === "audit_summary" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>ISO 15189 / NABL Audit Schedule</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Audit ID</th>
                        <th style={S.th}>Audit Category</th>
                        <th style={S.th}>Target Department</th>
                        <th style={S.th}>Auditor</th>
                        <th style={S.th}>Findings Identified</th>
                        <th style={S.th}>Schedule Date</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audits.map((a, idx) => (
                        <tr key={idx}>
                          <td style={S.td}><code>{a.id}</code></td>
                          <td style={S.td}><strong>{a.type}</strong></td>
                          <td style={S.td}>{a.dept}</td>
                          <td style={S.td}>{a.auditor}</td>
                          <td style={S.td}>{a.findings}</td>
                          <td style={S.td}>{a.date}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: a.status === "Completed" ? "#D1FAE5" : "#FEF3C7",
                              color: a.status === "Completed" ? "#065F46" : "#D97706"
                            }}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* NCR Summary */}
            {activeTab === "ncr_summary" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Non-Conformance Register (NCR)</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>NCR Description</th>
                        <th style={S.th}>Department</th>
                        <th style={S.th}>Action Required</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ncrs.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#065F46" }}>No registered non-conformances.</td>
                        </tr>
                      ) : (
                        ncrs.map(n => (
                          <tr key={n.id}>
                            <td style={S.td}><strong>{n.description || n.title}</strong></td>
                            <td style={S.td}>{n.department || "All"}</td>
                            <td style={S.td}>{n.actionProposed || "Pending review"}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: n.status === "Open" ? "#FEE2E2" : "#D1FAE5",
                                color: n.status === "Open" ? "#991B1B" : "#065F46"
                              }}>
                                {n.status || "Open"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Document Control Approvals */}
            {activeTab === "doc_control" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Standard Operating Procedure (SOP) Approvals</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Document Code</th>
                        <th style={S.th}>Title</th>
                        <th style={S.th}>Version</th>
                        <th style={S.th}>Department</th>
                        <th style={S.th}>Owner</th>
                        <th style={S.th}>Approval Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docsList.map((d, i) => (
                        <tr key={i}>
                          <td style={S.td}><code>{d.code}</code></td>
                          <td style={S.td}><strong>{d.title}</strong></td>
                          <td style={S.td}>{d.ver}</td>
                          <td style={S.td}>{d.dept}</td>
                          <td style={S.td}>{d.owner}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: d.status === "Approved" ? "#D1FAE5" : "#FEF3C7",
                              color: d.status === "Approved" ? "#065F46" : "#D97706"
                            }}>
                              {d.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Feedback and complaints */}
            {activeTab === "complaints_feedback" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Customer Feedback & Incident Logs</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Customer Name</th>
                        <th style={S.th}>Channel Source</th>
                        <th style={S.th}>Satisfaction Score</th>
                        <th style={S.th}>Observations / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((f, idx) => (
                        <tr key={idx}>
                          <td style={S.td}>{f.date}</td>
                          <td style={S.td}><strong>{f.patient}</strong></td>
                          <td style={S.td}>{f.source}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                              background: parseInt(f.score) >= 4 ? "#D1FAE5" : "#FEF3C7",
                              color: parseInt(f.score) >= 4 ? "#065F46" : "#D97706"
                            }}>
                              {f.score}
                            </span>
                          </td>
                          <td style={S.td}>{f.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "sample_rejection_mgmt" && (
              <SampleRejectionDashboard department={null} />
            )}

            {activeTab === "sample_retention_control" && (
              <RetentionDashboard />
            )}

            {/* Generic log submission form */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && activeTab !== "capa_summary" && activeTab !== "ncr_summary" && activeTab !== "doc_control" && activeTab !== "audit_summary" && activeTab !== "complaints_feedback" && activeTab !== "sample_rejection_mgmt" && activeTab !== "sample_retention_control" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Log Verification Entry</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericLogSubmit} style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Assigned Quality Officer</span>
                      <input type="text" required value={genericForm.inspector} onChange={(e) => setGenericForm({ ...genericForm, inspector: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Verification Details / Values</span>
                      <input type="text" required placeholder="e.g. Reviewed SOP indices" value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Status Compliance</span>
                      <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                        <option value="Pass">Pass / Compliant</option>
                        <option value="Fail">Fail / Action Needed</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <span style={S.label}>Remarks / Next Steps</span>
                      <input type="text" placeholder="Remarks" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 3", textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record Verification Log
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Verification log history table */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && activeTab !== "sample_rejection_mgmt" && activeTab !== "sample_retention_control" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Quality Audit Log History</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Quality Officer</th>
                        <th style={S.th}>Observation Details</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#065F46" }}>No interactive log runs saved for this section.</td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id}>
                            <td style={S.td}>{log.data?.date || log.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</td>
                            <td style={S.td}><strong>{log.data?.inspector || log.createdBy}</strong></td>
                            <td style={S.td}>{log.data?.val}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 600,
                                background: log.data?.status === "Pass" ? "#D1FAE5" : "#FEE2E2",
                                color: log.data?.status === "Pass" ? "#065F46" : "#981B1B"
                              }}>
                                {log.data?.status}
                              </span>
                            </td>
                            <td style={S.td}>{log.data?.remarks}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}