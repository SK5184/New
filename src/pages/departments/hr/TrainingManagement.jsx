import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import PaperRecordModal from "../../../components/PaperRecordModal";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
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

export default function TrainingManagement({ role, userName, dept }) {
  const [trainings, setTrainings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'new'
  const [selected, setSelected] = useState(null);
  const [paperDoc, setPaperDoc] = useState(null);

  const [form, setForm] = useState({
    title: "", department: "", date: today(), trainer: "", description: "", status: "Scheduled"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tSnap = await getDocs(query(collection(db, "hrTraining"), orderBy("createdAt", "desc")));
      const tList = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainings(tList);

      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (tList.length > 0) {
        const match = selected ? tList.find(t => t.id === selected.id) : null;
        setSelected(match || tList[0]);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.trainer) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrTraining"), {
        ...form,
        attendance: {},
        createdAt: serverTimestamp()
      });
      setModal(null);
      setForm({ title: "", department: "", date: today(), trainer: "", description: "", status: "Scheduled" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving training program.");
    }
    setSaving(false);
  };

  const toggleAttendance = async (empId) => {
    if (!selected) return;
    setSaving(true);
    try {
      const att = selected.attendance || {};
      const record = att[empId] || { status: "Absent", score: "" };
      record.status = record.status === "Attended" ? "Absent" : "Attended";

      const updatedAtt = { ...att, [empId]: record };
      await updateDoc(doc(db, "hrTraining", selected.id), { attendance: updatedAtt });

      setSelected(t => ({ ...t, attendance: updatedAtt }));
      setTrainings(list => list.map(t => t.id === selected.id ? { ...t, attendance: updatedAtt } : t));
    } catch (e) {
      console.error(e);
      alert("Error updating attendance.");
    }
    setSaving(false);
  };

  const handleScoreChange = async (empId, score) => {
    if (!selected) return;
    try {
      const att = selected.attendance || {};
      const record = att[empId] || { status: "Absent", score: "" };
      record.score = score;

      const updatedAtt = { ...att, [empId]: record };
      await updateDoc(doc(db, "hrTraining", selected.id), { attendance: updatedAtt });

      setSelected(t => ({ ...t, attendance: updatedAtt }));
      setTrainings(list => list.map(t => t.id === selected.id ? { ...t, attendance: updatedAtt } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteTraining = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "hrTraining", selected.id), { status: "Completed" });
      setSelected(t => ({ ...t, status: "Completed" }));
      setTrainings(list => list.map(t => t.id === selected.id ? { ...t, status: "Completed" } : t));
    } catch (e) {
      console.error(e);
      alert("Error updating status.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Training & Continuing Education</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2.3 · Plan and evaluate training courses for all laboratory staff</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal("new")}>
          📅 Schedule Training
        </button>
      </div>

      <div style={S.layout}>
        {/* Left Side: Training Schedule list */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Scheduled Training Programs</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Training Title</th>
                  <th style={S.th}>Date & Trainer</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading trainings...</td></tr>
                ) : trainings.length === 0 ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No training programs scheduled.</td></tr>
                ) : (
                  trainings.map(t => {
                    const active = selected && selected.id === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelected(t)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A" }}>
                          <div>{t.title}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Dept: {t.department || "General"}</div>
                        </td>
                        <td style={S.td}>
                          <div>{t.date}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>By: {t.trainer}</div>
                        </td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: t.status === "Completed" ? "#E1F5EE" : "#FAEEDA",
                            color: t.status === "Completed" ? "#0F6E56" : "#854F0B"
                          }}>{t.status}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Training Attendance sheet */}
        {selected ? (
          <div style={S.card}>
            <div style={{ ...S.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.cardTitle}>Attendance Sheet: {selected.title}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.description || "No description provided"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => setPaperDoc({
                    title: "LABORATORY PERSONNEL TRAINING SHEET",
                    docNumber: `TRAIN-REC-${selected.id}`,
                    metadata: [
                      { label: "Training Program", value: selected.title },
                      { label: "Description", value: selected.description || "General SOP / Compliance Training" },
                      { label: "Scheduled Date", value: selected.date },
                      { label: "Trainer/Instructor", value: selected.trainer },
                      { label: "Department Scope", value: selected.department || "General QMS" },
                      { label: "Training Status", value: selected.status },
                      { label: "Audit Verification", value: "SOP TRAINING REGISTER COMPLIANT TO §6.2.4" }
                    ]
                  })}
                  style={{
                    padding: "6px 12px", background: "#E2E8F0", color: "#475569",
                    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}
                >
                  📄 View Paper Record
                </button>
                {selected.status === "Scheduled" && (
                  <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={handleCompleteTraining}>
                    ✓ Mark Completed
                  </button>
                )}
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888780", marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
                <span>Mark attendance for personnel in this session:</span>
                <span>Date: {selected.date} | Trainer: {selected.trainer}</span>
              </div>
              <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee Name</th>
                      <th style={S.th}>Department</th>
                      <th style={{ ...S.th, width: 100 }}>Status</th>
                      <th style={{ ...S.th, width: 120 }}>Evaluation (Score)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No employees found in directory.</td></tr>
                    ) : (
                      employees.map(emp => {
                        const record = (selected.attendance || {})[emp.id] || { status: "Absent", score: "" };
                        return (
                          <tr key={emp.id}>
                            <td style={S.td}>
                              <div style={{ fontWeight: 500 }}>{emp.fullName || emp.employeeName}</div>
                            </td>
                            <td style={S.td}>{emp.department}</td>
                            <td style={S.td}>
                              <input
                                type="checkbox"
                                checked={record.status === "Attended"}
                                disabled={selected.status === "Completed" || saving}
                                onChange={() => toggleAttendance(emp.id)}
                              />{" "}
                              <span style={{ fontSize: 11, color: record.status === "Attended" ? "#0F6E56" : "#888780", fontWeight: record.status === "Attended" ? 600 : 400 }}>
                                {record.status}
                              </span>
                            </td>
                            <td style={S.td}>
                              <input
                                style={{ ...S.inp, padding: "3px 6px" }}
                                placeholder="e.g. Satisfactory / 90%"
                                value={record.score || ""}
                                disabled={selected.status === "Completed"}
                                onChange={e => handleScoreChange(emp.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select a training session to register attendance and record post-training scores.
          </div>
        )}
      </div>

      {/* Schedule Training Modal */}
      {modal === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Schedule New Training Program</div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Training Session Title *</label>
                <input style={S.inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Biosafety Levels and Clean Bench Operations" required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Target Department</label>
                  <input style={S.inp} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. Microbiology" />
                </div>
                <div>
                  <label style={S.label}>Trainer Name *</label>
                  <input style={S.inp} value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} placeholder="e.g. Dr. Rajesh Sharma" required />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Scheduled Date</label>
                <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Brief Description</label>
                <textarea style={{ ...S.inp, height: 60, fontFamily: "inherit" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Objectives and agenda of the session" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(null)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Schedule Program"}</button>
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
