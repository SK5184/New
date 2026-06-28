// src/modules/TemperatureMonitoring/ExcursionManagement.jsx
// Form to assess, document, and resolve temperature excursions, triggering CAPAs

import { useState, useEffect } from "react";
import { temperatureService } from "./temperatureService";
import { useAuth } from "../../context/AuthContext";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", cursor: "pointer" },
  textarea: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", minHeight: 60, boxSizing: "border-box", outline: "none", resize: "vertical" },
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
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 })
};

export default function ExcursionManagement({ excursions, onRefresh, showToast }) {
  const { name: currentUserName, role: userRole } = useAuth();
  const [selectedExcursion, setSelectedExcursion] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    duration: "2 hours",
    impactAssessment: "No impact on reagents. Temperature returned to normal after cabinet door was closed correctly.",
    actionTaken: "Door gasket inspected, adjusted temperature controls slightly, and informed laboratory supervisor.",
    capaRequired: "No"
  });

  const handleOpenResolve = (exc) => {
    setSelectedExcursion(exc);
    setFormState({
      duration: "1 hour",
      impactAssessment: "",
      actionTaken: "",
      capaRequired: "No"
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedExcursion) return;
    if (!formState.impactAssessment) return alert("Please specify the impact assessment");
    if (!formState.actionTaken) return alert("Please document the corrective action taken");

    setSaving(true);
    const success = await temperatureService.resolveExcursion(selectedExcursion.id, {
      ...formState,
      pointId: selectedExcursion.pointId,
      limitExceeded: selectedExcursion.limitExceeded,
      area: selectedExcursion.area,
      department: selectedExcursion.department,
      resolvedBy: currentUserName || "Supervisor"
    });

    setSaving(false);
    if (success) {
      showToast("Excursion resolved successfully!");
      if (formState.capaRequired === "Yes") {
        showToast("CAPA request automatically routed to Biomedical Engineering central queue.");
      }
      setSelectedExcursion(null);
      onRefresh();
    } else {
      alert("Error resolving excursion.");
    }
  };

  const activeExcursions = excursions.filter(e => !e.resolved);
  const resolvedExcursions = excursions.filter(e => e.resolved);

  return (
    <div>
      {/* Excursion assessment form */}
      {selectedExcursion && (
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 700, borderBottom: "1px solid #E2E8F0", paddingBottom: 8, marginBottom: 16, color: "#EF4444" }}>
            Investigate & Resolve Temperature Excursion: {selectedExcursion.pointId}
          </div>
          <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: "#991B1B" }}>
            <strong>Location:</strong> {selectedExcursion.area} ({selectedExcursion.department})<br/>
            <strong>Limit Exceeded:</strong> {selectedExcursion.limitExceeded}<br/>
            <strong>Trigger Timestamp:</strong> {new Date(selectedExcursion.timestamp).toLocaleString("en-IN")}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Excursion Duration *</label>
                <input style={S.inp} placeholder="e.g. 2 hours" value={formState.duration} onChange={e => setFormState({ ...formState, duration: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>CAPA Required? *</label>
                <select style={S.select} value={formState.capaRequired} onChange={e => setFormState({ ...formState, capaRequired: e.target.value })}>
                  <option value="No">No — Immediate Action sufficient</option>
                  <option value="Yes">Yes — Trigger central BME CAPA Ticket</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Investigated By</label>
                <input style={S.inp} value={currentUserName || "Staff"} readOnly />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Impact Assessment on Reagents / Samples / Clinical Results *</label>
              <textarea style={S.textarea} placeholder="Document any degradation or if samples had to be discarded/transferred..." value={formState.impactAssessment} onChange={e => setFormState({ ...formState, impactAssessment: e.target.value })} required />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Immediate Corrective Action Taken *</label>
              <textarea style={S.textarea} placeholder="e.g. Moved reagents to Refrigerator B, notified maintenance..." value={formState.actionTaken} onChange={e => setFormState({ ...formState, actionTaken: e.target.value })} required />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSelectedExcursion(null)} style={S.btn("secondary")}>Cancel</button>
              <button type="submit" disabled={saving} style={S.btn("danger")}>{saving ? "Saving Resolution..." : "Resolve Excursion & Log Actions"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Active Excursions */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 12 }}>
          ⚠️ Unresolved Environmental & Temperature Excursions ({activeExcursions.length} Active Alerts)
        </div>
        {activeExcursions.length === 0 ? (
          <div style={{ color: "#065F46", background: "#D1FAE5", padding: "16px 20px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            ✓ All temperature and humidity points are currently within limits. No active excursions.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Timestamp</th>
                  <th style={S.th}>Point ID</th>
                  <th style={S.th}>Area / Location</th>
                  <th style={S.th}>Breach Details</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeExcursions.map((exc) => (
                  <tr key={exc.id}>
                    <td style={S.td}>{new Date(exc.timestamp).toLocaleString("en-IN")}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{exc.pointId}</td>
                    <td style={S.td}>{exc.area} <span style={{ fontSize: 10.5, color: "#64748B" }}>({exc.department})</span></td>
                    <td style={{ ...S.td, color: "#B91C1C", fontWeight: 600 }}>{exc.limitExceeded}</td>
                    <td style={S.td}>
                      <button onClick={() => handleOpenResolve(exc)} style={S.btn("danger")}>🚨 Document Action</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resolved Excursions history */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>
          ✓ Excursion Investigation History & Audit Logs ({resolvedExcursions.length} Resolved Cases)
        </div>
        {resolvedExcursions.length === 0 ? (
          <div style={{ color: "#64748B", fontSize: 12, textAlign: "center", padding: 24 }}>No past excursions resolved yet.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Resolved Date</th>
                  <th style={S.th}>Point ID / Area</th>
                  <th style={S.th}>Breach Details</th>
                  <th style={S.th}>Duration</th>
                  <th style={S.th}>Corrective Actions & Impact</th>
                  <th style={S.th}>CAPA Required</th>
                  <th style={S.th}>Sign</th>
                </tr>
              </thead>
              <tbody>
                {resolvedExcursions.map((exc) => (
                  <tr key={exc.id}>
                    <td style={S.td}>{new Date(exc.resolvedAt).toLocaleString("en-IN")}</td>
                    <td style={S.td}>
                      <strong style={{ display: "block" }}>{exc.pointId}</strong>
                      <span style={{ fontSize: 11, color: "#64748B" }}>{exc.area}</span>
                    </td>
                    <td style={{ ...S.td, color: "#B91C1C", fontSize: 11.5 }}>{exc.limitExceeded}</td>
                    <td style={S.td}>{exc.duration}</td>
                    <td style={{ ...S.td, fontSize: 11.5 }}>
                      <strong>Action:</strong> {exc.actionTaken}<br/>
                      <strong>Impact:</strong> {exc.impactAssessment}
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(exc.capaRequired === "Yes" ? "#FEE2E2" : "#F1F5F9", exc.capaRequired === "Yes" ? "#B91C1C" : "#475569")}>
                        {exc.capaRequired === "Yes" ? "YES (Central CAPA)" : "NO"}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontFamily: "monospace" }}>{exc.resolvedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
