import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, updateDoc, doc } from "firebase/firestore";
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

export default function DepartmentAssignment() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", department: "Biochemistry", effectiveDate: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(collection(db, "employees"));
        setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error, loading offline employee list.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.effectiveDate) return alert("Please fill required fields");
    
    try {
      const emp = employees.find(x => x.id === form.employeeId || x.empId === form.employeeId);
      if (emp && emp.id) {
        await updateDoc(doc(db, "employees", emp.id), {
          department: form.department,
          assignmentEffectiveDate: form.effectiveDate
        });
        alert(`Successfully transferred employee to ${form.department}!`);
        setForm({ employeeId: "", department: "Biochemistry", effectiveDate: "" });
        const snap = await getDocs(collection(db, "employees"));
        setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        alert("Employee record not found in system.");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating assignment locally.");
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Assign / Transfer Employee Department (Clause 6.2.2)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Select Employee</label>
              <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>New Target Department</label>
              <select style={S.inp} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                <option>Biochemistry</option>
                <option>Microbiology</option>
                <option>Haematology</option>
                <option>Serology</option>
                <option>Quality</option>
                <option>Human Resource</option>
                <option>Biomedical</option>
                <option>Information Technology</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Effective Transfer Date</label>
              <input type="date" style={S.inp} value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <button type="submit" style={S.btn}>Submit Department Transfer</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Current Employee Allocations</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Full Name</th>
                <th style={{ padding: 8, textAlign: "left" }}>Assigned Department</th>
                <th style={{ padding: 8, textAlign: "left" }}>Designation</th>
                <th style={{ padding: 8, textAlign: "left" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No employees registered in master data.</td></tr>
              ) : (
                employees.map((emp, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{emp.empId || emp.id.substring(0,6)}</td>
                    <td style={{ padding: 8 }}>{emp.fullName || emp.employeeName}</td>
                    <td style={{ padding: 8, color: "#0F6E56", fontWeight: "bold" }}>{emp.department}</td>
                    <td style={{ padding: 8 }}>{emp.designation || "Lab Tech"}</td>
                    <td style={{ padding: 8 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 500,
                        background: emp.status === "Active" ? "#E1F5EE" : "#FCEBEB",
                        color: emp.status === "Active" ? "#085041" : "#791F1F"
                      }}>{emp.status || "Active"}</span>
                    </td>
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
