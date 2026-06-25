import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "80vh" },
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

export default function EquipmentTraining({ role, userName }) {
  const [trainings, setTrainings] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",
    equipmentId: "",
    dateTrained: today(),
    trainer: "",
    status: "Trained & Authorized"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const tSnap = await getDocs(query(collection(db, "equipmentTraining"), orderBy("createdAt", "desc")));
      const tList = tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrainings(tList);

      const eSnap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      setEquipment(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const empSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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

  const getEmpName = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? (match.fullName || match.employeeName) : "Unknown Employee";
  };

  const getEmpDept = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? match.department : "—";
  };

  const getEqName = (eqId) => {
    const match = equipment.find(e => e.id === eqId);
    return match ? match.name : "Unknown Instrument";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.equipmentId || !form.trainer) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "equipmentTraining"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setForm({ employeeId: "", equipmentId: "", dateTrained: today(), trainer: "", status: "Trained & Authorized" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving training record.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (authId, newStatus) => {
    try {
      await updateDoc(doc(db, "equipmentTraining", authId), { status: newStatus });
      setTrainings(list => list.map(t => t.id === authId ? { ...t, status: newStatus } : t));
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
          <h2 style={S.title}>Equipment Training & Operator Authorizations</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.1 · Record personnel training evaluations and instrument operation authorisations</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          🎓 Log Operator Authorization
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Authorizations Table */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Authorized Operators Register</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Employee Name</th>
                  <th style={S.th}>Instrument Name</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : trainings.length === 0 ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No operator records found.</td></tr>
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
                          <div>{getEmpName(t.employeeId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Dept: {getEmpDept(t.employeeId)}</div>
                        </td>
                        <td style={S.td}>{getEqName(t.equipmentId)}</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: t.status === "Trained & Authorized" ? "#E1F5EE" : t.status === "Training in Progress" ? "#FAEEDA" : "#FCEBEB",
                            color: t.status === "Trained & Authorized" ? "#0F6E56" : t.status === "Training in Progress" ? "#854F0B" : "#A32D2D"
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

        {/* Right: Operator Details */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Authorization Details</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{getEmpName(selected.employeeId)}</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Authorized Equipment Instrument</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>{getEqName(selected.equipmentId)}</div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <div style={S.label}>Date Logged</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.dateTrained}</div>
                </div>
                <div>
                  <div style={S.label}>Assessing Trainer</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.trainer}</div>
                </div>
              </div>
              <div style={{ ...S.grid(2), marginTop: 12 }}>
                <div>
                  <div style={S.label}>Operation Status</div>
                  <select
                    style={{ ...S.inp, padding: "5px 8px" }}
                    value={selected.status}
                    onChange={e => handleStatusChange(selected.id, e.target.value)}
                  >
                    <option value="Trained & Authorized">Trained & Authorized</option>
                    <option value="Supervised Operation Only">Supervised Operation Only</option>
                    <option value="Unauthorized / Suspended">Unauthorized / Suspended</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 20, fontSize: 11, color: "#888780", padding: "10px 12px", background: "#FAFAF8", borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                ℹ️ <strong>ISO 15189 §6.4.1 Note:</strong> The laboratory must ensure that only authorized staff operate clinical instruments. Operator list must match the active records.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an operator record from the table to view authorization logs.
          </div>
        )}
      </div>

      {/* New training authorization Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Equipment Operator Authorization</div>
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
                <label style={S.label}>Select Equipment *</label>
                <select style={S.inp} value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })} required>
                  <option value="">Select Instrument</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.assetCode})</option>)}
                </select>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Trainer / Assessor Name *</label>
                  <input style={S.inp} value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} placeholder="e.g. Dr. Verma" required />
                </div>
                <div>
                  <label style={S.label}>Authorization Status</label>
                  <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="Trained & Authorized">Trained & Authorized</option>
                    <option value="Supervised Operation Only">Supervised Operation Only</option>
                    <option value="Training in Progress">Training in Progress</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Checkout Date</label>
                <input style={S.inp} type="date" value={form.dateTrained} onChange={e => setForm({ ...form, dateTrained: e.target.value })} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Log Authorization"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
