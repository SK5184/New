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
function defaultNextCal() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6); // Default calibration interval 6 months
  return d.toISOString().split("T")[0];
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function getDueBadge(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return { label: "N/A", color: "#888780", bg: "#F1EFE8" };
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, color: "#A32D2D", bg: "#FCEBEB" };
  if (d <= 7) return { label: `Due in ${d}d`, color: "#854F0B", bg: "#FAEEDA" };
  if (d <= 30) return { label: `Due in ${d}d`, color: "#185FA5", bg: "#E6F1FB" };
  return { label: `Due in ${d}d`, color: "#0F6E56", bg: "#E1F5EE" };
}

export default function EquipmentCalibration({ role, userName }) {
  const [calibrations, setCalibrations] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    agency: "",
    certificateNo: "",
    referenceStandard: "",
    calDate: today(),
    nextCalDate: defaultNextCal(),
    result: "Pass"
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(query(collection(db, "calibrationRecords"), orderBy("createdAt", "desc")));
      setCalibrations(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

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
    if (!form.equipmentId || !form.certificateNo) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "calibrationRecords"), {
        ...form,
        createdAt: serverTimestamp()
      });
      // Also update nextCalDate and status in the master equipment registry!
      await updateDoc(doc(db, "equipmentList", form.equipmentId), {
        lastCalDate: form.calDate,
        nextCalDate: form.nextCalDate,
        calStatus: "Calibrated"
      });
      setForm({
        equipmentId: "", agency: "", certificateNo: "", referenceStandard: "",
        calDate: today(), nextCalDate: defaultNextCal(), result: "Pass"
      });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error logging calibration.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Equipment Calibration logs</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.5 · Track certificates, traceable standard checks, and next calibration due alerts</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          ⚖️ Log Calibration Certificate
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Calibrations list */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Calibration Logs Registry</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Equipment</th>
                  <th style={S.th}>Cert & Agency</th>
                  <th style={S.th}>Cal Date</th>
                  <th style={S.th}>Calibration Due Horizon</th>
                  <th style={S.th}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : calibrations.length === 0 ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No calibration events recorded.</td></tr>
                ) : (
                  calibrations.map(c => {
                    const badge = getDueBadge(c.nextCalDate);
                    return (
                      <tr key={c.id}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 600 }}>{getEqName(c.equipmentId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Code: {getEqCode(c.equipmentId)}</div>
                        </td>
                        <td style={S.td}>
                          <div>No: {c.certificateNo}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>By: {c.agency || "Internal"}</div>
                        </td>
                        <td style={S.td}>{c.calDate}</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
                            background: badge.bg, color: badge.color
                          }}>{badge.label}</span>
                          <div style={{ fontSize: 9.5, color: "#888780", marginTop: 2 }}>Due: {c.nextCalDate}</div>
                        </td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: c.result === "Pass" ? "#E1F5EE" : "#FCEBEB",
                            color: c.result === "Pass" ? "#0F6E56" : "#A32D2D"
                          }}>{c.result}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Expiry Warning Dashboard */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Upcoming Calibration Schedules</div></div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {equipment.filter(eq => eq.nextCalDate).map(eq => {
                const badge = getDueBadge(eq.nextCalDate);
                return (
                  <div key={eq.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAFAF8", borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{eq.name}</div>
                      <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>Asset ID: {eq.assetCode} | Dept: {eq.department}</div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
                      background: badge.bg, color: badge.color
                    }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* New Calibration Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Instrument Calibration Details</div>
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
                  <label style={S.label}>Certificate Number *</label>
                  <input style={S.inp} value={form.certificateNo} onChange={e => setForm({ ...form, certificateNo: e.target.value })} placeholder="e.g. CAL-2026-009" required />
                </div>
                <div>
                  <label style={S.label}>Calibrating Agency / Authority</label>
                  <input style={S.inp} value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} placeholder="e.g. NABL Accredited Agency Ltd" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Traceable Reference Standard Details *</label>
                <input style={S.inp} value={form.referenceStandard} onChange={e => setForm({ ...form, referenceStandard: e.target.value })} placeholder="e.g. NIST SRM 1960 traceable standards" required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Calibration Date</label>
                  <input style={S.inp} type="date" value={form.calDate} onChange={e => setForm({ ...form, calDate: e.target.value })} />
                </div>
                <div>
                  <label style={S.label}>Next Due Date</label>
                  <input style={S.inp} type="date" value={form.nextCalDate} onChange={e => setForm({ ...form, nextCalDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Calibration Result Status</label>
                <select style={S.inp} value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                  <option value="Conditional pass">Conditional pass</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Log Calibration"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
