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

export default function TrainingAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", topic: "Biosafety & Infection Control", date: "", trainerName: "", hours: "2", score: "80", remarks: "" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrTrainingAttendance"), orderBy("createdAt", "desc")));
        setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error loading training attendance.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.date || !form.trainerName) return alert("Please fill all required fields");
    const payload = {
      ...form,
      hours: Number(form.hours),
      score: Number(form.score),
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrTrainingAttendance"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Training attendance logged successfully!");
      setForm({ employeeId: "", topic: "Biosafety & Infection Control", date: "", trainerName: "", hours: "2", score: "80", remarks: "" });
      const snap = await getDocs(query(collection(db, "hrTrainingAttendance"), orderBy("createdAt", "desc")));
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setAttendance(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Log Training Session Attendance (Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(3)}>
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
              <label style={S.label}>Training Topic *</label>
              <select style={S.inp} value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} required>
                <option>Biosafety & Infection Control</option>
                <option>Fire Safety & First Aid</option>
                <option>Equipment Calibration & Operation</option>
                <option>Quality Control & Westgard Rules</option>
                <option>ISO 15189:2022 Awareness</option>
                <option>Pre-analytical Variable Monitoring</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Training Date *</label>
              <input type="date" style={S.inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Trainer / Instructor Name *</label>
              <input style={S.inp} value={form.trainerName} onChange={e => setForm({ ...form, trainerName: e.target.value })} placeholder="Trainer Name" required />
            </div>
            <div>
              <label style={S.label}>Duration (Hours)</label>
              <input type="number" min="0.5" step="0.5" style={S.inp} value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Assessment Score (0-100)</label>
              <input type="number" min="0" max="100" style={S.inp} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Session Remarks / Evaluation Comments</label>
            <textarea style={{ ...S.inp, height: 50 }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
          </div>
          <button type="submit" style={S.btn}>Save Attendance Record</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Staff Training Attendance & Assessment Registry</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Training Topic</th>
                <th style={{ padding: 8, textAlign: "left" }}>Trainer</th>
                <th style={{ padding: 8, textAlign: "center" }}>Date</th>
                <th style={{ padding: 8, textAlign: "center" }}>Hours</th>
                <th style={{ padding: 8, textAlign: "center" }}>Score</th>
                <th style={{ padding: 8, textAlign: "left" }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No training attendance logged yet.</td></tr>
              ) : (
                attendance.map((att, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{att.employeeId}</td>
                    <td style={{ padding: 8, fontWeight: 500 }}>{att.topic}</td>
                    <td style={{ padding: 8 }}>{att.trainerName}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{att.date}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{att.hours} hrs</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                        background: att.score >= 70 ? "#E1F5EE" : "#FCEBEB",
                        color: att.score >= 70 ? "#0F6E56" : "#A32D2D"
                      }}>{att.score}%</span>
                    </td>
                    <td style={{ padding: 8, color: "#5F5E5A" }}>{att.remarks || "—"}</td>
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
