import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
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

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", type: "Casual Leave", startDate: "", endDate: "", reason: "", coveredBy: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const lSnap = await getDocs(query(collection(db, "hrLeave"), orderBy("createdAt", "desc")));
        setLeaves(lSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error loading leave records.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.startDate || !form.endDate) return alert("Please fill all required fields");
    const payload = {
      ...form,
      status: "Pending",
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrLeave"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Leave request logged successfully!");
      setForm({ employeeId: "", type: "Casual Leave", startDate: "", endDate: "", reason: "", coveredBy: "" });
      const snap = await getDocs(query(collection(db, "hrLeave"), orderBy("createdAt", "desc")));
      setLeaves(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setLeaves(prev => [payload, ...prev]);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateDoc(doc(db, "hrLeave", id), { status });
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      alert(`Leave request ${status.toLowerCase()}!`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Request Leave & Duty Coverage (Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Select Employee *</label>
              <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.empId || emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Leave Type</label>
              <select style={S.inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option>Casual Leave</option>
                <option>Medical Leave</option>
                <option>Earned Leave</option>
                <option>Maternity/Paternity Leave</option>
                <option>Sabbatical</option>
              </select>
            </div>
          </div>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Start Date *</label>
              <input type="date" style={S.inp} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div>
              <label style={S.label}>End Date *</label>
              <input type="date" style={S.inp} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Reason for Leave</label>
              <input style={S.inp} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Brief description of leave reason" />
            </div>
            <div>
              <label style={S.label}>Assigned Duty Cover (Backup Staff)</label>
              <select style={S.inp} value={form.coveredBy} onChange={e => setForm({ ...form, coveredBy: e.target.value })}>
                <option value="">-- Select Backup Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.fullName || emp.employeeName}>{emp.fullName || emp.employeeName} ({emp.department})</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" style={S.btn}>Submit Leave Request</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Leave Applications & Approvals</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Type</th>
                <th style={{ padding: 8, textAlign: "left" }}>Duration</th>
                <th style={{ padding: 8, textAlign: "left" }}>Covered By</th>
                <th style={{ padding: 8, textAlign: "left" }}>Reason</th>
                <th style={{ padding: 8, textAlign: "center" }}>Status</th>
                <th style={{ padding: 8, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No leave requests recorded.</td></tr>
              ) : (
                leaves.map((l, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{l.employeeId}</td>
                    <td style={{ padding: 8 }}>{l.type}</td>
                    <td style={{ padding: 8 }}>{l.startDate} to {l.endDate}</td>
                    <td style={{ padding: 8 }}>{l.coveredBy || "—"}</td>
                    <td style={{ padding: 8, color: "#5F5E5A" }}>{l.reason}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: l.status === "Approved" ? "#E1F5EE" : l.status === "Rejected" ? "#FCEBEB" : "#FAEEDA",
                        color: l.status === "Approved" ? "#0F6E56" : l.status === "Rejected" ? "#A32D2D" : "#854F0B",
                        fontWeight: 600
                      }}>{l.status}</span>
                    </td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      {l.status === "Pending" && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          <button onClick={() => handleStatusChange(l.id, "Approved")} style={{ ...S.btn, background: "#0F6E56", color: "#fff", padding: "3px 8px", fontSize: 10 }}>Approve</button>
                          <button onClick={() => handleStatusChange(l.id, "Rejected")} style={{ ...S.btn, background: "#A32D2D", color: "#fff", padding: "3px 8px", fontSize: 10 }}>Reject</button>
                        </div>
                      )}
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
