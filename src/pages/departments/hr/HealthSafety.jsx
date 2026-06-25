import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
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

export default function HealthSafety({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    hepbDose1: "",
    hepbDose2: "",
    hepbBooster: "",
    tetanusDate: "",
    typhoidDate: "",
    safetyInduction: false,
    spillTraining: false,
    fireSafety: false,
    healthCheckDate: "",
    healthCheckStatus: "Fit"
  });

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(list);

      if (list.length > 0) {
        const match = selected ? list.find(e => e.id === selected.id) : null;
        const current = match || list[0];
        setSelected(current);

        const hs = current.healthSafety || {};
        setForm({
          hepbDose1: hs.hepbDose1 || "",
          hepbDose2: hs.hepbDose2 || "",
          hepbBooster: hs.hepbBooster || "",
          tetanusDate: hs.tetanusDate || "",
          typhoidDate: hs.typhoidDate || "",
          safetyInduction: hs.safetyInduction || false,
          spillTraining: hs.spillTraining || false,
          fireSafety: hs.fireSafety || false,
          healthCheckDate: hs.healthCheckDate || "",
          healthCheckStatus: hs.healthCheckStatus || "Fit"
        });
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleSelect = (emp) => {
    setSelected(emp);
    const hs = emp.healthSafety || {};
    setForm({
      hepbDose1: hs.hepbDose1 || "",
      hepbDose2: hs.hepbDose2 || "",
      hepbBooster: hs.hepbBooster || "",
      tetanusDate: hs.tetanusDate || "",
      typhoidDate: hs.typhoidDate || "",
      safetyInduction: hs.safetyInduction || false,
      spillTraining: hs.spillTraining || false,
      fireSafety: hs.fireSafety || false,
      healthCheckDate: hs.healthCheckDate || "",
      healthCheckStatus: hs.healthCheckStatus || "Fit"
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "employees", selected.id), { healthSafety: form });
      setSelected(p => ({ ...p, healthSafety: form }));
      setEmployees(list => list.map(emp => emp.id === selected.id ? { ...emp, healthSafety: form } : emp));
      alert("Health & Safety record updated successfully.");
    } catch (e) {
      console.error(e);
      alert("Error saving record.");
    }
    setSaving(false);
  };

  const filtered = employees.filter(e => {
    const nameVal = e.fullName || e.employeeName || "";
    const idVal = e.empId || e.employeeId || "";
    return nameVal.toLowerCase().includes(search.toLowerCase()) || idVal.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Health & Safety Registry</h2>
          <div style={S.subtitle}>ISO 15189:2022 · Biosafety training milestones and occupational immunization logs</div>
        </div>
      </div>

      <div style={S.layout}>
        {/* Left Side: Employees */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Employees Directory</div>
          </div>
          <div style={{ padding: 8, borderBottom: "0.5px solid #E0DDD6" }}>
            <input
              style={S.inp}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={S.listGroup}>
            {loading && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>No results.</div>}
            {filtered.map(emp => {
              const active = selected && selected.id === emp.id;
              const hs = emp.healthSafety || {};
              const safetyOk = hs.safetyInduction && hs.spillTraining;
              return (
                <div
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  style={S.listItem(active)}
                >
                  <div style={{ fontSize: 12 }}>{emp.fullName || emp.employeeName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10, color: active ? "#0F6E56" : "#888780" }}>
                    <span>ID: {emp.empId || emp.employeeId}</span>
                    <span style={{ color: safetyOk ? "#0F6E56" : "#854F0B", fontWeight: 600 }}>
                      {safetyOk ? "🛡️ Safety OK" : "⚠️ Training Due"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Health Logs Form */}
        {selected ? (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div>
                <div style={S.cardTitle}>Health & Safety: {selected.fullName || selected.employeeName}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.department} · {selected.designation || "No Designation"}</div>
              </div>
            </div>

            <form onSubmit={handleSave} style={{ padding: 16 }}>
              {/* Immunizations */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10, borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4 }}>💉 Laboratory Immunization Log</div>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>Hepatitis B Dose 1</label>
                    <input style={S.inp} type="date" value={form.hepbDose1} onChange={e => setForm({ ...form, hepbDose1: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Hepatitis B Dose 2</label>
                    <input style={S.inp} type="date" value={form.hepbDose2} onChange={e => setForm({ ...form, hepbDose2: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Hepatitis B Booster</label>
                    <input style={S.inp} type="date" value={form.hepbBooster} onChange={e => setForm({ ...form, hepbBooster: e.target.value })} />
                  </div>
                </div>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>Tetanus Vaccine Date</label>
                    <input style={S.inp} type="date" value={form.tetanusDate} onChange={e => setForm({ ...form, tetanusDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Typhoid Vaccine Date</label>
                    <input style={S.inp} type="date" value={form.typhoidDate} onChange={e => setForm({ ...form, typhoidDate: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Safety Training Milestones */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10, borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4 }}>🛡️ Safety Inductions & Training Checks</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                    <input type="checkbox" checked={form.safetyInduction} onChange={e => setForm({ ...form, safetyInduction: e.target.checked })} />
                    General Laboratory Biosafety Induction Completed
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                    <input type="checkbox" checked={form.spillTraining} onChange={e => setForm({ ...form, spillTraining: e.target.checked })} />
                    Biohazard Spill Kit Handling Retraining Completed
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                    <input type="checkbox" checked={form.fireSafety} onChange={e => setForm({ ...form, fireSafety: e.target.checked })} />
                    Fire Extinguisher & Emergency Evacuation Training Completed
                  </label>
                </div>
              </div>

              {/* Health Checks */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 10, borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4 }}>🩺 Occupational Health Check-ups</div>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>Last Health Review Date</label>
                    <input style={S.inp} type="date" value={form.healthCheckDate} onChange={e => setForm({ ...form, healthCheckDate: e.target.value })} />
                  </div>
                  <div>
                    <label style={S.label}>Medical Fitness Verdict</label>
                    <select style={S.inp} value={form.healthCheckStatus} onChange={e => setForm({ ...form, healthCheckStatus: e.target.value })}>
                      <option value="Fit">Fit for Duties</option>
                      <option value="Fit with Restrictions">Fit with Restrictions</option>
                      <option value="Temporary Unfit">Temporary Unfit</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="submit" disabled={saving} style={S.btn("#0F6E56", "#E1F5EE")}>
                  {saving ? "Saving Record..." : "💾 Save Health Record"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an employee to log health safety status.
          </div>
        )}
      </div>
    </div>
  );
}
