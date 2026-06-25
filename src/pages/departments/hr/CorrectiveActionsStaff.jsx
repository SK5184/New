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
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContents: "space-between" },
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

export default function CorrectiveActionsStaff({ role, userName, dept }) {
  const [capas, setCapas] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    sourceType: "Competency Gap",
    description: "",
    correctiveAction: "",
    dueDate: today(),
    status: "Pending Verification",
    verifiedBy: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(query(collection(db, "hrCAPA"), orderBy("createdAt", "desc")));
      setCapas(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
    if (!form.employeeId || !form.correctiveAction) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrCAPA"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setForm({ employeeId: "", sourceType: "Competency Gap", description: "", correctiveAction: "", dueDate: today(), status: "Pending Verification", verifiedBy: "" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error logging corrective action.");
    }
    setSaving(false);
  };

  const handleVerify = async (capaId) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "hrCAPA", capaId), {
        status: "Verified",
        verifiedBy: userName || "Quality Manager",
        verifiedDate: today()
      });
      setCapas(list => list.map(c => c.id === capaId ? { ...c, status: "Verified", verifiedBy: userName || "Quality Manager", verifiedDate: today() } : c));
    } catch (e) {
      console.error(e);
      alert("Error verifying CAPA.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Staff Corrective Actions (CAPA)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §8.4 · Log and track personnel retraining CAPA and audits due to EQA or competency gaps</div>
        </div>
        <button style={S.btn("#A32D2D", "#FCEBEB")} onClick={() => setModal(true)}>
          ⚠️ Log Staff CAPA
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: CAPAs Table */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Staff Action Plans Registry</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Staff Employee</th>
                  <th style={S.th}>Category & Issue</th>
                  <th style={S.th}>Corrective Action</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : capas.length === 0 ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No staff CAPA records logged.</td></tr>
                ) : (
                  capas.map(c => (
                    <tr key={c.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{getEmpName(c.employeeId)}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>{getEmpDept(c.employeeId)}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 500, color: "#A32D2D" }}>{c.sourceType}</div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>{c.description}</div>
                      </td>
                      <td style={S.td}>
                        <div>{c.correctiveAction}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>Due: {c.dueDate}</div>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                          background: c.status === "Verified" ? "#E1F5EE" : "#FAEEDA",
                          color: c.status === "Verified" ? "#0F6E56" : "#854F0B"
                        }}>{c.status}</span>
                      </td>
                      <td style={S.td}>
                        {c.status === "Pending Verification" ? (
                          <button
                            style={{ padding: "4px 8px", fontSize: 10, background: "#0F6E56", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                            onClick={() => handleVerify(c.id)}
                            disabled={saving}
                          >
                            Verify Effectiveness
                          </button>
                        ) : (
                          <div style={{ fontSize: 10, color: "#888780" }}>
                            Verified by {c.verifiedBy} on {c.verifiedDate}
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

        {/* Right: Summary of Open Staff CAPAs */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>CAPA Metrics</div>
          </div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8 }}>
                <span>Total Staff CAPAs Logged</span>
                <span style={{ fontWeight: 600 }}>{capas.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8, color: "#854F0B" }}>
                <span>Awaiting Follow-up Verification</span>
                <span style={{ fontWeight: 600 }}>{capas.filter(c => c.status === "Pending Verification").length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 8, color: "#0F6E56" }}>
                <span>Successfully Verified (Closed)</span>
                <span style={{ fontWeight: 600 }}>{capas.filter(c => c.status === "Verified").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log CAPA Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Staff Retraining & Corrective Action</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Affected Employee *</label>
                <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                  <option value="">Select Staff</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>)}
                </select>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>CAPA Source Trigger</label>
                  <select style={S.inp} value={form.sourceType} onChange={e => setForm({ ...form, sourceType: e.target.value })}>
                    <option value="Competency Gap">Competency Assessment Gap</option>
                    <option value="Training CAPA">Training Attendance Lack</option>
                    <option value="Performance CAPA">Performance Appraisal Remediation</option>
                    <option value="EQA/IQC Failure">EQA / IQC Analysis Error</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Target Remediation Date</label>
                  <input style={S.inp} type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Description of Deficiency / Gap *</label>
                <textarea style={{ ...S.inp, height: 50, fontFamily: "inherit" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Detail the specific deficiency or audit finding..." required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Remediation Action Plan (Retraining, etc.) *</label>
                <textarea style={{ ...S.inp, height: 60, fontFamily: "inherit" }} value={form.correctiveAction} onChange={e => setForm({ ...form, correctiveAction: e.target.value })} placeholder="e.g. 2 weeks supervised pipetting, retraining in blood group card method..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Log Action Plan"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
