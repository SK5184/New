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


export default function PurchasePlanning() {
  const { name } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    planYear: "2026",
    budgetReagents: "500000",
    budgetConsumables: "200000",
    budgetEquipment: "1000000",
    contingencyFund: "100000",
    description: "Proposed budget and contingency plan for standard operations and emergency backup calibrations."
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "procurementPlans"), {
        ...form,
        approvedBy: name,
        createdAt: serverTimestamp()
      });
      alert("Annual procurement plan logged successfully.");
    } catch (e) {
      console.error(e);
      alert("Failed to save plan.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Annual Procurement & Contingency Planning (PP/18)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.2 · Financial and supply continuity budget plans</div>
        </div>
      </div>

      <div style={{ ...S.card, maxWidth: 640, margin: "0 auto" }}>
        <form onSubmit={handleSubmit}>
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Plan Year</label>
              <input style={S.input} value={form.planYear} onChange={e => setForm({...form, planYear: e.target.value})} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Contingency Buffer Fund (₹)</label>
              <input style={S.input} type="number" value={form.contingencyFund} onChange={e => setForm({...form, contingencyFund: e.target.value})} />
            </div>
          </div>
          <div style={S.formGrid}>
            <div style={S.field}>
              <label style={S.label}>Reagents Allocation (₹)</label>
              <input style={S.input} type="number" value={form.budgetReagents} onChange={e => setForm({...form, budgetReagents: e.target.value})} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Consumables Allocation (₹)</label>
              <input style={S.input} type="number" value={form.budgetConsumables} onChange={e => setForm({...form, budgetConsumables: e.target.value})} />
            </div>
          </div>
          <div style={S.field}>
            <label style={S.label}>Capital Equipment Budget (₹)</label>
            <input style={S.input} type="number" value={form.budgetEquipment} onChange={e => setForm({...form, budgetEquipment: e.target.value})} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Contingency & Supply Disruption Strategy Notes</label>
            <textarea style={{ ...S.input, height: 80 }} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Submitting..." : "Submit Annual Budget Plan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}