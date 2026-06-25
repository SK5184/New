import { useState, useEffect } from "react";
import { getExtServices, createExtService } from "../firestore/externalServices";
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


export default function ExternalServices() {
  const { name } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    equipmentName: "",
    serviceType: "Calibration",
    serviceAgency: "",
    doneDate: "",
    nextDueDate: "",
    certificateRef: "",
    status: "Compliant"
  });

  const loadData = async () => {
    try {
      const data = await getExtServices();
      setServices(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipmentName || !form.serviceAgency || !form.doneDate) {
      alert("Please fill required fields.");
      return;
    }
    setSaving(true);
    try {
      await createExtService({
        ...form,
        loggedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ equipmentName: "", serviceType: "Calibration", serviceAgency: "", doneDate: "", nextDueDate: "", certificateRef: "", status: "Compliant" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log service.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>External Equipment Services & Calibration Register (ES/11)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.5 · Calibration traceabilities and preventative maintenance logs</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log External Service</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading service logs...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Equipment Name</th>
                <th style={S.th}>Service Type</th>
                <th style={S.th}>Service Agency</th>
                <th style={S.th}>Done Date</th>
                <th style={S.th}>Next Due Date</th>
                <th style={S.th}>Certificate Ref</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td style={S.td}><strong>{s.equipmentName}</strong></td>
                  <td style={S.td}>{s.serviceType}</td>
                  <td style={S.td}>{s.serviceAgency}</td>
                  <td style={S.td}>{s.doneDate}</td>
                  <td style={S.td}><strong>{s.nextDueDate || "—"}</strong></td>
                  <td style={S.td}><code>{s.certificateRef || "—"}</code></td>
                  <td style={S.td}><span style={S.badge(s.status === "Compliant" ? "#E6F4EA" : "#FCE8E6", s.status === "Compliant" ? "#137333" : "#C5221F")}>{s.status}</span></td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No services logged yet.</td>
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
              <strong style={{ fontSize: 16 }}>Log External Service / Calibration</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Equipment Name *</label>
                <input style={S.input} required value={form.equipmentName} onChange={e => setForm({...form, equipmentName: e.target.value})} placeholder="e.g. Biosafety Cabinet Grade A" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Service Type</label>
                  <select style={S.input} value={form.serviceType} onChange={e => setForm({...form, serviceType: e.target.value})}>
                    <option>Calibration</option>
                    <option>Preventive Maintenance</option>
                    <option>Emergency Breakdown Fix</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Service Agency / Engineer Name *</label>
                  <input style={S.input} required value={form.serviceAgency} onChange={e => setForm({...form, serviceAgency: e.target.value})} placeholder="e.g. National Calibration Lab" />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Done Date *</label>
                  <input style={S.input} type="date" required value={form.doneDate} onChange={e => setForm({...form, doneDate: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Next Due Date</label>
                  <input style={S.input} type="date" value={form.nextDueDate} onChange={e => setForm({...form, nextDueDate: e.target.value})} />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Certificate/Report Ref</label>
                  <input style={S.input} value={form.certificateRef} onChange={e => setForm({...form, certificateRef: e.target.value})} placeholder="e.g. CERT-2026-90" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Compliance Status</label>
                  <select style={S.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option>Compliant</option>
                    <option>Out of Calibration</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Service"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}