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

export default function AuthorizationRecords() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", scope: "Biochemistry Examination Processes", status: "Authorized" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrAuthorizations"), orderBy("createdAt", "desc")));
        setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error, loading offline authorizations.");
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
      await addDoc(collection(db, "hrAuthorizations"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Task Authorization saved!");
      setForm({ employeeId: "", scope: "Biochemistry Examination Processes", status: "Authorized" });
      const snap = await getDocs(query(collection(db, "hrAuthorizations"), orderBy("createdAt", "desc")));
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setRecords(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Add Staff Task Authorization Record (Clause 6.2.5)</h3></div>
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
              <label style={S.label}>Authorized Scope of Action</label>
              <select style={S.inp} value={form.scope} onChange={e => setForm({ ...form, scope: e.target.value })}>
                <option>Biochemistry Examination Processes</option>
                <option>Hematology Lab Operations</option>
                <option>Microbiology Diagnostic Reporting</option>
                <option>Access Control & Server Config</option>
                <option>Critical Value Calling & Verification</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Authorization Status</label>
              <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Authorized</option>
                <option>Suspended</option>
                <option>Under Training Supervision</option>
              </select>
            </div>
          </div>
          <button type="submit" style={S.btn}>Assign Authorization Signature</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Active Staff Authorization Registry</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Authorized Scope</th>
                <th style={{ padding: 8, textAlign: "left" }}>Status</th>
                <th style={{ padding: 8, textAlign: "left" }}>Authorized Date</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No authorizations registered yet.</td></tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.employeeId}</td>
                    <td style={{ padding: 8 }}>{r.scope}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 500,
                        background: r.status === "Authorized" ? "#E1F5EE" : r.status === "Suspended" ? "#FCEBEB" : "#FAEEDA",
                        color: r.status === "Authorized" ? "#085041" : r.status === "Suspended" ? "#791F1F" : "#854F0B"
                      }}>{r.status}</span>
                    </td>
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
