import { useState, useEffect } from "react";
import { getCompetencyRecords, createCompetencyRecord } from "../firestore/competencyRecords";
import { useAuth } from "../../../context/AuthContext";
import { serverTimestamp } from "firebase/firestore";

const S = {
  wrap: { padding: 20, fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh" },
  card: { background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 18, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 500, color: "#475569" },
  input: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0F6E56", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "opacity 0.2s" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F1F5F9", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  modal: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalContent: { background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }
};


export default function CompetencyAssessment() {
  const { name } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "",
    topic: "Verification of cold chain",
    result: "Competent"
  });

  const loadData = async () => {
    try {
      const data = await getCompetencyRecords();
      setRecords(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeName) {
      alert("Employee name is required.");
      return;
    }
    setSaving(true);
    try {
      await createCompetencyRecord({
        ...form,
        assessor: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ employeeName: "", topic: "Verification of cold chain", result: "Competent" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log assessment.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Staff Competency Assessment Records (CA/16)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §5.1.5 · Competency evaluation assessments of store staff</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log Competency Assessment</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading records...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Employee Name</th>
                <th style={S.th}>Assessment Area / Scope</th>
                <th style={S.th}>Assessor</th>
                <th style={S.th}>Result Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td style={S.td}><strong>{r.employeeName}</strong></td>
                  <td style={S.td}>{r.topic}</td>
                  <td style={S.td}>{r.assessor}</td>
                  <td style={S.td}><span style={S.badge(r.result === "Competent" ? "#E6F4EA" : "#FCE8E6", r.result === "Competent" ? "#137333" : "#C5221F")}>{r.result}</span></td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No assessments registered yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={S.modal}>
          <div style={S.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <strong style={{ fontSize: 16 }}>Log Competency Assessment</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Employee Name *</label>
                <input style={S.input} required value={form.employeeName} onChange={e => setForm({...form, employeeName: e.target.value})} placeholder="e.g. Ramesh Singh" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Assessment Topic / Area</label>
                <select style={S.input} value={form.topic} onChange={e => setForm({...form, topic: e.target.value})}>
                  <option>Verification of cold chain</option>
                  <option>Acceptance verification checks (MA/05)</option>
                  <option>Spill containment management</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Assessment Result</label>
                <select style={S.input} value={form.result} onChange={e => setForm({...form, result: e.target.value})}>
                  <option>Competent</option>
                  <option>Requires Retraining</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Competency"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}