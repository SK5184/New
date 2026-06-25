import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import PaperRecordModal from "../../../components/PaperRecordModal";

const METHODS = [
  { key: "method1", label: "1. Direct observation of routine test performance" },
  { key: "method2", label: "2. Direct observation of equipment maintenance & functional checks" },
  { key: "method3", label: "3. Monitoring of result recording and reporting" },
  { key: "method4", label: "4. Review of worksheets, logs, and patient records" },
  { key: "method5", label: "5. Assessment of problem-solving & critical skills" },
  { key: "method6", label: "6. Performance in EQA / proficiency testing / blind samples" }
];

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
function nextYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

export default function CompetencyManagement({ role, userName, dept }) {
  const [competencies, setCompetencies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'new'
  const [selected, setSelected] = useState(null);
  const [paperDoc, setPaperDoc] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    evaluator: userName || "",
    date: today(),
    nextReviewDate: nextYear(),
    method1: 5,
    method2: 5,
    method3: 5,
    method4: 5,
    method5: 5,
    method6: 5,
    overallStatus: "Competent",
    comments: "",
    capaRequired: false
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(query(collection(db, "hrCompetency"), orderBy("createdAt", "desc")));
      const cList = cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompetencies(cList);

      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (cList.length > 0) {
        const match = selected ? cList.find(c => c.id === selected.id) : null;
        setSelected(match || cList[0]);
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
      const averageScore = ((Number(form.method1) + Number(form.method2) + Number(form.method3) + Number(form.method4) + Number(form.method5) + Number(form.method6)) / 6).toFixed(2);
      await addDoc(collection(db, "hrCompetency"), {
        ...form,
        averageScore,
        createdAt: serverTimestamp()
      });
      setModal(null);
      setForm({
        employeeId: "", evaluator: userName || "", date: today(), nextReviewDate: nextYear(),
        method1: 5, method2: 5, method3: 5, method4: 5, method5: 5, method6: 5,
        overallStatus: "Competent", comments: "", capaRequired: false
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving competency record.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Competency Assessments</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2.3 · Assess personnel using 6 specific clinical evaluation methods</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal("new")}>
          🎯 New Competency Review
        </button>
      </div>

      <div style={S.layout}>
        {/* Left Side: Competency List */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Recent Competency Audits</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee Name</th>
                  <th style={S.th}>Evaluation Date</th>
                  <th style={S.th}>Avg Score</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : competencies.length === 0 ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No competency audits recorded.</td></tr>
                ) : (
                  competencies.map(c => {
                    const active = selected && selected.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A" }}>
                          <div>{getEmpName(c.employeeId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Dept: {getEmpDept(c.employeeId)}</div>
                        </td>
                        <td style={S.td}>{c.date}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{c.averageScore} / 5</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: c.overallStatus === "Competent" ? "#E1F5EE" : c.overallStatus === "Needs Retraining" ? "#FCEBEB" : "#FAEEDA",
                            color: c.overallStatus === "Competent" ? "#0F6E56" : c.overallStatus === "Needs Retraining" ? "#A32D2D" : "#854F0B"
                          }}>{c.overallStatus}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Competency Details */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Audit Details: {getEmpName(selected.employeeId)}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Evaluated on {selected.date} by {selected.evaluator}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setPaperDoc({
                    title: "STAFF CLINICAL COMPETENCY EVALUATION RECORD",
                    docNumber: `COMP-EVAL-${selected.id}`,
                    metadata: [
                      { label: "Employee Name", value: getEmpName(selected.employeeId) },
                      { label: "Employee ID", value: selected.employeeId },
                      { label: "Evaluation Date", value: selected.date },
                      { label: "Authorized Evaluator", value: selected.evaluator },
                      { label: "Competency Level", value: `${selected.averageScore} / 5` },
                      { label: "Final Status", value: selected.overallStatus },
                      { label: "Next Review Date", value: selected.nextReviewDate },
                      { label: "Verification Status", value: "COMPLETED IN ACCORDANCE WITH §6.2.3" }
                    ]
                  })}
                  style={{
                    padding: "3px 8px", background: "#E2E8F0", color: "#475569",
                    border: "none", borderRadius: 4, fontSize: 10.5, cursor: "pointer"
                  }}
                >
                  📄 View Paper Record
                </button>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                  background: selected.overallStatus === "Competent" ? "#E1F5EE" : "#FCEBEB",
                  color: selected.overallStatus === "Competent" ? "#0F6E56" : "#A32D2D"
                }}>
                  {selected.overallStatus} (Avg: {selected.averageScore}/5)
                </span>
              </div>
            </div>

            <div style={S.cardBody}>
              <div style={{ fontSize: 11, color: "#888780", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 6, marginBottom: 12 }}>
                ISO 15189:2022 §6.2.3 requires evaluating competency across these 6 distinct methods:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {METHODS.map(m => (
                  <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6" }}>
                    <span style={{ fontSize: 11.5, color: "#2C2C2A", maxWidth: "80%" }}>{m.label}</span>
                    <span style={{ fontWeight: 600, color: "#0F6E56", fontSize: 12 }}>{selected[m.key]} ★</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={S.label}>Comments & Reviewer Remarks</div>
                <div style={{ fontSize: 12, padding: "8px 12px", background: "#F7F6F2", borderRadius: 6, border: "0.5px solid #E0DDD6", color: "#2C2C2A" }}>
                  {selected.comments || "No comments entered."}
                </div>
              </div>

              <div style={{ ...S.grid(2), marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: "#888780" }}>Next Scheduled Review: <strong>{selected.nextReviewDate}</strong></span>
                {selected.capaRequired && <span style={{ color: "#A32D2D", fontWeight: 600 }}>⚠️ Retraining CAPA Record Required</span>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an audit record to view detailed evaluation breakdowns and ISO 15189 methods scores.
          </div>
        )}
      </div>

      {/* New Competency Review Modal */}
      {modal === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 580, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>New ISO 15189 Competency Assessment</div>
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
                  <label style={S.label}>Evaluator Name *</label>
                  <input style={S.inp} value={form.evaluator} onChange={e => setForm({ ...form, evaluator: e.target.value })} required />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Assessment Date</label>
                  <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Next Review Date</label>
                  <input style={S.inp} type="date" value={form.nextReviewDate} onChange={e => setForm({ ...form, nextReviewDate: e.target.value })} />
                </div>
              </div>

              {/* Methods ratings */}
              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6", marginBottom: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5F5E5A", marginBottom: 8 }}>Method Evaluation Scores (1 = Poor, 5 = Excellent)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {METHODS.map(m => (
                    <div key={m.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#2C2C2A", maxWidth: "80%" }}>{m.label}</span>
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

              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Overall Competence Status</label>
                  <select style={S.inp} value={form.overallStatus} onChange={e => setForm({ ...form, overallStatus: e.target.value })}>
                    <option value="Competent">Competent</option>
                    <option value="Needs Retraining">Needs Retraining</option>
                    <option value="Restricted Duties">Restricted Duties</option>
                  </select>
                </div>
                <div style={{ alignSelf: "center", paddingTop: 14 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2C2C2A" }}>
                    <input type="checkbox" checked={form.capaRequired} onChange={e => setForm({ ...form, capaRequired: e.target.checked })} />
                    Generate retrain CAPA ticket
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Comments / Actions / retrain Requirements</label>
                <textarea style={{ ...S.inp, height: 50, fontFamily: "inherit" }} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} placeholder="Details of observation or gap areas..." />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(null)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Save Audit Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {paperDoc && (
        <PaperRecordModal
          title={paperDoc.title}
          docNumber={paperDoc.docNumber}
          metadata={paperDoc.metadata}
          onClose={() => setPaperDoc(null)}
        />
      )}
    </div>
  );
}
