// Planning.jsx
// MBL QMS — Quality Planning Module
// ISO 15189:2022 §8.5 · Auditable NABL Planning Registers
// Supports 24 plan types, drag-and-drop file evidence, and visual schedules.

import { useState, useEffect, useCallback } from "react";
import { 
  collection, getDocs, doc, setDoc, updateDoc, 
  query, orderBy, serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../../firebase";

const PLAN_TYPES = {
  "PLN-EQAS": "EQAS Planning",
  "PLN-IQC": "IQC Planning",
  "PLN-CP": "Contingency Plan",
  "PLN-RM": "Risk Management Plan",
  "PLN-IA": "Internal Audit Plan",
  "PLN-MR": "Management Review Plan",
  "PLN-TR": "Training Plan",
  "PLN-CM": "Competency Assessment Plan",
  "PLN-EQ": "Equipment Management Plan",
  "PLN-CAL": "Calibration Plan",
  "PLN-MNT": "Preventive Maintenance Plan",
  "PLN-BIO": "Biosafety Plan",
  "PLN-DIS": "Disaster Recovery Plan",
  "PLN-IT": "IT & Cybersecurity Plan",
  "PLN-DOC": "Document Review Plan",
  "PLN-SAF": "Safety Plan",
  "PLN-ENV": "Environmental Monitoring Plan",
  "PLN-PT": "Proficiency Testing Plan",
  "PLN-CAPA": "CAPA Effectiveness Monitoring Plan",
  "PLN-RISK": "Risk & Opportunity Plan",
  "PLN-HR": "Manpower Planning",
  "PLN-PUR": "Procurement Plan",
  "PLN-VAL": "Validation/Verification Plan",
  "PLN-IND": "Quality Indicator Monitoring Plan"
};

const DEPARTMENTS = [
  "Quality Department", "Biochemistry", "Microbiology", "Serology", "Haematology",
  "Histopathology & Cytopathology", "Flow Cytometry", "Cytogenetics", "Clinical Pathology",
  "Molecular Biology", "Molecular Genetics", "Human Resources (HR)", "Biomedical Engineering",
  "Purchase Department", "Maintenance & Engineering", "Housekeeping & Sanitation",
  "Information Technology (IT)", "Kitchen & Dietary Services", "Security Services",
  "Phlebotomy (Blood Collection)", "Reception & Front Office", "Back Office Logistics",
  "Central Sample Collection", "Telecalling & Call Center", "Accounts & Finance",
  "General Administration", "Design & Media", "Marketing & Sales", "ERP Administration",
  "Outstation Collection Centers", "All Departments"
];

const STATUS_CFG = {
  Scheduled: { color: "#1D4ED8", bg: "#EFF6FF" },
  "In Progress": { color: "#D97706", bg: "#FEF3C7" },
  Completed: { color: "#0D9488", bg: "#F0FDFA" },
  Overdue: { color: "#DC2626", bg: "#FEF2F2" },
  Cancelled: { color: "#64748B", bg: "#F1F5F9" }
};

function todayStr() { return new Date().toISOString().split("T")[0]; }

export default function Planning({ role, userName, dept }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // "new" | "edit" | "view" | null
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Filters
  const [filterDept, setFilterDept] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All"); // "YYYY-MM"
  
  // Permission checks
  const isQualityAdmin = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";
  const isHOD = role === "HOD" || role === "Incharge" || role?.toLowerCase().includes("manager") || role?.toLowerCase().includes("incharge");
  const canSchedule = isQualityAdmin || isHOD;

  // Form states
  const [newPlan, setNewPlan] = useState({
    planType: "PLN-EQAS",
    title: "",
    description: "",
    department: dept || "Quality Department",
    targetDate: todayStr(),
    responsibility: "",
    status: "Scheduled"
  });

  const [editForm, setEditForm] = useState({
    status: "Scheduled",
    completionRemarks: ""
  });

  // Attachments upload state
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "planning"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlans(list);
    } catch (err) {
      console.error("Error loading plans:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Handle plan file upload
  const handleFileUpload = async (files, targetPlanId) => {
    if (attachments.length + files.length > 7) {
      alert("You can upload a maximum of 7 documents.");
      return;
    }
    
    const newAttachments = [...attachments];
    for (const file of files) {
      const tempId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => ({ ...prev, [tempId]: { name: file.name } }));
      
      try {
        const path = `planning_evidence/${targetPlanId || "temp"}/${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        
        newAttachments.push({
          name: file.name,
          url: downloadUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Upload error:", err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      }
    }
    setAttachments(newAttachments);
  };

  const computeNextPlanNumber = (prefix) => {
    const currentYear = new Date().getFullYear();
    const matched = plans.filter(p => p.planType === prefix && p.planNumber?.includes(`-${currentYear}-`));
    const nextSeq = matched.length + 1;
    return `${prefix}-${currentYear}-${String(nextSeq).padStart(3, "0")}`;
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.title || !newPlan.responsibility) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      const planDocRef = doc(collection(db, "planning"));
      const planId = planDocRef.id;
      const planNumber = computeNextPlanNumber(newPlan.planType);
      
      await setDoc(planDocRef, {
        ...newPlan,
        planNumber,
        scheduledDate: todayStr(),
        scheduledBy: userName || "Staff",
        attachments,
        createdAt: serverTimestamp()
      });

      alert(`Plan ${planNumber} created successfully.`);
      setNewPlan({
        planType: "PLN-EQAS",
        title: "",
        description: "",
        department: dept || "Quality Department",
        targetDate: todayStr(),
        responsibility: "",
        status: "Scheduled"
      });
      setAttachments([]);
      setActiveModal(null);
      loadPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const planRef = doc(db, "planning", selectedPlan.id);
      await updateDoc(planRef, {
        status: editForm.status,
        completionRemarks: editForm.completionRemarks,
        resolutionAttachments: attachments,
        updatedAt: serverTimestamp(),
        updatedBy: userName || "Staff"
      });
      alert("Plan updated successfully.");
      setActiveModal(null);
      setAttachments([]);
      loadPlans();
    } catch (err) {
      console.error(err);
      alert("Failed to update plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setSelectedPlan(null);
    setAttachments([]);
    setUploadingFiles({});
  };

  // Stats computation
  const totalCount = plans.length;
  const completedCount = plans.filter(p => p.status === "Completed").length;
  const inProgressCount = plans.filter(p => p.status === "In Progress").length;
  const scheduledCount = plans.filter(p => p.status === "Scheduled").length;
  const overdueCount = plans.filter(p => {
    const isPast = new Date(p.targetDate) < new Date(todayStr());
    return isPast && p.status !== "Completed" && p.status !== "Cancelled";
  }).length;

  // Filter plans list
  const filteredPlans = plans.filter(p => {
    const matchDept = filterDept === "All" || p.department === filterDept;
    const matchType = filterType === "All" || p.planType === filterType;
    const matchStatus = filterStatus === "All" || 
      (filterStatus === "Overdue" ? (new Date(p.targetDate) < new Date(todayStr()) && p.status !== "Completed" && p.status !== "Cancelled") : p.status === filterStatus);
    const matchMonth = filterMonth === "All" || p.targetDate.startsWith(filterMonth);
    return matchDept && matchType && matchStatus && matchMonth;
  });

  const S = {
    wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" },
    container: { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
    header: { display: "flex", justifyContent: "space-between", fontStyle: "normal", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16, marginBottom: 24 },
    titleSection: { display: "flex", alignItems: "center", gap: 12 },
    title: { fontSize: 18, fontWeight: 700, color: "#0F172A" },
    subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 },
    statCard: (borderColor) => ({ background: "#FFF", borderRadius: 12, padding: "16px 20px", border: `1.5px solid ${borderColor || "#E2E8F0"}`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }),
    statLabel: { fontSize: 11.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase" },
    statValue: { fontSize: 24, fontWeight: 700, color: "#0F172A", marginTop: 6 },
    card: { background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
    cardHeader: { padding: "14px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 13.5, fontWeight: 700, color: "#1E293B" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { background: "#F8FAFC", color: "#64748B", fontWeight: 600, textAlign: "left", padding: "12px 16px", borderBottom: "2px solid #E2E8F0" },
    td: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", color: "#334155", verticalAlign: "middle" },
    badge: (cfg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: cfg?.bg || "#F1F5F9", color: cfg?.color || "#475569" }),
    btn: (variant) => ({
      padding: "8px 16px",
      background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : "#0D9488",
      color: variant === "secondary" ? "#475569" : "#FFFFFF",
      border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
      borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.15s", outline: "none"
    }),
    inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
    overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
    modal: { background: "#FFF", borderRadius: 16, width: "100%", maxWidth: 680, maxHeight: "88vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0" },
    modalHeader: { padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F8FAFC" },
    modalTitle: { fontSize: 14, fontWeight: 700, color: "#0F172A" },
    modalBody: { padding: 20 },
    fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }
  };

  // Calendar Timeline Matrix: Shows plans by month for next 6 months
  const getTimelineMonths = () => {
    const months = [];
    const date = new Date();
    for (let i = -1; i < 5; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() + i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      months.push({ key: mStr, label });
    }
    return months;
  };

  return (
    <div style={S.wrap}>
      <div style={S.container}>
        
        {/* Header Section */}
        <div style={S.header}>
          <div style={S.titleSection}>
            <div style={{ fontSize: 28 }}>📅</div>
            <div>
              <div style={S.title}>Quality & Compliance Planning Console</div>
              <div style={S.subtitle}>ISO 15189:2022 Clause §8.5 · Clinical Diagnostics Operational Plans & Calendars</div>
            </div>
          </div>
          {canSchedule && (
            <button style={S.btn("primary")} onClick={() => { setAttachments([]); setActiveModal("new"); }}>
              + Schedule Plan
            </button>
          )}
        </div>

        {/* Dashboard Statistics Widget */}
        <div style={S.statsRow}>
          <div style={S.statCard("#CBD5E1")}>
            <div style={S.statLabel}>Total Plans</div>
            <div style={S.statValue}>{totalCount}</div>
          </div>
          <div style={S.statCard("#93C5FD")}>
            <div style={S.statLabel}>Scheduled / Pending</div>
            <div style={{ ...S.statValue, color: "#1D4ED8" }}>{scheduledCount}</div>
          </div>
          <div style={S.statCard("#FDE047")}>
            <div style={S.statLabel}>In Progress</div>
            <div style={{ ...S.statValue, color: "#D97706" }}>{inProgressCount}</div>
          </div>
          <div style={S.statCard("#86EFAC")}>
            <div style={S.statLabel}>Completed Plans</div>
            <div style={{ ...S.statValue, color: "#0F766E" }}>{completedCount}</div>
          </div>
          <div style={S.statCard("#FCA5A5")}>
            <div style={S.statLabel}>Overdue Alerts</div>
            <div style={{ ...S.statValue, color: "#DC2626" }}>{overdueCount}</div>
          </div>
        </div>

        {/* Calendar Timeline Grid */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>📅 6-Month Visual Target Timeline Grid</div>
            <button style={S.btn("secondary")} onClick={() => setFilterMonth("All")}>Clear Month Filter</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", background: "#FFF", borderBottom: "1px solid #E2E8F0" }}>
            {getTimelineMonths().map(m => {
              const matched = plans.filter(p => p.targetDate.startsWith(m.key));
              const isActive = filterMonth === m.key;
              return (
                <div 
                  key={m.key} 
                  onClick={() => setFilterMonth(m.key)}
                  style={{
                    padding: "16px 12px", borderRight: "1px solid #E2E8F0", textAlign: "center", cursor: "pointer",
                    background: isActive ? "#F0FDFA" : "transparent",
                    borderTop: isActive ? "3px solid #0D9488" : "none",
                    transition: "all 0.1s"
                  }}
                  onMouseOver={e => { if(!isActive) e.currentTarget.style.background = "#F8FAFC"; }}
                  onMouseOut={e => { if(!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#0F766E" : "#64748B" }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: matched.length > 0 ? "#0D9488" : "#94A3B8" }}>
                    {matched.length}
                  </div>
                  <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 4 }}>Plans Target</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search & Filters Registry Card */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>📜 Searchable Compliance Plan Register ({filteredPlans.length})</div>
          </div>
          <div style={{ padding: "14px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Plan Type</label>
              <select style={S.inp} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="All">All Types</option>
                {Object.keys(PLAN_TYPES).map(t => <option key={t} value={t}>{t} ({PLAN_TYPES[t]})</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={S.label}>Department</label>
              <select style={S.inp} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={S.label}>Status</label>
              <select style={S.inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Plans Table */}
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Plan Number</th>
                <th style={S.th}>Plan Type / Category</th>
                <th style={S.th}>Plan Title</th>
                <th style={S.th}>Responsible Dept.</th>
                <th style={S.th}>Responsible Staff</th>
                <th style={S.th}>Target Date</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 32 }}>Loading plans register...</td></tr>
              ) : filteredPlans.length === 0 ? (
                <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 32, color: "#64748B" }}>No plans found matching the filters.</td></tr>
              ) : filteredPlans.map(plan => {
                const isPlanOverdue = new Date(plan.targetDate) < new Date(todayStr()) && plan.status !== "Completed" && plan.status !== "Cancelled";
                const displayStatus = isPlanOverdue ? "Overdue" : plan.status;
                const sc = STATUS_CFG[displayStatus] || { color: "#64748B", bg: "#F1F5F9" };
                
                return (
                  <tr key={plan.id}>
                    <td style={{ ...S.td, fontWeight: 700, color: "#0F766E" }}>{plan.planNumber}</td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 600 }}>{plan.planType}</span>
                      <div style={{ fontSize: 10, color: "#64748B" }}>{PLAN_TYPES[plan.planType]}</div>
                    </td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{plan.title}</td>
                    <td style={S.td}>{plan.department}</td>
                    <td style={{ ...S.td, fontWeight: 500 }}>{plan.responsibility}</td>
                    <td style={S.td}>
                      <span style={{ color: isPlanOverdue ? "#DC2626" : "inherit", fontWeight: isPlanOverdue ? 700 : 500 }}>
                        {new Date(plan.targetDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(sc)}>{displayStatus}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <button 
                        style={S.btn("secondary")} 
                        onClick={() => {
                          setSelectedPlan(plan);
                          setEditForm({ status: plan.status, completionRemarks: plan.completionRemarks || "" });
                          setAttachments(plan.attachments || plan.resolutionAttachments || []);
                          setActiveModal("view");
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. Schedule New Plan Modal */}
      {activeModal === "new" && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>📅 Schedule New Quality & Compliance Plan</span>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            <form onSubmit={handleCreatePlan}>
              <div style={S.modalBody}>
                <div style={S.fieldGrid}>
                  <div>
                    <label style={S.label}>Plan Prefix (Type Mandate) *</label>
                    <select 
                      style={S.inp} 
                      value={newPlan.planType} 
                      onChange={e => setNewPlan({ ...newPlan, planType: e.target.value })}
                    >
                      {Object.keys(PLAN_TYPES).map(t => (
                        <option key={t} value={t}>{t} — {PLAN_TYPES[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Auto-Generated Plan ID</label>
                    <input 
                      style={{ ...S.inp, background: "#F1F5F9", fontWeight: 700, color: "#0F766E" }} 
                      type="text" 
                      value={computeNextPlanNumber(newPlan.planType)} 
                      disabled 
                    />
                  </div>
                </div>

                <div style={S.fieldGrid}>
                  <div>
                    <label style={S.label}>Responsible Department *</label>
                    <select 
                      style={S.inp} 
                      value={newPlan.department} 
                      onChange={e => setNewPlan({ ...newPlan, department: e.target.value })}
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Target Completion Date *</label>
                    <input 
                      style={S.inp} 
                      type="date" 
                      value={newPlan.targetDate} 
                      onChange={e => setNewPlan({ ...newPlan, targetDate: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div style={S.fieldGrid}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.label}>Plan Title / Focus *</label>
                    <input 
                      style={S.inp} 
                      type="text" 
                      placeholder="e.g. Q3 Internal Audit schedule / EQAS Reagents check" 
                      value={newPlan.title} 
                      onChange={e => setNewPlan({ ...newPlan, title: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div style={S.fieldGrid}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={S.label}>Plan Responsibility (Assigned Staff) *</label>
                    <input 
                      style={S.inp} 
                      type="text" 
                      placeholder="e.g. Dr. Ramesh (Biochem HOD) / Quality Executive" 
                      value={newPlan.responsibility} 
                      onChange={e => setNewPlan({ ...newPlan, responsibility: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={S.label}>Plan Objectives & Description</label>
                  <textarea 
                    style={{ ...S.inp, minHeight: 80, resize: "vertical" }} 
                    placeholder="Describe plan scope, checklist steps, and validation metrics..." 
                    value={newPlan.description} 
                    onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
                  />
                </div>

                {/* 📁 Drag & Drop File Attachments Box */}
                <div style={{ marginBottom: 16 }}>
                  <span style={S.label}>Initial Evidence / Resource Documents (Max 7 files)</span>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files) {
                        handleFileUpload(Array.from(e.dataTransfer.files), "temp");
                      }
                    }}
                    onClick={() => document.getElementById("plan-file-input").click()}
                    style={{
                      border: isDragging ? "2px dashed #0D9488" : "2px dashed #CBD5E1",
                      background: isDragging ? "#F0FDFA" : "#F8FAFC",
                      borderRadius: 8, padding: "16px 12px", textAlign: "center", cursor: "pointer", marginTop: 4
                    }}
                  >
                    <input
                      type="file"
                      id="plan-file-input"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileUpload(Array.from(e.target.files), "temp");
                        }
                      }}
                    />
                    <span style={{ fontSize: 20 }}>📥</span>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 4 }}>
                      Drag & Drop files here, or <span style={{ color: "#0D9488" }}>browse</span>
                    </div>
                  </div>
                </div>

                {/* Uploading Status list */}
                {Object.keys(uploadingFiles).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {Object.values(uploadingFiles).map((uf, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#FEF3C7", borderRadius: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#D97706" }}>⏳ Uploading: <strong>{uf.name}</strong>...</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Current Attachments List with delete */}
                {attachments.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                      ATTACHED RESOURCES ({attachments.length}/7)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {attachments.map((file, idx) => (
                        <div key={idx} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "5px 10px", background: "#F1F5F9", borderRadius: 6, border: "1px solid #E2E8F0"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                            <span>📄</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#1E293B" }}>{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11 }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ ...S.modalHeader, justifyContent: "flex-end", gap: 8 }}>
                <button type="button" style={S.btn("secondary")} onClick={handleCloseModal}>Cancel</button>
                <button type="submit" style={S.btn("primary")} disabled={saving}>{saving ? "Saving..." : "Create Compliance Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. View / Resolve Plan Modal */}
      {activeModal === "view" && selectedPlan && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>📄 Plan Details: {selectedPlan.planNumber} ({selectedPlan.title})</span>
              <button onClick={handleCloseModal} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            
            <div style={S.modalBody}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>PLAN ID PREFIX</div>
                  <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 700, marginTop: 2 }}>{selectedPlan.planType} ({PLAN_TYPES[selectedPlan.planType]})</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>PLAN STATUS</div>
                  <div style={{ marginTop: 4 }}>
                    <span style={S.badge(STATUS_CFG[selectedPlan.status])}>{selectedPlan.status}</span>
                  </div>
                </div>
                <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>TARGET DATE</div>
                  <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600, marginTop: 2 }}>{selectedPlan.targetDate}</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>RESPONSIBLE STAFF</div>
                  <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600, marginTop: 2 }}>{selectedPlan.responsibility}</div>
                </div>
                <div style={{ background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>DEPARTMENT</div>
                  <div style={{ fontSize: 12, color: "#1E293B", fontWeight: 600, marginTop: 2 }}>{selectedPlan.department}</div>
                </div>
              </div>

              <div style={{ background: "#F8FAFC", padding: "12px 14px", borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>OBJECTIVES / DESCRIPTION</div>
                <div style={{ fontSize: 12.5, color: "#1E293B", marginTop: 4, whiteSpace: "pre-line", lineHeight: 1.5 }}>{selectedPlan.description || "No description provided."}</div>
              </div>

              {/* Initial Attachments */}
              {selectedPlan.attachments && selectedPlan.attachments.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>INITIAL PLAN RESOURCES</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {selectedPlan.attachments.map((file, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 12px", background: "#FFF", borderRadius: 6, border: "1px solid #E2E8F0"
                      }}>
                        <span style={{ fontSize: 12, color: "#1E293B" }}>📄 {file.name}</span>
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0D9488", textDecoration: "none", fontWeight: 600 }}>Download Resource</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Attachments */}
              {selectedPlan.resolutionAttachments && selectedPlan.resolutionAttachments.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, marginBottom: 6 }}>COMPLIANCE EVIDENCE ATTACHED</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {selectedPlan.resolutionAttachments.map((file, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "6px 12px", background: "#FFF", borderRadius: 6, border: "1px solid #E2E8F0"
                      }}>
                        <span style={{ fontSize: 12, color: "#1E293B" }}>📄 {file.name}</span>
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#0D9488", textDecoration: "none", fontWeight: 600 }}>Download Evidence</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remarks logs */}
              {selectedPlan.completionRemarks && (
                <div style={{ background: "#ECFDF5", padding: "12px 14px", borderRadius: 8, border: "1px solid #A7F3D0", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#065F46", fontWeight: 600 }}>COMPLETION LOGS & REMARKS</div>
                  <div style={{ fontSize: 12.5, color: "#065F46", marginTop: 4, whiteSpace: "pre-line", lineHeight: 1.4 }}>{selectedPlan.completionRemarks}</div>
                  {selectedPlan.updatedBy && (
                    <div style={{ fontSize: 9.5, color: "#0F766E", marginTop: 6 }}>
                      Updated by <strong>{selectedPlan.updatedBy}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Edit / Update section for HOD / Quality Manager */}
              {canSchedule && (
                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>🖋️ Update Plan Status & Resolution Logs (NABL §8.5.2)</div>
                  <form onSubmit={handleUpdatePlan}>
                    <div style={S.fieldGrid}>
                      <div>
                        <label style={S.label}>Update Plan Status</label>
                        <select 
                          style={S.inp} 
                          value={editForm.status} 
                          onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                        >
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={S.label}>Review Notes / Completion Remarks</label>
                      <textarea 
                        style={{ ...S.inp, minHeight: 70, resize: "vertical" }} 
                        placeholder="Log checklist audit details, findings, or resolution remarks..." 
                        value={editForm.completionRemarks}
                        onChange={e => setEditForm({ ...editForm, completionRemarks: e.target.value })}
                      />
                    </div>

                    {/* Drag-and-drop Evidence */}
                    <div style={{ marginBottom: 16 }}>
                      <span style={S.label}>Upload Resolution Evidence (Max 7 files)</span>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          if (e.dataTransfer.files) {
                            handleFileUpload(Array.from(e.dataTransfer.files), selectedPlan.id);
                          }
                        }}
                        onClick={() => document.getElementById("plan-evidence-input").click()}
                        style={{
                          border: isDragging ? "2px dashed #0D9488" : "2px dashed #CBD5E1",
                          background: isDragging ? "#F0FDFA" : "#F8FAFC",
                          borderRadius: 8, padding: "16px 12px", textAlign: "center", cursor: "pointer", marginTop: 4
                        }}
                      >
                        <input
                          type="file"
                          id="plan-evidence-input"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            if (e.target.files) {
                              handleFileUpload(Array.from(e.target.files), selectedPlan.id);
                            }
                          }}
                        />
                        <span style={{ fontSize: 20 }}>📥</span>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginTop: 4 }}>
                          Drag & Drop files here, or <span style={{ color: "#0D9488" }}>browse</span>
                        </div>
                      </div>
                    </div>

                    {/* Uploading Status list */}
                    {Object.keys(uploadingFiles).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        {Object.values(uploadingFiles).map((uf, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", background: "#FEF3C7", borderRadius: 6, marginBottom: 4 }}>
                            <span style={{ fontSize: 11, color: "#D97706" }}>⏳ Uploading: <strong>{uf.name}</strong>...</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Current Attachments List with delete */}
                    {attachments.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                          EVIDENCE ATTACHED ({attachments.length}/7)
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          {attachments.map((file, idx) => (
                            <div key={idx} style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "5px 10px", background: "#F1F5F9", borderRadius: 6, border: "1px solid #E2E8F0"
                            }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                <span>📄</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#1E293B" }}>{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11 }}
                              >
                                ✕ Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ textAlign: "right" }}>
                      <button type="submit" style={S.btn("primary")} disabled={saving}>
                        {saving ? "Saving Logs..." : "Save Progress & Evidence"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            <div style={{ ...S.modalHeader, justifyContent: "flex-end", gap: 8 }}>
              <button style={S.btn("secondary")} onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
