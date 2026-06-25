import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", height: "fit-content", marginBottom: 16 },
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

export default function PerformanceManagement({ role, userName, dept }) {
  const [appraisals, setAppraisals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'new'
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    period: "2025-2026",
    evaluator: userName || "",
    date: today(),
    scoreTechnical: 5,
    scoreSafety: 5,
    scoreTAT: 5,
    scoreProfessionalism: 5,
    selfRemarks: "",
    managerRemarks: "",
    goals: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const aSnap = await getDocs(query(collection(db, "hrAppraisals"), orderBy("createdAt", "desc")));
      const aList = aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppraisals(aList);

      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (aList.length > 0) {
        const match = selected ? aList.find(a => a.id === selected.id) : null;
        setSelected(match || aList[0]);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

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
    if (!form.employeeId || !form.evaluator) return;
    setSaving(true);
    try {
      const finalScore = ((Number(form.scoreTechnical) + Number(form.scoreSafety) + Number(form.scoreTAT) + Number(form.scoreProfessionalism)) / 4).toFixed(2);
      await addDoc(collection(db, "hrAppraisals"), {
        ...form,
        finalScore,
        createdAt: serverTimestamp()
      });
      setForm({
        employeeId: "", period: "2025-2026", evaluator: userName || "", date: today(),
        scoreTechnical: 5, scoreSafety: 5, scoreTAT: 5, scoreProfessionalism: 5,
        selfRemarks: "", managerRemarks: "", goals: ""
      });
      setModal(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving performance review.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Performance Reviews & Appraisals</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2 · Annual performance reviews, goal trackers, and development scorecards</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal("new")}>
          📈 New Performance appraisal
        </button>
      </div>

      <div style={S.layout}>
        {/* Left Side: Appraisals List */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Appraisal Directory</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee</th>
                  <th style={S.th}>Period</th>
                  <th style={S.th}>Appraisal Date</th>
                  <th style={S.th}>Final Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : appraisals.length === 0 ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No appraisals recorded.</td></tr>
                ) : (
                  appraisals.map(a => {
                    const active = selected && selected.id === a.id;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelected(a)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A" }}>
                          <div>{getEmpName(a.employeeId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Dept: {getEmpDept(a.employeeId)}</div>
                        </td>
                        <td style={S.td}>{a.period}</td>
                        <td style={S.td}>{a.date}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{a.finalScore} / 5</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Appraisal Details */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Scorecard: {getEmpName(selected.employeeId)}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Period: {selected.period} · Review by {selected.evaluator} on {selected.date}</div>
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#0F6E56" }}>
                  {selected.finalScore} / 5.00
                </span>
              </div>
            </div>

            <div style={S.cardBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Technical Competence & Lab Operations Quality", val: selected.scoreTechnical },
                  { label: "Safety Regulations & Biosafety Protocol Adherence", val: selected.scoreSafety },
                  { label: "TAT (Turnaround Time) Speed & Work Efficiency", val: selected.scoreTAT },
                  { label: "Professionalism, Teamwork & Interpersonal Skills", val: selected.scoreProfessionalism }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6", fontSize: 11.5 }}>
                    <span style={{ color: "#2C2C2A" }}>{item.label}</span>
                    <strong style={{ color: "#0F6E56" }}>{item.val} / 5</strong>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={S.label}>Employee Self-Appraisal Remarks</div>
                <div style={{ fontSize: 11.5, padding: "8px 12px", background: "#F7F6F2", borderRadius: 6, border: "0.5px solid #E0DDD6", color: "#2C2C2A" }}>
                  {selected.selfRemarks || "No remarks entered."}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={S.label}>Manager / Reviewer Remarks</div>
                <div style={{ fontSize: 11.5, padding: "8px 12px", background: "#F7F6F2", borderRadius: 6, border: "0.5px solid #E0DDD6", color: "#2C2C2A" }}>
                  {selected.managerRemarks || "No remarks entered."}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <div style={S.label}>Professional Development Goals (ISO 15189 Requirement)</div>
                <div style={{ fontSize: 11.5, padding: "8px 12px", background: "#E1F5EE", borderRadius: 6, border: "0.5px solid #0F6E5633", color: "#0F6E56" }}>
                  {selected.goals || "No specific goals established."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an appraisal record to review scorecard parameters and goals.
          </div>
        )}
      </div>

      {/* New Appraisal Modal */}
      {modal === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 580, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Staff Appraisal Review</div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Select Employee *</label>
                  <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                    <option value="">Select Staff</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Reviewer Name *</label>
                  <input style={S.inp} value={form.evaluator} onChange={e => setForm({ ...form, evaluator: e.target.value })} required />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Review Period</label>
                  <input style={S.inp} value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2025-2026" />
                </div>
                <div>
                  <label style={S.label}>Appraisal Date</label>
                  <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>

              {/* Appraisal Ratings */}
              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6", marginBottom: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5F5E5A", marginBottom: 8 }}>Appraisal Parameters (1 = Poor, 5 = Excellent)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "scoreTechnical", label: "Technical Competence & Lab Operations Quality" },
                    { key: "scoreSafety", label: "Safety Regulations & Biosafety Protocol Adherence" },
                    { key: "scoreTAT", label: "TAT (Turnaround Time) Speed & Work Efficiency" },
                    { key: "scoreProfessionalism", label: "Professionalism, Teamwork & Interpersonal Skills" }
                  ].map(m => (
                    <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#2C2C2A" }}>{m.label}</span>
                      <select
                        style={{ ...S.inp, width: 80, padding: "4px 8px" }}
                        value={form[m.key]}
                        onChange={e => setForm({ ...form, [m.key]: Number(e.target.value) })}
                      >
                        {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>Employee Self Remarks / Highlights</label>
                <textarea style={{ ...S.inp, height: 40, fontFamily: "inherit" }} value={form.selfRemarks} onChange={e => setForm({ ...form, selfRemarks: e.target.value })} placeholder="Staff achievements or concerns..." />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={S.label}>Manager Remarks & Feedback</label>
                <textarea style={{ ...S.inp, height: 40, fontFamily: "inherit" }} value={form.managerRemarks} onChange={e => setForm({ ...form, managerRemarks: e.target.value })} placeholder="Core performance remarks..." />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Training Goals & Professional Development Objectives</label>
                <textarea style={{ ...S.inp, height: 40, fontFamily: "inherit" }} value={form.goals} onChange={e => setForm({ ...form, goals: e.target.value })} placeholder="Future training targets or competency aims..." />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(null)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Save Appraisal Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
