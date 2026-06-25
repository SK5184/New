import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const S = {
  wrap: { padding: "16px", fontFamily: "'Inter',system-ui,sans-serif" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { borderBottom: "0.5px solid #E0DDD6", paddingBottom: 10, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  inp: { padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: { padding: "6px 12px", background: "#0F6E56", color: "#E1F5EE", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }
};

export default function Designation() {
  const [designations, setDesignations] = useState([
    { title: "HOD / Biochemist", level: "L1", scope: "Directs biochemistry diagnostic procedures & verifies critical results." },
    { title: "Senior Technologist", level: "L2", scope: "Coordinates daily runs, IQC evaluations, and equipment maintenance." },
    { title: "Lab Technician", level: "L3", scope: "Performs sample dilution, analyzer runs, and temperature logging." }
  ]);
  const [form, setForm] = useState({ title: "", level: "L3", scope: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.scope) return alert("Please fill required fields");
    setDesignations([...designations, form]);
    setForm({ title: "", level: "L3", scope: "" });
    alert("New Designation Title defined successfully.");
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Define Corporate Lab Designations (Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Designation Title</label>
              <input style={S.inp} placeholder="e.g. Junior Research Fellow" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label style={S.label}>Level Hierarchy</label>
              <select style={S.inp} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}>
                <option value="L1">L1 - Executive / HOD</option>
                <option value="L2">L2 - Senior Technologist / Supervisor</option>
                <option value="L3">L3 - Junior Technologist / Operator</option>
                <option value="L4">L4 - Supportive Staff</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Scope of Responsibility & Authority Description</label>
            <textarea style={{ ...S.inp, height: 60 }} placeholder="Authorized to run calibration tests, release reports..." value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })} required />
          </div>
          <button type="submit" style={S.btn}>Save Designation Scope</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Designations Catalog & Scope matrix</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Designation Title</th>
                <th style={{ padding: 8, textAlign: "center" }}>Level</th>
                <th style={{ padding: 8, textAlign: "left" }}>Scope of Operational Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {designations.map((d, idx) => (
                <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                  <td style={{ padding: 8, fontWeight: 600 }}>{d.title}</td>
                  <td style={{ padding: 8, textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: d.level === "L1" ? "#E1F5EE" : d.level === "L2" ? "#E6F1FB" : "#F1EFE8",
                      color: d.level === "L1" ? "#085041" : d.level === "L2" ? "#0C447C" : "#5F5E5A"
                    }}>{d.level}</span>
                  </td>
                  <td style={{ padding: 8, color: "#5F5E5A", fontSize: 11.5 }}>{d.scope}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
