// RevenueCycle.jsx
// MBL QMS Accounts — Patient Billing, Collection Centers Settlements & AR Ageing
// Designed for diagnostic chains with multiple centers and corporate hospital contracts.

import React, { useState } from "react";

const S = {
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  title: { fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 4px" },
  subtitle: { fontSize: 11.5, color: "#64748B", margin: "0 0 16px" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff" },
  th: { background: "#F8FAFC", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  inp: { padding: "7px 10px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, background: "#fff", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (bg, color) => ({ padding: "7px 12px", background: bg || "#059669", color: color || "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: color }),
  flowStep: (active) => ({
    padding: 10, borderRadius: 8, background: active ? "#E1F5EE" : "#F8FAFC",
    border: active ? "1.5px solid #059669" : "1.5px solid #E2E8F0",
    textAlign: "center", fontSize: 11.5, fontWeight: 600, color: active ? "#047857" : "#475569", flex: 1
  })
};

export default function RevenueCycle({ onLogAudit, featureFlags }) {
  const [subTab, setSubTab] = useState("cc_logs"); // "cc_logs" | "settlement" | "corporate" | "ageing"
  const [flowIndex, setFlowIndex] = useState(0);

  // Billing Flow pipeline steps
  const FLOW_STEPS = [
    "1. Patient Reg & LIS Entry",
    "2. Auto Test Billing",
    "3. Invoice Generation",
    "4. Payment Gateway Collect",
    "5. Auto COA Double-Entry",
    "6. Bank Recon Auto-Sync"
  ];

  // Daily Collection Entry Logs for CCs
  const [ccLogs, setCcLogs] = useState([
    { id: 1, centerId: "CC-COL-01", date: "2026-06-22", patients: 85, tests: 190, amount: 85000, discount: 5000, collected: 80000, mode: "UPI (65k) + Cash (15k)" },
    { id: 2, centerId: "CC-COL-02", date: "2026-06-22", patients: 62, tests: 110, amount: 58000, discount: 2000, collected: 56000, mode: "Card (30k) + UPI (26k)" },
    { id: 3, centerId: "CC-COL-03", date: "2026-06-22", patients: 45, tests: 95, amount: 42000, discount: 1500, collected: 40500, mode: "UPI (40.5k)" },
    { id: 4, centerId: "CC-COL-04", date: "2026-06-22", patients: 98, tests: 210, amount: 105000, discount: 8000, collected: 97000, mode: "Cash (40k) + UPI (57k)" }
  ]);

  const [newLog, setNewLog] = useState({
    centerId: "CC-COL-01",
    date: new Date().toISOString().split("T")[0],
    patients: "",
    tests: "",
    amount: "",
    discount: "0",
    collected: "",
    mode: "UPI"
  });

  // settlements
  const [settlements, setSettlements] = useState([
    { id: 1, centerId: "CC-COL-01", period: "June Week 2", grossCollected: 520000, shareFranchise: 104000, incentives: 15000, depositStatus: "Transferred to HO" },
    { id: 2, centerId: "CC-COL-02", period: "June Week 2", grossCollected: 380000, shareFranchise: 76000, incentives: 10000, depositStatus: "Transferred to HO" },
    { id: 3, centerId: "CC-COL-03", period: "June Week 2", grossCollected: 290000, shareFranchise: 58000, incentives: 8500, depositStatus: "Verification Pending" }
  ]);

  // Corporate Dues
  const [corporateClients, setCorporateClients] = useState([
    { id: 1, name: "ABC Multispecialty Hospital", testsMonth: 10450, creditPeriod: "45 Days", outstanding: 1800000, status: "Active" },
    { id: 2, name: "Lifeline Cardiac Center", testsMonth: 4200, creditPeriod: "30 Days", outstanding: 650000, status: "Active" },
    { id: 3, name: "Metro Diagnostics Labs", testsMonth: 8200, creditPeriod: "60 Days", outstanding: 1250000, status: "Overdue Alert" },
    { id: 4, name: "Max Care Hospital Corporate", testsMonth: 1150, creditPeriod: "30 Days", outstanding: 180000, status: "Active" }
  ]);

  // AR Dues Ageing
  const arAgeingData = {
    patientDues: { "0-30": 850000, "31-60": 340000, "61-90": 120000, "90+": 45000 },
    corporateDues: { "0-30": 2200000, "31-60": 1480000, "61-90": 850000, "90+": 650000 }
  };

  const handleAddCcLog = (e) => {
    e.preventDefault();
    if (!newLog.patients || !newLog.amount || !newLog.collected) return;
    const log = {
      id: Date.now(),
      centerId: newLog.centerId,
      date: newLog.date,
      patients: parseInt(newLog.patients),
      tests: parseInt(newLog.tests || newLog.patients * 2),
      amount: parseFloat(newLog.amount),
      discount: parseFloat(newLog.discount),
      collected: parseFloat(newLog.collected),
      mode: newLog.mode
    };
    setCcLogs(p => [log, ...p]);
    onLogAudit("CC_LOG", `Entered Daily Collection for ${log.centerId}: ${log.patients} patients, ₹${log.collected.toLocaleString()} received.`);
    setNewLog({
      centerId: newLog.centerId,
      date: new Date().toISOString().split("T")[0],
      patients: "",
      tests: "",
      amount: "",
      discount: "0",
      collected: "",
      mode: "UPI"
    });
  };

  const handleTriggerSettlement = (id) => {
    setSettlements(p => p.map(s => s.id === id ? { ...s, depositStatus: "Transferred to HO" } : s));
    const item = settlements.find(s => s.id === id);
    if (item) {
      onLogAudit("SETTLEMENT", `Approved deposit settlement for ${item.centerId} (${item.period}): ₹${item.grossCollected.toLocaleString()}`);
      alert(`Settlement of ₹${item.grossCollected.toLocaleString()} reconciled & marked as deposit cleared.`);
    }
  };

  const handleInvoiceClient = (id) => {
    const client = corporateClients.find(c => c.id === id);
    if (client) {
      onLogAudit("BILLING", `Dispatched monthly consolidated invoice to corporate client: ${client.name} for outstanding ₹${client.outstanding.toLocaleString()}`);
      alert(`Invoice generated & dispatched to corporate portal of ${client.name}. Ledger balance posted.`);
    }
  };

  const fmt = (v) => "₹" + v.toLocaleString("en-IN");

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={S.btn(subTab === "cc_logs" ? "#059669" : "#E2E8F0", subTab === "cc_logs" ? "#FFF" : "#475569")} onClick={() => setSubTab("cc_logs")}>
          📥 Daily Collection Center Entry
        </button>
        <button style={S.btn(subTab === "settlement" ? "#059669" : "#E2E8F0", subTab === "settlement" ? "#FFF" : "#475569")} onClick={() => setSubTab("settlement")}>
          💸 Center Commission & Settlements
        </button>
        <button style={S.btn(subTab === "corporate" ? "#059669" : "#E2E8F0", subTab === "corporate" ? "#FFF" : "#475569")} onClick={() => setSubTab("corporate")}>
          🏢 Hospital & Corporate Client Billing
        </button>
        <button style={S.btn(subTab === "ageing" ? "#059669" : "#E2E8F0", subTab === "ageing" ? "#FFF" : "#475569")} onClick={() => setSubTab("ageing")}>
          ⏳ Accounts Receivable (AR) Ageing
        </button>
      </div>

      {/* PIPELINE STICKER */}
      <div style={S.card}>
        <h3 style={S.title}>Automated Revenue Cycle Pipeline Flow (LIS → Accounting)</h3>
        <p style={S.subtitle}>Every test performed triggers automated double-entry postings under GST/TDS regulations.</p>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
          {FLOW_STEPS.map((step, idx) => {
            const isStepEnabled = featureFlags?.["accts_patient_billing"] !== false || idx !== 1;
            return (
              <div 
                key={idx} 
                style={{ 
                  ...S.flowStep(idx === flowIndex), 
                  ...(!isStepEnabled ? { opacity: 0.5, textDecoration: "line-through", cursor: "not-allowed" } : {}) 
                }} 
                onClick={() => isStepEnabled && setFlowIndex(idx)}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUB TAB 1: DAILY COLLECTION LOGS */}
      {subTab === "cc_logs" && (
        featureFlags?.["accts_cc_collection"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Collection Center Daily Logs entry is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.grid(3)}>
            <div style={{ ...S.card, gridColumn: "span 2" }}>
              <h3 style={S.title}>Daily Center Collections Register</h3>
              <p style={S.subtitle}>Recent daily collection journals uploaded by collection booths.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Center ID</th>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Patients</th>
                      <th style={S.th}>Tests</th>
                      <th style={S.th}>Net Collection</th>
                      <th style={S.th}>Pay Modes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ccLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ ...S.td, fontWeight: 700, color: "#059669" }}>{log.centerId}</td>
                        <td style={S.td}>{log.date}</td>
                        <td style={S.td}>{log.patients}</td>
                        <td style={S.td}>{log.tests}</td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{fmt(log.collected)}</td>
                        <td style={{ ...S.td, fontSize: 11, color: "#64748B" }}>{log.mode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={S.card}>
              <h3 style={S.title}>Log Collection Entry</h3>
              <p style={S.subtitle}>Submit daily register totals for reconciliation.</p>
              <form onSubmit={handleAddCcLog} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <div>
                  <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Collection Booth</label>
                  <select value={newLog.centerId} onChange={e => setNewLog(p => ({ ...p, centerId: e.target.value }))} style={S.inp}>
                    <option value="CC-COL-01">CC-COL-01 — Chennai T-Nagar</option>
                    <option value="CC-COL-02">CC-COL-02 — Bangalore Indiranagar</option>
                    <option value="CC-COL-03">CC-COL-03 — Hyderabad Jubilee Hills</option>
                    <option value="CC-COL-04">CC-COL-04 — Delhi Connaught Place</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Patients Count</label>
                    <input type="number" value={newLog.patients} onChange={e => setNewLog(p => ({ ...p, patients: e.target.value }))} style={S.inp} placeholder="85" required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Tests Collected</label>
                    <input type="number" value={newLog.tests} onChange={e => setNewLog(p => ({ ...p, tests: e.target.value }))} style={S.inp} placeholder="170" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Gross Billing (₹)</label>
                    <input type="number" value={newLog.amount} onChange={e => setNewLog(p => ({ ...p, amount: e.target.value }))} style={S.inp} placeholder="85000" required />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Discount (₹)</label>
                    <input type="number" value={newLog.discount} onChange={e => setNewLog(p => ({ ...p, discount: e.target.value }))} style={S.inp} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Net Cash/UPI Collected (₹)</label>
                  <input type="number" value={newLog.collected} onChange={e => setNewLog(p => ({ ...p, collected: e.target.value }))} style={S.inp} placeholder="80000" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Split Modes</label>
                  <input type="text" value={newLog.mode} onChange={e => setNewLog(p => ({ ...p, mode: e.target.value }))} style={S.inp} placeholder="e.g. Cash 20k + UPI 60k" />
                </div>
                <button type="submit" style={S.btn()}>File Collection Voucher</button>
              </form>
            </div>
          </div>
        )
      )}

      {/* SUB TAB 2: SETTLEMENTS */}
      {subTab === "settlement" && (
        featureFlags?.["accts_cc_settlement"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Collection Center Settlements calculation is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.card}>
            <h3 style={S.title}>Center Settlements & Franchise Commission Log</h3>
            <p style={S.subtitle}>Tracks franchise share distribution (e.g. 20% standard rate) and employee incentives.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Center Code</th>
                    <th style={S.th}>Settlement Period</th>
                    <th style={S.th}>Gross Collection</th>
                    <th style={S.th}>Franchise Share (20%)</th>
                    <th style={S.th}>Staff Incentives</th>
                    <th style={S.th}>Deposit Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map(set => (
                    <tr key={set.id}>
                      <td style={{ ...S.td, fontWeight: 700 }}>{set.centerId}</td>
                      <td style={S.td}>{set.period}</td>
                      <td style={S.td}>{fmt(set.grossCollected)}</td>
                      <td style={{ ...S.td, color: "#7E22CE", fontWeight: "bold" }}>{fmt(set.shareFranchise)}</td>
                      <td style={{ ...S.td, color: "#059669" }}>{fmt(set.incentives)}</td>
                      <td style={S.td}>
                        <span style={S.badge(set.depositStatus.includes("Transferred") ? "#ECFDF5" : "#FEF3C7", set.depositStatus.includes("Transferred") ? "#059669" : "#D97706")}>
                          {set.depositStatus}
                        </span>
                      </td>
                      <td style={S.td}>
                        {set.depositStatus !== "Transferred to HO" ? (
                          <button style={S.btn()} onClick={() => handleTriggerSettlement(set.id)}>
                            Reconcile & Clear
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>✓ Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* SUB TAB 3: CORPORATE CLIENTS */}
      {subTab === "corporate" && (
        featureFlags?.["accts_corporate_billing"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Hospital & Corporate Client Billing is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.card}>
            <h3 style={S.title}>Hospital & Corporate Client Billing Catalog</h3>
            <p style={S.subtitle}>Manage contract pricing, package billings, credit terms, and monthly billing cycles.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Hospital / Corporate Name</th>
                    <th style={S.th}>Tests (Current Month)</th>
                    <th style={S.th}>Contract Credit Period</th>
                    <th style={S.th}>Outstanding Balance</th>
                    <th style={S.th}>Contract Status</th>
                    <th style={S.th}>Dispatches</th>
                  </tr>
                </thead>
                <tbody>
                  {corporateClients.map(client => (
                    <tr key={client.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{client.name}</td>
                      <td style={S.td}>{client.testsMonth.toLocaleString()} tests</td>
                      <td style={S.td}>{client.creditPeriod}</td>
                      <td style={{ ...S.td, color: client.outstanding > 1000000 ? "#BE123C" : "#1E293B", fontWeight: "bold" }}>{fmt(client.outstanding)}</td>
                      <td style={S.td}>
                        <span style={S.badge(client.status === "Active" ? "#ECFDF5" : "#FEE2E2", client.status === "Active" ? "#059669" : "#EF4444")}>
                          {client.status}
                        </span>
                      </td>
                      <td style={S.td}>
                        <button style={S.btn("#4F46E5")} onClick={() => handleInvoiceClient(client.id)}>
                          Consolidated Invoice
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* SUB TAB 4: AR AGEING REPORT */}
      {subTab === "ageing" && (
        featureFlags?.["accts_receivables"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Accounts Receivable (AR) Ageing tracker is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.grid(2)}>
            {/* Patient Dues Ageing */}
            <div style={S.card}>
              <h3 style={S.title}>Patient Walk-In Dues Ageing (AR)</h3>
              <p style={S.subtitle}>Dues outstanding from walk-in and home collection panels.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                {[
                  { range: "0 - 30 Days (Current)", val: arAgeingData.patientDues["0-30"], color: "#059669", max: 1000000 },
                  { range: "31 - 60 Days (Warning)", val: arAgeingData.patientDues["31-60"], color: "#D97706", max: 1000000 },
                  { range: "61 - 90 Days (Overdue)", val: arAgeingData.patientDues["61-90"], color: "#EA580C", max: 1000000 },
                  { range: "90+ Days (Critical/Bad)", val: arAgeingData.patientDues["90+"], color: "#BE123C", max: 1000000 }
                ].map(item => (
                  <div key={item.range}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{item.range}</span>
                      <strong style={{ color: item.color }}>{fmt(item.val)}</strong>
                    </div>
                    <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(item.val / item.max) * 100}%`, height: "100%", background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corporate Clients Ageing */}
            <div style={S.card}>
              <h3 style={S.title}>Hospital & Corporate Accounts Ageing (AR)</h3>
              <p style={S.subtitle}>Consolidated outstanding credits billed to medical institutions.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                {[
                  { range: "0 - 30 Days (Current)", val: arAgeingData.corporateDues["0-30"], color: "#059669", max: 3000000 },
                  { range: "31 - 60 Days (Warning)", val: arAgeingData.corporateDues["31-60"], color: "#D97706", max: 3000000 },
                  { range: "61 - 90 Days (Overdue)", val: arAgeingData.corporateDues["61-90"], color: "#EA580C", max: 3000000 },
                  { range: "90+ Days (Critical/Bad)", val: arAgeingData.corporateDues["90+"], color: "#BE123C", max: 3000000 }
                ].map(item => (
                  <div key={item.range}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{item.range}</span>
                      <strong style={{ color: item.color }}>{fmt(item.val)}</strong>
                    </div>
                    <div style={{ height: 8, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(item.val / item.max) * 100}%`, height: "100%", background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
