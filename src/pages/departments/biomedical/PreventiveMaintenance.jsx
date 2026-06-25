import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "80vh" },
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
function defaultNextPm() {
  const d = new Date();
  d.setMonth(d.getMonth() + 3); // PM interval 3 months
  return d.toISOString().split("T")[0];
}

export default function PreventiveMaintenance({ role, userName }) {
  const [records, setRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    date: today(),
    nextPmDate: defaultNextPm(),
    performedBy: userName || "",
    outcome: "Pass",
    chkElectrical: false,
    chkEmergency: false,
    chkHazmat: false,
    remarks: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(query(collection(db, "maintenanceRecords"), orderBy("createdAt", "desc")));
      setRecords(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const eSnap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      setEquipment(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const getEqName = (eqId) => {
    const match = equipment.find(e => e.id === eqId);
    return match ? match.name : "Unknown Instrument";
  };

  const getEqCode = (eqId) => {
    const match = equipment.find(e => e.id === eqId);
    return match ? match.assetCode : "—";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.equipmentId || !form.performedBy) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "maintenanceRecords"), {
        ...form,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "equipmentList", form.equipmentId), {
        lastPmDate: form.date,
        nextPmDate: form.nextPmDate
      });
      setForm({
        equipmentId: "", date: today(), nextPmDate: defaultNextPm(), performedBy: userName || "",
        outcome: "Pass", chkElectrical: false, chkEmergency: false, chkHazmat: false, remarks: ""
      });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving maintenance record.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Preventive Maintenance Logs</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.6 · Schedule preventive maintenance runs and verify electrical and safety stops</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          🔧 Log PM Work Order
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: PM History Table */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Preventive Maintenance History</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Equipment</th>
                  <th style={S.th}>PM Date</th>
                  <th style={S.th}>Next PM Date</th>
                  <th style={S.th}>Performed By</th>
                  <th style={S.th}>Safety Checks</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No preventive maintenance records logged.</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{getEqName(r.equipmentId)}</div>
                        <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Code: {getEqCode(r.equipmentId)}</div>
                      </td>
                      <td style={S.td}>{r.date}</td>
                      <td style={S.td}>{r.nextPmDate}</td>
                      <td style={S.td}>{r.performedBy}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span title="Electrical safety verified" style={{ opacity: r.chkElectrical ? 1 : 0.25 }}>⚡</span>
                          <span title="Emergency stop verified" style={{ opacity: r.chkEmergency ? 1 : 0.25 }}>🛑</span>
                          <span title="Hazardous material safety" style={{ opacity: r.chkHazmat ? 1 : 0.25 }}>☣️</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                          background: r.outcome === "Pass" ? "#E1F5EE" : "#FCEBEB",
                          color: r.outcome === "Pass" ? "#0F6E56" : "#A32D2D"
                        }}>{r.outcome}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Upcoming Schedules */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Planned PM Schedules</div></div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {equipment.filter(eq => eq.nextPmDate).map(eq => (
                <div key={eq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAFAF8", borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{eq.name}</div>
                    <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>Asset ID: {eq.assetCode}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#854F0B" }}>Due: {eq.nextPmDate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log PM Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Preventive Maintenance Details</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Instrument *</label>
                <select style={S.inp} value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })} required>
                  <option value="">Select Equipment</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.assetCode})</option>)}
                </select>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Performed By *</label>
                  <input style={S.inp} value={form.performedBy} onChange={e => setForm({ ...form, performedBy: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>PM Result Status</label>
                  <select style={S.inp} value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                    <option value="Conditional">Conditional Pass</option>
                  </select>
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>PM Action Date</label>
                  <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Next PM Due Date</label>
                  <input style={S.inp} type="date" value={form.nextPmDate} onChange={e => setForm({ ...form, nextPmDate: e.target.value })} />
                </div>
              </div>

              {/* Safety checks */}
              <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6", marginBottom: 12, marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#5F5E5A", marginBottom: 8 }}>ISO 15189 PM Verification Checks</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <input type="checkbox" checked={form.chkElectrical} onChange={e => setForm({ ...form, chkElectrical: e.target.checked })} />
                    Electrical safety verified (grounding and leakage checked)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <input type="checkbox" checked={form.chkEmergency} onChange={e => setForm({ ...form, chkEmergency: e.target.checked })} />
                    Emergency stop devices verified as fully functional
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                    <input type="checkbox" checked={form.chkHazmat} onChange={e => setForm({ ...form, chkHazmat: e.target.checked })} />
                    Safe handling of hazardous materials (chemical containment checked)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Remarks & Maintenance Actions Details</label>
                <textarea style={{ ...S.inp, height: 50, fontFamily: "inherit" }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Details of actions taken..." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Log PM Run"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
