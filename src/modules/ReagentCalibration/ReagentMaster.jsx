// ReagentMaster.jsx
// ISO 15189:2022 §6.2.2 & §7.2 Quality Controlled Reagent Masters Configuration

import { useState } from "react";

const DEPARTMENTS = ["Biochemistry", "Haematology", "Microbiology", "Serology", "Flow Cytometry", "Cytogenetics"];
const FREQUENCIES = ["Lot change", "Monthly", "Bi-Monthly", "Weekly"];
const CAL_TYPES = ["Auto", "Manual"];

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
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (active) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: active ? "#ECFDF5" : "#FEE2E2", color: active ? "#047857" : "#B91C1C" })
};

export default function ReagentMaster({ reagents, onAdd, onStatusToggle, isQualityStaff }) {
  const [form, setForm] = useState({
    reagentID: "",
    department: "Biochemistry",
    analyzerID: "",
    testName: "",
    manufacturer: "",
    lotNumber: "",
    expiryDate: "",
    frequency: "Monthly",
    calType: "Auto",
    biasLimit: 5,
    recoveryMin: 90,
    recoveryMax: 110
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.reagentID.trim() || !form.testName.trim()) return;
    onAdd({
      ...form,
      status: "Active"
    });
    // reset form
    setForm({
      reagentID: "",
      department: "Biochemistry",
      analyzerID: "",
      testName: "",
      manufacturer: "",
      lotNumber: "",
      expiryDate: "",
      frequency: "Monthly",
      calType: "Auto",
      biasLimit: 5,
      recoveryMin: 90,
      recoveryMax: 110
    });
  };

  return (
    <div>
      {/* Configure Reagent Master form (Only Quality / Admin authorized) */}
      {isQualityStaff && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>⚙️ Register Reagent Performance / Acceptance Limits</div>
          </div>
          <div style={S.cardBody}>
            <form onSubmit={handleSubmit}>
              <div style={S.grid(4)}>
                <div>
                  <label style={S.label}>Reagent ID</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. BIO-REA-001"
                    value={form.reagentID}
                    onChange={(e) => setForm({ ...form, reagentID: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Department</label>
                  <select
                    style={S.select}
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Analyzer Model</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Roche Cobas 6000"
                    value={form.analyzerID}
                    onChange={(e) => setForm({ ...form, analyzerID: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Test Name</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Creatinine"
                    value={form.testName}
                    onChange={(e) => setForm({ ...form, testName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Manufacturer</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Roche Diagnostics"
                    value={form.manufacturer}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Reagent Lot Number</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. LOT-54321"
                    value={form.lotNumber}
                    onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Expiry Date</label>
                  <input
                    type="date"
                    style={S.inp}
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Calibration Frequency</label>
                  <select
                    style={S.select}
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  >
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Calibration Type</label>
                  <select
                    style={S.select}
                    value={form.calType}
                    onChange={(e) => setForm({ ...form, calType: e.target.value })}
                  >
                    {CAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Max Allowable Bias %</label>
                  <input
                    type="number"
                    style={S.inp}
                    value={form.biasLimit}
                    onChange={(e) => setForm({ ...form, biasLimit: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Min Recovery %</label>
                  <input
                    type="number"
                    style={S.inp}
                    value={form.recoveryMin}
                    onChange={(e) => setForm({ ...form, recoveryMin: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Max Recovery %</label>
                  <input
                    type="number"
                    style={S.inp}
                    value={form.recoveryMax}
                    onChange={(e) => setForm({ ...form, recoveryMax: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" style={S.btn("primary")}>💾 Configure Reagent Master</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reagent Masters Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>📂 Active Reagents Master Register (ISO 15189 Compliant)</div>
        </div>
        <div style={{ padding: 0 }}>
          {reagents.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No reagents registered.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Reagent ID</th>
                  <th style={S.th}>Test / Department</th>
                  <th style={S.th}>Analyzer</th>
                  <th style={S.th}>Lot / Expiry</th>
                  <th style={S.th}>Calibration Type</th>
                  <th style={S.th}>Acceptance Limits</th>
                  <th style={S.th}>Status</th>
                  {isQualityStaff && <th style={{ ...S.th, textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {reagents.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}><code>{r.reagentID}</code></td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{r.testName}</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>{r.department}</div>
                    </td>
                    <td style={S.td}>{r.analyzerID}</td>
                    <td style={S.td}>
                      <div>{r.lotNumber}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>Exp: {r.expiryDate}</div>
                    </td>
                    <td style={S.td}>{r.calType} ({r.frequency})</td>
                    <td style={S.td}>
                      <div>Bias $\le$ {r.biasLimit}%</div>
                      <div style={{ fontSize: 10, color: "#64748B" }}>Rec: {r.recoveryMin}-{r.recoveryMax}%</div>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(r.status === "Active")}>{r.status}</span>
                    </td>
                    {isQualityStaff && (
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <button
                          style={S.btn("secondary")}
                          onClick={() => onStatusToggle(r.id, r.status === "Active" ? "Inactive" : "Active")}
                        >
                          {r.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
