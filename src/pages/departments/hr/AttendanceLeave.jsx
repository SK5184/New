import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", height: "fit-content" },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 10
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function AttendanceLeave({ role, userName, dept }) {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    type: "Casual Leave",
    startDate: today(),
    endDate: today(),
    reason: "",
    status: "Pending"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const lSnap = await getDocs(query(collection(db, "hrLeave"), orderBy("createdAt", "desc")));
      setLeaves(lSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const getEmpName = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? (match.fullName || match.employeeName) : "Unknown Employee";
  };

  const getEmpDept = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? match.department : "—";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.reason) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrLeave"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setForm({ employeeId: "", type: "Casual Leave", startDate: today(), endDate: today(), reason: "", status: "Pending" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error logging leave request.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (leaveId, newStatus) => {
    try {
      await updateDoc(doc(db, "hrLeave", leaveId), { status: newStatus });
      setLeaves(list => list.map(l => l.id === leaveId ? { ...l, status: newStatus } : l));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Attendance & Leave Management</h2>
          <div style={S.subtitle}>ISO 15189:2022 · Log leave requests and track personnel availability</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          📅 Apply Leave
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Active Leaves */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Leave Registry & Approval Logs</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee</th>
                  <th style={S.th}>Type & Dates</th>
                  <th style={S.th}>Reason</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : leaves.length === 0 ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No leave logs found.</td></tr>
                ) : (
                  leaves.map(l => (
                    <tr key={l.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{getEmpName(l.employeeId)}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>{getEmpDept(l.employeeId)}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 500 }}>{l.type}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>{l.startDate} to {l.endDate}</div>
                      </td>
                      <td style={S.td}>{l.reason}</td>
                      <td style={S.td}>
                        <span style={{
                          display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                          background: l.status === "Approved" ? "#E1F5EE" : l.status === "Rejected" ? "#FCEBEB" : "#FAEEDA",
                          color: l.status === "Approved" ? "#0F6E56" : l.status === "Rejected" ? "#A32D2D" : "#854F0B"
                        }}>{l.status}</span>
                      </td>
                      <td style={S.td}>
                        {l.status === "Pending" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button style={{ padding: "3px 6px", fontSize: 10, background: "#0F6E56", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} onClick={() => handleStatusChange(l.id, "Approved")}>Approve</button>
                            <button style={{ padding: "3px 6px", fontSize: 10, background: "#A32D2D", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} onClick={() => handleStatusChange(l.id, "Rejected")}>Reject</button>
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

        {/* Right: Summary Statistics */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Personnel Availability Snapshot</div>
          </div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8 }}>
                <span>Total Active Staff</span>
                <span style={{ fontWeight: 600 }}>{employees.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8 }}>
                <span>Currently on Leave Today</span>
                <span style={{ fontWeight: 600, color: "#854F0B" }}>
                  {leaves.filter(l => l.status === "Approved" && new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date()).length}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8 }}>
                <span>Pending Leave Applications</span>
                <span style={{ fontWeight: 600, color: "#185FA5" }}>
                  {leaves.filter(l => l.status === "Pending").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Apply Leave Request</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Employee *</label>
                <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                  <option value="">Select Staff</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Leave Type</label>
                <select style={S.inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Medical Leave">Medical Leave</option>
                  <option value="Privilege Leave">Privilege Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                </select>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Start Date</label>
                  <input style={S.inp} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>End Date</label>
                  <input style={S.inp} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Reason for Leave *</label>
                <textarea style={{ ...S.inp, height: 60, fontFamily: "inherit" }} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="State specific reason..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Submit Application"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
