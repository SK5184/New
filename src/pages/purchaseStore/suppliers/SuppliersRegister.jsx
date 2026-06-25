import { useState, useEffect } from "react";
import { getSuppliers, createSupplier, updateSupplierStatus } from "../firestore/suppliers";
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


export default function SuppliersRegister() {
  const { name } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    category: "Reagents"
  });

  const loadData = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierName || !form.email) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      const code = "SUP-" + String(suppliers.length + 1).padStart(4, '0');
      await createSupplier({
        ...form,
        supplierCode: code,
        status: "Pending Approval",
        createdBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ supplierName: "", contactPerson: "", phone: "", email: "", address: "", category: "Reagents" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save supplier.");
    }
    setSaving(false);
  };

  const handleStatus = async (id, status) => {
    try {
      await updateSupplierStatus(id, status);
      loadData();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Supplier Registration & Approved Vendor List (SUP/01)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6 · Evaluation and approval of providers</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Register Supplier</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading suppliers...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Code</th>
                <th style={S.th}>Supplier Name</th>
                <th style={S.th}>Contact Person</th>
                <th style={S.th}>Email</th>
                <th style={S.th}>Category</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td style={S.td}><code>{s.supplierCode}</code></td>
                  <td style={S.td}><strong>{s.supplierName}</strong></td>
                  <td style={S.td}>{s.contactPerson}</td>
                  <td style={S.td}>{s.email}</td>
                  <td style={S.td}>{s.category}</td>
                  <td style={S.td}>
                    <span style={S.badge(s.status === "Approved" ? "#E6F4EA" : s.status === "Pending Approval" ? "#EFF6FF" : "#FCE8E6", s.status === "Approved" ? "#137333" : s.status === "Pending Approval" ? "#1E40AF" : "#C5221F")}>
                      {s.status}
                    </span>
                  </td>
                  <td style={S.td}>
                    {s.status !== "Approved" && (
                      <button style={{ ...S.btn("#0F6E56", "#fff"), padding: "4px 8px", fontSize: 11, marginRight: 6 }} onClick={() => handleStatus(s.id, "Approved")}>Approve</button>
                    )}
                    {s.status !== "Disqualified" && (
                      <button style={{ ...S.btn("#DC2626", "#fff"), padding: "4px 8px", fontSize: 11 }} onClick={() => handleStatus(s.id, "Disqualified")}>Disqualify</button>
                    )}
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No suppliers registered yet.</td>
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
              <strong style={{ fontSize: 16 }}>Register Supplier</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Supplier / Vendor Name *</label>
                <input style={S.input} required value={form.supplierName} onChange={e => setForm({...form, supplierName: e.target.value})} placeholder="e.g. Sysmex India Pvt Ltd" />
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Contact Person</label>
                  <input style={S.input} value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} placeholder="e.g. Ramesh Kumar" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Category</label>
                  <select style={S.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option>Reagents</option>
                    <option>Consumables</option>
                    <option>Equipment</option>
                    <option>Services</option>
                  </select>
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Phone</label>
                  <input style={S.input} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="e.g. +91 98765 43210" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Email *</label>
                  <input style={S.input} required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="e.g. info@sysmex.in" />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Address</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Register"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}