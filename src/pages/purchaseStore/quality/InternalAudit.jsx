import { useState, useEffect } from "react";
import { getAudits, createAudit } from "../firestore/internalAudits";
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


export default function InternalAudit() {
  const { name } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    auditDate: "",
    findings: "",
    ncsRaised: "No",
    actionPlan: "",
    status: "Open"
  });

  const loadData = async () => {
    try {
      const data = await getAudits();
      setAudits(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.auditDate || !form.findings) {
      alert("Please fill required fields.");
      return;
    }
    setSaving(true);
    try {
      await createAudit({
        ...form,
        auditor: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ auditDate: "", findings: "", ncsRaised: "No", actionPlan: "", status: "Open" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save audit.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Internal Store Quality Audits (IA/13)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §8.6 · Verification of compliance checks of storage locations</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log Internal Audit</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading audits...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Audit Date</th>
                <th style={S.th}>Auditor</th>
                <th style={S.th}>Audit Findings</th>
                <th style={S.th}>NCs Raised?</th>
                <th style={S.th}>Action Plan</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id}>
                  <td style={S.td}>{a.auditDate}</td>
                  <td style={S.td}>{a.auditor}</td>
                  <td style={S.td}>{a.findings}</td>
                  <td style={S.td}><span style={{ color: a.ncsRaised === "Yes" ? "#DC2626" : "inherit" }}>{a.ncsRaised}</span></td>
                  <td style={S.td}>{a.actionPlan || "—"}</td>
                  <td style={S.td}><span style={S.badge(a.status === "Closed" ? "#E6F4EA" : "#EFF6FF", a.status === "Closed" ? "#137333" : "#1E40AF")}>{a.status}</span></td>
                </tr>
              ))}
              {audits.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No audits logged yet.</td>
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
              <strong style={{ fontSize: 16 }}>Log Store Compliance Audit</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Audit Date *</label>
                  <input style={S.input} type="date" required value={form.auditDate} onChange={e => setForm({...form, auditDate: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Non-Conformances Raised?</label>
                  <select style={S.input} value={form.ncsRaised} onChange={e => setForm({...form, ncsRaised: e.target.value})}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Findings & Observations *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.findings} onChange={e => setForm({...form, findings: e.target.value})} placeholder="e.g. Temperature limits logged daily; no excursions found." />
              </div>
              <div style={S.field}>
                <label style={S.label}>Corrective Action Plan (if NC raised)</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.actionPlan} onChange={e => setForm({...form, actionPlan: e.target.value})} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select style={S.input} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option>Open</option>
                  <option>Closed</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Audit"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}