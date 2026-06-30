// ErrorRecords.jsx
// MBL QMS — Reusable Error Record & CAPA Lifecycle Module
// Compliant with ISO 15189:2022 (Nonconformity Management & Corrective Actions)

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  query, where, orderBy, updateDoc, deleteDoc
} from "firebase/firestore";

const S = {
  container: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100%", padding: 12 },
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none", cursor: "pointer" },
  textarea: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", minHeight: 70, boxSizing: "border-box", outline: "none", resize: "vertical" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#334155", cursor: "pointer", userSelect: "none" },
  
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#E2E8F0" : variant === "danger" ? "#EF4444" : "#0F6E56",
    color: variant === "secondary" ? "#334155" : "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s"
  }),
  
  badge: (status) => {
    let bg = "#F1F5F9", color = "#475569";
    if (status === "Closed") { bg = "#DCFCE7"; color = "#15803D"; }
    else if (status === "CAPA Implemented") { bg = "#FEF9C3"; color = "#A16207"; }
    else if (status === "Under Investigation") { bg = "#DBEAFE"; color = "#1D4ED8"; }
    else if (status === "Open") { bg = "#FEE2E2"; color = "#B91C1C"; }
    return { padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: bg, color };
  },

  statCard: {
    background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px",
    display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
  },
  
  stepIndicator: (active) => ({
    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700,
    background: active ? "#0F6E56" : "#E2E8F0",
    color: active ? "#FFFFFF" : "#64748B",
    transition: "all 0.2s"
  })
};

const PRE_ANALYTICAL_ERRORS = [
  "Patient identification error",
  "Wrong test request",
  "Wrong tube/container",
  "Insufficient sample",
  "Hemolyzed sample",
  "Clotted sample",
  "Delayed transport",
  "Improper storage",
  "Incorrect patient preparation"
];

const ANALYTICAL_ERRORS = [
  "Instrument failure",
  "Calibration issue",
  "Reagent problem",
  "QC failure",
  "Incorrect procedure followed",
  "Equipment maintenance issue",
  "Technical error",
  "Environmental issue"
];

const POST_ANALYTICAL_ERRORS = [
  "Incorrect result entry",
  "Delay in reporting",
  "Incorrect interpretation",
  "Critical value communication failure",
  "Report correction required",
  "LIS/HIS issue"
];

const ERROR_SOURCES = [
  "Internal Audit",
  "External Audit",
  "QC Review",
  "Staff Identification",
  "Customer Complaint",
  "LIS/HIS Review",
  "Incident Report"
];

const ROOT_CAUSE_CATEGORIES = [
  "Human factor",
  "Process failure",
  "Equipment failure",
  "Material/Reagent issue",
  "Environment",
  "Training gap",
  "Documentation issue"
];

const PREVENTIVE_ACTIONS_EXAMPLES = [
  "SOP revision",
  "Training conducted",
  "Checklist introduced",
  "System modification",
  "Additional QC monitoring"
];

