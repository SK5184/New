// CAPAForm.jsx
// Failed Calibration Root Cause Investigation & CAPA Wizard

import { useState } from "react";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : "#EF4444",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (status) => ({
    padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600,
    background: status === "Resolved" ? "#ECFDF5" : "#FEE2E2",
    color: status === "Resolved" ? "#047857" : "#B91C1C"
  }),
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#334155", marginBottom: 8 }
};

export default function CAPAForm({ calibrations, onSubmitCAPA, operatorName }) {
  const [selectedCal, setSelectedCal] = useState(null);
  
  const [checks, setChecks] = useState({
    reagentLot: false,
    calibrator: false,
    analyzer: false,
    qcFailure: false,
    storage: false
  });

  const [form, setForm] = useState({
    investigationDetails: "",
    rootCause: "",
    correctiveAction: "",
    preventativeAction: "",
    reverificationRequired: true
  });

  const failedCalibrations = calibrations.filter(c => c.status === "Failed" && !c.capaID);

  const handleCheckbox = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCal) return alert("Please select a failed calibration run.");
    if (!form.rootCause.trim() || !form.correctiveAction.trim()) {
      return alert("Please fill out the Root Cause and Corrective Action Plan.");
    }

    const checklistSummary = [];
    if (checks.reagentLot) checklistSummary.push("Reagent lot inspected");
    if (checks.calibrator) checklistSummary.push("Calibrator storage & reconstitution verified");
    if (checks.analyzer) checklistSummary.push("Analyzer clean/maintenance performed");
    if (checks.qcFailure) checklistSummary.push("Related QC runs evaluated");
    if (checks.storage) checklistSummary.push("Storage logs and temperatures checked");

    const reason = `Root Cause: ${form.rootCause}. Checklist completed: ${checklistSummary.join(", ")}. Corrective action planned: ${form.correctiveAction}`;

    onSubmitCAPA(selectedCal, reason, form);
    
    // Reset Form
    setSelectedCal(null);
    setChecks({ reagentLot: false, calibrator: false, analyzer: false, qcFailure: false, storage: false });
    setForm({ investigationDetails: "", rootCause: "", correctiveAction: "", preventativeAction: "", reverificationRequired: true });
  };

  return (
    <div>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>⚠️ Active Failed Calibrations Registry (CAPA Required)</div>
        </div>
        <div style={S.cardBody}>
          {failedCalibrations.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
              ✅ No failed calibrations currently require CAPA logging!
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Test / Department</th>
                  <th style={S.th}>Analyzer</th>
                  <th style={S.th}>Reagent Lot</th>
                  <th style={S.th}>Failure Date</th>
                  <th style={S.th}>Operator</th>
                  <th style={S.th}>Status</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedCalibrations.map(c => (
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
                      <span style={S.badge("Failed")}>CAPA Required</span>
                    </td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <button style={S.btn("secondary")} onClick={() => setSelectedCal(c)}>
                        🚨 Investigate Failure
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Investigation & CAPA Wizard Dialog */}
      {selectedCal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 750, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            
            <div style={{ ...S.cardHeader, background: "#EF4444", borderBottom: "1px solid #DC2626" }}>
              <div style={{ ...S.cardTitle, color: "#FFF" }}>⚠️ Initiate Root Cause Investigation &amp; CAPA ({selectedCal.testName})</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setSelectedCal(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 12, color: "#991B1B" }}>
                This calibration run failed limits checks. Under ISO 15189:2022 §7.3, nonconforming calibration runs must be investigated and resolved before patient testing is resumed.
              </div>

              {/* 1. INVESTIGATION CHECKLIST */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, margin: "0 0 12px 0" }}>
                1. Preliminary Investigation Checklist
              </h4>
              <div style={{ marginBottom: 20 }}>
                <div style={S.checkRow}>
                  <input type="checkbox" id="checkLot" checked={checks.reagentLot} onChange={() => handleCheckbox("reagentLot")} />
                  <label htmlFor="checkLot" style={{ cursor: "pointer" }}>Verify reagent lot physical condition and expiry date</label>
                </div>
                <div style={S.checkRow}>
                  <input type="checkbox" id="checkCal" checked={checks.calibrator} onChange={() => handleCheckbox("calibrator")} />
                  <label htmlFor="checkCal" style={{ cursor: "pointer" }}>Check calibrator reconstitution time, storage conditions, and expiry</label>
                </div>
                <div style={S.checkRow}>
                  <input type="checkbox" id="checkAnalyzer" checked={checks.analyzer} onChange={() => handleCheckbox("analyzer")} />
                  <label htmlFor="checkAnalyzer" style={{ cursor: "pointer" }}>Audit analyzer maintenance log and clean probe/reagent lines</label>
                </div>
                <div style={S.checkRow}>
                  <input type="checkbox" id="checkQC" checked={checks.qcFailure} onChange={() => handleCheckbox("qcFailure")} />
                  <label htmlFor="checkQC" style={{ cursor: "pointer" }}>Review previous Internal QC runs for shifts/trends</label>
                </div>
                <div style={S.checkRow}>
                  <input type="checkbox" id="checkStorage" checked={checks.storage} onChange={() => handleCheckbox("storage")} />
                  <label htmlFor="checkStorage" style={{ cursor: "pointer" }}>Confirm storage temperature logs for the reagent refrigerator</label>
                </div>
              </div>

              {/* 2. ROOT CAUSE ANALYSIS */}
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, margin: "0 0 12px 0" }}>
                2. Root Cause Analysis &amp; Action Plan
              </h4>
              
              <div style={S.grid(2)}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={S.label}>Investigation &amp; Findings Details</label>
                  <textarea
                    style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                    placeholder="Describe what you observed during the preliminary checklist audits..."
                    value={form.investigationDetails}
                    onChange={(e) => setForm({ ...form, investigationDetails: e.target.value })}
                  />
                </div>
                <div>
                  <label style={S.label}>Determined Root Cause (Required)</label>
                  <textarea
                    style={{ ...S.inp, height: 80, fontFamily: "inherit" }}
                    placeholder="Identify why the calibration failed (e.g. calibrator vial left uncapped)..."
                    value={form.rootCause}
                    onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Corrective Action Plan (Immediate Action - Required)</label>
                  <textarea
                    style={{ ...S.inp, height: 80, fontFamily: "inherit" }}
                    placeholder="Immediate steps (e.g. discard old calibrator, reconstitute fresh vial, repeat)..."
                    value={form.correctiveAction}
                    onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })}
                    required
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={S.label}>Preventative Action Plan (Long Term)</label>
                  <textarea
                    style={{ ...S.inp, height: 60, fontFamily: "inherit" }}
                    placeholder="Steps to prevent recurrence (e.g. retraining staff on reconstitution logs)..."
                    value={form.preventativeAction}
                    onChange={(e) => setForm({ ...form, preventativeAction: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button type="button" style={S.btn("secondary")} onClick={() => setSelectedCal(null)}>Cancel</button>
                <button type="submit" style={S.btn("primary")}>💾 Log CAPA &amp; Trigger Reverification</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
