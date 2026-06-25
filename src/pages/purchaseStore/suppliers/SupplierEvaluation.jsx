import { useState, useEffect } from "react";
import { getEvaluations, createEvaluation } from "../firestore/supplierEvaluations";
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


export default function SupplierEvaluation() {
  const { name } = useAuth();
  const [evals, setEvals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: "Sysmex India",
    qualityScore: 5,
    deliveryScore: 5,
    pricingScore: 5,
    supportScore: 5,
    remarks: ""
  });

  const loadData = async () => {
    try {
      const data = await getEvaluations();
      setEvals(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const avgScore = (parseInt(form.qualityScore) + parseInt(form.deliveryScore) + parseInt(form.pricingScore) + parseInt(form.supportScore)) / 4;
      await createEvaluation({
        ...form,
        averageScore: avgScore,
        evaluatedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ supplierName: "Sysmex India", qualityScore: 5, deliveryScore: 5, pricingScore: 5, supportScore: 5, remarks: "" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log evaluation.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Annual Supplier Performance Evaluation (SUP/02)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.2 · Evaluation based on quality, delivery, and service criteria</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Add Evaluation</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading evaluations...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Supplier Name</th>
                <th style={S.th}>Quality (1-5)</th>
                <th style={S.th}>Delivery (1-5)</th>
                <th style={S.th}>Support (1-5)</th>
                <th style={S.th}>Average Score</th>
                <th style={S.th}>Evaluated By</th>
                <th style={S.th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {evals.map(e => (
                <tr key={e.id}>
                  <td style={S.td}><strong>{e.supplierName}</strong></td>
                  <td style={S.td}>{e.qualityScore}/5</td>
                  <td style={S.td}>{e.deliveryScore}/5</td>
                  <td style={S.td}>{e.supportScore}/5</td>
                  <td style={S.td}>
                    <span style={S.badge(e.averageScore >= 4 ? "#E6F4EA" : e.averageScore >= 2.5 ? "#FEF3C7" : "#FCE8E6", e.averageScore >= 4 ? "#137333" : e.averageScore >= 2.5 ? "#92400E" : "#C5221F")}>
                      {e.averageScore.toFixed(1)} / 5.0
                    </span>
                  </td>
                  <td style={S.td}>{e.evaluatedBy}</td>
                  <td style={S.td}>{e.remarks}</td>
                </tr>
              ))}
              {evals.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No evaluations recorded yet.</td>
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
              <strong style={{ fontSize: 16 }}>Supplier Performance Evaluation</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Supplier Name *</label>
                <select style={S.input} value={form.supplierName} onChange={e => setForm({...form, supplierName: e.target.value})}>
                  <option>Sysmex India</option>
                  <option>Roche Diagnostics</option>
                  <option>Bio-Rad Laboratories</option>
                  <option>CMC Medicals</option>
                </select>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Quality of Material (1-5)</label>
                  <input style={S.input} type="number" min={1} max={5} value={form.qualityScore} onChange={e => setForm({...form, qualityScore: parseInt(e.target.value) || 5})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Delivery Timelines (1-5)</label>
                  <input style={S.input} type="number" min={1} max={5} value={form.deliveryScore} onChange={e => setForm({...form, deliveryScore: parseInt(e.target.value) || 5})} />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Pricing Competitiveness (1-5)</label>
                  <input style={S.input} type="number" min={1} max={5} value={form.pricingScore} onChange={e => setForm({...form, pricingScore: parseInt(e.target.value) || 5})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Technical Support (1-5)</label>
                  <input style={S.input} type="number" min={1} max={5} value={form.supportScore} onChange={e => setForm({...form, supportScore: parseInt(e.target.value) || 5})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Remarks / Improvements Required</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} placeholder="e.g. Delay in delivery noticed in Q3 but quality remains excellent." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Evaluation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}