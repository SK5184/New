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

export default function AnnualAppraisal() {
  const [appraisals, setAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", period: "2025-2026", scoreTechnical: "5", scoreSafety: "5", scoreTAT: "5", managerRemarks: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const aSnap = await getDocs(query(collection(db, "hrAppraisals"), orderBy("createdAt", "desc")));
        setAppraisals(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error, loading offline appraisals.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return alert("Please select an employee");
    const payload = {
      ...form,
      scoreTechnical: parseInt(form.scoreTechnical),
      scoreSafety: parseInt(form.scoreSafety),
      scoreTAT: parseInt(form.scoreTAT),
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrAppraisals"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Appraisal recorded successfully!");
      setForm({ employeeId: "", period: "2025-2026", scoreTechnical: "5", scoreSafety: "5", scoreTAT: "5", managerRemarks: "" });
      const snap = await getDocs(query(collection(db, "hrAppraisals"), orderBy("createdAt", "desc")));
      setAppraisals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setAppraisals(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>New Performance Appraisal (Clause 6.2.2)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Select Employee</label>
              <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.empId || emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Appraisal Period</label>
              <input style={S.inp} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
            </div>
          </div>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Technical Skills (1-10)</label>
              <input type="number" min="1" max="10" style={S.inp} value={form.scoreTechnical} onChange={e => setForm({ ...form, scoreTechnical: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Quality & Safety Compliance (1-10)</label>
              <input type="number" min="1" max="10" style={S.inp} value={form.scoreSafety} onChange={e => setForm({ ...form, scoreSafety: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>TAT and Productivity (1-10)</label>
              <input type="number" min="1" max="10" style={S.inp} value={form.scoreTAT} onChange={e => setForm({ ...form, scoreTAT: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Manager's Review Remarks</label>
            <textarea style={{ ...S.inp, height: 60 }} value={form.managerRemarks} onChange={e => setForm({ ...form, managerRemarks: e.target.value })} />
          </div>
          <button type="submit" style={S.btn}>Save Performance Appraisal</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Historical Appraisals Log</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Period</th>
                <th style={{ padding: 8, textAlign: "center" }}>Technical</th>
                <th style={{ padding: 8, textAlign: "center" }}>Safety</th>
                <th style={{ padding: 8, textAlign: "center" }}>TAT</th>
                <th style={{ padding: 8, textAlign: "left" }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No appraisals logged yet.</td></tr>
              ) : (
                appraisals.map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{a.employeeId}</td>
                    <td style={{ padding: 8 }}>{a.period}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{a.scoreTechnical}/10</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{a.scoreSafety}/10</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{a.scoreTAT}/10</td>
                    <td style={{ padding: 8, color: "#5F5E5A" }}>{a.managerRemarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
