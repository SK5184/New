// ReportsAudits.jsx
// MBL QMS Accounts — Financial Reports (P&L, Balance Sheet), Approvals Cockpit & Audit Trail logs

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
  badge: (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: color })
};

export default function ReportsAudits({ auditLogs, onLogAudit }) {
  const [subTab, setSubTab] = useState("pl"); // "pl" | "balancesheet" | "approvals" | "audittrail"

  // Mock Profit & Loss
  const plData = {
    revenue: [
      { name: "Laboratory Testing Revenue", ytd: 154200000 },
      { name: "Corporate & Hospital Contracts", ytd: 182000000 },
      { name: "Collection Center Franchises", ytd: 123800000 },
      { name: "Home Collection Surcharges", ytd: 40000000 }
    ],
    expenses: [
      { name: "Direct Reagents & Lab Consumables", ytd: 124800000 },
      { name: "Employee Salaries & Incentives", ytd: 122500000 },
      { name: "Rent, Electricity & Branch Utilities", ytd: 35000000 },
      { name: "Transport Cold Chain logistics", ytd: 18000000 },
      { name: "IT, Cloud Infrastructure & SOP Systems", ytd: 9800000 }
    ]
  };

  const totalRevenue = plData.revenue.reduce((sum, item) => sum + item.ytd, 0);
  const totalExpenses = plData.expenses.reduce((sum, item) => sum + item.ytd, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Mock Balance Sheet
  const balanceSheet = {
    assets: [
      { name: "Fixed Assets (Laboratory Analyzers)", val: 145000000 },
      { name: "Cash & Operating Bank balances", val: 84500000 },
      { name: "Reagents Inventory Stocks", val: 12500000 },
      { name: "Trade Receivables Outstanding (AR)", val: 28400000 }
    ],
    liabilities: [
      { name: "Share Capital & Reserves", val: 200000000 },
      { name: "SBI Equipment Loans", val: 45000000 },
      { name: "Trade Payables (Vendors AP)", val: 18200000 },
      { name: "Accrued Expenses & Salaries Payable", val: 7200000 }
    ]
  };

  const totalAssets = balanceSheet.assets.reduce((sum, item) => sum + item.val, 0);
  const totalLiabilities = balanceSheet.liabilities.reduce((sum, item) => sum + item.val, 0);

  // Expense Approval Queue
  const [approvalQueue, setApprovalQueue] = useState([
    { id: 1, reqNo: "REQ-089", requester: "Dr. A. K. Sharma (Biochemistry)", desc: "Replacement Laser Tube for Sysmex XN-1000", amount: 155000, stage: "Pending Finance Director Sign-Off" },
    { id: 2, reqNo: "REQ-094", requester: "S. Murugan (IT Dept)", desc: "AWS Reserved Instance Database hosting license renewal (1 Year)", amount: 350000, stage: "Pending Finance Director Sign-Off" },
    { id: 3, reqNo: "REQ-098", requester: "R. Jayashree (Quality)", desc: "NABL Pre-Assessment External Consultant Audit Audit fee", amount: 45000, stage: "Approved by Finance HOD" }
  ]);

  const handleApproveClaim = (id) => {
    const item = approvalQueue.find(q => q.id === id);
    if (item) {
      onLogAudit("APPROVAL", `Approved high-value expense request ${item.reqNo} for '${item.desc}' of ₹${item.amount.toLocaleString()}`);
      setApprovalQueue(p => p.filter(q => q.id !== id));
      alert(`Request ${item.reqNo} has been approved. Postings sent to Accounts Payable registry.`);
    }
  };

  const handleRejectClaim = (id) => {
    const item = approvalQueue.find(q => q.id === id);
    if (item) {
      onLogAudit("APPROVAL", `Rejected high-value expense request ${item.reqNo} for '${item.desc}'`);
      setApprovalQueue(p => p.filter(q => q.id !== id));
      alert(`Request ${item.reqNo} has been rejected and returned to requester.`);
    }
  };

  const fmt = (v) => "₹" + v.toLocaleString("en-IN");

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={S.btn(subTab === "pl" ? "#059669" : "#E2E8F0", subTab === "pl" ? "#FFF" : "#475569")} onClick={() => setSubTab("pl")}>
          📊 Profit & Loss Statement
        </button>
        <button style={S.btn(subTab === "balancesheet" ? "#059669" : "#E2E8F0", subTab === "balancesheet" ? "#FFF" : "#475569")} onClick={() => setSubTab("balancesheet")}>
          🏛️ Corporate Balance Sheet
        </button>
        <button style={S.btn(subTab === "approvals" ? "#059669" : "#E2E8F0", subTab === "approvals" ? "#FFF" : "#475569")} onClick={() => setSubTab("approvals")}>
          ✍️ Multi-Level Expense Approvals
        </button>
        <button style={S.btn(subTab === "audittrail" ? "#059669" : "#E2E8F0", subTab === "audittrail" ? "#FFF" : "#475569")} onClick={() => setSubTab("audittrail")}>
          📜 Accounts Audit Trail logs
        </button>
      </div>

      {/* SUB TAB 1: PROFIT & LOSS */}
      {subTab === "pl" && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={S.title}>Profit & Loss Statement (YTD FY 2026-27)</h3>
            <button style={S.btn("#4F46E5")} onClick={() => window.print()}>🖨️ Export PDF / Print Statement</button>
          </div>
          <p style={S.subtitle}>Laboratory consolidated operating revenue and expenses ledger.</p>

          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Particulars</th>
                <th style={S.th} style={{ ...S.th, textAlign: "right" }}>YTD Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              {/* Income */}
              <tr style={{ background: "#F8FAFC" }}>
                <td style={{ ...S.td, fontWeight: "bold" }}>A. INCOME / REVENUE</td>
                <td style={S.td}></td>
              </tr>
              {plData.revenue.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, paddingLeft: 24 }}>{r.name}</td>
                  <td style={{ ...S.td, textAlign: "right" }}>{fmt(r.ytd)}</td>
                </tr>
              ))}
              <tr style={{ background: "#ECFDF5", fontWeight: "bold" }}>
                <td style={{ ...S.td, paddingLeft: 12 }}>Gross Consolidated Revenue (A)</td>
                <td style={{ ...S.td, textAlign: "right" }}>{fmt(totalRevenue)}</td>
              </tr>

              {/* Expenses */}
              <tr style={{ background: "#F8FAFC" }}>
                <td style={{ ...S.td, fontWeight: "bold" }}>B. OPERATING EXPENSES</td>
                <td style={S.td}></td>
              </tr>
              {plData.expenses.map((e, i) => (
                <tr key={i}>
                  <td style={{ ...S.td, paddingLeft: 24 }}>{e.name}</td>
                  <td style={{ ...S.td, textAlign: "right", color: "#BE123C" }}>{fmt(e.ytd)}</td>
                </tr>
              ))}
              <tr style={{ background: "#FFF1F2", fontWeight: "bold" }}>
                <td style={{ ...S.td, paddingLeft: 12 }}>Total Operating Expenditures (B)</td>
                <td style={{ ...S.td, textAlign: "right", color: "#BE123C" }}>{fmt(totalExpenses)}</td>
              </tr>

              {/* Profit */}
              <tr style={{ background: "#E1F5EE", fontWeight: "bold", fontSize: 14 }}>
                <td style={{ ...S.td, color: "#047857" }}>NET OPERATING PROFIT (A - B)</td>
                <td style={{ ...S.td, textAlign: "right", color: "#047857" }}>{fmt(netProfit)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* SUB TAB 2: BALANCE SHEET */}
      {subTab === "balancesheet" && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={S.title}>Consolidated Balance Sheet</h3>
            <button style={S.btn("#4F46E5")} onClick={() => window.print()}>🖨️ Print Balance Sheet</button>
          </div>
          <p style={S.subtitle}>Consolidated corporate assets and liabilities statements.</p>

          <div style={S.grid(2)}>
            {/* Liabilities */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 8 }}>CAPITAL & LIABILITIES</h4>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Particulars</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.liabilities.map((l, i) => (
                    <tr key={i}>
                      <td style={S.td}>{l.name}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{fmt(l.val)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#F8FAFC", fontWeight: "bold" }}>
                    <td style={S.td}>Total Capital & Liabilities</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{fmt(totalLiabilities)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Assets */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 8 }}>ASSETS</h4>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Particulars</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceSheet.assets.map((a, i) => (
                    <tr key={i}>
                      <td style={S.td}>{a.name}</td>
                      <td style={{ ...S.td, textAlign: "right" }}>{fmt(a.val)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#F8FAFC", fontWeight: "bold" }}>
                    <td style={S.td}>Total Corporate Assets</td>
                    <td style={{ ...S.td, textAlign: "right" }}>{fmt(totalAssets)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: APPROVALS */}
      {subTab === "approvals" && (
        <div style={S.card}>
          <h3 style={S.title}>Expense & Indent Approval Cockpit</h3>
          <p style={S.subtitle}>Authorize high-value procurement requests (Employee → HOD → Finance → Director).</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Req No</th>
                  <th style={S.th}>Requester</th>
                  <th style={S.th}>Item Details</th>
                  <th style={S.th}>Request Amount</th>
                  <th style={S.th}>Stage</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvalQueue.map(q => (
                  <tr key={q.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{q.reqNo}</td>
                    <td style={S.td}>{q.requester}</td>
                    <td style={S.td}>{q.desc}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmt(q.amount)}</td>
                    <td style={S.td}>
                      <span style={S.badge("#E0F2FE", "#0369A1")}>{q.stage}</span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button style={S.btn()} onClick={() => handleApproveClaim(q.id)}>
                          Approve Release
                        </button>
                        <button style={S.btn("#BE123C")} onClick={() => handleRejectClaim(q.id)}>
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {approvalQueue.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748B" }}>
                      ✓ All pending expense vouchers resolved. Approval queue is clear.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 4: AUDIT TRAILS */}
      {subTab === "audittrail" && (
        <div style={S.card}>
          <h3 style={S.title}>Financial Audit Trail Log (Real-time Operations)</h3>
          <p style={S.subtitle}>Audit logs of ledger changes, billing creations, tax filings and expense approvals.</p>
          <div style={{ overflowY: "auto", maxHeight: 350, border: "1px solid #CBD5E1", borderRadius: 8 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Operation Class</th>
                  <th style={S.th}>Action Details</th>
                  <th style={S.th}>Timestamp</th>
                  <th style={S.th}>Operator User</th>
                  <th style={S.th}>Audit Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? "#F8FAFC" : "#fff" }}>
                    <td style={S.td}>
                      <span style={S.badge(log.class === "BUDGET" ? "#E0F2FE" : log.class === "APPROVAL" ? "#F3E8FF" : "#ECFDF5", log.class === "BUDGET" ? "#0369A1" : log.class === "APPROVAL" ? "#7E22CE" : "#059669")}>
                        {log.class}
                      </span>
                    </td>
                    <td style={{ ...S.td, fontSize: 12, fontWeight: 500 }}>{log.desc}</td>
                    <td style={{ ...S.td, fontSize: 11, color: "#64748B" }}>{log.time}</td>
                    <td style={S.td}>{log.user}</td>
                    <td style={S.td}>
                      <span style={S.badge("#ECFDF5", "#059669")}>Verified Integrity</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
