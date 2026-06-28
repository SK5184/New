// src/modules/TemperatureMonitoring/MonitoringMaster.jsx
// Admin panel to register, edit, and toggle temperature monitoring points

import { useState } from "react";
import { temperatureService } from "./temperatureService";

const S = {
  container: { fontFamily: "'Inter',system-ui,sans-serif", color: "#1E293B" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", cursor: "pointer" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }
};

const DEPARTMENTS = [
  "Biochemistry", "Haematology", "Microbiology", "Histopathology & Cytopathology",
  "Serology", "Flow Cytometry", "Cytogenetics", "Clinical Pathology", "Molecular Biology",
  "Molecular Genetics", "Purchase", "Sample Collection", "Phlebotomy", "Reception",
  "Back Office", "Kitchen"
];

const TYPES = ["Room", "Refrigerator", "Freezer", "Deep Freezer", "Incubator", "Water Bath", "Transport Box"];

export default function MonitoringMaster({ points, onRefresh, showToast }) {
  const [editingPoint, setEditingPoint] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    id: "", department: "Biochemistry", area: "", type: "Refrigerator",
    minLimit: "", maxLimit: "", minHumidity: "", maxHumidity: "",
    frequency: "2 times/day", mode: "manual", sensorId: "",
    alertEnabled: true, status: "active"
  });

  const handleOpenAdd = () => {
    const nextId = `TMP-MBL-${Math.floor(1000 + Math.random() * 9000)}`;
    setEditingPoint(null);
    setFormState({
      id: nextId, department: "Biochemistry", area: "", type: "Refrigerator",
      minLimit: "2", maxLimit: "8", minHumidity: "", maxHumidity: "",
      frequency: "2 times/day", mode: "manual", sensorId: "",
      alertEnabled: true, status: "active"
    });
    setIsFormOpen(true);
  };

  const handleEdit = (point) => {
    setEditingPoint(point);
    setFormState({ ...point });
    setIsFormOpen(true);
  };

  const handleToggleMode = async (point) => {
    const updated = { ...point, mode: point.mode === "manual" ? "sensor" : "manual" };
    if (updated.mode === "sensor" && !updated.sensorId) {
      updated.sensorId = `IOT-SENS-${point.id.slice(4)}`;
    }
    setSaving(true);
    await temperatureService.savePoint(updated);
    setSaving(false);
    showToast(`${point.area} switched to ${updated.mode.toUpperCase()} mode.`);
    onRefresh();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formState.area) return alert("Please specify the area or location");
    setSaving(true);

    const payload = {
      ...formState,
      minLimit: parseFloat(formState.minLimit) || 0,
      maxLimit: parseFloat(formState.maxLimit) || 0,
      minHumidity: formState.minHumidity ? parseFloat(formState.minHumidity) : null,
      maxHumidity: formState.maxHumidity ? parseFloat(formState.maxHumidity) : null
    };

    await temperatureService.savePoint(payload);
    setSaving(false);
    setIsFormOpen(false);
    showToast(`Monitoring point '${payload.id}' saved successfully.`);
    onRefresh();
  };

  return (
    <div style={S.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>Monitoring Points Registry</div>
        <button onClick={handleOpenAdd} style={S.btn("success")}>➕ Register Monitoring Point</button>
      </div>

      {isFormOpen && (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#0F6E56" }}>
            {editingPoint ? `Edit Point Details: ${formState.id}` : `Register New Monitoring Point: ${formState.id}`}
          </div>
          <form onSubmit={handleSubmit}>
            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Department *</label>
                <select style={S.select} value={formState.department} onChange={e => setFormState({ ...formState, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Specific Area / Equipment Location *</label>
                <input style={S.inp} placeholder="e.g. Storage Refrigerator A" value={formState.area} onChange={e => setFormState({ ...formState, area: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Point Type *</label>
                <select style={S.select} value={formState.type} onChange={e => setFormState({ ...formState, type: e.target.value })}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Min Temperature Limit (°C) *</label>
                <input type="number" step="0.1" style={S.inp} value={formState.minLimit} onChange={e => setFormState({ ...formState, minLimit: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Max Temperature Limit (°C) *</label>
                <input type="number" step="0.1" style={S.inp} value={formState.maxLimit} onChange={e => setFormState({ ...formState, maxLimit: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Min Humidity (%RH)</label>
                <input type="number" placeholder="Optional" style={S.inp} value={formState.minHumidity || ""} onChange={e => setFormState({ ...formState, minHumidity: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>Max Humidity (%RH)</label>
                <input type="number" placeholder="Optional" style={S.inp} value={formState.maxHumidity || ""} onChange={e => setFormState({ ...formState, maxHumidity: e.target.value })} />
              </div>
            </div>

            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Monitoring Frequency</label>
                <select style={S.select} value={formState.frequency} onChange={e => setFormState({ ...formState, frequency: e.target.value })}>
                  <option>2 times/day</option>
                  <option>3 times/day</option>
                  <option>Continuous</option>
                  <option>1 time/day</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Data Source Control</label>
                <select style={S.select} value={formState.mode} onChange={e => setFormState({ ...formState, mode: e.target.value })}>
                  <option value="manual">Manual Logs</option>
                  <option value="sensor">Automated IoT Sensor</option>
                </select>
              </div>
              {formState.mode === "sensor" && (
                <div>
                  <label style={S.label}>Sensor ID / IoT MAC address *</label>
                  <input style={S.inp} placeholder="e.g. IOT-SENS-001" value={formState.sensorId} onChange={e => setFormState({ ...formState, sensorId: e.target.value })} required />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" onClick={() => setIsFormOpen(false)} style={S.btn("secondary")}>Cancel</button>
              <button type="submit" disabled={saving} style={S.btn("primary")}>{saving ? "Saving..." : "Save Point Settings"}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ overflowX: "auto", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12 }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Department</th>
              <th style={S.th}>Area / Location</th>
              <th style={S.th}>Limits</th>
              <th style={S.th}>Source Mode</th>
              <th style={S.th}>Sensor ID</th>
              <th style={S.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.id}>
                <td style={{ ...S.td, fontWeight: 700 }}>{p.id}</td>
                <td style={S.td}>{p.department}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{p.area} <span style={{ fontSize: 10.5, color: "#64748B" }}>({p.type})</span></td>
                <td style={S.td}>
                  {p.minLimit} to {p.maxLimit}°C
                  {p.minHumidity ? ` | ${p.minHumidity}-${p.maxHumidity}%RH` : ""}
                </td>
                <td style={S.td}>
                  <span style={S.badge(p.mode === "sensor" ? "#E0F2FE" : "#FEF3C7", p.mode === "sensor" ? "#0369A1" : "#B45309")}>
                    {p.mode.toUpperCase()}
                  </span>
                </td>
                <td style={S.td}>{p.sensorId || "—"}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(p)} style={S.btn("secondary")}>✏️ Edit</button>
                    <button onClick={() => handleToggleMode(p)} style={S.btn(p.mode === "manual" ? "primary" : "secondary")}>
                      {p.mode === "manual" ? "🔌 Connect Sensor" : "✍️ Switch Manual"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
