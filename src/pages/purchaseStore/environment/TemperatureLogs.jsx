import { useState, useEffect } from "react";
import { getTempLogs, createTempLog } from "../firestore/temperatureLogs";
import { useAuth } from "../../../context/AuthContext";
import { serverTimestamp } from "firebase/firestore";

const S = {
  wrap: { padding: 20, fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh" },
  card: { background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 18, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 },
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: 500, color: "#475569" },
  input: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0F6E56", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "opacity 0.2s" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F1F5F9", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "1px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  modal: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalContent: { background: "#fff", borderRadius: 12, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }
};


export default function TemperatureLogs() {
  const { name } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    location: "Main Store Fridge 1 (2-8°C)",
    currentTemp: "",
    minTemp: "",
    maxTemp: "",
    deviationAction: ""
  });

  const loadData = async () => {
    try {
      const data = await getTempLogs();
      setLogs(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentTemp) {
      alert("Current temperature is required.");
      return;
    }
    setSaving(true);
    try {
      await createTempLog({
        ...form,
        checkedBy: name,
        createdAt: serverTimestamp()
      });
      setModal(false);
      setForm({ location: "Main Store Fridge 1 (2-8°C)", currentTemp: "", minTemp: "", maxTemp: "", deviationAction: "" });
      loadData();
    } catch (e) {
      console.error(e);
      alert("Failed to save temperature log.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>Cold Chain Storage Temperature Log (TL/14)</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.6.3 · Daily temperature monitoring of reagents store fridges</div>
        </div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Log Temperature</button>
      </div>

      <div style={S.card}>
        {loading ? <div style={{ textAlign: "center", padding: 20 }}>Loading logs...</div> : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Storage Location</th>
                <th style={S.th}>Current Temp (°C)</th>
                <th style={S.th}>Min Temp (°C)</th>
                <th style={S.th}>Max Temp (°C)</th>
                <th style={S.th}>Checked By</th>
                <th style={S.th}>Corrective Action (if deviated)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => {
                const temp = parseFloat(l.currentTemp);
                const isOutOfRange = l.location.includes("2-8") ? (temp < 2 || temp > 8) : (temp < 15 || temp > 25);
                return (
                  <tr key={l.id}>
                    <td style={S.td}><strong>{l.location}</strong></td>
                    <td style={S.td}><span style={{ color: isOutOfRange ? "#DC2626" : "inherit", fontWeight: 600 }}>{l.currentTemp}°C</span></td>
                    <td style={S.td}>{l.minTemp || "—"}°C</td>
                    <td style={S.td}>{l.maxTemp || "—"}°C</td>
                    <td style={S.td}>{l.checkedBy}</td>
                    <td style={S.td}>{l.deviationAction || "None Required"}</td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No temperature audits recorded today.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div style={S.modal}>
          <div style={S.modalContent}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <strong style={{ fontSize: 16 }}>Log Daily Storage Temp</strong>
              <span style={{ cursor: "pointer" }} onClick={() => setModal(false)}>✕</span>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={S.field}>
                <label style={S.label}>Storage Unit / Fridge *</label>
                <select style={S.input} value={form.location} onChange={e => setForm({...form, location: e.target.value})}>
                  <option>Main Store Fridge 1 (2-8°C)</option>
                  <option>Freezer F3 (-20°C)</option>
                  <option>General Store Area (15-25°C)</option>
                </select>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Current Temp (°C) *</label>
                  <input style={S.input} type="number" step="0.1" required value={form.currentTemp} onChange={e => setForm({...form, currentTemp: e.target.value})} placeholder="e.g. 4.2" />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Min Temp (°C)</label>
                  <input style={S.input} type="number" step="0.1" value={form.minTemp} onChange={e => setForm({...form, minTemp: e.target.value})} />
                </div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Max Temp (°C)</label>
                <input style={S.input} type="number" step="0.1" value={form.maxTemp} onChange={e => setForm({...form, maxTemp: e.target.value})} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Action Taken (if temperature is out of limits)</label>
                <textarea style={{ ...S.input, height: 60 }} value={form.deviationAction} onChange={e => setForm({...form, deviationAction: e.target.value})} placeholder="e.g. Adjusted thermostat. Monitored closely for next 1 hour." />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving..." : "Log Reading"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}