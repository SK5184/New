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

export default function EquipmentDecommission({ role, userName }) {
  const [records, setRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    type: "Decommission Request",
    date: today(),
    reason: "",
    recallNoticeRef: "",
    disposalMethod: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rSnap = await getDocs(query(collection(db, "equipmentDecommissions"), orderBy("createdAt", "desc")));
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
    if (!form.equipmentId || !form.reason) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "equipmentDecommissions"), {
        ...form,
        createdAt: serverTimestamp()
      });
      // Update the master equipment status in the register!
      const statusVal = form.type === "Decommission Request" ? "Decommissioned" : "Out of service";
      await updateDoc(doc(db, "equipmentList", form.equipmentId), {
        status: statusVal
      });
      setForm({ equipmentId: "", type: "Decommission Request", date: today(), reason: "", recallNoticeRef: "", disposalMethod: "" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving decommission record.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Decommissioning & Manufacturer Recalls</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.9 · Manage decommission requests and recalls responses</div>
        </div>
        <button style={S.btn("#A32D2D", "#FCEBEB")} onClick={() => setModal(true)}>
          🚫 Log Decommission / Recall
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Records list */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Decommission & Recall Logs</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Equipment</th>
                  <th style={S.th}>Action Type</th>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Reason</th>
                  <th style={S.th}>Disposal / Recall Ref</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No decommissioning logs recorded.</td></tr>
                ) : (
                  records.map(r => (
                    <tr key={r.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600 }}>{getEqName(r.equipmentId)}</div>
                        <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Code: {getEqCode(r.equipmentId)}</div>
                      </td>
                      <td style={S.td}>
                        <span style={{
                          display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                          background: r.type === "Decommission Request" ? "#F1EFE8" : "#FCEBEB",
                          color: r.type === "Decommission Request" ? "#5F5E5A" : "#A32D2D"
                        }}>{r.type}</span>
                      </td>
                      <td style={S.td}>{r.date}</td>
                      <td style={S.td}>{r.reason}</td>
                      <td style={S.td}>{r.type === "Decommission Request" ? (r.disposalMethod || "—") : (r.recallNoticeRef || "—")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Summary Information */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Audit Instructions</div></div>
          <div style={S.cardBody}>
            <div style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.7 }}>
              🚨 <strong>ISO 15189:2022 §6.4.9 Requirements:</strong>
              <ul style={{ paddingLeft: 16, marginTop: 8 }}>
                <li>Equipments that have been recalled by manufacturers must be immediately removed from service.</li>
                <li>Decommissioned equipment must be clearly labeled as "OUT OF SERVICE" or "DECOMMISSIONED" to prevent accidental use.</li>
                <li>Log disposal methods or return references in the registry for asset verification.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Decommission/Recall Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Decommission / Recall Action</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Instrument *</label>
                <select style={S.inp} value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })} required>
                  <option value="">Select Equipment</option>
                  {equipment.filter(eq => eq.status !== "Decommissioned").map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.assetCode})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Action Type</label>
                <select style={S.inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="Decommission Request">Decommission Request</option>
                  <option value="Manufacturer Safety Recall">Manufacturer Safety Recall</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Action Date</label>
                <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Reason / Details *</label>
                <textarea style={{ ...S.inp, height: 50, fontFamily: "inherit" }} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for decommissioning or recall details..." required />
              </div>

              {form.type === "Decommission Request" ? (
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Disposal / Scrap Method</label>
                  <input style={S.inp} value={form.disposalMethod} onChange={e => setForm({ ...form, disposalMethod: e.target.value })} placeholder="e.g. Scrapped for parts, returned to vendor" />
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Recall Notice Reference / URL</label>
                  <input style={S.inp} value={form.recallNoticeRef} onChange={e => setForm({ ...form, recallNoticeRef: e.target.value })} placeholder="e.g. FDA Recall Ref Link" />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#A32D2D", "#FCEBEB")}>{saving ? "Saving..." : "Log Decommission"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
