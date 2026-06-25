import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

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


export default function OrderCancellationPage() {
  const { name } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    poNumber: "",
    vendorName: "",
    cancellationReason: "Delivery Delay (Out of Stock)",
    riskImplication: "Risk of critical reagent stockout causing TAT delays. Transitioning to contingency backup analyzer.",
    mitigationActions: "Initiate contingency fallback analyzer. Place urgent spot request with secondary approved vendor."
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.poNumber || !form.vendorName) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      // 1. Log order cancellation record
      await addDoc(collection(db, "orderCancellations"), {
        ...form,
        cancelledBy: name,
        createdAt: serverTimestamp()
      });

      // 2. Automatically log risk review in Risk Register (ISO 15189 compliance)
      await addDoc(collection(db, "risks"), {
        source: `Order Cancellation (${form.poNumber})`,
        description: `Procurement failure: ${form.cancellationReason}. ${form.riskImplication}`,
        department: "Purchase & Store",
        riskScore: 12, // Critical level
        mitigation: form.mitigationActions,
        loggedBy: name,
        createdAt: serverTimestamp()
      });

      alert("Order cancelled. Risk assessment & mitigation workflow registered in Compliance Matrix successfully.");
      setForm({
        poNumber: "",
        vendorName: "",
        cancellationReason: "Delivery Delay (Out of Stock)",
        riskImplication: "Risk of critical reagent stockout causing TAT delays. Transitioning to contingency backup analyzer.",
        mitigationActions: "Initiate contingency fallback analyzer. Place urgent spot request with secondary approved vendor."
      });
    } catch (e) {
      console.error(e);
      alert("Failed to process cancellation.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Order Cancellation Registry & Risk Review (F/MBL/PUR/OC/18)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §8.5 · Risk assessment of supply chain disruption</div>
        </div>
      </div>

      <div style={{ ...S.card, maxWidth: 680, margin: "0 auto" }}>
        <div style={{ background: "#FFFBEB", border: "0.5px solid #FCD34D", borderRadius: 8, padding: 12, marginBottom: 20, color: "#92400E", fontSize: 12.5 }}>
          <strong>ℹ️ ISO 15189:2022 Compliance Alert:</strong> Cancelling a PO triggers an automatic risk evaluation in the QMS. A risk ticket will be raised automatically to log clinical impact, testing continuity, and secondary backup plans.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Purchase Order Number (PO #) *</label>
              <input style={S.input} required value={form.poNumber} onChange={e => setForm({...form, poNumber: e.target.value})} placeholder="e.g. PO-2026-000034" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Vendor / Supplier Name *</label>
              <input style={S.input} required value={form.vendorName} onChange={e => setForm({...form, vendorName: e.target.value})} placeholder="e.g. Sysmex India" />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Reason for Cancellation</label>
            <select style={S.input} value={form.cancellationReason} onChange={e => setForm({...form, cancellationReason: e.target.value})}>
              <option>Delivery Delay (Out of Stock)</option>
              <option>Price Mismatch</option>
              <option>Specification Error in PO</option>
              <option>Alternative Supplier Selected</option>
              <option>Product Discontinued by Manufacturer</option>
            </select>
          </div>

          <div style={S.field}>
            <label style={S.label}>Clinical & Laboratory Impact (Risk Analysis)</label>
            <textarea style={{ ...S.input, height: 70 }} value={form.riskImplication} onChange={e => setForm({...form, riskImplication: e.target.value})} />
          </div>

          <div style={S.field}>
            <label style={S.label}>Mitigation Actions (Testing Continuity Plan)</label>
            <textarea style={{ ...S.input, height: 70 }} value={form.mitigationActions} onChange={e => setForm({...form, mitigationActions: e.target.value})} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button type="submit" style={S.btn("#DC2626", "#FFF")} disabled={saving}>
              {saving ? "Processing..." : "Confirm Cancellation & Log Risk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}