export default function ErrorRecords({ department }) {
  const { name: authName, role } = useAuth();
  
  // Navigation
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'form'
  const [editingId, setEditingId] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  
  // Data
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, open: 0, investigation: 0, closed: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Form State
  const [errorId, setErrorId] = useState("");
  const [dateOccurrence, setDateOccurrence] = useState("");
  const [dateIdentified, setDateIdentified] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [errorSource, setErrorSource] = useState("");
  const [phase, setPhase] = useState("Pre-Analytical");
  const [selectedClassifications, setSelectedClassifications] = useState([]);
  const [classificationOther, setClassificationOther] = useState("");
  const [phaseDetails, setPhaseDetails] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("No patient impact");
  const [impactDetails, setImpactDetails] = useState("");
  const [immediateActions, setImmediateActions] = useState([]);
  const [immediateActionOther, setImmediateActionOther] = useState("");
  const [immediateActionDetails, setImmediateActionDetails] = useState("");
  const [rcaMethod, setRcaMethod] = useState("5 Why Analysis");
  const [rcaProblem, setRcaProblem] = useState("");
  const [rcaWhys, setRcaWhys] = useState(["", "", "", "", ""]);
  const [rcaRootCauseCategory, setRcaRootCauseCategory] = useState("");
  const [rcaRootCause, setRcaRootCause] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState([]);
  const [newAction, setNewAction] = useState({ action: "", responsible: "", dueDate: "", status: "Pending" });
  const [preventiveActions, setPreventiveActions] = useState([]);
  const [preventiveActionsOther, setPreventiveActionsOther] = useState("");
  const [effectivenessReviewedBy, setEffectivenessReviewedBy] = useState("");
  const [effectivenessDate, setEffectivenessDate] = useState("");
  const [effectivenessStatus, setEffectivenessStatus] = useState("Effective");
  const [effectivenessEvidence, setEffectivenessEvidence] = useState("");
  const [closureApproverName, setClosureApproverName] = useState("");
  const [closureSignature, setClosureSignature] = useState("");
  const [closureDate, setClosureDate] = useState("");
  const [status, setStatus] = useState("Open");

  // Load Data
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "errorRecords"),
        where("department", "==", department || "Biochemistry")
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by date occurrence desc
      items.sort((a, b) => new Date(b.dateOccurrence) - new Date(a.dateOccurrence));
      setRecords(items);

      // Compute statistics
      const s = { total: items.length, open: 0, investigation: 0, closed: 0 };
      items.forEach(it => {
        if (it.status === "Open") s.open++;
        else if (it.status === "Under Investigation") s.investigation++;
        else if (it.status === "Closed") s.closed++;
      });
      setStats(s);
    } catch (e) {
      console.error("Failed to load error records:", e);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Handle classification checkboxes
  const handleClassificationChange = (item) => {
    if (selectedClassifications.includes(item)) {
      setSelectedClassifications(selectedClassifications.filter(c => c !== item));
    } else {
      setSelectedClassifications([...selectedClassifications, item]);
    }
  };

  // Handle immediate action checkboxes
  const handleImmediateActionChange = (action) => {
    if (immediateActions.includes(action)) {
      setImmediateActions(immediateActions.filter(a => a !== action));
    } else {
      setImmediateActions([...immediateActions, action]);
    }
  };

  // Handle preventive actions checkboxes
  const handlePreventiveActionChange = (act) => {
    if (preventiveActions.includes(act)) {
      setPreventiveActions(preventiveActions.filter(a => a !== act));
    } else {
      setPreventiveActions([...preventiveActions, act]);
    }
  };

  // Initialize new record
  const handleCreateNew = () => {
    // Generate new ERR ID format: ERR-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const yearRecords = records.filter(r => r.errorId && r.errorId.includes(`ERR-${currentYear}`));
    let nextNum = 1;
    if (yearRecords.length > 0) {
      const numbers = yearRecords.map(r => parseInt(r.errorId.split("-")[2])).filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      }
    }
    const formattedId = `ERR-${currentYear}-${nextNum.toString().padStart(4, "0")}`;
    
    setErrorId(formattedId);
    setDateOccurrence(new Date().toISOString().substring(0, 10));
    setDateIdentified(new Date().toISOString().substring(0, 10));
    setReportedBy(authName || "");
    setErrorSource("");
    setPhase("Pre-Analytical");
    setSelectedClassifications([]);
    setClassificationOther("");
    setPhaseDetails("");
    setDescription("");
    setImpact("No patient impact");
    setImpactDetails("");
    setImmediateActions([]);
    setImmediateActionOther("");
    setImmediateActionDetails("");
    setRcaMethod("5 Why Analysis");
    setRcaProblem("");
    setRcaWhys(["", "", "", "", ""]);
    setRcaRootCauseCategory("");
    setRcaRootCause("");
    setCorrectiveActions([]);
    setPreventiveActions([]);
    setPreventiveActionsOther("");
    setEffectivenessReviewedBy("");
    setEffectivenessDate("");
    setEffectivenessStatus("Effective");
    setEffectivenessEvidence("");
    setClosureApproverName("");
    setClosureSignature("");
    setClosureDate("");
    setStatus("Open");
    
    setEditingId(null);
    setActiveStep(1);
    setViewMode("form");
  };

  // Load record for edit
  const handleEdit = (record) => {
    setErrorId(record.errorId || "");
    setDateOccurrence(record.dateOccurrence || "");
    setDateIdentified(record.dateIdentified || "");
    setReportedBy(record.reportedBy || "");
    setErrorSource(record.errorSource || "");
    setPhase(record.phase || "Pre-Analytical");
    setSelectedClassifications(record.selectedClassifications || []);
    setClassificationOther(record.classificationOther || "");
    setPhaseDetails(record.phaseDetails || "");
    setDescription(record.description || "");
    setImpact(record.impact || "No patient impact");
    setImpactDetails(record.impactDetails || "");
    setImmediateActions(record.immediateActions || []);
    setImmediateActionOther(record.immediateActionOther || "");
    setImmediateActionDetails(record.immediateActionDetails || "");
    setRcaMethod(record.rcaMethod || "5 Why Analysis");
    setRcaProblem(record.rcaProblem || "");
    setRcaWhys(record.rcaWhys || ["", "", "", "", ""]);
    setRcaRootCauseCategory(record.rcaRootCauseCategory || "");
    setRcaRootCause(record.rcaRootCause || "");
    setCorrectiveActions(record.correctiveActions || []);
    setPreventiveActions(record.preventiveActions || []);
    setPreventiveActionsOther(record.preventiveActionsOther || "");
    setEffectivenessReviewedBy(record.effectivenessReviewedBy || "");
    setEffectivenessDate(record.effectivenessDate || "");
    setEffectivenessStatus(record.effectivenessStatus || "Effective");
    setEffectivenessEvidence(record.effectivenessEvidence || "");
    setClosureApproverName(record.closureApproverName || "");
    setClosureSignature(record.closureSignature || "");
    setClosureDate(record.closureDate || "");
    setStatus(record.status || "Open");

    setEditingId(record.id);
    setActiveStep(1);
    setViewMode("form");
  };

  // Add corrective action to grid list
  const addCorrectiveAction = () => {
    if (!newAction.action || !newAction.responsible || !newAction.dueDate) return;
    setCorrectiveActions([...correctiveActions, newAction]);
    setNewAction({ action: "", responsible: "", dueDate: "", status: "Pending" });
  };

  const removeCorrectiveAction = (index) => {
    setCorrectiveActions(correctiveActions.filter((_, i) => i !== index));
  };

  // Save Record
  const handleSave = async () => {
    const payload = {
      errorId,
      dateOccurrence,
      dateIdentified,
      reportedBy,
      department: department || "Biochemistry",
      errorSource,
      phase,
      selectedClassifications,
      classificationOther,
      phaseDetails,
      description,
      impact,
      impactDetails,
      immediateActions,
      immediateActionOther,
      immediateActionDetails,
      rcaMethod,
      rcaProblem,
      rcaWhys,
      rcaRootCauseCategory,
      rcaRootCause,
      correctiveActions,
      preventiveActions,
      preventiveActionsOther,
      effectivenessReviewedBy,
      effectivenessDate,
      effectivenessStatus,
      effectivenessEvidence,
      closureApproverName,
      closureSignature,
      closureDate,
      status,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "errorRecords", editingId), payload);
      } else {
        payload.createdAt = new Date().toISOString();
        await addDoc(collection(db, "errorRecords"), payload);
      }
      setViewMode("list");
      loadRecords();
    } catch (e) {
      alert("Failed to save record: " + e.message);
    }
  };

  // Delete Record
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this error record? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "errorRecords", id));
      loadRecords();
    } catch (e) {
      alert("Failed to delete record.");
    }
  };

  // Filters and search logic
  const filteredRecords = records.filter(it => {
    const matchesSearch = it.errorId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          it.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          it.reportedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || it.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={S.container}>
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: "#0F6E56" }}>ISO 15189:2022 Error & NC Registry</h2>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748B" }}>Nonconformity Lifecycle Tracking for {department || "Biochemistry"} Department</p>
        </div>
        {viewMode === "list" && (
          <button style={S.btn()} onClick={handleCreateNew}>
            ➕ Log New Error Record
          </button>
        )}
      </div>

      {/* STATS HEADER */}
      {viewMode === "list" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={S.statCard}>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Total Registered Errors</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#0F6E56" }}>{stats.total}</span>
          </div>
          <div style={S.statCard}>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Open / Under Actions</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#EF4444" }}>{stats.open}</span>
          </div>
          <div style={S.statCard}>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Under Investigation</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#2563EB" }}>{stats.investigation}</span>
          </div>
          <div style={S.statCard}>
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Closed & Verified</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#16A34A" }}>{stats.closed}</span>
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Logged Nonconformities & Errors</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ ...S.inp, width: 200 }}
                placeholder="Search by ID, Desc, Staff..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select style={{ ...S.select, width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="CAPA Implemented">CAPA Implemented</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div style={{ padding: 12, overflowX: "auto" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: 20, fontSize: 12, color: "#64748B" }}>Loading records...</div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, fontSize: 12, color: "#64748B" }}>No error records found matching criteria.</div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Record ID</th>
                    <th style={S.th}>Date Occurred</th>
                    <th style={S.th}>Phase</th>
                    <th style={S.th}>Reported By</th>
                    <th style={S.th}>Description Snippet</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(it => (
                    <tr key={it.id}>
                      <td style={{ ...S.td, fontWeight: 700, color: "#0F6E56" }}>{it.errorId}</td>
                      <td style={S.td}>{it.dateOccurrence}</td>
                      <td style={S.td}>{it.phase}</td>
                      <td style={S.td}>{it.reportedBy}</td>
                      <td style={S.td}>{it.description ? it.description.substring(0, 50) + "..." : "No description"}</td>
                      <td style={S.td}>
                        <span style={S.badge(it.status)}>{it.status}</span>
                      </td>
                      <td style={{ ...S.td, display: "flex", gap: 6 }}>
                        <button style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 10 }} onClick={() => handleEdit(it)}>
                          📝 Edit/Verify
                        </button>
                        <button style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 10 }} onClick={() => handleDelete(it.id)}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* FORM / WIZARD VIEW */}
      {viewMode === "form" && (
        <div>
          {/* STEP INDICATORS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.stepIndicator(activeStep >= 1)}>1</div>
              <span style={{ fontSize: 12, fontWeight: activeStep === 1 ? 700 : 500, color: activeStep === 1 ? "#1E293B" : "#64748B" }}>Identify & Classify</span>
            </div>
            <div style={{ width: 40, height: 1, background: "#E2E8F0" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.stepIndicator(activeStep >= 2)}>2</div>
              <span style={{ fontSize: 12, fontWeight: activeStep === 2 ? 700 : 500, color: activeStep === 2 ? "#1E293B" : "#64748B" }}>Description & Containment</span>
            </div>
            <div style={{ width: 40, height: 1, background: "#E2E8F0" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.stepIndicator(activeStep >= 3)}>3</div>
              <span style={{ fontSize: 12, fontWeight: activeStep === 3 ? 700 : 500, color: activeStep === 3 ? "#1E293B" : "#64748B" }}>Root Cause (RCA)</span>
            </div>
            <div style={{ width: 40, height: 1, background: "#E2E8F0" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.stepIndicator(activeStep >= 4)}>4</div>
              <span style={{ fontSize: 12, fontWeight: activeStep === 4 ? 700 : 500, color: activeStep === 4 ? "#1E293B" : "#64748B" }}>CAPA Plan</span>
            </div>
            <div style={{ width: 40, height: 1, background: "#E2E8F0" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={S.stepIndicator(activeStep >= 5)}>5</div>
              <span style={{ fontSize: 12, fontWeight: activeStep === 5 ? 700 : 500, color: activeStep === 5 ? "#1E293B" : "#64748B" }}>Verify & Close</span>
            </div>
          </div>

          {/* STEP 1: IDENTIFICATION & CLASSIFICATION */}
          {activeStep === 1 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Step 1: Error Identification & Lifecycle Classification</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>Clause 8.7 (Nonconformity & Corrective Action)</div>
              </div>
              <div style={S.cardBody}>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>Error Record ID</label>
                    <input style={{ ...S.inp, background: "#F1F5F9", fontWeight: 700 }} value={errorId} disabled />
                  </div>
                  <div>
                    <label style={S.label}>Date of Occurrence *</label>
                    <input type="date" style={S.inp} value={dateOccurrence} onChange={e => setDateOccurrence(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Date Identified *</label>
                    <input type="date" style={S.inp} value={dateIdentified} onChange={e => setDateIdentified(e.target.value)} />
                  </div>
                </div>

                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>Reported By (Technologist/Staff) *</label>
                    <input style={S.inp} value={reportedBy} onChange={e => setReportedBy(e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Error Source *</label>
                    <select style={S.select} value={errorSource} onChange={e => setErrorSource(e.target.value)}>
                      <option value="">Select source...</option>
                      {ERROR_SOURCES.map((s, idx) => <option key={idx} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Error Phase Classification</label>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="phase" checked={phase === "Pre-Analytical"} onChange={() => { setPhase("Pre-Analytical"); setSelectedClassifications([]); }} />
                      Pre-Analytical (Before Testing)
                    </label>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="phase" checked={phase === "Analytical"} onChange={() => { setPhase("Analytical"); setSelectedClassifications([]); }} />
                      Analytical (During Testing)
                    </label>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="phase" checked={phase === "Post-Analytical"} onChange={() => { setPhase("Post-Analytical"); setSelectedClassifications([]); }} />
                      Post-Analytical (After Testing)
                    </label>
                  </div>

                  <label style={S.label}>Specific Nonconformity Category (Check all that apply)</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, background: "#F8FAFC", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                    {phase === "Pre-Analytical" && PRE_ANALYTICAL_ERRORS.map((item, idx) => (
                      <label key={idx} style={S.checkboxLabel}>
                        <input type="checkbox" checked={selectedClassifications.includes(item)} onChange={() => handleClassificationChange(item)} />
                        {item}
                      </label>
                    ))}
                    {phase === "Analytical" && ANALYTICAL_ERRORS.map((item, idx) => (
                      <label key={idx} style={S.checkboxLabel}>
                        <input type="checkbox" checked={selectedClassifications.includes(item)} onChange={() => handleClassificationChange(item)} />
                        {item}
                      </label>
                    ))}
                    {phase === "Post-Analytical" && POST_ANALYTICAL_ERRORS.map((item, idx) => (
                      <label key={idx} style={S.checkboxLabel}>
                        <input type="checkbox" checked={selectedClassifications.includes(item)} onChange={() => handleClassificationChange(item)} />
                        {item}
                      </label>
                    ))}
                  </div>

                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>Other Specific Category (If applicable)</label>
                      <input style={S.inp} placeholder="e.g. Specimen labeling issue..." value={classificationOther} onChange={e => setClassificationOther(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Comments on Phase Classification</label>
                      <input style={S.inp} placeholder="Additional comments..." value={phaseDetails} onChange={e => setPhaseDetails(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DESCRIPTION & IMMEDIATE ACTION */}
          {activeStep === 2 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Step 2: Error Description & Containment Action</div>
              </div>
              <div style={S.cardBody}>
                <div>
                  <label style={S.label}>What happened? (Detailed description of the error / NC) *</label>
                  <textarea
                    style={{ ...S.textarea, minHeight: 90 }}
                    placeholder="Provide a step-by-step description of the incident, specimen numbers, machines involved, etc..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={S.label}>Patient Impact Assessment</label>
                  <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="impact" checked={impact === "No patient impact"} onChange={() => setImpact("No patient impact")} />
                      No patient impact (Detected before reporting)
                    </label>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="impact" checked={impact === "Potential patient impact"} onChange={() => setImpact("Potential patient impact")} />
                      Potential patient impact (Needs clinical check)
                    </label>
                    <label style={S.checkboxLabel}>
                      <input type="radio" name="impact" checked={impact === "Patient impact occurred"} onChange={() => setImpact("Patient impact occurred")} />
                      Patient impact occurred (Incorrect report released)
                    </label>
                  </div>
                  <label style={S.label}>Impact Details / Scope</label>
                  <input style={S.inp} placeholder="Details about patient risk, duplicate collection needed, etc..." value={impactDetails} onChange={e => setImpactDetails(e.target.value)} />
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Immediate Correction / Containment Action</label>
                  <label style={S.label}>Action taken immediately (Check all that apply):</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                    {["Sample recollected", "Result corrected", "Report amended", "Clinician informed", "Equipment stopped", "Reagent replaced", "Staff notified"].map((action, idx) => (
                      <label key={idx} style={S.checkboxLabel}>
                        <input type="checkbox" checked={immediateActions.includes(action)} onChange={() => handleImmediateActionChange(action)} />
                        {action}
                      </label>
                    ))}
                  </div>

                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>Other Containment Action</label>
                      <input style={S.inp} placeholder="e.g. Rerun calibration..." value={immediateActionOther} onChange={e => setImmediateActionOther(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Details of Action Taken</label>
                      <input style={S.inp} placeholder="Action description & result..." value={immediateActionDetails} onChange={e => setImmediateActionDetails(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: ROOT CAUSE ANALYSIS (RCA) */}
          {activeStep === 3 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Step 3: Root Cause Analysis (RCA)</div>
              </div>
              <div style={S.cardBody}>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>RCA Method</label>
                    <select style={S.select} value={rcaMethod} onChange={e => setRcaMethod(e.target.value)}>
                      <option>5 Why Analysis</option>
                      <option>Fishbone Diagram</option>
                      <option>Fault Tree Analysis</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Root Cause Category *</label>
                    <select style={S.select} value={rcaRootCauseCategory} onChange={e => setRcaRootCauseCategory(e.target.value)}>
                      <option value="">Select category...</option>
                      {ROOT_CAUSE_CATEGORIES.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                </div>

                {rcaMethod === "5 Why Analysis" && (
                  <div style={{ background: "#F8FAFC", padding: 16, borderRadius: 12, marginBottom: 12 }}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Problem Statement *</label>
                      <input style={S.inp} placeholder="Identify the core problem..." value={rcaProblem} onChange={e => setRcaProblem(e.target.value)} />
                    </div>
                    {rcaWhys.map((why, idx) => (
                      <div key={idx} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", minWidth: 50 }}>Why {idx + 1}:</span>
                        <input
                          style={S.inp}
                          placeholder={`Why did this happen? (Cause {idx + 1})`}
                          value={why}
                          onChange={e => {
                            const newWhys = [...rcaWhys];
                            newWhys[idx] = e.target.value;
                            setRcaWhys(newWhys);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label style={S.label}>Root Cause Identified Details *</label>
                  <textarea
                    style={S.textarea}
                    placeholder="Provide a clear, actionable statement of the root cause identified..."
                    value={rcaRootCause}
                    onChange={e => setRcaRootCause(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CAPA PLAN */}
          {activeStep === 4 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Step 4: Corrective & Preventive Action (CAPA) Plan</div>
              </div>
              <div style={S.cardBody}>
                {/* Corrective Actions Table */}
                <div>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Corrective Actions (CAPA Grid)</label>
                  <table style={{ ...S.table, marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={S.th}>Action</th>
                        <th style={S.th}>Responsible Person</th>
                        <th style={S.th}>Due Date</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correctiveActions.map((ca, idx) => (
                        <tr key={idx}>
                          <td style={S.td}>{ca.action}</td>
                          <td style={S.td}>{ca.responsible}</td>
                          <td style={S.td}>{ca.dueDate}</td>
                          <td style={S.td}>{ca.status}</td>
                          <td style={S.td}>
                            <button style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 10 }} onClick={() => removeCorrectiveAction(idx)}>
                              ❌ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add action row */}
                  <div style={{ ...S.grid(4), background: "#F8FAFC", padding: 12, borderRadius: 8, alignItems: "end" }}>
                    <div>
                      <label style={S.label}>Action Item</label>
                      <input style={S.inp} placeholder="e.g. Retrain staff" value={newAction.action} onChange={e => setNewAction({ ...newAction, action: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Responsible Person</label>
                      <input style={S.inp} placeholder="e.g. Lab Manager" value={newAction.responsible} onChange={e => setNewAction({ ...newAction, responsible: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Due Date</label>
                      <input type="date" style={S.inp} value={newAction.dueDate} onChange={e => setNewAction({ ...newAction, dueDate: e.target.value })} />
                    </div>
                    <button style={{ ...S.btn(), width: "100%" }} onClick={addCorrectiveAction}>
                      ➕ Add Action
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Preventive Actions (System Improvements)</label>
                  <label style={S.label}>Systematic changes to prevent recurrence (Check all that apply):</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                    {PREVENTIVE_ACTIONS_EXAMPLES.map((act, idx) => (
                      <label key={idx} style={S.checkboxLabel}>
                        <input type="checkbox" checked={preventiveActions.includes(act)} onChange={() => handlePreventiveActionChange(act)} />
                        {act}
                      </label>
                    ))}
                  </div>

                  <div>
                    <label style={S.label}>Other Preventive Actions / Details</label>
                    <textarea
                      style={S.textarea}
                      placeholder="Detail policy updates, automated checklists, LIS modifications..."
                      value={preventiveActionsOther}
                      onChange={e => setPreventiveActionsOther(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: VERIFICATION & CLOSURE */}
          {activeStep === 5 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Step 5: Effectiveness Review & Closure Approval</div>
              </div>
              <div style={S.cardBody}>
                {/* Effectiveness Verification */}
                <div>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Effectiveness Verification</label>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Reviewed By (Auditor/HOD)</label>
                      <input style={S.inp} placeholder="Name" value={effectivenessReviewedBy} onChange={e => setEffectivenessReviewedBy(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Review Date</label>
                      <input type="date" style={S.inp} value={effectivenessDate} onChange={e => setEffectivenessDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Effectiveness Status</label>
                      <select style={S.select} value={effectivenessStatus} onChange={e => setEffectivenessStatus(e.target.value)}>
                        <option>Effective</option>
                        <option>Not Effective (Further action required)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Evidence of Effectiveness / Review Details</label>
                    <textarea
                      style={S.textarea}
                      placeholder="e.g. 0 occurrences in 3 months of tracking, IQC results within acceptable range..."
                      value={effectivenessEvidence}
                      onChange={e => setEffectivenessEvidence(e.target.value)}
                    />
                  </div>
                </div>

                {/* Closure Approval */}
                <div style={{ borderTop: "1px solid #E2E8F0", marginTop: 16, paddingTop: 16 }}>
                  <label style={{ ...S.label, fontSize: 12, color: "#0F6E56" }}>Quality Manager Closure Approval</label>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Approver Name</label>
                      <input style={S.inp} value={closureApproverName} onChange={e => setClosureApproverName(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Signature / Validation Key</label>
                      <input style={S.inp} placeholder="Initials/Validation" value={closureSignature} onChange={e => setClosureSignature(e.target.value)} />
                    </div>
                    <div>
                      <label style={S.label}>Closure Date</label>
                      <input type="date" style={S.inp} value={closureDate} onChange={e => setClosureDate(e.target.value)} />
                    </div>
                  </div>

                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>Current Nonconformity Status</label>
                      <select style={S.select} value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="Open">Open</option>
                        <option value="Under Investigation">Under Investigation</option>
                        <option value="CAPA Implemented">CAPA Implemented</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WIZARD ACTIONS */}
          <div style={{ display: "flex", justifyContent: "space-between", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 12 }}>
            <button style={S.btn("secondary")} onClick={() => setViewMode("list")}>
              ⬅️ Cancel & Back to List
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              {activeStep > 1 && (
                <button style={S.btn("secondary")} onClick={() => setActiveStep(activeStep - 1)}>
                  Previous Step
                </button>
              )}
              {activeStep < 5 ? (
                <button style={S.btn()} onClick={() => setActiveStep(activeStep + 1)}>
                  Next Step
                </button>
              ) : (
                <button style={S.btn()} onClick={handleSave}>
                  💾 Save & Finish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
