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

export default function CompetencyMatrix() {
  const [competencyList, setCompetencyList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", method: "Direct Observation of routine test runs", status: "Competent", remarks: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrCompetency"), orderBy("createdAt", "desc")));
        setCompetencyList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error, loading offline competency runs.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) return alert("Please select an employee");
    const payload = {
      ...form,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrCompetency"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Competency assessment saved successfully!");
      setForm({ employeeId: "", method: "Direct Observation of routine test runs", status: "Competent", remarks: "" });
      const snap = await getDocs(query(collection(db, "hrCompetency"), orderBy("createdAt", "desc")));
      setCompetencyList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setCompetencyList(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>New Competency Assessment (NABL 6-Method Review Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(3)}>
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
              <label style={S.label}>Evaluation Method</label>
              <select style={S.inp} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                <option>Direct Observation of routine test runs</option>
                <option>Monitoring of recording and reporting of test results</option>
                <option>Review of intermediate work sheets & quality control data</option>
                <option>Direct observation of instrument maintenance & safety checks</option>
                <option>Assessment of problem-solving skills & corrective actions</option>
                <option>Analysis of blind samples / proficiency testing runs</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Competency Status</label>
              <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Competent</option>
                <option>Needs Re-training</option>
                <option>Under Supervision</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>HOD Comments & Observation remarks</label>
            <input style={S.inp} placeholder="Observe calibration setups and sample dilutions" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <button type="submit" style={S.btn}>Log Competency Evaluation</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>NABL Competency Audit Log</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Evaluation Method Used</th>
                <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                <th style={{ padding: 8, textAlign: "left" }}>Comments / Remarks</th>
                <th style={{ padding: 8, textAlign: "left" }}>Evaluated Date</th>
              </tr>
            </thead>
            <tbody>
              {competencyList.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No competency evaluations logged yet.</td></tr>
              ) : (
                competencyList.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{c.employeeId}</td>
                    <td style={{ padding: 8 }}>{c.method}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
                        background: c.status === "Competent" ? "#E1F5EE" : "#FCEBEB",
                        color: c.status === "Competent" ? "#085041" : "#791F1F"
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: 8, color: "#5F5E5A" }}>{c.remarks}</td>
                    <td style={{ padding: 8 }}>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
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
