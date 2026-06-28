// src/modules/TemperatureMonitoring/ManualEntry.jsx
// Form interface for technicians to log manual temperature & humidity readings

import { useState, useEffect } from "react";
import { temperatureService } from "./temperatureService";
import { useAuth } from "../../context/AuthContext";

const S = {
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", cursor: "pointer" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  btn: { padding: "8px 16px", background: "#0D9488", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" },
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg })
};

export default function ManualEntry({ points, department, showToast }) {
  const { name: currentUserName } = useAuth();
  
  const [selectedPointId, setSelectedPointId] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [session, setSession] = useState("Morning");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filter to active manual points
  const manualPoints = points.filter(p => p.mode === "manual" && p.status === "active");
  const sensorPoints = points.filter(p => p.mode === "sensor" && p.status === "active");

  useEffect(() => {
    if (manualPoints.length > 0 && !selectedPointId) {
      setSelectedPointId(manualPoints[0].id);
    }
  }, [manualPoints, selectedPointId]);

  useEffect(() => {
    const match = manualPoints.find(p => p.id === selectedPointId);
    setSelectedPoint(match || null);
    
    // Load historical records for the selected point
    if (selectedPointId) {
      setLoadingHistory(true);
      temperatureService.getRecords(selectedPointId, 10).then(list => {
        setHistory(list);
        setLoadingHistory(false);
      });
    }
  }, [selectedPointId, manualPoints]);

  const loadHistory = async () => {
    if (selectedPointId) {
      setLoadingHistory(true);
      const list = await temperatureService.getRecords(selectedPointId, 10);
      setHistory(list);
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPoint) return alert("Select a monitoring point first");
    if (!temperature) return alert("Enter measured temperature");

    setSaving(true);
    const tempNum = parseFloat(temperature);
    const humNum = humidity ? parseFloat(humidity) : null;

    const payload = {
      pointId: selectedPoint.id,
      department: selectedPoint.department,
      area: selectedPoint.area,
      type: selectedPoint.type,
      minLimit: selectedPoint.minLimit,
      maxLimit: selectedPoint.maxLimit,
      minHumidity: selectedPoint.minHumidity || null,
      maxHumidity: selectedPoint.maxHumidity || null,
      temperature: tempNum,
      humidity: humNum,
      session,
      mode: "manual",
      enteredBy: currentUserName || "Pathology Staff"
    };

    const res = await temperatureService.addRecord(payload);
    setSaving(false);
    setTemperature("");
    setHumidity("");
    
    if (res.status === "Normal") {
      showToast("Reading recorded: Status NORMAL.");
    } else {
      showToast(`Warning: Out-of-Limit reading logged (${res.status}). Excursion created!`);
    }

    loadHistory();
  };

  return (
    <div>
      <div style={S.grid(12)}>
        {/* Manual entry card */}
        <div style={{ ...S.card, gridColumn: "span 5" }}>
          <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#0D9488" }}>
            Manual Verification Log Sheet
          </div>
          {manualPoints.length === 0 ? (
            <div style={{ color: "#64748B", fontSize: 12, textAlign: "center", padding: 24 }}>
              No monitoring points are currently set to MANUAL mode in this department. All points are automated.
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Monitoring Location / Unit *</label>
                <select style={S.select} value={selectedPointId} onChange={e => setSelectedPointId(e.target.value)}>
                  {manualPoints.map(p => (
                    <option key={p.id} value={p.id}>{p.area} ({p.id})</option>
                  ))}
                </select>
              </div>

              {selectedPoint && (
                <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", marginBottom: 12, fontSize: 11.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 600 }}>Type:</span>
                    <span style={{ color: "#1E293B" }}>{selectedPoint.type}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#475569", fontWeight: 600 }}>Acceptable Temperature Limit:</span>
                    <span style={{ color: "#0F6E56", fontWeight: "bold" }}>{selectedPoint.minLimit} to {selectedPoint.maxLimit}°C</span>
                  </div>
                  {selectedPoint.minHumidity && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569", fontWeight: 600 }}>Acceptable Humidity Limit:</span>
                      <span style={{ color: "#0F6E56", fontWeight: "bold" }}>{selectedPoint.minHumidity} to {selectedPoint.maxHumidity}%RH</span>
                    </div>
                  )}
                </div>
              )}

              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Shift Session *</label>
                  <select style={S.select} value={session} onChange={e => setSession(e.target.value)}>
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Evening</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Operator</label>
                  <input style={S.inp} value={currentUserName || "Staff"} readOnly />
                </div>
              </div>

              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Measured Temperature (°C) *</label>
                  <input type="number" step="0.1" style={S.inp} placeholder="e.g. 4.2" value={temperature} onChange={e => setTemperature(e.target.value)} required />
                </div>
                <div>
                  <label style={S.label}>Measured Humidity (%RH)</label>
                  <input type="number" step="1" style={S.inp} placeholder="e.g. 45" value={humidity} onChange={e => setHumidity(e.target.value)} disabled={!selectedPoint?.minHumidity} />
                </div>
              </div>

              <button type="submit" disabled={saving} style={{ ...S.btn, width: "100%", marginTop: 12 }}>
                {saving ? "Submitting Log..." : "Submit Temperature Reading"}
              </button>
            </form>
          )}
        </div>

        {/* Audit trail for the selected point */}
        <div style={{ ...S.card, gridColumn: "span 7" }}>
          <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 12, color: "#1E293B" }}>
            Recent Activity Logs (Audit Trail)
          </div>
          {loadingHistory ? (
            <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", padding: 24 }}>Loading history logs...</div>
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", padding: 24 }}>No records logged for this point in the current session.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date & Time</th>
                    <th style={S.th}>Session</th>
                    <th style={S.th}>Temp (°C)</th>
                    <th style={S.th}>Humidity (%RH)</th>
                    <th style={S.th}>Operator</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const isOut = h.temperature < h.minLimit || h.temperature > h.maxLimit;
                    return (
                      <tr key={i}>
                        <td style={S.td}>{new Date(h.timestamp).toLocaleString("en-IN")}</td>
                        <td style={S.td}>{h.session || "IoT Stream"}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{h.temperature}°C</td>
                        <td style={S.td}>{h.humidity ? `${h.humidity}%` : "—"}</td>
                        <td style={S.td}>{h.enteredBy}</td>
                        <td style={S.td}>
                          <span style={S.badge(isOut ? "#FEE2E2" : "#D1FAE5", isOut ? "#991B1B" : "#065F46")}>
                            {isOut ? "OUT OF LIMIT" : "NORMAL"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {sensorPoints.length > 0 && (
        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
            🔌 Automated IoT Sensor Monitoring Points (Active in {department || "Technical Departments"})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {sensorPoints.map(p => (
              <div key={p.id} style={{ background: "#F0FDFA", border: "1px solid #CCFBF1", borderRadius: 8, padding: 12, fontSize: 11.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: "#0F6E56" }}>{p.area}</span>
                  <span style={S.badge("#E0F2FE", "#0369A1")}>IoT Connected</span>
                </div>
                <div style={{ color: "#64748B" }}>Point ID: {p.id}</div>
                <div style={{ color: "#64748B" }}>Limits: {p.minLimit} to {p.maxLimit}°C</div>
                <div style={{ color: "#64748B", fontStyle: "italic", marginTop: 4 }}>Sensor ID: {p.sensorId}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
