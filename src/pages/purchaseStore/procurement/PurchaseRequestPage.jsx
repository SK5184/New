import { useState, useEffect } from "react";
import { getPRs, createPR } from "../firestore/purchaseRequests";
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


export default function PurchaseRequestPage() {
  const { name, role, dept } = useAuth();
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    materialCategory: "Reagents",
    itemDetails: "",
    quantity: 1,
    justification: "",
    urgency: "Medium",
    budgetHead: "Operational Cost",
    estimatedCost: ""
  });

  const loadData = async () => {
    try {
      const data = await getPRs();
      setPrs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.itemDetails || !form.estimatedCost) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      const autoId = "PR-" + new Date().getFullYear() + "-" + String(prs.length + 1).padStart(6, '0');
      await createPR({
        ...form,
        prNumber: autoId,
        requester: name,
        department: dept,
        status: "Pending HOD Approval",
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({
        materialCategory: "Reagents",
        itemDetails: "",
        quantity: 1,
        justification: "",
        urgency: "Medium",
        budgetHead: "Operational Cost",
        estimatedCost: ""
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to submit PR.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Purchase Requests Register (PR-2026-000001)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6 · Requisition and approval workflow</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Raise Requisition</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading requests...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>PR Number</th>
                <th style={S.th}>Item Details</th>
                <th style={S.th}>Qty</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>Urgency</th>
                <th style={S.th}>Est. Cost</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Requester</th>
              </tr>
            </thead>
            <tbody>
              {prs.map(p => (
                <tr key={p.id}>
                  <td style={S.td}><code>{p.prNumber}</code></td>
                  <td style={S.td}><strong style={{ color: "#0F172A" }}>{p.itemDetails}</strong><div style={{ fontSize: 10, color: "#64748B" }}>Category: {p.materialCategory}</div></td>
                  <td style={S.td}>{p.quantity}</td>
                  <td style={S.td}>{p.department}</td>
                  <td style={S.td}>
                    <span style={S.badge(p.urgency === "High" ? "#FEE2E2" : p.urgency === "Medium" ? "#FEF3C7" : "#E1F5EE", p.urgency === "High" ? "#991B1B" : p.urgency === "Medium" ? "#92400E" : "#0F6E56")}>
                      {p.urgency}
                    </span>
                  </td>
                  <td style={S.td}>₹{Number(p.estimatedCost).toLocaleString("en-IN")}</td>
                  <td style={S.td}>
                    <span style={S.badge(p.status.includes("Approved") ? "#E6F4EA" : p.status.includes("Pending") ? "#EFF6FF" : "#FCE8E6", p.status.includes("Approved") ? "#137333" : p.status.includes("Pending") ? "#1E40AF" : "#C5221F")}>
                      {p.status}
                    </span>
                  </td>
                  <td style={S.td}>{p.requester}</td>
                </tr>
              ))}
              {prs.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No requisitions logged yet.</td>
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
              <strong style={{ fontSize: 16 }}>Raise Purchase Requisition</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Material Category</label>
                <select style={S.input} value={form.materialCategory} onChange={e => setForm({...form, materialCategory: e.target.value})}>
                  <option>Reagents</option>
                  <option>Consumables</option>
                  <option>Equipment</option>
                  <option>Calibration Services</option>
                  <option>External Maintenance</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Item Name & Specifications *</label>
                <input style={S.input} required value={form.itemDetails} onChange={e => setForm({...form, itemDetails: e.target.value})} placeholder="e.g. EDTA Vacutainers 4ml (100pk)" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Quantity *</label>
                  <input style={S.input} type="number" min={1} required value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 1})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Estimated Cost (₹) *</label>
                  <input style={S.input} type="number" required value={form.estimatedCost} onChange={e => setForm({...form, estimatedCost: e.target.value})} placeholder="Total price" />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Justification for Purchase</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.justification} onChange={e => setForm({...form, justification: e.target.value})} placeholder="Clinical reason, low stock, analyzer breakdown..." />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Urgency</label>
                  <select style={S.input} value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Budget Head</label>
                  <select style={S.input} value={form.budgetHead} onChange={e => setForm({...form, budgetHead: e.target.value})}>
                    <option>Operational Cost</option>
                    <option>Capital Equipment</option>
                    <option>Quality Assurance</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Submitting..." : "Submit Requisition"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}