// WorkHandover.jsx
// Centralized, department-independent QMS Pending Work Handover Module
// ISO 15189:2022 §6.2 & §7.2 Compliant
// Supports role-based handoffs, shift continuity, and auto-escalation to QMS Action Requests.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection, addDoc, getDocs, doc, setDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";

const DEPARTMENTS = [
  "Molecular Genetics",
  "Microbiology",
  "Serology",
  "Histopathology & Cytopathology",
  "Flow Cytometry",
  "Cytogenetics",
  "Biochemistry",
  "Haematology",
  "Clinical Pathology",
  "Molecular Biology",
  "Quality",
  "Human Resource",
  "Biomedical Engineering",
  "Purchase",
  "Maintenance",
  "Housekeeping",
  "Information Technology",
  "Kitchen",
  "Security",
  "Collection",
  "Front Office",
  "Back Office",
  "Sample Collection Centre",
  "Call Centre",
  "Accounts",
  "Administration",
  "Design",
  "Marketing"
];

const SHIFTS = ["Morning", "Evening", "Night"];
const HANDOVER_TYPES = ["Shift change", "Leave", "Emergency", "Other"];
const PRIORITIES = ["Low", "Medium", "High"];
const CATEGORIES = ["Routine", "Urgent", "Critical"];
const STATUS_WORKFLOW = ["Created", "Pending", "Assigned", "In Progress", "Completed", "Closed"];

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "24px 32px" },
  header: { marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 10 },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  metricCard: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { fontSize: 12, color: "#64748B", fontWeight: 500 },
  metricVal: { fontSize: 24, fontWeight: 700, color: "#0F172A", marginTop: 4 },
  tabBar: { display: "flex", gap: 16, borderBottom: "1px solid #E2E8F0", marginBottom: 20 },
  tabBtn: (active) => ({ padding: "10px 16px", background: "transparent", border: "none", borderBottom: active ? "3px solid #0D9488" : "3px solid transparent", color: active ? "#0D9488" : "#64748B", fontWeight: active ? 600 : 500, cursor: "pointer", transition: "all 0.15s ease" }),
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", fontSize: 12.5, zIndex: 2000, display: "flex", alignItems: "center", gap: 8 }
};

