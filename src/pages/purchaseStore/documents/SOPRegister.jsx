import { useState, useEffect } from "react";
import { getSopDocs, createSopDoc } from "../firestore/sopDocuments";
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


export default function SOPRegister() {
  const { name } = useAuth();
  const [sops, setSops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    docNo: "",
    title: "",
    revNo: "1",
    effectiveDate: "",
    status: "Active"
  });

  const loadData = async () => {
    try {
      const data = await getSopDocs();
      setSops(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.docNo || !form.title || !form.effectiveDate) {
      alert("Please fill required fields.");
      return;
    }
    setSaving(true);
    try {
      await createSopDoc({
        ...form,
        createdBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ docNo: "", title: "", revNo: "1", effectiveDate: "", status: "Active" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log SOP.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Standard Operating Procedures (SOPs) Register (SOP/17)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §8.2 · Store master control SOP reference codes and document logs</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Register SOP</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading SOPs...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Document Number</th>
                <th style={S.th}>SOP Title</th>
                <th style={S.th}>Revision Number</th>
                <th style={S.th}>Effective Date</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Approved By</th>
              </tr>
            </thead>
            <tbody>
              {sops.map(s => (
                <tr key={s.id}>
                  <td style={S.td}><code>{s.docNo}</code></td>
                  <td style={S.td}><strong>{s.title}</strong></td>
                  <td style={S.td}>Rev {s.revNo}</td>
                  <td style={S.td}>{s.effectiveDate}</td>
                  <td style={S.td}><span style={S.badge(s.status === "Active" ? "#E6F4EA" : "#FCE8E6", s.status === "Active" ? "#137333" : "#C5221F")}>{s.status}</span></td>
                  <td style={S.td}>{s.createdBy}</td>
                </tr>
              ))}
              {sops.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No SOP documents registered yet.</td>
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
              <strong style={{ fontSize: 16 }}>Register SOP Document</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>SOP Document Number *</label>
                  <input style={S.input} required value={form.docNo} onChange={e => setForm({...form, docNo: e.target.value})} placeholder="e.g. SOP/PUR/001" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Revision Number *</label>
                  <input style={S.input} required type="number" min={1} value={form.revNo} onChange={e => setForm({...form, revNo: e.target.value})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>SOP Title *</label>
                <input style={S.input} required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Calibration procedures of store room refrigerators" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Effective Date *</label>
                  <input style={S.input} type="date" required value={form.effectiveDate} onChange={e => setForm({...form, effectiveDate: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Status</label>
                  <select style={S.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option>Active</option>
                    <option>Obsolete</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Register SOP"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}