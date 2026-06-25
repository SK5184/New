import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "80vh" },
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

export default function EquipmentManuals({ role, userName }) {
  const [manuals, setManuals] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    equipmentId: "",
    title: "",
    type: "Operation Manual",
    version: "1.0",
    url: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mSnap = await getDocs(query(collection(db, "equipmentManuals"), orderBy("createdAt", "desc")));
      const mList = mSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setManuals(mList);

      const eSnap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      setEquipment(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const empSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (mList.length > 0) {
        const match = selected ? mList.find(m => m.id === selected.id) : null;
        setSelected(match || mList[0]);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

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
    if (!form.equipmentId || !form.title || !form.url) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "equipmentManuals"), {
        ...form,
        readBy: {},
        createdAt: serverTimestamp()
      });
      setForm({ equipmentId: "", title: "", type: "Operation Manual", version: "1.0", url: "" });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving document.");
    }
    setSaving(false);
  };

  const toggleReadSignoff = async (empId, empName) => {
    if (!selected) return;
    setSaving(true);
    try {
      const readBy = selected.readBy || {};
      const record = readBy[empId] || { read: false, date: "" };
      record.read = !record.read;
      record.date = record.read ? new Date().toISOString().split("T")[0] : "";
      record.name = empName;

      const updatedReadBy = { ...readBy, [empId]: record };
      await updateDoc(doc(db, "equipmentManuals", selected.id), { readBy: updatedReadBy });

      setSelected(t => ({ ...t, readBy: updatedReadBy }));
      setManuals(list => list.map(m => m.id === selected.id ? { ...m, readBy: updatedReadBy } : m));
    } catch (e) {
      console.error(e);
      alert("Error updating sign-off.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Instructions for Use (IFU) & Operation Manuals</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.2 · Maintain manufacturer documents and track staff reading confirmations</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          📖 Catalog New Manual
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Manuals list */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Manufacturer Documents Catalogue</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Equipment Name</th>
                  <th style={S.th}>Document Details</th>
                  <th style={S.th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : manuals.length === 0 ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No documents catalogued.</td></tr>
                ) : (
                  manuals.map(m => {
                    const active = selected && selected.id === m.id;
                    return (
                      <tr
                        key={m.id}
                        onClick={() => setSelected(m)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A" }}>
                          <div>{getEqName(m.equipmentId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Code: {getEqCode(m.equipmentId)}</div>
                        </td>
                        <td style={S.td}>
                          <div>{m.title}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Ver: {m.version}</div>
                        </td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: "#E6F1FB", color: "#185FA5"
                          }}>{m.type}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected manual & Read Sign-offs */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Document details & Sign-offs</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.title} (Version: {selected.version})</div>
              </div>
              <div>
                <a href={selected.url} target="_blank" rel="noreferrer" style={S.btn("#185FA5", "#E6F1FB")}>
                  👁️ View Manual Document
                </a>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#888780", marginBottom: 12, borderBottom: "0.5px solid #E0DDD6", paddingBottom: 6 }}>
                Staff read & understood confirmations:
              </div>
              <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Employee Name</th>
                      <th style={S.th}>Department</th>
                      <th style={S.th}>Read Sign-off</th>
                      <th style={S.th}>Sign-off Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No active staff registered.</td></tr>
                    ) : (
                      employees.map(emp => {
                        const record = (selected.readBy || {})[emp.id] || { read: false, date: "" };
                        return (
                          <tr key={emp.id}>
                            <td style={S.td}>{emp.fullName || emp.employeeName}</td>
                            <td style={S.td}>{emp.department}</td>
                            <td style={S.td}>
                              <input
                                type="checkbox"
                                checked={record.read}
                                disabled={saving}
                                onChange={() => toggleReadSignoff(emp.id, emp.fullName || emp.employeeName)}
                              />{" "}
                              <span style={{ fontSize: 11, color: record.read ? "#0F6E56" : "#888780", fontWeight: record.read ? 600 : 400 }}>
                                {record.read ? "Read & Confirmed" : "Pending"}
                              </span>
                            </td>
                            <td style={S.td}>{record.read ? record.date : "—"}</td>
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
            Select a document from the catalog to view links and verify staff sign-off lists.
          </div>
        )}
      </div>

      {/* New Manual Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Catalog Manufacturer Document</div>
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
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Document Title *</label>
                <input style={S.inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sysmex XN-1000 Operator Manual" required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Document Type</label>
                  <select style={S.inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="Operation Manual">Operation Manual</option>
                    <option value="IFU (Instructions for Use)">IFU (Instructions for Use)</option>
                    <option value="Technical Reference Guide">Technical Reference Guide</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Version / Revision</label>
                  <input style={S.inp} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. Rev C" />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Document File Link (URL) *</label>
                <input style={S.inp} value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="Google Drive URL or file link..." required />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Catalog Document"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
