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

function today() { return new Date().toISOString().split("T")[0]; }

export default function EquipmentValidation({ role, userName }) {
  const [equipment, setEquipment] = useState([]);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({
    equipmentId: "",
    title: "",
    date: today(),
    acceptanceCriteria: "",
    observedResults: "",
    outcome: "Passed Validation",
    validatedBy: userName || "",
    reportUrl: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      const eList = eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipment(eList);

      const vSnap = await getDocs(query(collection(db, "equipmentValidations"), orderBy("createdAt", "desc")));
      const vList = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setValidations(vList);

      if (vList.length > 0) {
        const match = selected ? vList.find(v => v.id === selected.id) : null;
        setSelected(match || vList[0]);
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
    if (!form.equipmentId || !form.title || !form.validatedBy) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "equipmentValidations"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setForm({
        equipmentId: "", title: "", date: today(), acceptanceCriteria: "",
        observedResults: "", outcome: "Passed Validation", validatedBy: userName || "", reportUrl: ""
      });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving validation record.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Equipment Validation Studies</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.4.4 · Document precision, accuracy, and clinical performance verification</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => setModal(true)}>
          📋 Log Validation Study
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Validation list */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Validation Reports</div></div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Equipment Name</th>
                  <th style={S.th}>Validation Study Title</th>
                  <th style={S.th}>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : validations.length === 0 ? (
                  <tr><td colSpan="3" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No validations recorded.</td></tr>
                ) : (
                  validations.map(v => {
                    const active = selected && selected.id === v.id;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setSelected(v)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A" }}>
                          <div>{getEqName(v.equipmentId)}</div>
                          <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>Code: {getEqCode(v.equipmentId)}</div>
                        </td>
                        <td style={S.td}>{v.title}</td>
                        <td style={S.td}>
                          <span style={{
                            display: "inline-block", fontSize: 9.5, fontWeight: 500, padding: "2px 6px", borderRadius: 8,
                            background: v.outcome === "Passed Validation" ? "#E1F5EE" : v.outcome === "Failed Validation" ? "#FCEBEB" : "#FAEEDA",
                            color: v.outcome === "Passed Validation" ? "#0F6E56" : v.outcome === "Failed Validation" ? "#A32D2D" : "#854F0B"
                          }}>{v.outcome}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Selected validation details */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Validation: {getEqName(selected.equipmentId)}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Protocol: {selected.title} · Study Date: {selected.date}</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Acceptance Criteria (Specifications)</div>
                <div style={{ fontSize: 12, padding: "8px 12px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6", color: "#2C2C2A" }}>
                  {selected.acceptanceCriteria || "None specified."}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Observed Experimental Results & Data</div>
                <div style={{ fontSize: 12, padding: "8px 12px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6", color: "#2C2C2A" }}>
                  {selected.observedResults || "No experimental results recorded."}
                </div>
              </div>

              <div style={S.grid(2)}>
                <div>
                  <div style={S.label}>Study Conclusion / Outcome</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selected.outcome === "Passed Validation" ? "#0F6E56" : "#A32D2D" }}>{selected.outcome}</div>
                </div>
                <div>
                  <div style={S.label}>Validated By</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{selected.validatedBy}</div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={S.label}>Report File Reference / URL Link</div>
                <div style={{ fontSize: 12, wordBreak: "break-all" }}>
                  {selected.reportUrl ? (
                    <a href={selected.reportUrl} target="_blank" rel="noreferrer" style={{ color: "#185FA5", textDecoration: "underline" }}>{selected.reportUrl}</a>
                  ) : "No validation report linked."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select a validation record from the list to view study data and protocols.
          </div>
        )}
      </div>

      {/* New Validation Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log Validation Study Record</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Equipment *</label>
                <select style={S.inp} value={form.equipmentId} onChange={e => setForm({ ...form, equipmentId: e.target.value })} required>
                  <option value="">Select Instrument</option>
                  {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name} ({eq.assetCode})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Study / Protocol Title *</label>
                <input style={S.inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Linearity Validation (Glucose Method)" required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Validated By *</label>
                  <input style={S.inp} value={form.validatedBy} onChange={e => setForm({ ...form, validatedBy: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Study Date</label>
                  <input style={S.inp} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Acceptance Criteria *</label>
                <textarea style={{ ...S.inp, height: 40, fontFamily: "inherit" }} value={form.acceptanceCriteria} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} placeholder="e.g. R2 > 0.99, CV < 3%" required />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Observed Data & Findings *</label>
                <textarea style={{ ...S.inp, height: 50, fontFamily: "inherit" }} value={form.observedResults} onChange={e => setForm({ ...form, observedResults: e.target.value })} placeholder="e.g. R2 = 0.998, CV = 1.6%" required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Conclusion Outcome</label>
                  <select style={S.inp} value={form.outcome} onChange={e => setForm({ ...form, outcome: e.target.value })}>
                    <option value="Passed Validation">Passed Validation</option>
                    <option value="Conditional Pass">Conditional Pass</option>
                    <option value="Failed Validation">Failed Validation</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Report Document URL</label>
                  <input style={S.inp} value={form.reportUrl} onChange={e => setForm({ ...form, reportUrl: e.target.value })} placeholder="Google Drive or file path..." />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Save Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
