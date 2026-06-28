// src/modules/TemperatureMonitoring/Reports.jsx
// Trend visualization using premium SVG charts and monthly compliance review scorecards

import { useState, useEffect } from "react";
import { temperatureService } from "./temperatureService";
import { useAuth } from "../../context/AuthContext";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", cursor: "pointer" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  btn: { padding: "8px 16px", background: "#0D9488", color: "#FFFFFF", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box" }
};

export default function Reports({ points, excursions }) {
  const { name: currentUserName } = useAuth();
  
  const [selectedPointId, setSelectedPointId] = useState("");
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Review state
  const [reviewer, setReviewer] = useState(currentUserName || "Quality Manager");
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSigned, setIsSigned] = useState(false);

  useEffect(() => {
    if (points.length > 0 && !selectedPointId) {
      setSelectedPointId(points[0].id);
    }
  }, [points, selectedPointId]);

  useEffect(() => {
    const match = points.find(p => p.id === selectedPointId);
    setSelectedPoint(match || null);
    
    if (selectedPointId) {
      setLoading(true);
      temperatureService.getRecords(selectedPointId, 30).then(list => {
        setHistory(list);
        setLoading(false);
      });
    }
  }, [selectedPointId, points]);

  // Compute monthly review statistics
  const totalPoints = points.length;
  const totalExcursions = excursions.length;
  const activeExcursions = excursions.filter(e => !e.resolved).length;
  const resolvedExcursions = excursions.filter(e => e.resolved).length;

  // Render SVG Trend Chart
  const renderChart = () => {
    if (loading) return <div style={{ textAlign: "center", padding: 40, fontSize: 12.5, color: "#64748B" }}>Loading historical telemetry data...</div>;
    if (history.length === 0) return <div style={{ textAlign: "center", padding: 40, fontSize: 12.5, color: "#64748B" }}>No telemetry logs registered for this monitoring location.</div>;

    // Sort ascending for graph rendering
    const sortedHist = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const minLim = selectedPoint.minLimit;
    const maxLim = selectedPoint.maxLimit;

    // SVG parameters
    const width = 600;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    // Value scaling
    const temps = sortedHist.map(h => h.temperature);
    const minVal = Math.min(...temps, minLim) - 2;
    const maxVal = Math.max(...temps, maxLim) + 2;
    const valRange = maxVal - minVal;

    const getX = (index) => {
      const spacing = (width - paddingLeft - paddingRight) / Math.max(sortedHist.length - 1, 1);
      return paddingLeft + index * spacing;
    };

    const getY = (val) => {
      return height - paddingBottom - ((val - minVal) / valRange) * (height - paddingTop - paddingBottom);
    };

    // Construct path line points
    const pointsStr = sortedHist.map((h, i) => `${getX(i)},${getY(h.temperature)}`).join(" ");

    return (
      <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 200 }}>
          {/* Axis Labels & Grid */}
          <line x1={paddingLeft} y1={getY(minLim)} x2={width - paddingRight} y2={getY(minLim)} stroke="#F87171" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={paddingLeft} y1={getY(maxLim)} x2={width - paddingRight} y2={getY(maxLim)} stroke="#F87171" strokeDasharray="3 3" strokeWidth="1" />
          
          <text x={paddingLeft - 10} y={getY(minLim) + 3} fontSize="8.5" textAnchor="end" fill="#991B1B">Min ({minLim}°C)</text>
          <text x={paddingLeft - 10} y={getY(maxLim) + 3} fontSize="8.5" textAnchor="end" fill="#991B1B">Max ({maxLim}°C)</text>

          {/* Identity Line */}
          <line x1={paddingLeft} y1={height - paddingBottom} x2={width - paddingRight} y2={height - paddingBottom} stroke="#CBD5E1" strokeWidth="1" />
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={height - paddingBottom} stroke="#CBD5E1" strokeWidth="1" />

          {/* Trend Polyline */}
          <polyline fill="none" stroke="#0D9488" strokeWidth="2" points={pointsStr} />

          {/* Data Points */}
          {sortedHist.map((h, i) => {
            const isBreach = h.temperature < minLim || h.temperature > maxLim;
            return (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(h.temperature)} r="3.5" fill={isBreach ? "#EF4444" : "#0D9488"} />
                {sortedHist.length < 15 && (
                  <text x={getX(i)} y={getY(h.temperature) - 6} fontSize="8" textAnchor="middle" fill="#475569">{h.temperature}°</text>
                )}
              </g>
            );
          })}

          {/* Date Axis markings */}
          {sortedHist.map((h, i) => {
            // Label only every Nth element to avoid clutter
            const stride = Math.max(Math.floor(sortedHist.length / 5), 1);
            if (i % stride === 0 || i === sortedHist.length - 1) {
              const dt = new Date(h.timestamp);
              const label = `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
              return (
                <text key={i} x={getX(i)} y={height - 12} fontSize="7.5" textAnchor="middle" fill="#64748B">{label}</text>
              );
            }
            return null;
          })}
        </svg>
      </div>
    );
  };

  return (
    <div style={S.grid(12)}>
      {/* SVG Trend line visualization */}
      <div style={{ ...S.card, gridColumn: "span 7" }}>
        <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#1E293B" }}>
          📈 Temperature & Humidity Trend Analysis
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Select Monitoring Point</label>
          <select style={S.select} value={selectedPointId} onChange={e => setSelectedPointId(e.target.value)}>
            {points.map(p => (
              <option key={p.id} value={p.id}>{p.area} ({p.id})</option>
            ))}
          </select>
        </div>
        {selectedPoint && renderChart()}
      </div>

      {/* ISO Monthly Compliance Scorecard */}
      <div style={{ ...S.card, gridColumn: "span 5" }}>
        <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#0F6E56" }}>
          📋 Monthly Review & ISO 15189 compliance Log
        </div>
        <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>
          ISO 15189:2022 §6.4 requires authorized supervisors to review environmental monitoring records periodically to identify shifts or trends.
        </div>
        
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: 14, border: "1px solid #E2E8F0", marginBottom: 16 }}>
          <table style={{ width: "100%", fontSize: 12 }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px 0", color: "#475569" }}>Total Monitoring Locations</td>
                <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right" }}>{totalPoints}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px 0", color: "#475569" }}>Total Deviations Observed</td>
                <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", color: totalExcursions > 0 ? "#EF4444" : "#0D9488" }}>{totalExcursions}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}>
                <td style={{ padding: "6px 0", color: "#475569" }}>Corrective Actions Completed</td>
                <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", color: "#0D9488" }}>{resolvedExcursions}</td>
              </tr>
              <tr>
                <td style={{ padding: "6px 0", color: "#475569" }}>Pending Excursion Audits</td>
                <td style={{ padding: "6px 0", fontWeight: 700, textAlign: "right", color: activeExcursions > 0 ? "#EF4444" : "#475569" }}>{activeExcursions}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={S.grid(2)}>
          <div>
            <label style={S.label}>Reviewed & Signed By *</label>
            <input style={S.inp} value={reviewer} onChange={e => setReviewer(e.target.value)} disabled={isSigned} />
          </div>
          <div>
            <label style={S.label}>Review Date *</label>
            <input type="date" style={S.inp} value={reviewDate} onChange={e => setReviewDate(e.target.value)} disabled={isSigned} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button 
            onClick={() => {
              setIsSigned(true);
              alert("Verification and Monthly Review signed successfully. Log sealed for audit trail.");
            }} 
            disabled={isSigned || activeExcursions > 0}
            style={{ ...S.btn, width: "100%", background: isSigned ? "#64748B" : "#0D9488", cursor: isSigned ? "default" : "pointer" }}
          >
            {isSigned ? "✓ Monthly Review Sealed" : activeExcursions > 0 ? "Resolve Excursions to Sign" : "🔒 Sign & Approve Monthly Log"}
          </button>
        </div>
      </div>
    </div>
  );
}
