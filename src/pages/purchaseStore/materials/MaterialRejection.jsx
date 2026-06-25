import { useState, useEffect } from "react";
import { getRejections, createRejection } from "../firestore/materialRejections";
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


export default function MaterialRejection() {
  const { name } = useAuth();
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialName: "",
    batchNo: "",
    supplierName: "Sysmex India",
    reason: "Temperature Excursion during shipment",
    actionTaken: "Returned to vendor. Initiated contingency stock buffer."
  });

  const loadData = async () => {
    try {
      const data = await getRejections();
      setRejections(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.materialName || !form.batchNo) {
      alert("Please fill required fields.");
      return;
    }
    setSaving(true);
    try {
      await createRejection({
        ...form,
        rejectedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ materialName: "", batchNo: "", supplierName: "Sysmex India", reason: "Temperature Excursion during shipment", actionTaken: "Returned to vendor. Initiated contingency stock buffer." });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log rejection.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Material Non-Conformance & Rejections (MR/06)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Segregation of rejected incoming material</div>
        </div>
        <button style={S.btn("#DC2626", "#FFF")} onClick={() => setModal(true)}>+ Raise Rejection Report</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading rejections...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Material Name</th>
                <th style={S.th}>Batch No</th>
                <th style={S.th}>Supplier</th>
                <th style={S.th}>Reason</th>
                <th style={S.th}>Action Taken</th>
                <th style={S.th}>Rejected By</th>
              </tr>
            </thead>
            <tbody>
              {rejections.map(r => (
                <tr key={r.id}>
                  <td style={S.td}><strong>{r.materialName}</strong></td>
                  <td style={S.td}><code>{r.batchNo}</code></td>
                  <td style={S.td}>{r.supplierName}</td>
                  <td style={S.td}><span style={{ color: "#DC2626", fontWeight: 500 }}>{r.reason}</span></td>
                  <td style={S.td}>{r.actionTaken}</td>
                  <td style={S.td}>{r.rejectedBy}</td>
                </tr>
              ))}
              {rejections.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No rejection reports logged yet.</td>
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
              <strong style={{ fontSize: 16 }}>Raise Material Rejection report</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Material Name *</label>
                <input style={S.input} required value={form.materialName} onChange={e => setForm({...form, materialName: e.target.value})} placeholder="e.g. Immunoassay Control Set" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Batch / Lot No *</label>
                  <input style={S.input} required value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} placeholder="e.g. LC-2026A" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Supplier</label>
                  <select style={S.input} value={form.supplierName} onChange={e => setForm({...form, supplierName: e.target.value})}>
                    <option>Sysmex India</option>
                    <option>Roche Diagnostics</option>
                    <option>Bio-Rad Laboratories</option>
                    <option>CMC Medicals</option>
                  </select>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Reason for Rejection</label>
                <select style={S.input} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}>
                  <option>Temperature Excursion during shipment</option>
                  <option>Damaged Packaging / Seal broken</option>
                  <option>Expiry Date too short (&lt; 3 months)</option>
                  <option>Failed Acceptance checklist verification</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Corrective Action / Action Taken *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.actionTaken} onChange={e => setForm({...form, actionTaken: e.target.value})} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn("#DC2626", "#FFF")} disabled={saving}>{saving ? "Submitting..." : "Submit Rejection"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}