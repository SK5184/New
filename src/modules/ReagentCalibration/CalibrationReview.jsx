// CalibrationReview.jsx
// Quality Department & HOD Calibration verification review board

import { useState } from "react";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  label: { fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "danger" ? "#EF4444" : variant === "secondary" ? "#F1F5F9" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (status) => ({
    padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600,
    background: status === "Approved" ? "#ECFDF5" : status === "Failed" ? "#FEE2E2" : "#FEF3C7",
    color: status === "Approved" ? "#047857" : status === "Failed" ? "#B91C1C" : "#D97706"
  })
};

export default function CalibrationReview({ calibrations, onReview, reviewerName, isAuthorized }) {
  const [selectedCal, setSelectedCal] = useState(null);

  const pendingCalibrations = calibrations.filter(c => c.status === "Pending Approval");

  const handleAction = (status) => {
    if (!selectedCal) return;
    const approvalDetails = {
      approvedBy: reviewerName || "Quality Manager",
      approvedAt: new Date().toISOString()
    };
    const auditLog = [
      ...selectedCal.auditTrail,
      {
        user: reviewerName || "Quality Manager",
        action: `Calibration ${status}`,
        date: new Date().toISOString()
      }
    ];

    onReview(selectedCal.id, status, approvalDetails, auditLog, selectedCal);
    setSelectedCal(null);
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>🔑 HOD / Quality Authorization Dashboard</div>
        </div>
        <div style={S.cardBody}>
          {pendingCalibrations.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
              🎉 No pending reagent calibrations awaiting review!
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Test / Department</th>
                  <th style={S.th}>Analyzer</th>
                  <th style={S.th}>Reagent Lot</th>
                  <th style={S.th}>Run Date</th>
                  <th style={S.th}>Operator</th>
                  <th style={S.th}>Status</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingCalibrations.map(c => (
                  <tr key={c.id}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{c.testName}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>{c.department}</div>
                    </td>
                    <td style={S.td}>{c.analyzerID}</td>
                    <td style={S.td}><code>{c.lotNumber}</code></td>
                    <td style={S.td}>{c.calibrationDate}</td>
                    <td style={S.td}>{c.operator}</td>
                    <td style={S.td}>
                      <span style={S.badge(c.status)}>{c.status}</span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <button style={S.btn("secondary")} onClick={() => setSelectedCal(c)}>
                        🔎 Audit Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Review Modal Dialog */}
      {selectedCal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 650, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }}>
            
            <div style={{ ...S.cardHeader, background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
              <div style={{ ...S.cardTitle, color: "#FFF" }}>🔄 Calibration Audit - {selectedCal.testName} (Lot: {selectedCal.lotNumber})</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setSelectedCal(null)}>✕</button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={S.grid(3)}>
                <div>
                  <span style={S.label}>Reagent ID</span>
                  <strong>{selectedCal.reagentID}</strong>
                </div>
                <div>
                  <span style={S.label}>Analyzer</span>
                  <strong>{selectedCal.analyzerID}</strong>
                </div>
                <div>
                  <span style={S.label}>Operator</span>
                  <strong>{selectedCal.operator}</strong>
                </div>
                <div>
                  <span style={S.label}>Calibrator Name</span>
                  <strong>{selectedCal.calibrator.name}</strong>
                </div>
                <div>
                  <span style={S.label}>Calibrator Lot</span>
                  <strong>{selectedCal.calibrator.lotNumber}</strong>
                </div>
                <div>
                  <span style={S.label}>Calibrator Expiry</span>
                  <strong>{selectedCal.calibrator.expiry}</strong>
                </div>
              </div>

              <h4 style={{ fontSize: 12, fontWeight: 700, margin: "16px 0 8px 0" }}>Results & Bias Verification</h4>
              
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Level</th>
                    <th style={S.th}>Expected Value</th>
                    <th style={S.th}>Obtained Value</th>
                    <th style={S.th}>Bias %</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCal.results.map((res, index) => (
                    <tr key={index}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{res.level}</td>
                      <td style={S.td}>{res.expected}</td>
                      <td style={S.td}>{res.obtained}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: res.status === "Pass" ? "#0D9488" : "#EF4444" }}>{res.bias}%</td>
                      <td style={S.td}>
                        <span style={S.badge(res.status === "Pass" ? "Approved" : "Failed")}>{res.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Review actions */}
              {isAuthorized ? (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                  <button style={S.btn("danger")} onClick={() => handleAction("Failed")}>
                    ✕ Reject Calibration
                  </button>
                  <button style={S.btn("primary")} onClick={() => handleAction("Approved")}>
                    ✓ Approve Calibration
                  </button>
                </div>
              ) : (
                <div style={{ padding: 12, background: "#FEF3C7", borderRadius: 8, color: "#92400E", fontSize: 12, fontWeight: 500 }}>
                  ⚠️ Only authorized Quality Managers or HODs can sign off and approve reagent calibrations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
