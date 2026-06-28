// src/modules/TemperatureMonitoring/SensorIntegration.jsx
// IoT Sensor parameters panel and simulated live sensor data stream generator

import { useState, useEffect } from "react";
import { temperatureService } from "./temperatureService";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "stop" ? "#EF4444" : variant === "simulate" ? "#0F6E56" : "#0D9488",
    color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
  logBox: { background: "#0F172A", color: "#38BDF8", fontFamily: "monospace", fontSize: 11, padding: 12, borderRadius: 8, height: 180, overflowY: "auto", marginTop: 8 }
};

export default function SensorIntegration({ points, onRefresh, showToast }) {
  const [streamActive, setStreamActive] = useState(false);
  const [streamIntervalId, setStreamIntervalId] = useState(null);
  const [simulatedLogs, setSimulatedLogs] = useState([]);
  const [simulationFrequency, setSimulationFrequency] = useState(5); // in seconds
  const [noiseLevel, setNoiseLevel] = useState(0.4); // Random fluctuations

  const sensorPoints = points.filter(p => p.mode === "sensor" && p.status === "active");

  useEffect(() => {
    return () => {
      if (streamIntervalId) clearInterval(streamIntervalId);
    };
  }, [streamIntervalId]);

  const addSimLog = (msg) => {
    setSimulatedLogs(prev => [
      `[${new Date().toISOString().split("T")[1].slice(0, 8)}] ${msg}`,
      ...prev.slice(0, 40)
    ]);
  };

  const handleToggleStream = () => {
    if (streamActive) {
      if (streamIntervalId) {
        clearInterval(streamIntervalId);
        setStreamIntervalId(null);
      }
      setStreamActive(false);
      addSimLog("IoT Telemetry stream simulation stopped.");
      showToast("Sensor stream stopped.");
    } else {
      if (sensorPoints.length === 0) {
        alert("Please configure at least one active monitoring point to SENSOR mode first.");
        return;
      }

      addSimLog(`Starting IoT stream simulation. Frequency: ${simulationFrequency}s`);
      showToast("IoT Sensor stream activated!");
      setStreamActive(true);

      const interval = setInterval(async () => {
        // Pick a random sensor point
        const idx = Math.floor(Math.random() * sensorPoints.length);
        const point = sensorPoints[idx];

        // Generate simulated temperature value close to limits
        // Random walk around limits
        const mean = (point.minLimit + point.maxLimit) / 2;
        // Occasionally simulate a temperature breach/excursion (5% chance)
        const isBreach = Math.random() < 0.08;
        let temp;
        if (isBreach) {
          temp = Math.random() < 0.5 ? point.minLimit - 2.5 : point.maxLimit + 3.0;
        } else {
          // Normal random fluctuation around the mean
          temp = mean + (Math.random() - 0.5) * (point.maxLimit - point.minLimit) * 0.7;
        }
        temp = parseFloat(temp.toFixed(1));

        // Generate humidity if applicable
        let hum = null;
        if (point.minHumidity) {
          const meanHum = (point.minHumidity + point.maxHumidity) / 2;
          hum = Math.floor(meanHum + (Math.random() - 0.5) * 15);
        }

        const telemetryPayload = {
          pointId: point.id,
          department: point.department,
          area: point.area,
          type: point.type,
          minLimit: point.minLimit,
          maxLimit: point.maxLimit,
          minHumidity: point.minHumidity || null,
          maxHumidity: point.maxHumidity || null,
          temperature: temp,
          humidity: hum,
          session: "IoT Telemetry Stream",
          mode: "sensor",
          enteredBy: `Sensor ${point.sensorId}`
        };

        const res = await temperatureService.addRecord(telemetryPayload);
        
        let statusMsg = `Telemetry sent: ID=${point.sensorId} | Temp=${temp}°C`;
        if (hum) statusMsg += ` | Humidity=${hum}%`;
        
        if (res.status !== "Normal") {
          statusMsg += ` | ⚠️ STATUS: ${res.status.toUpperCase()} (EXCURSION CREATED)`;
        } else {
          statusMsg += ` | Status: NORMAL`;
        }

        addSimLog(statusMsg);
        onRefresh(); // Trigger refresh in parent dashboard
      }, simulationFrequency * 1000);

      setStreamIntervalId(interval);
    }
  };

  return (
    <div style={S.grid(12)}>
      {/* Configuration & Simulated Telemetry API Details */}
      <div style={{ ...S.card, gridColumn: "span 6" }}>
        <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#0F6E56" }}>
          Automated IoT Integration Config
        </div>
        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>
          Configure IoT sensors (e.g. RuuviTag, Sigfox, or Raspberry Pi nodes) to post data to the QMS telemetry endpoint:
        </div>
        <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 11, color: "#334155", marginBottom: 16 }}>
          <strong>POST</strong> https://api.mbl-qms.com/v1/telemetry<br/>
          <strong>Headers:</strong> Authorization: Bearer IOT_KEY_...<br/>
          <strong>Payload:</strong><br/>
          {"{"}<br/>
          &nbsp;&nbsp;&quot;sensorId&quot;: &quot;IOT-SENS-MOL80&quot;,<br/>
          &nbsp;&nbsp;&quot;temperature&quot;: -74.2,<br/>
          &nbsp;&nbsp;&quot;humidity&quot;: null,<br/>
          &nbsp;&nbsp;&quot;timestamp&quot;: &quot;2026-06-26T09:00:00Z&quot;<br/>
          {"}"}
        </div>

        <div style={S.grid(2)}>
          <div>
            <label style={S.label}>Simulation Interval (seconds)</label>
            <input type="number" min="2" max="60" style={S.inp} value={simulationFrequency} onChange={e => setSimulationFrequency(parseInt(e.target.value) || 5)} disabled={streamActive} />
          </div>
          <div>
            <label style={S.label}>Anomaly Likelihood (%)</label>
            <select style={S.inp} value={noiseLevel} onChange={e => setNoiseLevel(parseFloat(e.target.value))} disabled={streamActive}>
              <option value="0.02">2% (Stable Lab)</option>
              <option value="0.08">8% (Occasional Breaches)</option>
              <option value="0.25">25% (High Stress Test)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={handleToggleStream} style={S.btn(streamActive ? "stop" : "simulate")}>
            {streamActive ? "⏹️ Stop Telemetry Stream" : "▶️ Start Simulated IoT Stream"}
          </button>
        </div>
      </div>

      {/* Simulator Stream Output Logs */}
      <div style={{ ...S.card, gridColumn: "span 6" }}>
        <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 8, color: "#1E293B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Telemetry Stream Feed</span>
          <span style={S.badge(streamActive ? "#D1FAE5" : "#F1F5F9", streamActive ? "#065F46" : "#475569")}>
            {streamActive ? "STREAMING LIVE" : "STANDBY"}
          </span>
        </div>
        <div style={S.logBox}>
          {simulatedLogs.length === 0 ? (
            <div style={{ color: "#64748B", fontStyle: "italic" }}>Start the simulated IoT stream to display raw telemetry payloads...</div>
          ) : (
            simulatedLogs.map((log, idx) => <div key={idx} style={{ marginBottom: 4 }}>{log}</div>)
          )}
        </div>
      </div>

      {/* List of active sensor devices */}
      <div style={{ ...S.card, gridColumn: "span 12" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 8 }}>
          Active IoT Devices Registry ({sensorPoints.length} Devices Registered)
        </div>
        {sensorPoints.length === 0 ? (
          <div style={{ color: "#64748B", fontSize: 12, fontStyle: "italic" }}>No devices mapped. Switch points to SENSOR mode in Master Config.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {sensorPoints.map(p => (
              <div key={p.id} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, fontSize: 11.5, background: "#FAFAF8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
                  <span>{p.area}</span>
                  <span style={{ color: "#0D9488" }}>{p.id}</span>
                </div>
                <div>Sensor ID: <strong style={{ fontFamily: "monospace" }}>{p.sensorId}</strong></div>
                <div>Limits: {p.minLimit} to {p.maxLimit}°C</div>
                <div>Frequency: {p.frequency}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
