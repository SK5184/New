import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const AUTHORIZED_TASKS = [
  "Phlebotomy / Sample Collection",
  "Sample Accessioning & Pre-analytical Sorting",
  "Biochemistry Analyzer Operation (Atellica/Cobas)",
  "Haematology Slide Review & Release",
  "Microbiology Cultures & Identification",
  "Molecular Assay Runs (PCR)",
  "Flow Cytometry Runs & Analysis",
  "Sign-off & Release of Lab Results (Report Signing)",
  "Conduct Internal Quality Audits",
  "Perform Equipment Calibration & Maintenance Verification"
];

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
function defaultExpiry() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2); // Authorizations valid for 2 years
  return d.toISOString().split("T")[0];
}

export default function AuthorizationPrivileges({ role, userName, dept }) {
  const [authorizations, setAuthorizations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'new'
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    task: AUTHORIZED_TASKS[0],
    authorizedBy: userName || "",
    dateAuthorized: today(),
    expiryDate: defaultExpiry(),
    status: "Active",
    remarks: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const aSnap = await getDocs(query(collection(db, "hrAuthorizations"), orderBy("createdAt", "desc")));
      const aList = aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuthorizations(aList);

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
    if (!form.employeeId || !form.task || !form.authorizedBy) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrAuthorizations"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setModal(null);
      setForm({
        employeeId: "", task: AUTHORIZED_TASKS[0], authorizedBy: userName || "",
        dateAuthorized: today(), expiryDate: defaultExpiry(), status: "Active", remarks: ""
      });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving authorization record.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (authId, newStatus) => {
    try {
      await updateDoc(doc(db, "hrAuthorizations", authId), { status: newStatus });
      setAuthorizations(list => list.map(a => a.id === authId ? { ...a, status: newStatus } : a));
      if (selected && selected.id === authId) {
        setSelected(prev => ({ ...prev, status: newStatus }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Task Authorizations</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2.5 · Formal management authorization for laboratory task duties</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal("new")}>
          🔑 New Authorization
        </button>
      </div>

      <div style={S.layout}>
        {/* Left Side: Authorizations Table */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Personnel Authorizations Registry</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee Name</th>
                  <th style={S.th}>Authorized Task</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : authorizations.length === 0 ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No authorizations logged.</td></tr>
                ) : (
                  authorizations.map(a => {
                    const active = selected && selected.id === a.id;
                    const expired = new Date(a.expiryDate) < new Date();
                    const dispStatus = expired ? "Expired" : a.status;
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
                        <td style={S.td}>{a.task}</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: dispStatus === "Active" ? "#E1F5EE" : dispStatus === "Expired" ? "#FCEBEB" : "#F1EFE8",
                            color: dispStatus === "Active" ? "#0F6E56" : dispStatus === "Expired" ? "#A32D2D" : "#5F5E5A"
                          }}>{dispStatus}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Authorization Details */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Authorization Details</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Granted to {getEmpName(selected.employeeId)}</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ marginBottom: 16 }}>
                <div style={S.label}>Authorized Activity / Duty Task</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A", background: "#F7F6F2", padding: "8px 12px", borderRadius: 6, border: "0.5px solid #E0DDD6" }}>
                  {selected.task}
                </div>
              </div>

              <div style={S.grid(2)}>
                <div>
                  <div style={S.label}>Date Authorized</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.dateAuthorized}</div>
                </div>
                <div>
                  <div style={S.label}>Expiry Date</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.expiryDate} {new Date(selected.expiryDate) < new Date() && <span style={{ color: "#A32D2D", fontWeight: 600 }}>(Expired)</span>}</div>
                </div>
              </div>

              <div style={{ ...S.grid(2), marginTop: 12 }}>
                <div>
                  <div style={S.label}>Authorized By (Supervisor / HOD)</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.authorizedBy}</div>
                </div>
                <div>
                  <div style={S.label}>Authorization Status</div>
                  <select
                    style={{ ...S.inp, padding: "5px 8px" }}
                    value={selected.status}
                    onChange={e => handleStatusChange(selected.id, e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Revoked">Revoked</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={S.label}>Remarks & Training Reference</div>
                <div style={{ fontSize: 12, padding: "8px 12px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6", minHeight: 40 }}>
                  {selected.remarks || "No remarks logged."}
                </div>
              </div>

              <div style={{ marginTop: 16, fontSize: 11, color: "#888780", padding: "10px 12px", background: "#FAFAF8", borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                ℹ️ <strong>ISO 15189:2022 §6.2.5 Note:</strong> The laboratory director or authorized HOD must define and authorize the job scope and duties of all staff. Duties must be restricted to those currently authorized.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an authorization record from the registry to view grant details.
          </div>
        )}
      </div>

      {/* New Authorization Modal */}
      {modal === "new" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Grant New Task Authorization</div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
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
                <label style={S.label}>Authorized Activity / Task *</label>
                <select style={S.inp} value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} required>
                  {AUTHORIZED_TASKS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Authorized By *</label>
                  <input style={S.inp} value={form.authorizedBy} onChange={e => setForm({ ...form, authorizedBy: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Date Authorized</label>
                  <input style={S.inp} type="date" value={form.dateAuthorized} onChange={e => setForm({ ...form, dateAuthorized: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Expiry Date</label>
                  <input style={S.inp} type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Remarks & Training/Assessment References</label>
                <textarea style={{ ...S.inp, height: 60, fontFamily: "inherit" }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Reference training session date or competency score..." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(null)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Authorize Personnel"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
