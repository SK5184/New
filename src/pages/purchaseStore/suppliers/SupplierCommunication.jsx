import { useState, useEffect } from "react";
import { getCommunications, createCommunication } from "../firestore/supplierCommunications";
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


export default function SupplierCommunication() {
  const { name } = useAuth();
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: "Sysmex India",
    type: "Email",
    subject: "",
    message: "",
    status: "Awaiting Action"
  });

  const loadData = async () => {
    try {
      const data = await getCommunications();
      setComms(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject || !form.message) {
      alert("Please fill all fields.");
      return;
    }
    setSaving(true);
    try {
      await createCommunication({
        ...form,
        loggedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ supplierName: "Sysmex India", type: "Email", subject: "", message: "", status: "Awaiting Action" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save communication.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Supplier Communications & Correspondence Log (SUP/03)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.2 · Communication logs for deviations, recall alerts, and price updates</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log Correspondence</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading logs...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Supplier</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Subject</th>
                <th style={S.th}>Details</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {comms.map(c => (
                <tr key={c.id}>
                  <td style={S.td}><strong>{c.supplierName}</strong></td>
                  <td style={S.td}>{c.type}</td>
                  <td style={S.td}><strong>{c.subject}</strong></td>
                  <td style={S.td}>{c.message}</td>
                  <td style={S.td}><span style={S.badge(c.status === "Resolved" ? "#E6F4EA" : "#EFF6FF", c.status === "Resolved" ? "#137333" : "#1E40AF")}>{c.status}</span></td>
                  <td style={S.td}>{c.loggedBy}</td>
                </tr>
              ))}
              {comms.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No correspondence logged yet.</td>
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
              <strong style={{ fontSize: 16 }}>Log Supplier Communication</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Supplier *</label>
                  <select style={S.input} value={form.supplierName} onChange={e => setForm({...form, supplierName: e.target.value})}>
                    <option>Sysmex India</option>
                    <option>Roche Diagnostics</option>
                    <option>Bio-Rad Laboratories</option>
                    <option>CMC Medicals</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Communication Type</label>
                  <select style={S.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option>Email</option>
                    <option>Phone Call</option>
                    <option>Audit Correspondence</option>
                    <option>Service Report</option>
                  </select>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Subject *</label>
                <input style={S.input} required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g. Temperature excursion warning batch X-12" />
              </div>
              <div style={S.field}>
                <label style={S.label}>Details / message *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Awaiting Action</option>
                  <option>Resolved</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Communication"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}