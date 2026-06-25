// ProcurementAP.jsx
// MBL QMS Accounts — Vendor Accounts Payable, Expenses, Assets & Cost-Per-Test
// Tracks outbound cash flow, corporate asset depreciation, and reagent cost integrations.

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

export default function ProcurementAP({ onLogAudit }) {
  const [subTab, setSubTab] = useState("ap_vendors"); // "ap_vendors" | "expenses" | "assets" | "costpertest"

  // Vendor Payables
  const [payables, setPayables] = useState([
    { id: 1, vendor: "BioRad Diagnostic India Ltd", poNo: "PO/2026/089", invDate: "2026-06-18", amount: 485000, approval: "Approved", status: "Pending Bank Release" },
    { id: 2, vendor: "Roche Diagnostics Systems", poNo: "PO/2026/092", invDate: "2026-06-20", amount: 1250000, approval: "Approved", status: "Paid" },
    { id: 3, vendor: "Abbott Healthcare Pvt Ltd", poNo: "PO/2026/104", invDate: "2026-06-22", amount: 620000, approval: "Verification Pending", status: "Under Review" },
    { id: 4, vendor: "Sysmex India Pvt Ltd", poNo: "PO/2026/108", invDate: "2026-06-23", amount: 180000, approval: "Approved", status: "Pending Bank Release" }
  ]);

  // Expenses claims
  const [expenses, setExpenses] = useState([
    { id: 1, dept: "Quality", category: "Internal Audit Audit expenses", amount: 15000, date: "2026-06-15", desc: "Consultant fee for pre-assessment audit", approval: "Approved & Paid" },
    { id: 2, dept: "Biomedical", category: "Equipment AMC / Calibration", amount: 85000, date: "2026-06-18", desc: "Cobas e411 semi-annual calibration service", approval: "Approved & Paid" },
    { id: 3, dept: "HR & Training", category: "Employee training programs", amount: 12000, date: "2026-06-20", desc: "NABL assessor workshop registration", approval: "Pending Approval" },
    { id: 4, dept: "IT & Server", category: "Cloud hosting & SaaS license", amount: 45000, date: "2026-06-22", desc: "Monthly Azure cloud server and database backups", approval: "Pending Approval" }
  ]);

  const [newExpense, setNewExpense] = useState({ dept: "Quality", category: "", amount: "", desc: "" });

  // Fixed Assets
  const [assets, setAssets] = useState([
    { id: "AST-EQ-01", name: "Roche Cobas c6000 ISE Analyzer", pValue: 8500000, pDate: "2024-04-12", depRate: 15, accDep: 2362500, netBook: 6137500 },
    { id: "AST-EQ-02", name: "Sysmex XN-1000 Hematology System", pValue: 3500000, pDate: "2024-06-20", depRate: 15, accDep: 938437, netBook: 2561563 },
    { id: "AST-IT-01", name: "Central LIMS Server cluster (Dell)", pValue: 1200000, pDate: "2025-01-10", depRate: 40, accDep: 480000, netBook: 720000 },
    { id: "AST-VH-01", name: "Sample Cold Chain Transport Van", pValue: 900000, pDate: "2023-08-15", depRate: 15, accDep: 341850, netBook: 558150 }
  ]);

  // Inventory Integration Cost per Test
  const costPerTestList = [
    { code: "MBL-0005", test: "ACTH (Hormone)", reagentCost: 45.0, consumables: 12.0, laborUtility: 15.0, totalCost: 72.0, price: 500.0, margin: 428.0, marginPct: 85.6 },
    { code: "MBL-0006", test: "Ammonia", reagentCost: 28.0, consumables: 8.0, laborUtility: 12.0, totalCost: 48.0, price: 350.0, margin: 302.0, marginPct: 86.3 },
    { code: "MBL-0007", test: "PTH Intact", reagentCost: 65.0, consumables: 15.0, laborUtility: 18.0, totalCost: 98.0, price: 650.0, margin: 552.0, marginPct: 84.9 },
    { code: "MBL-0009", test: "Hs-Troponin T", reagentCost: 110.0, consumables: 20.0, laborUtility: 25.0, totalCost: 155.0, price: 950.0, margin: 795.0, marginPct: 83.7 },
    { code: "MBL-0010", test: "Lactate", reagentCost: 15.0, consumables: 5.0, laborUtility: 10.0, totalCost: 30.0, price: 180.0, margin: 150.0, marginPct: 83.3 }
  ];

  const handleLogExpense = (e) => {
    e.preventDefault();
    if (!newExpense.category || !newExpense.amount) return;
    const item = {
      id: Date.now(),
      dept: newExpense.dept,
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString().split("T")[0],
      desc: newExpense.desc,
      approval: "Pending Approval"
    };
    setExpenses(p => [item, ...p]);
    onLogAudit("EXPENSE_CLAIM", `Filed departmental expense claim for ${item.dept} under category '${item.category}': ₹${item.amount.toLocaleString()}`);
    setNewExpense({ dept: "Quality", category: "", amount: "", desc: "" });
    alert("Expense voucher registered and dispatched to department head approval workflow queue.");
  };

  const handlePayVendor = (id) => {
    setPayables(p => p.map(x => x.id === id ? { ...x, status: "Paid" } : x));
    const item = payables.find(x => x.id === id);
    if (item) {
      onLogAudit("VENDOR_PAYMENT", `Authorized bank payment release to vendor '${item.vendor}' for PO ${item.poNo}: ₹${item.amount.toLocaleString()}`);
      alert(`Payment release of ₹${item.amount.toLocaleString()} initiated via corporate bank node. Transaction ID posted to ledger.`);
    }
  };

  const fmt = (v) => "₹" + v.toLocaleString("en-IN");

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={S.btn(subTab === "ap_vendors" ? "#059669" : "#E2E8F0", subTab === "ap_vendors" ? "#FFF" : "#475569")} onClick={() => setSubTab("ap_vendors")}>
          🛒 Accounts Payable (AP) & Vendors
        </button>
        <button style={S.btn(subTab === "expenses" ? "#059669" : "#E2E8F0", subTab === "expenses" ? "#FFF" : "#475569")} onClick={() => setSubTab("expenses")}>
          💸 Departmental Expense Management
        </button>
        <button style={S.btn(subTab === "assets" ? "#059669" : "#E2E8F0", subTab === "assets" ? "#FFF" : "#475569")} onClick={() => setSubTab("assets")}>
          ⚙️ Fixed Asset Depreciation Logs
        </button>
        <button style={S.btn(subTab === "costpertest" ? "#059669" : "#E2E8F0", subTab === "costpertest" ? "#FFF" : "#475569")} onClick={() => setSubTab("costpertest")}>
          🧪 Reagent Cost-Per-Test Valuation
        </button>
      </div>

      {/* SUB TAB 1: VENDOR PAYABLES */}
      {subTab === "ap_vendors" && (
        <div style={S.card}>
          <h3 style={S.title}>Vendor Accounts Payable (AP) ledger</h3>
          <p style={S.subtitle}>Manage reagent supplier invoices, purchase orders, and payout scheduling.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Vendor Name</th>
                  <th style={S.th}>PO Reference</th>
                  <th style={S.th}>Invoice Date</th>
                  <th style={S.th}>Net Invoice Amount</th>
                  <th style={S.th}>Audit Approval</th>
                  <th style={S.th}>Payment Release</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {payables.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight: 600 }}>{p.vendor}</td>
                    <td style={S.td}>{p.poNo}</td>
                    <td style={S.td}>{p.invDate}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{fmt(p.amount)}</td>
                    <td style={S.td}>
                      <span style={S.badge(p.approval === "Approved" ? "#ECFDF5" : "#FEF3C7", p.approval === "Approved" ? "#059669" : "#D97706")}>
                        {p.approval}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={S.badge(p.status === "Paid" ? "#ECFDF5" : p.status === "Under Review" ? "#FFF1F2" : "#E0F2FE", p.status === "Paid" ? "#059669" : p.status === "Under Review" ? "#BE123C" : "#0369A1")}>
                        {p.status}
                      </span>
                    </td>
                    <td style={S.td}>
                      {p.status === "Pending Bank Release" ? (
                        <button style={S.btn()} onClick={() => handlePayVendor(p.id)}>
                          Approve & Pay (RTGS)
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>✓ Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 2: EXPENSES */}
      {subTab === "expenses" && (
        <div style={S.grid(3)}>
          <div style={{ ...S.card, gridColumn: "span 2" }}>
            <h3 style={S.title}>Departmental Expense claims</h3>
            <p style={S.subtitle}>Recent operational expense claims submitted across departments.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Department</th>
                    <th style={S.th}>Expense Category</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Amount</th>
                    <th style={S.th}>Description</th>
                    <th style={S.th}>Approval Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{exp.dept}</td>
                      <td style={S.td}>{exp.category}</td>
                      <td style={S.td}>{exp.date}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{fmt(exp.amount)}</td>
                      <td style={{ ...S.td, fontSize: 11, color: "#64748B" }}>{exp.desc}</td>
                      <td style={S.td}>
                        <span style={S.badge(exp.approval.includes("Paid") ? "#ECFDF5" : "#FEF3C7", exp.approval.includes("Paid") ? "#059669" : "#D97706")}>
                          {exp.approval}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={S.card}>
            <h3 style={S.title}>File Expense Voucher</h3>
            <p style={S.subtitle}>Log cross-departmental petty cash or invoice expenditures.</p>
            <form onSubmit={handleLogExpense} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Claimant Department</label>
                <select value={newExpense.dept} onChange={e => setNewExpense(p => ({ ...p, dept: e.target.value }))} style={S.inp}>
                  <option value="Quality">Quality Assurance (Audit Expenses)</option>
                  <option value="Biomedical">Biomedical Engineering (AMC/Parts)</option>
                  <option value="HR & Training">HR & Personnel (Workshops/roster)</option>
                  <option value="IT & Server">IT Department (Licenses/cloud)</option>
                  <option value="Logistics">Logistics (Van Fuel/refrigeration)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Expense Category / Account</label>
                <input type="text" value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))} style={S.inp} placeholder="e.g. Bleach stock, SOP print folders" required />
              </div>
              <div>
                <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Amount Billed (₹)</label>
                <input type="number" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} style={S.inp} placeholder="₹" required />
              </div>
              <div>
                <label style={{ fontSize: 11, display: "block", marginBottom: 3, fontWeight: 600 }}>Description & Invoices refs</label>
                <textarea value={newExpense.desc} onChange={e => setNewExpense(p => ({ ...p, desc: e.target.value }))} style={{ ...S.inp, minHeight: 60, fontFamily: "inherit" }} placeholder="Provide purchase details and reference receipt numbers..." />
              </div>
              <button type="submit" style={S.btn()}>File Expense claim</button>
            </form>
          </div>
        </div>
      )}

      {/* SUB TAB 3: FIXED ASSETS */}
      {subTab === "assets" && (
        <div style={S.card}>
          <h3 style={S.title}>Laboratory Fixed Assets & Depreciation Registry</h3>
          <p style={S.subtitle}>Tracks corporate equipment value using Indian WDV (Written Down Value) depreciation schedules.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Asset ID</th>
                  <th style={S.th}>Asset Name</th>
                  <th style={S.th}>Purchase Date</th>
                  <th style={S.th}>Capital Value</th>
                  <th style={S.th}>Depreciation Rate</th>
                  <th style={S.th}>Accumulated Dep.</th>
                  <th style={S.th}>Net Book Value</th>
                  <th style={S.th}>AMC Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => (
                  <tr key={asset.id}>
                    <td style={{ ...S.td, fontWeight: 700, color: "#4F46E5" }}>{asset.id}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{asset.name}</td>
                    <td style={S.td}>{asset.pDate}</td>
                    <td style={S.td}>{fmt(asset.pValue)}</td>
                    <td style={S.td}>{asset.depRate}% WDV</td>
                    <td style={{ ...S.td, color: "#BE123C" }}>{fmt(asset.accDep)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: "#059669" }}>{fmt(asset.netBook)}</td>
                    <td style={S.td}>
                      <span style={S.badge("#ECFDF5", "#059669")}>Active Coverage</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 4: COST PER TEST */}
      {subTab === "costpertest" && (
        <div style={S.card}>
          <h3 style={S.title}>Laboratory Reagent Cost-Per-Test & Margin analysis</h3>
          <p style={S.subtitle}>Financial integration with inventory stock to analyze direct analyte margins.</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Test Code</th>
                  <th style={S.th}>Analyte Name</th>
                  <th style={S.th}>Reagent Cost</th>
                  <th style={S.th}>Consumables</th>
                  <th style={S.th}>Labor & Utility</th>
                  <th style={S.th}>Total Production Cost</th>
                  <th style={S.th}>Walk-In selling Price</th>
                  <th style={S.th}>Net Margin / Test</th>
                  <th style={S.th}>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {costPerTestList.map(c => (
                  <tr key={c.code}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{c.code}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{c.test}</td>
                    <td style={S.td}>{fmt(c.reagentCost)}</td>
                    <td style={S.td}>{fmt(c.consumables)}</td>
                    <td style={S.td}>{fmt(c.laborUtility)}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: "#475569" }}>{fmt(c.totalCost)}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{fmt(c.price)}</td>
                    <td style={{ ...S.td, color: "#059669", fontWeight: "bold" }}>{fmt(c.margin)}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, color: "#059669" }}>{c.marginPct}%</span>
                        <div style={{ width: 50, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${c.marginPct}%`, height: "100%", background: "#059669" }} />
                        </div>
                      </div>
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
