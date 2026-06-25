import { useState, useEffect } from "react";
import { getPOs, createPO } from "../firestore/purchaseOrders";
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


export default function PurchaseOrderPage() {
  const { name } = useAuth();
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendor: "CMC Medicals",
    prReference: "",
    itemSummary: "",
    totalAmount: "",
    paymentTerms: "Net 30",
    deliveryDate: ""
  });

  const loadData = async () => {
    try {
      const data = await getPOs();
      setPos(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemSummary || !form.totalAmount) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      const autoId = "PO-" + new Date().getFullYear() + "-" + String(pos.length + 1).padStart(6, '0');
      await createPO({
        ...form,
        poNumber: autoId,
        status: "Issued",
        createdBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({
        vendor: "CMC Medicals",
        prReference: "",
        itemSummary: "",
        totalAmount: "",
        paymentTerms: "Net 30",
        deliveryDate: ""
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to submit PO.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Purchase Orders Register (R/MBL/PUR/POI/20)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.2 · Control of procurement documents</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Generate PO</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading orders...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>PO Number</th>
                <th style={S.th}>Vendor</th>
                <th style={S.th}>Item Summary</th>
                <th style={S.th}>PR Ref</th>
                <th style={S.th}>Amount</th>
                <th style={S.th}>Target Delivery</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Issued By</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><code>{p.poNumber}</code></td>
                  <td style={S.td}><strong>{p.vendor}</strong></td>
                  <td style={S.td}>{p.itemSummary}</td>
                  <td style={S.td}>{p.prReference || "—"}</td>
                  <td style={S.td}>₹{Number(p.totalAmount).toLocaleString("en-IN")}</td>
                  <td style={S.td}>{p.deliveryDate || "—"}</td>
                  <td style={S.td}><span style={S.badge("#E6F4EA", "#137333")}>{p.status}</span></td>
                  <td style={S.td}>{p.createdBy}</td>
                </tr>
              ))}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No POs issued yet.</td>
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
              <strong style={{ fontSize: 16 }}>Generate Purchase Order</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Vendor / Supplier Name *</label>
                <select style={S.input} value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})}>
                  <option>CMC Medicals</option>
                  <option>Sysmex India</option>
                  <option>Roche Diagnostics</option>
                  <option>Bio-Rad Laboratories</option>
                  <option>Other approved vendor</option>
                </select>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>PR Reference Code</label>
                  <input style={S.input} value={form.prReference} onChange={e => setForm({...form, prReference: e.target.value})} placeholder="e.g. PR-2026-000001" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Target Delivery Date</label>
                  <input style={S.input} type="date" value={form.deliveryDate} onChange={e => setForm({...form, deliveryDate: e.target.value})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Item description & terms *</label>
                <textarea style={{ ...S.input, height: 60 }} required value={form.itemSummary} onChange={e => setForm({...form, itemSummary: e.target.value})} placeholder="List items, packaging sizes, catalog numbers..." />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Total PO Value (₹) *</label>
                  <input style={S.input} type="number" required value={form.totalAmount} onChange={e => setForm({...form, totalAmount: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Payment Terms</label>
                  <input style={S.input} value={form.paymentTerms} onChange={e => setForm({...form, paymentTerms: e.target.value})} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Generate & Dispatch"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}