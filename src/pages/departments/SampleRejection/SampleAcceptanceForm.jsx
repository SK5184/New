// SampleAcceptanceForm.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { addAssessment, getAssessments } from "./sampleRejectionService";

export default function SampleAcceptanceForm({ department, onLogException }) {
  const { userName } = useAuth();
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    accessionNumber: "",
    patientId: "",
    collectionDate: new Date().toISOString().split("T")[0],
    collectionCentre: "Main Laboratory",
    department: department || "Biochemistry",
    testRequested: "",
    checks: {
      patientIdCheck: "Pass",
      tubeCheck: "Pass",
      volumeCheck: "Pass",
      hemolysisCheck: "Pass",
      lipemiaCheck: "Pass",
      icterusCheck: "Pass",
      clotCheck: "Pass",
      transportCheck: "Pass"
    },
    decision: "Accept",
    reasons: [],
    remarks: ""
  });

  const loadAssessments = async () => {
    setLoading(true);
    const data = await getAssessments(department);
    // Sort by createdAt desc
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setAssessments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAssessments();
  }, [department]);

  // Handle reasons checkboxes
  const handleReasonCheckbox = (reason) => {
    const copy = [...form.reasons];
    if (copy.includes(reason)) {
      setForm({ ...form, reasons: copy.filter(r => r !== reason) });
    } else {
      setForm({ ...form, reasons: [...copy, reason] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accessionNumber || !form.patientId || !form.testRequested) {
      alert("Please fill in Accession Number, Patient ID, and Test Requested.");
      return;
    }

    setSaving(true);
    try {
      await addAssessment({
        ...form,
        loggedBy: userName || "Staff"
      });
      alert("Sample assessment logged successfully.");
      setForm({
        accessionNumber: "",
        patientId: "",
        collectionDate: new Date().toISOString().split("T")[0],
        collectionCentre: "Main Laboratory",
        department: department || "Biochemistry",
        testRequested: "",
        checks: {
          patientIdCheck: "Pass",
          tubeCheck: "Pass",
          volumeCheck: "Pass",
          hemolysisCheck: "Pass",
          lipemiaCheck: "Pass",
          icterusCheck: "Pass",
          clotCheck: "Pass",
          transportCheck: "Pass"
        },
        decision: "Accept",
        reasons: [],
        remarks: ""
      });
      loadAssessments();
    } catch (err) {
      alert("Error logging sample check. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const S = {
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    cardBody: { padding: 16 },
    inp: { padding: "6px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 11, fontWeight: 500, color: "#475569", display: "block", marginBottom: 4 },
    btn: (bg, color) => ({
      padding: "6px 14px", background: bg || "#0F6E56", color: color || "#FFF",
      border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 12px", borderBottom: "0.5px solid #CBD5E1", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" },
    badge: (dec) => {
      const cfg = {
        Accept: { bg: "#E2F0D9", color: "#385723" },
        Reject: { bg: "#FCEBEB", color: "#C00000" },
        "Conditional Acceptance": { bg: "#FFF2CC", color: "#7F6000" },
        "Accepted with Exception": { bg: "#E8F0FE", color: "#1A73E8" }
      };
      const c = cfg[dec] || { bg: "#F1F5F9", color: "#475569" };
      return {
        padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600,
        background: c.bg, color: c.color, border: `0.5px solid ${c.color}`
      };
    }
  };

  const DEPT_OPTS = [
    "Biochemistry", "Haematology", "Microbiology", "Serology", 
    "Flow Cytometry", "Cytogenetics", "Clinical Pathology", 
    "Molecular Biology", "Molecular Genetics"
  ];

  const REASONS = [
    "Hemolysed", "Insufficient quantity", "Wrong container", 
    "Clotted sample", "Delayed transport", "Temperature excursion"
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
      {/* Entry Form */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Pre-Analytical Acceptance Checklist</span>
          <span style={{ fontSize: 11, color: "#64748B" }}>ISO 15189:2022 §7.2.5</span>
        </div>
        <div style={S.cardBody}>
          <form onSubmit={handleSubmit}>
            {/* Identity Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <span style={S.label}>Accession Number *</span>
                <input 
                  style={S.inp} 
                  placeholder="e.g. ACC-26-9081" 
                  required 
                  value={form.accessionNumber} 
                  onChange={e => setForm({...form, accessionNumber: e.target.value})} 
                />
              </div>
              <div>
                <span style={S.label}>Patient ID *</span>
                <input 
                  style={S.inp} 
                  placeholder="e.g. P-0092" 
                  required 
                  value={form.patientId} 
                  onChange={e => setForm({...form, patientId: e.target.value})} 
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <span style={S.label}>Collection Date *</span>
                <input 
                  style={S.inp} 
                  type="date" 
                  required 
                  value={form.collectionDate} 
                  onChange={e => setForm({...form, collectionDate: e.target.value})} 
                />
              </div>
              <div>
                <span style={S.label}>Collection Centre</span>
                <select 
                  style={S.inp} 
                  value={form.collectionCentre} 
                  onChange={e => setForm({...form, collectionCentre: e.target.value})}
                >
                  <option value="Main Laboratory">Main Laboratory</option>
                  <option value="Satellite Clinic A">Satellite Clinic A</option>
                  <option value="Collection Centre B">Collection Centre B</option>
                  <option value="Home Sample Collection">Home Sample Collection</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <span style={S.label}>Target Department</span>
                {department ? (
                  <input style={{...S.inp, background: "#F1F5F9"}} value={department} readOnly />
                ) : (
                  <select 
                    style={S.inp} 
                    value={form.department} 
                    onChange={e => setForm({...form, department: e.target.value})}
                  >
                    {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
              </div>
              <div>
                <span style={S.label}>Test Requested *</span>
                <input 
                  style={S.inp} 
                  placeholder="e.g. Potassium, Complete Blood Count" 
                  required 
                  value={form.testRequested} 
                  onChange={e => setForm({...form, testRequested: e.target.value})} 
                />
              </div>
            </div>

            {/* Checklists Parameters */}
            <div style={{ border: "0.5px solid #E2E8F0", borderRadius: 8, padding: 10, background: "#F8FAFC", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", display: "block", marginBottom: 8 }}>
                Pre-Examination Assessment Checks
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(form.checks).map(([checkKey, checkVal]) => {
                  const labelMap = {
                    patientIdCheck: "Patient Identification",
                    tubeCheck: "Correct Tube / Container",
                    volumeCheck: "Adequate Sample Volume",
                    hemolysisCheck: "No Hemolysis",
                    lipemiaCheck: "No Lipemia",
                    icterusCheck: "No Icterus",
                    clotCheck: "No Clot (if EDTA)",
                    transportCheck: "Transport Temp/Condition"
                  };
                  return (
                    <div key={checkKey} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#475569" }}>{labelMap[checkKey] || checkKey}</span>
                      <select 
                        style={{ padding: "2px 5px", fontSize: 11, borderRadius: 4, border: "0.5px solid #CBD5E1" }}
                        value={checkVal}
                        onChange={e => {
                          const checksCopy = { ...form.checks, [checkKey]: e.target.value };
                          // Auto set decision to Reject if major things fail (optional, but keep it manual)
                          setForm({ ...form, checks: checksCopy });
                        }}
                      >
                        <option value="Pass">Pass</option>
                        <option value="Fail">Fail</option>
                        <option value="N/A">N/A</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Decision Logic */}
            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>Acceptance Decision *</span>
              <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#385723", fontWeight: 600 }}>
                  <input 
                    type="radio" 
                    name="decision" 
                    value="Accept" 
                    checked={form.decision === "Accept"}
                    onChange={() => setForm({ ...form, decision: "Accept", reasons: [] })}
                  /> Accept
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#C00000", fontWeight: 600 }}>
                  <input 
                    type="radio" 
                    name="decision" 
                    value="Reject"
                    checked={form.decision === "Reject"}
                    onChange={() => setForm({ ...form, decision: "Reject" })}
                  /> Reject
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#B25E00", fontWeight: 600 }}>
                  <input 
                    type="radio" 
                    name="decision" 
                    value="Conditional Acceptance"
                    checked={form.decision === "Conditional Acceptance"}
                    onChange={() => setForm({ ...form, decision: "Conditional Acceptance" })}
                  /> Conditional Acceptance
                </label>
              </div>
            </div>

            {/* Reason Code checkboxes */}
            {(form.decision === "Reject" || form.decision === "Conditional Acceptance") && (
              <div style={{ border: "0.5px solid #F87171", borderRadius: 8, padding: 10, background: "#FFF5F5", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", display: "block", marginBottom: 6 }}>
                  Select Rejection / Deviation Reasons *
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {REASONS.map(r => (
                    <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                      <input 
                        type="checkbox"
                        checked={form.reasons.includes(r)}
                        onChange={() => handleReasonCheckbox(r)}
                      />
                      {r}
                    </label>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569" }}>
                    <input 
                      type="checkbox"
                      checked={form.reasons.includes("Other")}
                      onChange={() => handleReasonCheckbox("Other")}
                    />
                    Other / Label Error
                  </label>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>Rejection Remarks / Risk Comments</span>
              <input 
                style={S.inp} 
                placeholder="e.g. Hemolysis level severe, repeating collection" 
                value={form.remarks} 
                onChange={e => setForm({...form, remarks: e.target.value})} 
              />
            </div>

            <button type="submit" disabled={saving} style={{...S.btn(null, null), width: "100%"}}>
              {saving ? "Saving Assessment log..." : "✓ Log Sample Acceptance Assessment"}
            </button>
          </form>
        </div>
      </div>

      {/* Log History list */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Recent Pre-Analytical Assessments</span>
          <button onClick={loadAssessments} style={S.btn("#64748B", "#FFF")}>🔄 Refresh</button>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "560px" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>Retrieving assessments history...</div>
          ) : assessments.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>No assessments logged yet.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Accession ID</th>
                  <th style={S.th}>Patient ID</th>
                  {!department && <th style={S.th}>Dept</th>}
                  <th style={S.th}>Test</th>
                  <th style={S.th}>Assessment</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => {
                  const hasDeviation = a.decision === "Reject" || a.decision === "Conditional Acceptance" || a.decision === "Accepted with Exception";
                  return (
                    <tr key={a.id}>
                      <td style={S.td}>{a.collectionDate}</td>
                      <td style={{...S.td, fontWeight: 600}}>{a.accessionNumber}</td>
                      <td style={S.td}>
                        <div>{a.patientId}</div>
                        <div style={{ fontSize: 10, color: "#64748B" }}>{a.collectionCentre}</div>
                      </td>
                      {!department && <td style={S.td}>{a.department}</td>}
                      <td style={S.td}>{a.testRequested}</td>
                      <td style={S.td}>
                        <span style={S.badge(a.decision)}>{a.decision}</span>
                        {hasDeviation && a.reasons && a.reasons.length > 0 && (
                          <div style={{ fontSize: 9.5, color: "#C00000", marginTop: 4 }}>
                            Reason: {a.reasons.join(", ")}
                          </div>
                        )}
                        {a.remarks && (
                          <div style={{ fontSize: 9.5, color: "#64748B", fontStyle: "italic", marginTop: 2 }}>
                            "{a.remarks}"
                          </div>
                        )}
                      </td>
                      <td style={S.td}>
                        {a.decision === "Conditional Acceptance" && (
                          <button 
                            onClick={() => onLogException(a)}
                            style={{
                              padding: "2px 6px", background: "#FEF3C7", color: "#D97706",
                              border: "0.5px solid #F59E0B", borderRadius: 4, fontSize: 10,
                              fontWeight: 600, cursor: "pointer"
                            }}
                          >
                            ⚠️ Log Exception
                          </button>
                        )}
                        {(a.decision === "Accept" || a.decision === "Accepted with Exception") && (
                          <span style={{ fontSize: 10, color: "#166534", fontWeight: 500 }}>✓ Processed</span>
                        )}
                        {a.decision === "Reject" && (
                          <span style={{ fontSize: 10, color: "#991B1B", fontWeight: 500 }}>✕ Rejected</span>
                        )}
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
  );
}
