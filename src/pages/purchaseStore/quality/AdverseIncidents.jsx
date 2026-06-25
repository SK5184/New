import { useState, useEffect } from "react";
import { getAdverseIncidents, createAdverseIncident } from "../firestore/adverseIncidents";
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


export default function AdverseIncidents() {
  const { name } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    reagentName: "",
    batchNo: "",
    issueDescription: "",
    correctiveAction: ""
  });

  const loadData = async () => {
    try {
      const data = await getAdverseIncidents();
      setIncidents(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reagentName || !form.issueDescription) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      await createAdverseIncident({
        ...form,
        loggedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ reagentName: "", batchNo: "", issueDescription: "", correctiveAction: "" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log adverse incident.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Adverse Supply Chain Incidents & Recalls Register (AI/12)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Adverse incidents logging and recalls reporting</div>
        </div>
        <button style={S.btn("#DC2626", "#FFF")} onClick={() => setModal(true)}>+ Report Incident</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading incidents...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Reagent / Material</th>
                <th style={S.th}>Batch No</th>
                <th style={S.th}>Issue Description</th>
                <th style={S.th}>Corrective / Preventive Action</th>
                <th style={S.th}>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(i => (
                <tr key={i.id}>
                  <td style={S.td}><strong>{i.reagentName}</strong></td>
                  <td style={S.td}><code>{i.batchNo || "—"}</code></td>
                  <td style={S.td} style={{ color: "#DC2626" }}>{i.issueDescription}</td>
                  <td style={S.td}>{i.correctiveAction}</td>
                  <td style={S.td}>{i.loggedBy}</td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No adverse incidents recorded.</td>
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
              <strong style={{ fontSize: 16 }}>Report Adverse Incident / Recall</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Reagent / Material Name *</label>
                <input style={S.input} required value={form.reagentName} onChange={e => setForm({...form, reagentName: e.target.value})} placeholder="e.g. Glucose Analyzer Reagent pack" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Batch / Lot Number</label>
                <input style={S.input} value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} placeholder="e.g. LOT-X-9002" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Description of Issue (Adverse Event / Manufacturer Recall) *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.issueDescription} onChange={e => setForm({...form, issueDescription: e.target.value})} placeholder="e.g. Defective calibrator value resulting in false high values." />
              </div>
              <div style={S.field}>
                <label style={S.label}>Immediate Action / Corrective Actions Taken</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.correctiveAction} onChange={e => setForm({...form, correctiveAction: e.target.value})} placeholder="e.g. Discarded lot, notified vendor, re-ran patient tests." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn("#DC2626", "#FFF")} disabled={saving}>{saving ? "Submitting..." : "Report Incident"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}