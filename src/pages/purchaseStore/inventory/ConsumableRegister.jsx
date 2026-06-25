import { useState, useEffect } from "react";
import { getConsumables, createConsumables } from "../firestore/consumables";
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


export default function ConsumableRegister() {
  const { name } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    stock: 0,
    unit: "Boxes",
    reorderLevel: 5
  });

  const loadData = async () => {
    try {
      const data = await getConsumables();
      setItems(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await createConsumables({
        ...form,
        loggedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ name: "", stock: 0, unit: "Boxes", reorderLevel: 5 });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to log consumable.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Consumables Stock Registry (CR/09)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Non-reagent consumables inventory levels</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Add Consumable Item</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading consumables...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Item Name</th>
                <th style={S.th}>Stock Count</th>
                <th style={S.th}>Unit</th>
                <th style={S.th}>Reorder Level</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => {
                const low = i.stock <= i.reorderLevel;
                return (
                  <tr key={i.id}>
                    <td style={S.td}><strong>{i.name}</strong></td>
                    <td style={S.td}>{i.stock}</td>
                    <td style={S.td}>{i.unit}</td>
                    <td style={S.td}>{i.reorderLevel}</td>
                    <td style={S.td}><span style={S.badge(low ? "#FCE8E6" : "#E6F4EA", low ? "#C5221F" : "#137333")}>{low ? "Needs Reorder" : "Adequate"}</span></td>
                    <td style={S.td}>{i.loggedBy}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No consumables registered yet.</td>
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
              <strong style={{ fontSize: 16 }}>Add Consumable</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Consumable Name *</label>
                <input style={S.input} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Pipette tips 200ul" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Initial Stock Quantity *</label>
                  <input style={S.input} type="number" min={0} value={form.stock} onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Unit</label>
                  <input style={S.input} value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Reorder Alert Trigger Level *</label>
                <input style={S.input} type="number" min={1} value={form.reorderLevel} onChange={e => setForm({...form, reorderLevel: parseInt(e.target.value) || 5})} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Add to Inventory"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}