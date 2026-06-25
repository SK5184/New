import { useState, useEffect } from "react";
import { getAcceptances, createAcceptance } from "../firestore/materialAcceptance";
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


export default function MaterialAcceptance() {
  const { name } = useAuth();
  const [acceptances, setAcceptances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialName: "",
    supplier: "Sysmex India",
    batchNo: "",
    expiryDate: "",
    dcReference: "",
    tempMatch: "Yes",
    packMatch: "Yes",
    coaMatch: "Yes"
  });

  const loadData = async () => {
    try {
      const data = await getAcceptances();
      setAcceptances(data);
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
      const overallStatus = (form.tempMatch === "Yes" && form.packMatch === "Yes" && form.coaMatch === "Yes") ? "Accepted" : "Rejected";
      await createAcceptance({
        ...form,
        status: overallStatus,
        verifiedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ materialName: "", supplier: "Sysmex India", batchNo: "", expiryDate: "", dcReference: "", tempMatch: "Yes", packMatch: "Yes", coaMatch: "Yes" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log acceptance.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Material Receiving & Acceptance checklist (MA/05)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Shipments verification check against requirements</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Verify Shipment</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading verifications...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Material</th>
                <th style={S.th}>Supplier</th>
                <th style={S.th}>Batch No</th>
                <th style={S.th}>Expiry</th>
                <th style={S.th}>Checks (Temp/Pack/COA)</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Verified By</th>
              </tr>
            </thead>
            <tbody>
              {acceptances.map(a => (
                <tr key={a.id}>
                  <td style={S.td}><strong>{a.materialName}</strong></td>
                  <td style={S.td}>{a.supplier}</td>
                  <td style={S.td}><code>{a.batchNo}</code></td>
                  <td style={S.td}>{a.expiryDate}</td>
                  <td style={S.td}>
                    Temp: {a.tempMatch} | Pack: {a.packMatch} | COA: {a.coaMatch}
                  </td>
                  <td style={S.td}>
                    <span style={S.badge(a.status === "Accepted" ? "#E6F4EA" : "#FCE8E6", a.status === "Accepted" ? "#137333" : "#C5221F")}>
                      {a.status}
                    </span>
                  </td>
                  <td style={S.td}>{a.verifiedBy}</td>
                </tr>
              ))}
              {acceptances.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No acceptance audits recorded yet.</td>
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
              <strong style={{ fontSize: 16 }}>Log Material Receiving Checklist</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Material / Item Name *</label>
                <input style={S.input} required value={form.materialName} onChange={e => setForm({...form, materialName: e.target.value})} placeholder="e.g. EDTA Blood Collection Tubes" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Supplier</label>
                  <select style={S.input} value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})}>
                    <option>Sysmex India</option>
                    <option>Roche Diagnostics</option>
                    <option>Bio-Rad Laboratories</option>
                    <option>CMC Medicals</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>DC / Gate entry Ref</label>
                  <input style={S.input} value={form.dcReference} onChange={e => setForm({...form, dcReference: e.target.value})} placeholder="e.g. DC-9921" />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Batch / Lot No *</label>
                  <input style={S.input} required value={form.batchNo} onChange={e => setForm({...form, batchNo: e.target.value})} placeholder="e.g. B-202611" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Expiry Date *</label>
                  <input style={S.input} type="date" required value={form.expiryDate} onChange={e => setForm({...form, expiryDate: e.target.value})} />
                </div>
              </div>
              <div style={{ border: "1.5px solid #F1F5F9", borderRadius: 8, padding: 12, marginBottom: 14 }}>
                <strong style={{ display: "block", fontSize: 11, color: "#64748B", marginBottom: 10 }}>Receiving Quality Checklists</strong>
                <div style={S.formGrid}>
                  <div style={S.field}>
                    <label style={S.label}>Temp within Limits?</label>
                    <select style={S.input} value={form.tempMatch} onChange={e => setForm({...form, tempMatch: e.target.value})}>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div style={S.field}>
                    <label style={S.label}>Packaging Intact?</label>
                    <select style={S.input} value={form.packMatch} onChange={e => setForm({...form, packMatch: e.target.value})}>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                </div>
                <div style={S.field}>
                  <label style={S.label}>COA / Lot Certificate Available?</label>
                  <select style={S.input} value={form.coaMatch} onChange={e => setForm({...form, coaMatch: e.target.value})}>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Approve Receipt"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}