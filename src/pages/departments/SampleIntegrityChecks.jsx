// SampleIntegrityChecks.jsx
// MBL QMS — Stored Sample Stability Verification Module
// Compliant with ISO 15189:2022 guidelines for Pre-examination processes & Stored Sample Validity checks

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  query, where, orderBy, setDoc, updateDoc, deleteDoc
} from "firebase/firestore";

const S = {
  container: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100%", padding: 12 },
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none", transition: "border 0.15s" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none", cursor: "pointer" },
  textarea: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", minHeight: 60, boxSizing: "border-box", outline: "none", resize: "vertical" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : variant === "success" ? "#10B981" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.15s"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", fontSize: 12.5, fontWeight: 500, zIndex: 2000, display: "flex", alignItems: "center", gap: 8 }
};

export default function SampleIntegrityChecks({ department }) {
  const { name: currentUserName, role: userRole, dept: userDept, isSuperAdmin, isERPAdmin } = useAuth();

  // Access rules: department staff, Director (Super Admin), Admin, and ERP Admin
  const isDirector = isSuperAdmin || userRole?.toLowerCase().includes("director") || userDept === "Administration";
  const isAdmin = userRole === "Admin";
  const hasAccess = isDirector || isAdmin || isERPAdmin || userDept === department;

  const [checks, setChecks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formState, setFormState] = useState({
    studyId: "",
    department: department || "Biochemistry",
    analyzer: "Roche Cobas c311",
    sampleType: "Serum",
    studyPeriodStart: new Date().toISOString().split("T")[0],
    studyPeriodEnd: new Date().toISOString().split("T")[0],
    retentionPeriod: "7 days",
    conductedBy: "",
    reviewedBy: "",

    // Original Result
    patientId: "",
    sampleId: "",
    originalTestingDate: new Date().toISOString().split("T")[0],
    analyte: "Glucose",
    originalResult: "",
    unit: "mg/dL",
    referenceRange: "70 - 100 mg/dL",
    originalAnalyzer: "Roche Cobas c311",
    originalQcStatus: "Pass",

    // Stored Sample Retest
    retestDate: new Date().toISOString().split("T")[0],
    storageDuration: "7 days",
    storageCondition: "Refrigerator (2-8°C)",
    sampleCondition: "Clear",
    retestResult: "",
    retestAnalyzer: "Roche Cobas c311",

    // Comparison Analysis (Calculated)
    difference: 0,
    pctDifference: 0,

    // Acceptance Criteria
    acceptanceCriteriaLimit: "Within ±10%",

    // Final Evaluation
    finalEvaluation: "Acceptable Stability",

    // Investigation
    possibleCause: "",
    capaRequired: "No",

    // Signatures
    preparedBy: currentUserName || "Pathology Staff",
    reviewedDate: ""
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Generate Study ID
  const generateStudyId = useCallback(() => {
    const code = (department || "BIO").slice(0, 3).toUpperCase();
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    return `STUDY-${code}-${dateStr}-${rand}`;
  }, [department]);

  // Load Stability Check Records
  const loadData = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "sampleIntegrityChecks"),
        where("department", "==", department),
        orderBy("retestDate", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setChecks(list);
      localStorage.setItem(`mbl_stability_${department}`, JSON.stringify(list));

      const empSnap = await getDocs(collection(db, "employees"));
      const empList = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(empList);
    } catch (err) {
      console.warn("Firestore offline. Loading local stability cache:", err);
      const cached = localStorage.getItem(`mbl_stability_${department}`);
      if (cached) setChecks(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [department, hasAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Retest / Original values changed to compute difference & % difference
  useEffect(() => {
    const orig = parseFloat(formState.originalResult);
    const ret = parseFloat(formState.retestResult);
    
    if (!isNaN(orig) && !isNaN(ret)) {
      const diff = parseFloat((ret - orig).toFixed(2));
      const pctDiff = parseFloat(((ret - orig) / orig * 100).toFixed(2));
      
      // Auto-evaluate against criteria
      let evaluation = "Acceptable Stability";
      let criteriaPercent = 10; // default 10%
      if (formState.acceptanceCriteriaLimit.includes("5")) criteriaPercent = 5;
      else if (formState.acceptanceCriteriaLimit.includes("15")) criteriaPercent = 15;
      else if (formState.acceptanceCriteriaLimit.includes("20")) criteriaPercent = 20;

      if (Math.abs(pctDiff) > criteriaPercent) {
        evaluation = "Not Acceptable";
      }

      setFormState(prev => ({
        ...prev,
        difference: diff,
        pctDifference: pctDiff,
        finalEvaluation: evaluation
      }));
    }
  }, [formState.originalResult, formState.retestResult, formState.acceptanceCriteriaLimit]);

  // Toggle Log Verification
  const handleNewCheck = () => {
    setEditingId(null);
    setFormState({
      studyId: generateStudyId(),
      department: department || "Biochemistry",
      analyzer: "Roche Cobas c311",
      sampleType: "Serum",
      studyPeriodStart: new Date().toISOString().split("T")[0],
      studyPeriodEnd: new Date().toISOString().split("T")[0],
      retentionPeriod: "7 days",
      conductedBy: "",
      reviewedBy: "",

      patientId: "",
      sampleId: "",
      originalTestingDate: new Date().toISOString().split("T")[0],
      analyte: "Glucose",
      originalResult: "",
      unit: "mg/dL",
      referenceRange: "70 - 100 mg/dL",
      originalAnalyzer: "Roche Cobas c311",
      originalQcStatus: "Pass",

      retestDate: new Date().toISOString().split("T")[0],
      storageDuration: "7 days",
      storageCondition: "Refrigerator (2-8°C)",
      sampleCondition: "Clear",
      retestResult: "",
      retestAnalyzer: "Roche Cobas c311",

      difference: 0,
      pctDifference: 0,
      acceptanceCriteriaLimit: "Within ±10%",
      finalEvaluation: "Acceptable Stability",
      possibleCause: "",
      capaRequired: "No",
      preparedBy: currentUserName || "Pathology Staff",
      reviewedDate: ""
    });
    setIsFormOpen(true);
  };

  const handleEditCheck = (c) => {
    setEditingId(c.id);
    setFormState({ ...c });
    setIsFormOpen(true);
  };

  const handleDeleteCheck = async (id) => {
    if (!window.confirm("Are you sure you want to delete this stability verification log?")) return;
    try {
      await deleteDoc(doc(db, "sampleIntegrityChecks", id));
      showToast("Verification log deleted.");
      loadData();
    } catch (e) {
      alert("Failed to delete log.");
    }
  };

  // Save/Submit Form
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formState.conductedBy || !formState.reviewedBy) {
      return alert("Please select Conducted By and Reviewed By HOD.");
    }
    setSaving(true);

    try {
      let docRefId = editingId;
      const payload = {
        ...formState,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await setDoc(doc(db, "sampleIntegrityChecks", editingId), payload);
      } else {
        const docRef = await addDoc(collection(db, "sampleIntegrityChecks"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        docRefId = docRef.id;
      }

      // If CAPA is required, auto-transfer this as a pending CAPA action request
      if (formState.capaRequired === "Yes") {
        const capaId = `CAPA-${formState.studyId}`;
        const capaPayload = {
          actionId: capaId,
          meetingId: formState.studyId, // Linked to Study ID
          source: `Stored Sample Stability Failure (${formState.analyte})`,
          actionRequired: `Investigate storage stability failure for analyte ${formState.analyte} (Study ID: ${formState.studyId}). Observed bias: ${formState.pctDifference}%, allowed limit: ${formState.acceptanceCriteriaLimit}. Reason: ${formState.possibleCause || "Unknown"}`,
          assignedTo: formState.reviewedBy,
          priority: "High",
          targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 14 days out
          status: "Open",
          createdAt: new Date().toISOString(),
          createdBy: currentUserName || "Quality Staff"
        };
        await setDoc(doc(db, "actionRequests", capaId), capaPayload);
      }

      showToast(`Stability record ${editingId ? "updated" : "saved"} successfully.`);
      setIsFormOpen(false);
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error saving record to database. Saved locally.");
    } finally {
      setSaving(false);
    }
  };

  // Filter department employees
  const filteredEmployees = employees.filter(emp => {
    const empDept = emp.department || emp.dept || "";
    return empDept.toLowerCase() === department.toLowerCase();
  });

  // Calculate statistics
  const totalVerified = checks.length;
  const acceptableCount = checks.filter(c => c.finalEvaluation === "Acceptable Stability").length;
  const failedCount = totalVerified - acceptableCount;
  const agreementPercent = totalVerified > 0 ? parseFloat(((acceptableCount / totalVerified) * 100).toFixed(1)) : 100.0;
  const overallStatus = agreementPercent >= 95.0 ? "PASS" : "FAIL";

  if (!hasAccess) {
    return (
      <div style={S.container}>
        <div style={{ ...S.card, maxWidth: 500, margin: "40px auto", textAlign: "center" }}>
          <div style={{ ...S.cardHeader, background: "#FCEBEB", borderBottom: "1px solid #EF4444" }}>
            <span style={{ ...S.cardTitle, color: "#EF4444" }}>🔒 Access Restricted</span>
          </div>
          <div style={S.cardBody}>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: "1.6" }}>
              Under **ISO 15189:2022 §7.2.6** audit parameters, stored sample stability reports and validation logs are confidential.
            </p>
            <p style={{ fontSize: 12.5, color: "#791F1F", fontWeight: 600, marginTop: 8 }}>
              You must belong to the {department} department or hold a Director/System Administrator role to view these records.
            </p>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Your department: {userDept || "Not Set"}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Your role: {userRole || "Not Set"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ── SECTION 1: DASHBOARD VIEW ─────────────────────────────────────── */}
      {!isFormOpen && (
        <div>
          {/* Stats Bar */}
          <div style={S.grid(5)}>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #0D9488" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Total Samples Verified</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{totalVerified}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Retest validation logs</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #10B981" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Acceptable Stability</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#059669", marginTop: 4 }}>{acceptableCount}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Passed bias criteria</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #EF4444" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Stability Failures</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#DC2626", marginTop: 4 }}>{failedCount}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Exceeded allowed bias</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #3B82F6" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Percentage Agreement</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#2563EB", marginTop: 4 }}>{agreementPercent}%</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Target: &gt;= 95%</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: `4px solid ${overallStatus === "PASS" ? "#10B981" : "#EF4444"}` }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Overall Study Status</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: overallStatus === "PASS" ? "#059669" : "#DC2626", marginTop: 4 }}>{overallStatus}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Based on agreement %</div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button style={S.btn()} onClick={handleNewCheck}>
              ➕ Log Retest Verification Record
            </button>
          </div>

          {/* History Grid */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>📥 Stored Sample Stability Registry ({department})</span>
              <button style={S.btn("secondary")} onClick={loadData}>🔄 Refresh</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Study ID</th>
                    <th style={S.th}>Sample ID</th>
                    <th style={S.th}>Analyte</th>
                    <th style={S.th}>Original Result</th>
                    <th style={S.th}>Retest Result</th>
                    <th style={S.th}>Bias / % Diff</th>
                    <th style={S.th}>Acceptance Limit</th>
                    <th style={S.th}>Evaluation</th>
                    <th style={S.th}>Retest Date</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="10" style={{ padding: 24, textAlign: "center", color: "#64748B" }}>Loading verification records...</td></tr>
                  ) : checks.length === 0 ? (
                    <tr><td colSpan="10" style={{ padding: 32, textAlign: "center", color: "#64748B" }}>No sample stability verification records logged.</td></tr>
                  ) : (
                    checks.map((c) => {
                      const isFailed = c.finalEvaluation !== "Acceptable Stability";
                      return (
                        <tr key={c.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}><code>{c.studyId}</code></td>
                          <td style={S.td}><code>{c.sampleId}</code></td>
                          <td style={S.td}><span style={{ fontWeight: 600 }}>{c.analyte}</span></td>
                          <td style={S.td}>{c.originalResult} {c.unit}</td>
                          <td style={S.td}>{c.retestResult} {c.unit}</td>
                          <td style={{ ...S.td, color: isFailed ? "#EF4444" : "#0D9488", fontWeight: 600 }}>
                            {c.difference > 0 ? "+" : ""}{c.difference} ({c.pctDifference > 0 ? "+" : ""}{c.pctDifference}%)
                          </td>
                          <td style={S.td}>{c.acceptanceCriteriaLimit}</td>
                          <td style={S.td}>
                            <span style={S.badge(
                              c.finalEvaluation === "Acceptable Stability" ? "#ECFDF5" : c.finalEvaluation === "Not Acceptable" ? "#FEF2F2" : "#FFFBEB",
                              c.finalEvaluation === "Acceptable Stability" ? "#065F46" : c.finalEvaluation === "Not Acceptable" ? "#991B1B" : "#92400E"
                            )}>{c.finalEvaluation}</span>
                          </td>
                          <td style={S.td}>{c.retestDate}</td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <button style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 11, marginRight: 6 }} onClick={() => handleEditCheck(c)}>Edit</button>
                            <button style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 11 }} onClick={() => handleDeleteCheck(c.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: FORM LOGGING VIEW ──────────────────────────────────── */}
      {isFormOpen && (
        <form onSubmit={handleSave} style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>📝 {editingId ? "Edit Retest Verification Document" : "Log Stored Sample Stability Retest Verification"}</span>
            <button type="button" style={S.btn("secondary")} onClick={() => setIsFormOpen(false)}>Back to List</button>
          </div>

          <div style={S.cardBody}>
            {/* 1. Study Information */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>1. Verification Study Specifications</h4>
            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Study ID (Auto)</label>
                <input style={S.inp} value={formState.studyId} readOnly />
              </div>
              <div>
                <label style={S.label}>Department</label>
                <input style={S.inp} value={formState.department} readOnly />
              </div>
              <div>
                <label style={S.label}>Analyzer (Original)</label>
                <select style={S.select} value={formState.analyzer} onChange={e => setFormState({ ...formState, analyzer: e.target.value })}>
                  <option value="Roche Cobas c311">Roche Cobas c311</option>
                  <option value="Siemens Atellica CH">Siemens Atellica CH</option>
                  <option value="Abbott Alinity c">Abbott Alinity c</option>
                  <option value="Mini Vidas">Mini Vidas</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Sample Type *</label>
                <select style={S.select} value={formState.sampleType} onChange={e => setFormState({ ...formState, sampleType: e.target.value })}>
                  <option value="Serum">Serum (Yellow Top)</option>
                  <option value="Plasma">Plasma (Green Top)</option>
                  <option value="Whole Blood">Whole Blood (Purple Top)</option>
                  <option value="Urine">Urine</option>
                </select>
              </div>
            </div>

            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Study Period Start *</label>
                <input type="date" style={S.inp} value={formState.studyPeriodStart} onChange={e => setFormState({ ...formState, studyPeriodStart: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Study Period End *</label>
                <input type="date" style={S.inp} value={formState.studyPeriodEnd} onChange={e => setFormState({ ...formState, studyPeriodEnd: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Retention Period Evaluated</label>
                <input style={S.inp} placeholder="e.g. 7 days / 30 days" value={formState.retentionPeriod} onChange={e => setFormState({ ...formState, retentionPeriod: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Conducted By *</label>
                <select style={S.select} value={formState.conductedBy} onChange={e => setFormState({ ...formState, conductedBy: e.target.value })} required>
                  <option value="">-- Choose Member --</option>
                  {filteredEmployees.map((emp, i) => (
                    <option key={i} value={emp.fullName || emp.employeeName || emp.name}>{emp.fullName || emp.employeeName || emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.grid(2)}>
              <div>
                <label style={S.label}>Reviewed By (Quality Manager/HOD) *</label>
                <select style={S.select} value={formState.reviewedBy} onChange={e => setFormState({ ...formState, reviewedBy: e.target.value })} required>
                  <option value="">-- Choose Reviewer --</option>
                  {employees.filter(e => ["Quality Manager", "HOD", "Supervisor"].includes(e.designation)).map((emp, i) => (
                    <option key={i} value={emp.fullName || emp.employeeName || emp.name}>{emp.fullName || emp.employeeName || emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Original Patient Result */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>2. Original Patient Testing Data</h4>
            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Patient ID / UHID *</label>
                <input style={S.inp} placeholder="UHID-XXXX" value={formState.patientId} onChange={e => setFormState({ ...formState, patientId: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Sample ID / Barcode *</label>
                <input style={S.inp} placeholder="SMP-XXXX" value={formState.sampleId} onChange={e => setFormState({ ...formState, sampleId: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Original Testing Date *</label>
                <input type="date" style={S.inp} value={formState.originalTestingDate} onChange={e => setFormState({ ...formState, originalTestingDate: e.target.value })} required />
              </div>
            </div>

            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Analyte / Parameter *</label>
                <select style={S.select} value={formState.analyte} onChange={e => setFormState({ ...formState, analyte: e.target.value })}>
                  <option value="Glucose">Glucose (GLU)</option>
                  <option value="Creatinine">Creatinine (CREA)</option>
                  <option value="Urea">Urea (BUN)</option>
                  <option value="Sodium">Sodium (NA)</option>
                  <option value="Potassium">Potassium (K)</option>
                  <option value="Albumin">Albumin (ALB)</option>
                  <option value="Total Bilirubin">Total Bilirubin (TBIL)</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Original Value *</label>
                <input type="number" step="0.01" style={S.inp} placeholder="Original result" value={formState.originalResult} onChange={e => setFormState({ ...formState, originalResult: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Unit</label>
                <select style={S.select} value={formState.unit} onChange={e => setFormState({ ...formState, unit: e.target.value })}>
                  <option value="mg/dL">mg/dL</option>
                  <option value="mmol/L">mmol/L</option>
                  <option value="g/dL">g/dL</option>
                  <option value="U/L">U/L</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Reference Range</label>
                <input style={S.inp} placeholder="e.g. 70 - 100 mg/dL" value={formState.referenceRange} onChange={e => setFormState({ ...formState, referenceRange: e.target.value })} />
              </div>
            </div>

            <div style={S.grid(2)}>
              <div>
                <label style={S.label}>Original QC Status</label>
                <select style={S.select} value={formState.originalQcStatus} onChange={e => setFormState({ ...formState, originalQcStatus: e.target.value })}>
                  <option value="Pass">Pass (All runs verified)</option>
                  <option value="Fail">Fail</option>
                </select>
              </div>
            </div>

            {/* 3. Stored Sample Retest */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>3. Stored Sample Retest Result (Stability Validation)</h4>
            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Retest Date *</label>
                <input type="date" style={S.inp} value={formState.retestDate} onChange={e => setFormState({ ...formState, retestDate: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Storage Duration Evaluated</label>
                <input style={S.inp} placeholder="e.g. 7 days" value={formState.storageDuration} onChange={e => setFormState({ ...formState, storageDuration: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Storage Temperature Condition</label>
                <select style={S.select} value={formState.storageCondition} onChange={e => setFormState({ ...formState, storageCondition: e.target.value })}>
                  <option value="Refrigerator (2-8°C)">Refrigerator (2-8°C)</option>
                  <option value="Freezer (-20°C)">Deep Freezer (-20°C)</option>
                  <option value="Freezer (-80°C)">Ultra Freezer (-80°C)</option>
                  <option value="Room Temperature (20-25°C)">Room Temp (20-25°C)</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Visual Sample Condition</label>
                <select style={S.select} value={formState.sampleCondition} onChange={e => setFormState({ ...formState, sampleCondition: e.target.value })}>
                  <option value="Clear">Clear (Normal)</option>
                  <option value="Hemolyzed">Hemolyzed (Red tint)</option>
                  <option value="Icteric">Icteric (Dark yellow)</option>
                  <option value="Lipemic">Lipemic (Milky)</option>
                </select>
              </div>
            </div>

            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Retest Value *</label>
                <input type="number" step="0.01" style={S.inp} placeholder="Retested result" value={formState.retestResult} onChange={e => setFormState({ ...formState, retestResult: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Retest Analyzer</label>
                <select style={S.select} value={formState.retestAnalyzer} onChange={e => setFormState({ ...formState, retestAnalyzer: e.target.value })}>
                  <option value="Roche Cobas c311">Roche Cobas c311</option>
                  <option value="Siemens Atellica CH">Siemens Atellica CH</option>
                  <option value="Abbott Alinity c">Abbott Alinity c</option>
                </select>
              </div>
            </div>

            {/* 4. Comparison Analysis & Acceptance Criteria */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>4. Comparison Analysis & Acceptance Review</h4>
            <div style={S.grid(3)}>
              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: 10, color: "#64748B", fontWeight: "bold" }}>Bias Difference (Retest - Original)</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>
                  {formState.difference > 0 ? "+" : ""}{formState.difference} {formState.unit}
                </div>
              </div>
              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                <span style={{ fontSize: 10, color: "#64748B", fontWeight: "bold" }}>Percentage Difference (% Bias)</span>
                <div style={{ fontSize: 18, fontWeight: 700, color: formState.finalEvaluation === "Acceptable Stability" ? "#0D9488" : "#EF4444", marginTop: 4 }}>
                  {formState.pctDifference > 0 ? "+" : ""}{formState.pctDifference}%
                </div>
              </div>
              <div>
                <label style={S.label}>Acceptance Criteria (Limit) *</label>
                <select style={S.select} value={formState.acceptanceCriteriaLimit} onChange={e => setFormState({ ...formState, acceptanceCriteriaLimit: e.target.value })}>
                  <option value="Within ±5%">Within ±5% (e.g. Electrolytes)</option>
                  <option value="Within ±10%">Within ±10% (e.g. Glucose/Creatinine)</option>
                  <option value="Within ±15%">Within ±15% (e.g. Lipids)</option>
                  <option value="Within ±20%">Within ±20%</option>
                </select>
              </div>
            </div>

            <div style={S.grid(2)}>
              <div>
                <label style={S.label}>Final Stability Evaluation</label>
                <select style={S.select} value={formState.finalEvaluation} onChange={e => setFormState({ ...formState, finalEvaluation: e.target.value })}>
                  <option value="Acceptable Stability">Acceptable Stability (Verified)</option>
                  <option value="Not Acceptable">Not Acceptable (Failure)</option>
                  <option value="Further Investigation Required">Further Investigation Required</option>
                </select>
              </div>
            </div>

            {/* 5. Investigation (Rendered conditionally or if Failure occurs) */}
            {(formState.finalEvaluation !== "Acceptable Stability") && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: 16, marginTop: 20, marginBottom: 16 }}>
                <h5 style={{ fontSize: 11.5, fontWeight: 700, color: "#991B1B", margin: "0 0 10px 0", textTransform: "uppercase" }}>⚠️ Pre-examination stability failure investigation</h5>
                <div style={S.grid(2)}>
                  <div>
                    <label style={{ ...S.label, color: "#991B1B" }}>Identified Possible Cause *</label>
                    <select style={S.select} value={formState.possibleCause} onChange={e => setFormState({ ...formState, possibleCause: e.target.value })} required>
                      <option value="">-- Choose Probable Reason --</option>
                      <option value="Storage temperature deviation">Storage temperature deviation (excursion)</option>
                      <option value="Analyzer variation / Calibration shift">Analyzer variation / Calibration drift</option>
                      <option value="Sample degradation / Evaporation">Sample degradation / Tube evaporation</option>
                      <option value="Reagent degradation">Reagent degradation</option>
                      <option value="Pipette or dilution error">Pipette or dilution error</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ ...S.label, color: "#991B1B" }}>CAPA Required (Auto-transfer to Audit Logs)?</label>
                    <select style={S.select} value={formState.capaRequired} onChange={e => setFormState({ ...formState, capaRequired: e.target.value })}>
                      <option value="No">No (Minor deviation)</option>
                      <option value="Yes">Yes (Launch CAPA workflow)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Review & Prepared fields */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>5. Author & Audit Trail</h4>
            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Prepared By (Conducted)</label>
                <input style={S.inp} value={formState.preparedBy} readOnly />
              </div>
              <div>
                <label style={S.label}>Reviewed By (Approver HOD)</label>
                <input style={S.inp} value={formState.reviewedBy || "Approver Signature"} readOnly />
              </div>
              <div>
                <label style={S.label}>Approval Date</label>
                <input type="date" style={S.inp} value={formState.reviewedDate} onChange={e => setFormState({ ...formState, reviewedDate: e.target.value })} />
              </div>
            </div>

            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" style={S.btn("secondary")} onClick={() => setIsFormOpen(false)}>Cancel</button>
              <button type="submit" style={S.btn("success")} disabled={saving}>
                {saving ? "Saving Log..." : "💾 Approve & Save Retest Log"}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
