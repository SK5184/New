// SampleExceptionForm.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { addException, getExceptions } from "./sampleRejectionService";

export default function SampleExceptionForm({ department, selectedAssessment, onClearAssessment }) {
  const { userName } = useAuth();
  
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    exceptionId: `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    assessmentId: "",
    accessionNumber: "",
    deviation: "",
    clinicalJustification: "",
    riskAssessment: "",
    authorizedApproval: "Pathologist",
    capaRequired: false
  });

  // Pre-fill from selected assessment if passed
  useEffect(() => {
    if (selectedAssessment) {
      setForm(prev => ({
        ...prev,
        assessmentId: selectedAssessment.id || "",
        accessionNumber: selectedAssessment.accessionNumber || "",
        deviation: selectedAssessment.reasons ? selectedAssessment.reasons.join(", ") : "Deviation detected"
      }));
    }
  }, [selectedAssessment]);

  const loadExceptions = async () => {
    setLoading(true);
    const data = await getExceptions(department);
    // Sort desc by date
    data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setExceptions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadExceptions();
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.accessionNumber || !form.deviation || !form.clinicalJustification || !form.riskAssessment) {
      alert("Please fill in Accession Number, Deviation, Clinical Justification, and Risk Assessment.");
      return;
    }

    setSaving(true);
    try {
      await addException({
        ...form,
        department: department || selectedAssessment?.department || "Biochemistry",
        createdBy: userName || "Staff"
      });
      alert("Sample deviation exception approved and recorded.");
      setForm({
        exceptionId: `EXP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        assessmentId: "",
        accessionNumber: "",
        deviation: "",
        clinicalJustification: "",
        riskAssessment: "",
        authorizedApproval: "Pathologist",
        capaRequired: false
      });
      if (onClearAssessment) onClearAssessment();
      loadExceptions();
    } catch (err) {
      alert("Error logging exception. Please try again.");
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
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
      {/* Form Card */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Sample Acceptance Exception Approval</span>
          <span style={{ fontSize: 10, background: "#FEF3C7", color: "#D97706", padding: "2px 8px", borderRadius: 12 }}>
            Deviation Handling (ISO §7.2.5 / Nonconforming Work §7.10)
          </span>
        </div>
        <div style={S.cardBody}>
          {selectedAssessment && (
            <div style={{
              background: "#EFF6FF", border: "0.5px solid #BFDBFE", borderRadius: 8,
              padding: 10, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: 11, color: "#1E3A8A", display: "block", fontWeight: 700 }}>
                  Linked Sample: {selectedAssessment.accessionNumber}
                </span>
                <span style={{ fontSize: 10.5, color: "#3B82F6" }}>
                  Deviations: {selectedAssessment.reasons?.join(", ")} | Test: {selectedAssessment.testRequested}
                </span>
              </div>
              <button 
                onClick={onClearAssessment} 
                style={{
                  background: "transparent", border: "none", color: "#1D4ED8",
                  fontSize: 11, fontWeight: 600, cursor: "pointer"
                }}
              >
                ✕ Deselect
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <span style={S.label}>Exception ID</span>
                <input style={{...S.inp, background: "#F1F5F9"}} value={form.exceptionId} readOnly />
              </div>
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
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>Deviation Parameter *</span>
              <input 
                style={S.inp} 
                placeholder="e.g. Hemolysis, Insufficient quantity" 
                required 
                value={form.deviation} 
                onChange={e => setForm({...form, deviation: e.target.value})} 
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>Clinical Justification for Acceptance *</span>
              <textarea 
                style={{...S.inp, height: 50, resize: "none"}} 
                placeholder="e.g. Critical emergency patient sample. Repeat collection is delayed or risky." 
                required 
                value={form.clinicalJustification} 
                onChange={e => setForm({...form, clinicalJustification: e.target.value})} 
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <span style={S.label}>Risk Assessment & Interference Comments *</span>
              <textarea 
                style={{...S.inp, height: 50, resize: "none"}} 
                placeholder="e.g. Potential pseudo-elevation in potassium levels due to cell rupture." 
                required 
                value={form.riskAssessment} 
                onChange={e => setForm({...form, riskAssessment: e.target.value})} 
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <span style={S.label}>Authorized Approval Authority</span>
                <select 
                  style={S.inp} 
                  value={form.authorizedApproval} 
                  onChange={e => setForm({...form, authorizedApproval: e.target.value})}
                >
                  <option value="Pathologist">Pathologist</option>
                  <option value="Biochemist">Biochemist</option>
                  <option value="Laboratory Director">Laboratory Director</option>
                  <option value="HOD">Department HOD</option>
                  <option value="Quality Manager">Quality Manager</option>
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={S.label}>Raise CAPA Request?</span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 4, cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={form.capaRequired} 
                    onChange={e => setForm({...form, capaRequired: e.target.checked})} 
                  />
                  Yes, log CAPA
                </label>
              </div>
            </div>

            <button type="submit" disabled={saving} style={{...S.btn(null, null), width: "100%"}}>
              {saving ? "Filing exception..." : "✓ Authorize Exception Approval"}
            </button>
          </form>
        </div>
      </div>

      {/* Exception Log list */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Deviation & Exception Approvals Register</span>
          <button onClick={loadExceptions} style={S.btn("#64748B", "#FFF")}>🔄 Refresh</button>
        </div>
        <div style={{ overflowX: "auto", maxHeight: "560px" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>Retrieving exceptions register...</div>
          ) : exceptions.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>No deviation exception approvals documented.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Accession</th>
                  <th style={S.th}>Deviation</th>
                  <th style={S.th}>Justification & Risk</th>
                  <th style={S.th}>Approver</th>
                  <th style={S.th}>CAPA</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map(e => (
                  <tr key={e.id}>
                    <td style={{...S.td, fontWeight: 600, color: "#1D4ED8"}}>{e.exceptionId}</td>
                    <td style={{...S.td, fontWeight: 600}}>{e.accessionNumber}</td>
                    <td style={{...S.td, color: "#991B1B", fontWeight: 500}}>{e.deviation}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>Justification:</div>
                      <div style={{ color: "#475569", marginBottom: 4 }}>"{e.clinicalJustification}"</div>
                      <div style={{ fontWeight: 600 }}>Risk:</div>
                      <div style={{ color: "#475569", fontStyle: "italic" }}>"{e.riskAssessment}"</div>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{e.authorizedApproval}</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>by {e.createdBy}</div>
                    </td>
                    <td style={S.td}>
                      <span style={{
                        padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 600,
                        background: e.capaRequired ? "#FEE2E2" : "#F1F5F9",
                        color: e.capaRequired ? "#991B1B" : "#475569"
                      }}>
                        {e.capaRequired ? "⚠️ Logged" : "None"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
