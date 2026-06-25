import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
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

export default function ContinuingEducation({ role, userName, dept }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    title: "",
    provider: "",
    date: today(),
    credits: 5,
    certNo: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(query(collection(db, "hrContinuingEducation"), orderBy("createdAt", "desc")));
      setRecords(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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

  const getAccumulatedCredits = (empId) => {
    return records
      .filter(r => r.employeeId === empId)
      .reduce((acc, r) => acc + Number(r.credits || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.title) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrContinuingEducation"), {
        ...form,
        credits: Number(form.credits),
        createdAt: serverTimestamp()
      });
      setForm({ employeeId: "", title: "", provider: "", date: today(), credits: 5, certNo: "" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error logging continuing education record.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Continuing Education (CME)</h2>
          <div style={S.subtitle}>ISO 15189:2022 · Track scientific credits, seminars, and training contact hours</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          📘 Log CME Record
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: CE list */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Professional Development Logs</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee</th>
                  <th style={S.th}>Course Title & Provider</th>
                  <th style={S.th}>Date & Credits</th>
                  <th style={S.th}>Cert No</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No Continuing Education logs found.</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{getEmpName(r.employeeId)}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>{getEmpDept(r.employeeId)}</div>
                      </td>
                      <td style={S.td}>
                        <div style={{ fontWeight: 500 }}>{r.title}</div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>{r.provider}</div>
                      </td>
                      <td style={S.td}>
                        <div>{r.date}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: "#0F6E56", marginTop: 2 }}>{r.credits} CME Credits</div>
                      </td>
                      <td style={S.td}>{r.certNo || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: CME Credit Summary */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Annual CME Progress (Target: 15 Credits)</div>
          </div>
          <div style={S.cardBody}>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Staff Name</th>
                    <th style={S.th}>Department</th>
                    <th style={S.th}>Accumulated Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No employees found.</td></tr>
                  ) : (
                    employees.map(emp => {
                      const totalCme = getAccumulatedCredits(emp.id);
                      const target = 15;
                      const pct = Math.min(Math.round((totalCme / target) * 100), 100);
                      return (
                        <tr key={emp.id}>
                          <td style={S.td}>{emp.fullName || emp.employeeName}</td>
                          <td style={S.td}>{emp.department}</td>
                          <td style={S.td}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: 11.5 }}>
                              <span>{totalCme} / {target} Credits</span>
                              <span style={{ color: totalCme >= target ? "#0F6E56" : "#854F0B" }}>{pct}%</span>
                            </div>
                            <div style={{ background: "#E0DDD6", borderRadius: 10, height: 6, width: "100%", overflow: "hidden", marginTop: 4 }}>
                              <div style={{ width: `${pct}%`, background: totalCme >= target ? "#0F6E56" : "#EF9F27", height: "100%" }} />
                            </div>
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
      </div>

      {/* CME Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Continuing Education Credit</div>
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
                <label style={S.label}>Course / Seminar / Training Title *</label>
                <input style={S.inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Molecular Diagnostic Advances in Virology" required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Provider / Organization</label>
                <input style={S.inp} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} placeholder="e.g. Indian Association of Medical Microbiologists" />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Completion Date</label>
                  <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>CME Credits (Hours)</label>
                  <input style={S.inp} type="number" min="0.5" step="0.5" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Certificate Number / Ref Link</label>
                <input style={S.inp} value={form.certNo} onChange={e => setForm({ ...form, certNo: e.target.value })} placeholder="e.g. CERT-2026-99" />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Save CME Record"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
