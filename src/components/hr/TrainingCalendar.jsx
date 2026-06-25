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

export default function TrainingCalendar() {
  const [sessions, setSessions] = useState([]);
  const [form, setForm] = useState({ topic: "", date: "", coordinator: "", targetAudience: "All Lab Staff", status: "Scheduled" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrTrainingCalendar"), orderBy("date", "asc")));
        setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error loading training calendar.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic || !form.date || !form.coordinator) return alert("Please fill all required fields");
    const payload = {
      ...form,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrTrainingCalendar"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Training event added to calendar!");
      setForm({ topic: "", date: "", coordinator: "", targetAudience: "All Lab Staff", status: "Scheduled" });
      const snap = await getDocs(query(collection(db, "hrTrainingCalendar"), orderBy("date", "asc")));
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setSessions(prev => [...prev, payload].sort((a,b) => new Date(a.date) - new Date(b.date)));
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Schedule New QMS Training Event (Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Training Topic / Subject *</label>
              <input style={S.inp} value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Chemical Hygiene & Spillage Protocol" required />
            </div>
            <div>
              <label style={S.label}>Scheduled Date *</label>
              <input type="date" style={S.inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
          </div>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Coordinator / Presenter *</label>
              <input style={S.inp} value={form.coordinator} onChange={e => setForm({ ...form, coordinator: e.target.value })} placeholder="e.g. Dr. A. K. Sharma (Q.M.)" required />
            </div>
            <div>
              <label style={S.label}>Target Audience</label>
              <input style={S.inp} value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} placeholder="e.g. All Technicians" />
            </div>
            <div>
              <label style={S.label}>Initial Status</label>
              <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Scheduled</option>
                <option>In-Progress</option>
                <option>Completed</option>
                <option>Postponed</option>
              </select>
            </div>
          </div>
          <button type="submit" style={S.btn}>Schedule Training Event</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Annual Laboratory Training Planner & Schedule</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Training Subject</th>
                <th style={{ padding: 8, textAlign: "left" }}>Date</th>
                <th style={{ padding: 8, textAlign: "left" }}>Coordinator</th>
                <th style={{ padding: 8, textAlign: "left" }}>Target Audience</th>
                <th style={{ padding: 8, textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No training events scheduled.</td></tr>
              ) : (
                sessions.map((s, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{s.topic}</td>
                    <td style={{ padding: 8 }}>{s.date}</td>
                    <td style={{ padding: 8 }}>{s.coordinator}</td>
                    <td style={{ padding: 8 }}>{s.targetAudience}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: s.status === "Completed" ? "#E1F5EE" : s.status === "Scheduled" ? "#E6F1FB" : s.status === "Postponed" ? "#FCEBEB" : "#FAEEDA",
                        color: s.status === "Completed" ? "#0F6E56" : s.status === "Scheduled" ? "#185FA5" : s.status === "Postponed" ? "#A32D2D" : "#854F0B",
                        fontWeight: 600
                      }}>{s.status}</span>
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
