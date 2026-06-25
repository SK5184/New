import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "80vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", height: "fit-content" },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  inp: {
    padding: "6px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  listGroup: { display: "flex", flexDirection: "column", maxHeight: "65vh", overflowY: "auto" },
  listItem: (active) => ({
    padding: "10px 14px", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer",
    background: active ? "#E1F5EE" : "transparent",
    color: active ? "#0F6E56" : "#2C2C2A",
    fontWeight: active ? 600 : 400
  })
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function EquipmentVerification({ role, userName }) {
  const [equipment, setEquipment] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    iqStatus: "Pending", iqDate: today(), iqBy: "",
    oqStatus: "Pending", oqDate: today(), oqBy: "",
    pqStatus: "Pending", pqDate: today(), pqBy: "",
    certRef: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      const eList = eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipment(eList);

      const vSnap = await getDocs(collection(db, "equipmentVerifications"));
      const vList = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVerifications(vList);

      if (eList.length > 0) {
        const match = selected ? eList.find(e => e.id === selected.id) : null;
        const current = match || eList[0];
        setSelected(current);

        const record = vList.find(v => v.equipmentId === current.id) || {
          iqStatus: "Pending", iqDate: today(), iqBy: "",
          oqStatus: "Pending", oqDate: today(), oqBy: "",
          pqStatus: "Pending", pqDate: today(), pqBy: "",
          certRef: ""
        };
        setForm(record);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    loadData();
  }, []);

  const handleSelect = (eq) => {
    setSelected(eq);
    const record = verifications.find(v => v.equipmentId === eq.id) || {
      iqStatus: "Pending", iqDate: today(), iqBy: "",
      oqStatus: "Pending", oqDate: today(), oqBy: "",
      pqStatus: "Pending", pqDate: today(), pqBy: "",
      certRef: ""
    };
    setForm(record);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const record = verifications.find(v => v.equipmentId === selected.id);
      if (record) {
        await updateDoc(doc(db, "equipmentVerifications", record.id), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "equipmentVerifications"), {
          ...form,
          equipmentId: selected.id,
          createdAt: serverTimestamp()
        });
      }
      alert("Qualifications verification log saved.");
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving record.");
    }
    setSaving(false);
  };

  const filtered = equipment.filter(e => {
    const nameVal = e.name || "";
    const idVal = e.assetCode || "";
    return nameVal.toLowerCase().includes(search.toLowerCase()) || idVal.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={S.wrap}>
      <div style={S.layout}>
        {/* Left Side: Equipment List */}
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Equipment Directory</div></div>
          <div style={{ padding: 8, borderBottom: "0.5px solid #E0DDD6" }}>
            <input style={S.inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={S.listGroup}>
            {loading && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>No results.</div>}
            {filtered.map(eq => {
              const active = selected && selected.id === eq.id;
              const record = verifications.find(v => v.equipmentId === eq.id) || {};
              const iqOk = record.iqStatus === "Verified";
              const oqOk = record.oqStatus === "Verified";
              const pqOk = record.pqStatus === "Verified";
              const fullyVerified = iqOk && oqOk && pqOk;
              return (
                <div key={eq.id} onClick={() => handleSelect(eq)} style={S.listItem(active)}>
                  <div style={{ fontSize: 12 }}>{eq.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10, color: active ? "#0F6E56" : "#888780" }}>
                    <span>{eq.assetCode}</span>
                    <span style={{ color: fullyVerified ? "#0F6E56" : "#854F0B", fontWeight: 600 }}>
                      {fullyVerified ? "✅ Verified" : "⏳ IQ/OQ/PQ Due"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Verification Logs Form */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>IQ/OQ/PQ Verification: {selected.name}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>Model: {selected.model || "—"} · SN: {selected.serialNo || "—"}</div>
              </div>
            </div>
            <form onSubmit={handleSave} style={{ padding: 16 }}>
              {/* IQ */}
              <div style={{ marginBottom: 20, background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10 }}>1. Installation Qualification (IQ)</div>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>IQ Status</label>
                    <select style={S.inp} value={form.iqStatus} onChange={e => setForm({ ...form, iqStatus: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified & Passed</option>
                      <option value="N/A">Not Applicable</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Date Completed</label>
                    <input style={S.inp} type="date" value={form.iqDate} onChange={e => setForm({ ...form, iqDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Verified By</label>
                    <input style={S.inp} value={form.iqBy} onChange={e => setForm({ ...form, iqBy: e.target.value })} placeholder="e.g. Engineer Name" />
                  </div>
                </div>
              </div>

              {/* OQ */}
              <div style={{ marginBottom: 20, background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10 }}>2. Operational Qualification (OQ)</div>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>OQ Status</label>
                    <select style={S.inp} value={form.oqStatus} onChange={e => setForm({ ...form, oqStatus: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified & Passed</option>
                      <option value="N/A">Not Applicable</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Date Completed</label>
                    <input style={S.inp} type="date" value={form.oqDate} onChange={e => setForm({ ...form, oqDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Verified By</label>
                    <input style={S.inp} value={form.oqBy} onChange={e => setForm({ ...form, oqBy: e.target.value })} placeholder="e.g. Engineer Name" />
                  </div>
                </div>
              </div>

              {/* PQ */}
              <div style={{ marginBottom: 20, background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10 }}>3. Performance Qualification (PQ)</div>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>PQ Status</label>
                    <select style={S.inp} value={form.pqStatus} onChange={e => setForm({ ...form, pqStatus: e.target.value })}>
                      <option value="Pending">Pending</option>
                      <option value="Verified">Verified & Passed</option>
                      <option value="N/A">Not Applicable</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Date Completed</label>
                    <input style={S.inp} type="date" value={form.pqDate} onChange={e => setForm({ ...form, pqDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Verified By</label>
                    <input style={S.inp} value={form.pqBy} onChange={e => setForm({ ...form, pqBy: e.target.value })} placeholder="e.g. Engineer/Supervisor" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Verification Certificate Reference / Link</label>
                <input style={S.inp} value={form.certRef || ""} onChange={e => setForm({ ...form, certRef: e.target.value })} placeholder="e.g. Google Drive Link or FileRef-8872" />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" disabled={saving} style={S.btn("#0F6E56", "#E1F5EE")}>
                  {saving ? "Saving Logs..." : "💾 Save Verification Log"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an instrument from the directory list to perform qualification logs.
          </div>
        )}
      </div>
    </div>
  );
}
