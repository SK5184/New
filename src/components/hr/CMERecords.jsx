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

export default function CMERecords() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", title: "", provider: "", credits: "5", certNo: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrContinuingEducation"), orderBy("createdAt", "desc")));
        setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error, loading offline CME records.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.title) return alert("Please fill required fields");
    const payload = {
      ...form,
      credits: parseInt(form.credits) || 0,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrContinuingEducation"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("CME/CPD Credit logged!");
      setForm({ employeeId: "", title: "", provider: "", credits: "5", certNo: "" });
      const snap = await getDocs(query(collection(db, "hrContinuingEducation"), orderBy("createdAt", "desc")));
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setRecords(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Add CPD / CME Training Record (Clause 6.2.6)</h3></div>
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
              <label style={S.label}>CME Course / Seminar Title</label>
              <input style={S.inp} placeholder="e.g. ISO 15189:2022 Implementation" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
          </div>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Course Provider / Body</label>
              <input style={S.inp} placeholder="e.g. NABL / Quality Council" value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>CME / CPD Credits Awarded</label>
              <input type="number" style={S.inp} value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Certificate Number</label>
              <input style={S.inp} placeholder="e.g. CERT-9021" value={form.certNo} onChange={e => setForm({ ...form, certNo: e.target.value })} />
            </div>
          </div>
          <button type="submit" style={S.btn}>Save Continuing Education Log</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Registered CPD / CME Credits Log</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Seminar / Course Title</th>
                <th style={{ padding: 8, textAlign: "left" }}>Provider</th>
                <th style={{ padding: 8, textAlign: "center" }}>Credits</th>
                <th style={{ padding: 8, textAlign: "left" }}>Cert No.</th>
                <th style={{ padding: 8, textAlign: "left" }}>Logged Date</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No CME credits logged yet.</td></tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.employeeId}</td>
                    <td style={{ padding: 8 }}>{r.title}</td>
                    <td style={{ padding: 8 }}>{r.provider}</td>
                    <td style={{ padding: 8, textAlign: "center", fontWeight: "bold", color: "#0F6E56" }}>{r.credits} Credits</td>
                    <td style={{ padding: 8 }}>{r.certNo || "—"}</td>
                    <td style={{ padding: 8 }}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
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
