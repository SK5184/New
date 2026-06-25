import { useState, useEffect } from "react";
import { getDCs, createDC } from "../firestore/deliveryChallans";
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


export default function DeliveryChallanPage() {
  const { name } = useAuth();
  const [dcs, setDcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    dcNumber: "",
    vendor: "CMC Medicals",
    poReference: "",
    vehicleNumber: "",
    receivedItems: ""
  });

  const loadData = async () => {
    try {
      const data = await getDCs();
      setDcs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.dcNumber || !form.poReference) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      await createDC({
        ...form,
        receivedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({
        dcNumber: "",
        vendor: "CMC Medicals",
        poReference: "",
        vehicleNumber: "",
        receivedItems: ""
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to submit Delivery Challan.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Delivery Challans Log (F/MBL/PUR/DCF/05)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Verifications of incoming shipments</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log Delivery Challan</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading challans...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>DC Number</th>
                <th style={S.th}>Vendor</th>
                <th style={S.th}>PO Reference</th>
                <th style={S.th}>Vehicle Number</th>
                <th style={S.th}>Received Items</th>
                <th style={S.th}>Received By</th>
              </tr>
            </thead>
            <tbody>
              {dcs.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><strong>{p.dcNumber}</strong></td>
                  <td style={S.td}>{p.vendor}</td>
                  <td style={S.td}><code>{p.poReference}</code></td>
                  <td style={S.td}>{p.vehicleNumber || "—"}</td>
                  <td style={S.td}>{p.receivedItems}</td>
                  <td style={S.td}>{p.receivedBy}</td>
                </tr>
              ))}
              {dcs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No delivery logs entered yet.</td>
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
              <strong style={{ fontSize: 16 }}>Log Shipment Delivery Challan</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>DC Number / Gate Entry *</label>
                  <input style={S.input} required value={form.dcNumber} onChange={e => setForm({...form, dcNumber: e.target.value})} placeholder="e.g. DC-10029" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>PO Reference *</label>
                  <input style={S.input} required value={form.poReference} onChange={e => setForm({...form, poReference: e.target.value})} placeholder="e.g. PO-2026-000001" />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Vendor / Supplier Name</label>
                  <select style={S.input} value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})}>
                    <option>CMC Medicals</option>
                    <option>Sysmex India</option>
                    <option>Roche Diagnostics</option>
                    <option>Bio-Rad Laboratories</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Vehicle Number</label>
                  <input style={S.input} value={form.vehicleNumber} onChange={e => setForm({...form, vehicleNumber: e.target.value})} placeholder="e.g. KA-03-MK-1234" />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Received Items & Package Condition *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.receivedItems} onChange={e => setForm({...form, receivedItems: e.target.value})} placeholder="e.g. 5 boxes reagent at 4°C, ice packs active, seal intact." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Receipt"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}