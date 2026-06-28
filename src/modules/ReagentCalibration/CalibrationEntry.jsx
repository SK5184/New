// CalibrationEntry.jsx
// Performed by technical staff - Calibration Run & Verification Data Entry

import { useState, useEffect } from "react";

const S = {
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (pass) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: pass ? "#ECFDF5" : "#FEE2E2", color: pass ? "#047857" : "#B91C1C" })
};

export default function CalibrationEntry({ reagents, onSave, operatorName }) {
  const [selectedReagentId, setSelectedReagentId] = useState("");
  const [selectedReagent, setSelectedReagent] = useState(null);
  
  const [entry, setEntry] = useState({
    calibrationDate: new Date().toISOString().slice(0, 10),
    calibratorName: "",
    calibratorLot: "",
    calibratorExpiry: "",
    calibratorTraceability: "",
    levels: [
      { level: "Level 1", expected: "", obtained: "", bias: 0, status: "Pending" },
      { level: "Level 2", expected: "", obtained: "", bias: 0, status: "Pending" },
      { level: "Level 3", expected: "", obtained: "", bias: 0, status: "Pending" }
    ]
  });

  useEffect(() => {
    if (selectedReagentId) {
      const found = reagents.find(r => r.id === selectedReagentId);
      setSelectedReagent(found);
    } else {
      setSelectedReagent(null);
    }
  }, [selectedReagentId, reagents]);

  const handleReagentChange = (e) => {
    setSelectedReagentId(e.target.value);
  };

  const handleLevelChange = (index, field, value) => {
    const nextLevels = [...entry.levels];
    nextLevels[index][field] = parseFloat(value) || "";
    
    // Auto-calculate bias
    const exp = nextLevels[index].expected;
    const obt = nextLevels[index].obtained;
    
    if (exp && obt) {
      const bias = ((obt - exp) / exp) * 100;
      nextLevels[index].bias = parseFloat(bias.toFixed(2));
      
      // Check limits
      const limit = selectedReagent ? selectedReagent.biasLimit : 5;
      const passes = Math.abs(bias) <= limit;
      nextLevels[index].status = passes ? "Pass" : "Fail";
    } else {
      nextLevels[index].bias = 0;
      nextLevels[index].status = "Pending";
    }
    
    setEntry({ ...entry, levels: nextLevels });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedReagent) return alert("Please select a reagent.");
    
    // Validate inputs
    const incomplete = entry.levels.some(l => l.expected === "" || l.obtained === "");
    if (incomplete) return alert("Please complete results for all levels.");

    // Check if calibration passes or fails
    const hasFail = entry.levels.some(l => l.status === "Fail");
    const status = hasFail ? "Failed" : "Pending Approval";

    onSave({
      reagentID: selectedReagent.reagentID,
      reagentDocId: selectedReagent.id,
      department: selectedReagent.department,
      testName: selectedReagent.testName,
      analyzerID: selectedReagent.analyzerID,
      lotNumber: selectedReagent.lotNumber,
      calibrationDate: entry.calibrationDate,
      operator: operatorName || "Staff Technologist",
      calibrator: {
        name: entry.calibratorName,
        lotNumber: entry.calibratorLot,
        expiry: entry.calibratorExpiry,
        traceability: entry.calibratorTraceability
      },
      results: entry.levels,
      status: status,
      auditTrail: [
        {
          user: operatorName || "Staff Technologist",
          action: "Calibration Run Entered",
          date: new Date().toISOString()
        }
      ]
    });

    // Reset Entry
    setEntry({
      calibrationDate: new Date().toISOString().slice(0, 10),
      calibratorName: "",
      calibratorLot: "",
      calibratorExpiry: "",
      calibratorTraceability: "",
      levels: [
        { level: "Level 1", expected: "", obtained: "", bias: 0, status: "Pending" },
        { level: "Level 2", expected: "", obtained: "", bias: 0, status: "Pending" },
        { level: "Level 3", expected: "", obtained: "", bias: 0, status: "Pending" }
      ]
    });
    setSelectedReagentId("");
  };

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>📥 Log New Reagent Calibration Run / Verification</div>
      </div>
      <div style={S.cardBody}>
        <form onSubmit={handleSubmit}>
          
          {/* Reagent Selection */}
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Select Active Reagent</label>
              <select style={S.select} value={selectedReagentId} onChange={handleReagentChange} required>
                <option value="">Select reagent lot</option>
                {reagents.filter(r => r.status === "Active").map(r => (
                  <option key={r.id} value={r.id}>
                    {r.testName} ({r.analyzerID}) - Lot: {r.lotNumber}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Calibration Run Date</label>
              <input
                type="date"
                style={S.inp}
                value={entry.calibrationDate}
                onChange={(e) => setEntry({ ...entry, calibrationDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={S.label}>Operator</label>
              <input type="text" style={{ ...S.inp, background: "#F1F5F9" }} value={operatorName || ""} readOnly />
            </div>
          </div>

          {selectedReagent && (
            <div>
              {/* Calibrator Material details */}
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, margin: "20px 0 12px 0" }}>
                🧪 Calibrator Standard Reference Material
              </h4>
              <div style={S.grid(4)}>
                <div>
                  <label style={S.label}>Calibrator Name</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Glucose Calibrator"
                    value={entry.calibratorName}
                    onChange={(e) => setEntry({ ...entry, calibratorName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Calibrator Lot</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. CAL-2026-05"
                    value={entry.calibratorLot}
                    onChange={(e) => setEntry({ ...entry, calibratorLot: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Calibrator Expiry</label>
                  <input
                    type="date"
                    style={S.inp}
                    value={entry.calibratorExpiry}
                    onChange={(e) => setEntry({ ...entry, calibratorExpiry: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Metrological Traceability Reference</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. NIST SRM 917"
                    value={entry.calibratorTraceability}
                    onChange={(e) => setEntry({ ...entry, calibratorTraceability: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Calibration Results entry table */}
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, margin: "20px 0 12px 0" }}>
                📊 Calibration Verification Levels & Expected Bias Limits (Max allowable: {selectedReagent.biasLimit}%)
              </h4>
              
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Calibrator Level</th>
                    <th style={S.th}>Expected Value</th>
                    <th style={S.th}>Obtained Value</th>
                    <th style={S.th}>Calculated Bias %</th>
                    <th style={S.th}>Limits Validation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.levels.map((level, idx) => (
                    <tr key={idx}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{level.level}</td>
                      <td style={S.td}>
                        <input
                          type="number"
                          step="any"
                          style={S.inp}
                          placeholder="Expected target value"
                          value={level.expected}
                          onChange={(e) => handleLevelChange(idx, "expected", e.target.value)}
                          required
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          type="number"
                          step="any"
                          style={S.inp}
                          placeholder="Measured obtained value"
                          value={level.obtained}
                          onChange={(e) => handleLevelChange(idx, "obtained", e.target.value)}
                          required
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, color: Math.abs(level.bias) > selectedReagent.biasLimit ? "#EF4444" : "#0D9488" }}>
                        {level.bias === 0 && level.expected === "" ? "0.00" : `${level.bias}%`}
                      </td>
                      <td style={S.td}>
                        <span style={S.badge(level.status === "Pass")}>{level.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" style={S.btn("primary")}>💾 Submit Calibration Results</button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