export default function WorkHandover() {
  const { name: currentUserName, dept: currentUserDept, role } = useAuth();
  const [activeTab, setActiveTab] = useState("department"); // "department" | "quality"
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState(currentUserDept || "Biochemistry");

  // Form State
  const [form, setForm] = useState({
    handoverID: "",
    department: currentUserDept || "Biochemistry",
    section: "",
    shift: "Morning",
    type: "Shift change",
    receivedBy: "",
    technicalDetails: {
      issueReason: "",
      actionsCompleted: "",
      remainingAction: "",
      expectedCompletion: "",
      specialInstructions: ""
    },
    sampleDetails: {
      sampleId: "",
      patientId: "",
      testName: "",
      sampleStatus: "Awaiting Approval",
      pendingReason: ""
    },
    equipmentDetails: {
      equipmentId: "",
      equipmentName: "",
      problemDescription: "",
      currentStatus: "Downtime",
      actionRequired: ""
    },
    pendingItems: []
  });

  // Pending item constructor temp states
  const [newItem, setNewItem] = useState({
    activity: "",
    category: "Routine",
    area: "Test",
    patientId: "",
    referenceNo: "",
    status: "Pending",
    priority: "Medium"
  });

  // Acknowledging modal state
  const [viewingHandover, setViewingHandover] = useState(null);
  const [ackName, setAckName] = useState(currentUserName || "");
  const [ackChecked, setAckChecked] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadHandovers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "pendingWorkHandovers"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHandovers(list);
    } catch (err) {
      console.error("Error loading handovers:", err);
      showToast("Failed to retrieve handover logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandovers();
  }, [loadHandovers]);

  // Generate unique ID on opening modal
  const openNewHandoverModal = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 900 + 100);
    setForm({
      handoverID: `HO-${todayStr}-${randomSuffix}`,
      department: currentUserDept && DEPARTMENTS.includes(currentUserDept) ? currentUserDept : "Biochemistry",
      section: "",
      shift: "Morning",
      type: "Shift change",
      receivedBy: "",
      technicalDetails: {
        issueReason: "",
        actionsCompleted: "",
        remainingAction: "",
        expectedCompletion: "",
        specialInstructions: ""
      },
      sampleDetails: {
        sampleId: "",
        patientId: "",
        testName: "",
        sampleStatus: "Awaiting Approval",
        pendingReason: ""
      },
      equipmentDetails: {
        equipmentId: "",
        equipmentName: "",
        problemDescription: "",
        currentStatus: "Downtime",
        actionRequired: ""
      },
      pendingItems: []
    });
    setShowModal(true);
  };

  const handleAddPendingItem = () => {
    if (!newItem.activity.trim()) return;
    const item = {
      id: `item_${Date.now()}`,
      ...newItem
    };
    setForm(prev => ({
      ...prev,
      pendingItems: [...prev.pendingItems, item]
    }));
    setNewItem({
      activity: "",
      category: "Routine",
      area: "Test",
      patientId: "",
      referenceNo: "",
      status: "Pending",
      priority: "Medium"
    });
  };

  const handleRemovePendingItem = (itemId) => {
    setForm(prev => ({
      ...prev,
      pendingItems: prev.pendingItems.filter(item => item.id !== itemId)
    }));
  };

  const isLabDepartment = (deptName) => {
    const labDepts = [
      "Biochemistry", "Haematology", "Microbiology", "Serology",
      "Histopathology & Cytopathology", "Flow Cytometry", "Cytogenetics",
      "Clinical Pathology", "Molecular Biology", "Molecular Genetics",
      "Sample Collection Centre", "Collection"
    ];
    return labDepts.includes(deptName);
  };

  const isTechnicalDepartment = (deptName) => {
    const techDepts = ["Biomedical Engineering", "Maintenance", "Information Technology", "Housekeeping"];
    return techDepts.includes(deptName);
  };

  const handleSaveHandover = async (e) => {
    e.preventDefault();
    if (form.pendingItems.length === 0) {
      alert("Please add at least one pending work item.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        createdBy: currentUserName || "System User",
        status: "Pending",
        createdAt: new Date().toISOString(),
        acceptance: {
          outgoing: {
            name: currentUserName || "System User",
            signedAt: new Date().toISOString()
          },
          incoming: null
        },
        auditTrail: [
          {
            user: currentUserName || "System User",
            action: "Handover Created & Published",
            timestamp: new Date().toISOString()
          }
        ]
      };

      await addDoc(collection(db, "pendingWorkHandovers"), payload);

      // Auto-escalation: for each Critical/Urgent pending item, create an Action Request
      for (const item of form.pendingItems) {
        if (item.category === "Critical" || item.category === "Urgent") {
          await addDoc(collection(db, "actionRequests"), {
            actionId: `ACT-${form.handoverID}-${item.id}`,
            source: `Work Handover (${form.department})`,
            actionRequired: `Escalated from Handover: ${item.activity}`,
            assignedTo: form.receivedBy || "Pending Assignment",
            priority: item.priority === "High" ? "Critical" : "High",
            targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // +24 hours
            status: "Open",
            createdAt: new Date().toISOString(),
            createdBy: currentUserName || "System User"
          });
        }
      }

      showToast("Handover successfully registered.");
      setShowModal(false);
      loadHandovers();
    } catch (err) {
      console.error(err);
      showToast("Failed to save handover.");
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledgeHandover = async () => {
    if (!ackChecked) {
      alert("Please check the acknowledgment box.");
      return;
    }
    setSaving(true);
    try {
      const hoRef = doc(db, "pendingWorkHandovers", viewingHandover.id);
      
      const newAuditLog = {
        user: ackName,
        action: "Handover Acknowledged & Received",
        timestamp: new Date().toISOString()
      };

      await updateDoc(hoRef, {
        status: "Assigned",
        "acceptance.incoming": {
          name: ackName,
          signedAt: new Date().toISOString(),
          acknowledged: true
        },
        auditTrail: [...viewingHandover.auditTrail, newAuditLog]
      });

      showToast("Handover acknowledged successfully.");
      setViewingHandover(null);
      setAckChecked(false);
      loadHandovers();
    } catch (err) {
      console.error(err);
      showToast("Failed to acknowledge handover.");
    } finally {
      setSaving(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return { bg: "#FEE2E2", fg: "#991B1B" };
      case "Medium": return { bg: "#FEF3C7", fg: "#92400E" };
      default: return { bg: "#F1F5F9", fg: "#475569" };
    }
  };

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Critical": return { bg: "#FEE2E2", fg: "#EF4444" };
      case "Urgent": return { bg: "#FEF3C7", fg: "#F59E0B" };
      default: return { bg: "#ECFDF5", fg: "#10B981" };
    }
  };

  // Filter Handovers for Department Dashboard
  const deptHandovers = handovers.filter(ho => ho.department === selectedDeptFilter);

  // Compute Metrics for the selected department
  const totalPending = deptHandovers.filter(ho => ho.status !== "Completed" && ho.status !== "Closed").length;
  const criticalCount = deptHandovers.reduce((acc, ho) => {
    if (ho.status === "Completed" || ho.status === "Closed") return acc;
    return acc + ho.pendingItems.filter(i => i.category === "Critical").length;
  }, 0);
  const highPriorityCount = deptHandovers.reduce((acc, ho) => {
    if (ho.status === "Completed" || ho.status === "Closed") return acc;
    return acc + ho.pendingItems.filter(i => i.priority === "High").length;
  }, 0);
  const completedToday = deptHandovers.filter(ho => {
    if (ho.status !== "Completed" && ho.status !== "Closed") return false;
    const doneDate = ho.acceptance.incoming?.signedAt || ho.createdAt;
    return new Date(doneDate).toDateString() === new Date().toDateString();
  }).length;
  const overdueCount = deptHandovers.filter(ho => {
    if (ho.status === "Completed" || ho.status === "Closed") return false;
    const ageHrs = (Date.now() - new Date(ho.createdAt).getTime()) / (1000 * 60 * 60);
    return ageHrs > 24;
  }).length;

  return (
    <div style={S.wrap}>
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>
            <span>🔄</span> Pending Work Handover Control Register
          </h1>
          <p style={S.subtitle}>ISO 15189:2022 §6.2.2 & §7.2 - Clinical Shift Continuity & Traceability Matrix</p>
        </div>
        <button style={S.btn("primary")} onClick={openNewHandoverModal}>
          ➕ Initiate Work Handover
        </button>
      </div>

      {/* Tab Switcher */}
      <div style={S.tabBar}>
        <button style={S.tabBtn(activeTab === "department")} onClick={() => setActiveTab("department")}>
          🏢 Department Operational Dashboard
        </button>
        {role && (role === "Quality Manager" || role === "HOD" || role === "Admin" || role === "Managing Director") && (
          <button style={S.tabBtn(activeTab === "quality")} onClick={() => setActiveTab("quality")}>
            🛡️ Quality Audits & Monitor Console
          </button>
        )}
      </div>

      {/* Tab 1: Department Dashboard */}
      {activeTab === "department" && (
        <div>
          {/* Filters and Department selection */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Active Department:</span>
              <select
                style={{ ...S.select, width: 220 }}
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Metrics */}
          <div style={S.grid(5)}>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Total Active Handovers</div>
                <div style={S.metricVal}>{totalPending}</div>
              </div>
              <span style={{ fontSize: 24 }}>📋</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Critical Pending Tasks</div>
                <div style={{ ...S.metricVal, color: "#EF4444" }}>{criticalCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>🚨</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>High Priority Tasks</div>
                <div style={{ ...S.metricVal, color: "#F59E0B" }}>{highPriorityCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>⚠️</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Acknowledged Today</div>
                <div style={{ ...S.metricVal, color: "#10B981" }}>{completedToday}</div>
              </div>
              <span style={{ fontSize: 24 }}>✅</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Overdue &gt;24 Hrs</div>
                <div style={{ ...S.metricVal, color: overdueCount > 0 ? "#EF4444" : "#0F172A" }}>{overdueCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>⏱️</span>
            </div>
          </div>

          {/* Handovers Table */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>📂 Active Handovers Log — {selectedDeptFilter}</div>
            </div>
            <div style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Retrieving logs...</div>
              ) : deptHandovers.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: "#64748B" }}>
                  <span style={{ fontSize: 40, display: "block", marginBottom: 12 }}>🔍</span>
                  No active handovers found for {selectedDeptFilter}.
                </div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Handover ID</th>
                      <th style={S.th}>Shift / Date</th>
                      <th style={S.th}>Prepared By</th>
                      <th style={S.th}>Assigned Receiver</th>
                      <th style={S.th}>Pending Items</th>
                      <th style={S.th}>Status</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptHandovers.map(ho => {
                      const criticalItems = ho.pendingItems.filter(i => i.category === "Critical").length;
                      return (
                        <tr key={ho.id}>
                          <td style={{ ...S.td, fontWeight: 700 }}><code>{ho.handoverID}</code></td>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600 }}>{ho.shift} Shift</div>
                            <div style={{ fontSize: 10, color: "#64748B" }}>{new Date(ho.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td style={S.td}>{ho.createdBy}</td>
                          <td style={S.td}>{ho.receivedBy || <span style={{ color: "#94A3B8" }}>Not Assigned</span>}</td>
                          <td style={S.td}>
                            <span style={{ fontWeight: 600 }}>{ho.pendingItems.length} items</span>
                            {criticalItems > 0 && (
                              <span style={{ marginLeft: 8, ...S.badge("#FEE2E2", "#EF4444") }}>
                                {criticalItems} Critical
                              </span>
                            )}
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(
                              ho.status === "Assigned" || ho.status === "In Progress" ? "#EFF6FF" : ho.status === "Pending" ? "#FEF3C7" : "#ECFDF5",
                              ho.status === "Assigned" || ho.status === "In Progress" ? "#1D4ED8" : ho.status === "Pending" ? "#D97706" : "#065F46"
                            )}>
                              {ho.status}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <button style={S.btn("secondary")} onClick={() => setViewingHandover(ho)}>
                              🔎 Review & Sign
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quality Monitor Console */}
      {activeTab === "quality" && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>🛡️ Global QMS Compliance Check & Closure Audits</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Department Space</th>
                  <th style={S.th}>Total Handovers</th>
                  <th style={S.th}>Pending &gt;24 Hrs</th>
                  <th style={S.th}>Critical Items</th>
                  <th style={S.th}>Closure Rate</th>
                  <th style={S.th}>NABL Compliance Status</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map(deptName => {
                  const deptHos = handovers.filter(ho => ho.department === deptName);
                  const total = deptHos.length;
                  const pendingOver24 = deptHos.filter(ho => ho.status === "Pending" && (Date.now() - new Date(ho.createdAt).getTime()) / (1000 * 60 * 60) > 24).length;
                  const activeCritical = deptHos.reduce((sum, ho) => ho.status !== "Completed" ? sum + ho.pendingItems.filter(i => i.category === "Critical").length : sum, 0);
                  const closed = deptHos.filter(ho => ho.status === "Completed" || ho.status === "Closed").length;
                  const rate = total > 0 ? Math.round((closed / total) * 100) : 100;
                  const compliant = pendingOver24 === 0 && activeCritical === 0;

                  return (
                    <tr key={deptName}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{deptName}</td>
                      <td style={S.td}>{total}</td>
                      <td style={{ ...S.td, color: pendingOver24 > 0 ? "#EF4444" : "#475569", fontWeight: pendingOver24 > 0 ? 700 : 400 }}>{pendingOver24}</td>
                      <td style={{ ...S.td, color: activeCritical > 0 ? "#EF4444" : "#475569", fontWeight: activeCritical > 0 ? 700 : 400 }}>{activeCritical}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{rate}%</span>
                          <div style={{ width: 60, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${rate}%`, height: "100%", background: rate > 75 ? "#10B981" : rate > 40 ? "#F59E0B" : "#EF4444" }} />
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={S.badge(
                          compliant ? "#ECFDF5" : "#FEE2E2",
                          compliant ? "#047857" : "#B91C1C"
                        )}>
                          {compliant ? "🟢 Compliant" : "🔴 Action Required"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 850, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            
            <div style={{ ...S.cardHeader, background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
              <div style={{ ...S.cardTitle, color: "#FFF" }}>🔄 Register Shift Work Handover ({form.handoverID})</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveHandover} style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              
              {/* SECTION 1: Handover Details */}
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>1. Handover Parameters</h4>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>Department</label>
                    <select
                      style={S.select}
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Section / Unit</label>
                    <input
                      type="text"
                      style={S.inp}
                      placeholder="e.g. Clinical Chemistry"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={S.label}>Shift Schedule</label>
                    <select
                      style={S.select}
                      value={form.shift}
                      onChange={(e) => setForm({ ...form, shift: e.target.value })}
                    >
                      {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Handover Context Type</label>
                    <select
                      style={S.select}
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      {HANDOVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Prepared By (Outgoing)</label>
                    <input type="text" style={{ ...S.inp, background: "#F1F5F9" }} value={currentUserName || ""} readOnly />
                  </div>
                  <div>
                    <label style={S.label}>Assigned Incoming Receiver</label>
                    <input
                      type="text"
                      style={S.inp}
                      placeholder="Enter receiver name"
                      value={form.receivedBy}
                      onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Pending Work Details */}
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>2. Pending Activities Entry Checklist</h4>
                
                {/* Creator entry widget */}
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Pending Activity Description</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Analyzer calibration audit pending"
                        value={newItem.activity}
                        onChange={(e) => setNewItem({ ...newItem, activity: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Criticality Level</label>
                      <select
                        style={S.select}
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Task Priority</label>
                      <select
                        style={S.select}
                        value={newItem.priority}
                        onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                      >
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Related Operational Area</label>
                      <select
                        style={S.select}
                        value={newItem.area}
                        onChange={(e) => setNewItem({ ...newItem, area: e.target.value })}
                      >
                        <option value="Test">Clinical Testing</option>
                        <option value="Equipment">Laboratory Instrumentation</option>
                        <option value="Process">Administrative Process</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Sample ID (Optional)</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. SMP-9912"
                        value={newItem.patientId}
                        onChange={(e) => setNewItem({ ...newItem, patientId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Accession/Request ID (Optional)</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. ACC-190"
                        value={newItem.referenceNo}
                        onChange={(e) => setNewItem({ ...newItem, referenceNo: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ ...S.btn("secondary"), marginTop: 10 }}
                    onClick={handleAddPendingItem}
                  >
                    ⚡ Add Activity Item
                  </button>
                </div>

                {/* Selected list */}
                {form.pendingItems.length === 0 ? (
                  <div style={{ padding: 12, border: "1px dashed #CBD5E1", borderRadius: 8, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                    No pending items added yet. Use the wizard block above to register items.
                  </div>
                ) : (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Pending Activity Description</th>
                        <th style={S.th}>Category</th>
                        <th style={S.th}>Priority</th>
                        <th style={S.th}>Area</th>
                        <th style={S.th}>Reference No</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.pendingItems.map(item => (
                        <tr key={item.id}>
                          <td style={S.td}>{item.activity}</td>
                          <td style={S.td}>
                            <span style={S.badge(getCategoryColor(item.category).bg, getCategoryColor(item.category).fg)}>
                              {item.category}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(getPriorityColor(item.priority).bg, getPriorityColor(item.priority).fg)}>
                              {item.priority}
                            </span>
                          </td>
                          <td style={S.td}>{item.area}</td>
                          <td style={S.td}>{item.referenceNo || "-"}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <button
                              type="button"
                              style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handleRemovePendingItem(item.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* SECTION 3: Technical Details */}
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>3. Technical Context details</h4>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>Issue / Reason Pending</label>
                    <textarea
                      style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                      placeholder="Detail why these actions are pending..."
                      value={form.technicalDetails.issueReason}
                      onChange={(e) => setForm({
                        ...form,
                        technicalDetails: { ...form.technicalDetails, issueReason: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <div>
                    <label style={S.label}>Actions Already Completed</label>
                    <textarea
                      style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                      placeholder="What fixes or mitigation steps were performed?"
                      value={form.technicalDetails.actionsCompleted}
                      onChange={(e) => setForm({
                        ...form,
                        technicalDetails: { ...form.technicalDetails, actionsCompleted: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Remaining Action Required</label>
                    <textarea
                      style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                      placeholder="Specify precisely what the incoming staff member needs to check."
                      value={form.technicalDetails.remainingAction}
                      onChange={(e) => setForm({
                        ...form,
                        technicalDetails: { ...form.technicalDetails, remainingAction: e.target.value }
                      })}
                      required
                    />
                  </div>
                  <div>
                    <label style={S.label}>Special Instructions</label>
                    <textarea
                      style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                      placeholder="Special cautions, safety warnings, patient release restrictions..."
                      value={form.technicalDetails.specialInstructions}
                      onChange={(e) => setForm({
                        ...form,
                        technicalDetails: { ...form.technicalDetails, specialInstructions: e.target.value }
                      })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Expected Completion Time</label>
                    <input
                      type="text"
                      style={S.inp}
                      placeholder="e.g. Before 18:30"
                      value={form.technicalDetails.expectedCompletion}
                      onChange={(e) => setForm({
                        ...form,
                        technicalDetails: { ...form.technicalDetails, expectedCompletion: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Laboratory Specific Details */}
              {isLabDepartment(form.department) && (
                <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16, background: "#F0FDFA", padding: 16, borderRadius: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F766E", margin: "0 0 12px 0" }}>🔬 4. Sample & Patient Related Handover Matrix</h4>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Sample ID</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. SMP-8902"
                        value={form.sampleDetails.sampleId}
                        onChange={(e) => setForm({
                          ...form,
                          sampleDetails: { ...form.sampleDetails, sampleId: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Patient ID</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. PT-2210"
                        value={form.sampleDetails.patientId}
                        onChange={(e) => setForm({
                          ...form,
                          sampleDetails: { ...form.sampleDetails, patientId: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Clinical Test Name</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Fasting Serum Glucose"
                        value={form.sampleDetails.testName}
                        onChange={(e) => setForm({
                          ...form,
                          sampleDetails: { ...form.sampleDetails, testName: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Sample Status Context</label>
                      <select
                        style={S.select}
                        value={form.sampleDetails.sampleStatus}
                        onChange={(e) => setForm({
                          ...form,
                          sampleDetails: { ...form.sampleDetails, sampleStatus: e.target.value }
                        })}
                      >
                        <option value="Awaiting Repeat">Awaiting Repeat</option>
                        <option value="Awaiting Approval">Awaiting Approval</option>
                        <option value="Technical Review">Technical Review</option>
                        <option value="Instrument Issue">Instrument Issue</option>
                        <option value="External Confirmation">External Confirmation</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={S.label}>Pending Log Reason</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Calibrator verification failure"
                        value={form.sampleDetails.pendingReason}
                        onChange={(e) => setForm({
                          ...form,
                          sampleDetails: { ...form.sampleDetails, pendingReason: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 5: Equipment Specific Details */}
              {isTechnicalDepartment(form.department) && (
                <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16, background: "#FFFBEB", padding: 16, borderRadius: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#B45309", margin: "0 0 12px 0" }}>⚙️ 5. Biomedical Instrument / Hardware Related Handover</h4>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Equipment Asset ID</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. BIO-COBAS-02"
                        value={form.equipmentDetails.equipmentId}
                        onChange={(e) => setForm({
                          ...form,
                          equipmentDetails: { ...form.equipmentDetails, equipmentId: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Equipment / Asset Model Name</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Sysmex XN-1000"
                        value={form.equipmentDetails.equipmentName}
                        onChange={(e) => setForm({
                          ...form,
                          equipmentDetails: { ...form.equipmentDetails, equipmentName: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label style={S.label}>Current Hardware Status</label>
                      <select
                        style={S.select}
                        value={form.equipmentDetails.currentStatus}
                        onChange={(e) => setForm({
                          ...form,
                          equipmentDetails: { ...form.equipmentDetails, currentStatus: e.target.value }
                        })}
                      >
                        <option value="Downtime">Downtime (Complete Stop)</option>
                        <option value="Degraded">Degraded (Limited Ops)</option>
                        <option value="Calibration Needed">Calibration Needed</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <label style={S.label}>Failure / Problem Description</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Probe error: vertical movement blocked"
                        value={form.equipmentDetails.problemDescription}
                        onChange={(e) => setForm({
                          ...form,
                          equipmentDetails: { ...form.equipmentDetails, problemDescription: e.target.value }
                        })}
                      />
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <label style={S.label}>Action Plan / Engineering Tasks Required</label>
                      <input
                        type="text"
                        style={S.inp}
                        placeholder="e.g. Roche field service visit scheduled for Monday morning"
                        value={form.equipmentDetails.actionRequired}
                        onChange={(e) => setForm({
                          ...form,
                          equipmentDetails: { ...form.equipmentDetails, actionRequired: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: Attachments (Mock Uploader) */}
              <div style={{ borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" }}>📎 6. Support Attachments & Images</h4>
                <div style={{ border: "2px dashed #CBD5E1", borderRadius: 8, padding: 20, textAlign: "center", color: "#64748B", background: "#F8FAFC" }}>
                  <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>📤</span>
                  <span style={{ fontSize: 12 }}>Drag &amp; Drop reference report sheets, screenshots, or logs here, or click to upload.</span>
                  <input type="file" style={{ display: "none" }} disabled />
                </div>
              </div>

              {/* SECTION 7: Acceptance Outgoing Sign-off */}
              <div style={{ background: "#FAFAFA", border: "1px solid #E2E8F0", padding: 16, borderRadius: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", margin: "0 0 12px 0" }}>✍️ 7. Outgoing Handover Sign-off Authorization</h4>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  I, <strong>{currentUserName || "System User"}</strong>, hereby verify that the status details of the listed activities and parameters are complete, accurate, and ready for shift transition in accordance with ISO 15189 compliance guidelines.
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: "#64748B" }}>
                  Signature Lock: Certified Secure &amp; Transmitted at {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                <button type="button" style={S.btn("secondary")} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" style={S.btn("primary")} disabled={saving}>
                  {saving ? "Registering..." : "💾 Publish Work Handover"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Acknowledgement Modal */}
      {viewingHandover && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 750, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            
            <div style={{ ...S.cardHeader, background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
              <div style={{ ...S.cardTitle, color: "#FFF" }}>🔍 Review Handover Register — {viewingHandover.handoverID}</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setViewingHandover(null)}>✕</button>
            </div>

            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              
              {/* Form Details */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>Handover Parameters</h4>
                <div style={S.grid(3)}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Department</span>
                    <strong style={{ fontSize: 12 }}>{viewingHandover.department}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Section / Unit</span>
                    <strong style={{ fontSize: 12 }}>{viewingHandover.section || "General"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Shift Context</span>
                    <strong style={{ fontSize: 12 }}>{viewingHandover.shift} Shift</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Outgoing Prepared By</span>
                    <strong style={{ fontSize: 12 }}>{viewingHandover.createdBy}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Incoming Assigned To</span>
                    <strong style={{ fontSize: 12 }}>{viewingHandover.receivedBy}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Date Created</span>
                    <strong style={{ fontSize: 12 }}>{new Date(viewingHandover.createdAt).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Pending Items Table */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>Pending Activities Checklist</h4>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Activity</th>
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Priority</th>
                      <th style={S.th}>Area</th>
                      <th style={S.th}>Reference No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingHandover.pendingItems.map(item => (
                      <tr key={item.id}>
                        <td style={S.td}>{item.activity}</td>
                        <td style={S.td}>
                          <span style={S.badge(getCategoryColor(item.category).bg, getCategoryColor(item.category).fg)}>
                            {item.category}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(getPriorityColor(item.priority).bg, getPriorityColor(item.priority).fg)}>
                            {item.priority}
                          </span>
                        </td>
                        <td style={S.td}>{item.area}</td>
                        <td style={S.td}>{item.referenceNo || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Technical Details */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>Technical Context</h4>
                <div style={S.grid(2)}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Issue / Reason Pending</span>
                    <p style={{ fontSize: 12, margin: "4px 0 0 0", color: "#334155" }}>{viewingHandover.technicalDetails.issueReason}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Actions Completed</span>
                    <p style={{ fontSize: 12, margin: "4px 0 0 0", color: "#334155" }}>{viewingHandover.technicalDetails.actionsCompleted || "None"}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Remaining Action Required</span>
                    <p style={{ fontSize: 12, margin: "4px 0 0 0", color: "#0D9488", fontWeight: 600 }}>{viewingHandover.technicalDetails.remainingAction}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Special Instructions</span>
                    <p style={{ fontSize: 12, margin: "4px 0 0 0", color: "#7F1D1D", fontWeight: 500 }}>{viewingHandover.technicalDetails.specialInstructions || "None"}</p>
                  </div>
                </div>
              </div>

              {/* Department Specific Render */}
              {isLabDepartment(viewingHandover.department) && viewingHandover.sampleDetails.sampleId && (
                <div style={{ marginBottom: 20, background: "#F0FDFA", padding: 12, borderRadius: 8 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0F766E", margin: "0 0 8px 0" }}>🔬 Clinical Sample Related details</h4>
                  <div style={S.grid(3)}>
                    <div>
                      <span style={{ fontSize: 10, color: "#0F766E" }}>Sample ID</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{viewingHandover.sampleDetails.sampleId}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#0F766E" }}>Patient ID</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{viewingHandover.sampleDetails.patientId}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#0F766E" }}>Test Name</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{viewingHandover.sampleDetails.testName}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#0F766E" }}>Status</span>
                      <div>
                        <span style={S.badge("#E6F4EA", "#137333")}>{viewingHandover.sampleDetails.sampleStatus}</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <span style={{ fontSize: 10, color: "#0F766E" }}>Pending Reason</span>
                      <div style={{ fontSize: 12 }}>{viewingHandover.sampleDetails.pendingReason || "-"}</div>
                    </div>
                  </div>
                </div>
              )}

              {isTechnicalDepartment(viewingHandover.department) && viewingHandover.equipmentDetails.equipmentId && (
                <div style={{ marginBottom: 20, background: "#FFFBEB", padding: 12, borderRadius: 8 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#B45309", margin: "0 0 8px 0" }}>⚙️ Equipment / Biomedical details</h4>
                  <div style={S.grid(3)}>
                    <div>
                      <span style={{ fontSize: 10, color: "#B45309" }}>Equipment Asset ID</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{viewingHandover.equipmentDetails.equipmentId}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#B45309" }}>Name / Model</span>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{viewingHandover.equipmentDetails.equipmentName}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "#B45309" }}>Failure Status</span>
                      <div>
                        <span style={S.badge("#FEF3C7", "#D97706")}>{viewingHandover.equipmentDetails.currentStatus}</span>
                      </div>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <span style={{ fontSize: 10, color: "#B45309" }}>Issue Description</span>
                      <div style={{ fontSize: 12 }}>{viewingHandover.equipmentDetails.problemDescription}</div>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <span style={{ fontSize: 10, color: "#B45309" }}>Required Action Plan</span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#92400E" }}>{viewingHandover.equipmentDetails.actionRequired}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Acknowledgement Sign-off (Only visible if status is Pending) */}
              {viewingHandover.status === "Pending" ? (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: 16, borderRadius: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1E3A8A", margin: "0 0 12px 0" }}>✍️ 8. Incoming Receiver Acknowledgment</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={S.label}>Verifier Name</label>
                      <input
                        type="text"
                        style={S.inp}
                        value={ackName}
                        onChange={(e) => setAckName(e.target.value)}
                        required
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <input
                        type="checkbox"
                        id="ackCheck"
                        checked={ackChecked}
                        onChange={(e) => setAckChecked(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                      <label htmlFor="ackCheck" style={{ fontSize: 12, color: "#1E3A8A", cursor: "pointer", fontWeight: 600 }}>
                        I hereby acknowledge that I have reviewed the listed items, accept operational responsibility, and agree to the specified action plans.
                      </label>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button type="button" style={S.btn("primary")} onClick={handleAcknowledgeHandover} disabled={saving}>
                        {saving ? "Signing..." : "✍️ Sign & Acknowledge Handover"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: 16, borderRadius: 10 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#065F46", margin: "0 0 8px 0" }}>✍️ Handover Acknowledged & Resolved</h4>
                  <div style={{ fontSize: 12, color: "#065F46" }}>
                    Received and signed off by: <strong>{viewingHandover.acceptance.incoming?.name}</strong> on {new Date(viewingHandover.acceptance.incoming?.signedAt).toLocaleString()}
                  </div>
                </div>
              )}

              {/* Audit Logs Trail */}
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#64748B", borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>Audit Trail Log (ISO Compliance)</h4>
                <div style={{ maxHeight: 120, overflowY: "auto", fontSize: 11, color: "#475569", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: 4, padding: "8px 0" }}>
                  {viewingHandover.auditTrail.map((log, idx) => (
                    <div key={idx}>
                      [{new Date(log.timestamp).toLocaleTimeString()}] {log.user}: {log.action}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" style={S.btn("secondary")} onClick={() => setViewingHandover(null)}>Close Review</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
