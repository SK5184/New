// FinancialPlanning.jsx
// MBL QMS Accounts — Corporate Planning, Budgets, Cost Centers & COA
// Compliant with Pvt Ltd Company financial standards.

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
  treeNode: { padding: "8px 12px", borderBottom: "1px dashed #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }
};

export default function FinancialPlanning({ onLogAudit, featureFlags }) {
  const [subTab, setSubTab] = useState("budget"); // "budget" | "costcenters" | "coa"

  // Budget states
  const [budgetItems, setBudgetItems] = useState([
    { id: 1, category: "Revenue Target", target: 500000000, actual: 485000000, type: "Revenue" },
    { id: 2, category: "Processing Center Cost", target: 150000000, actual: 148000000, type: "Expense" },
    { id: 3, category: "Manpower (Salaries)", target: 120000000, actual: 122500000, type: "Expense" },
    { id: 4, category: "CAPEX (Laboratory Equipment)", target: 80000000, actual: 75000000, type: "CAPEX" },
    { id: 5, category: "Marketing & Camps", target: 30000000, actual: 29500000, type: "Expense" },
    { id: 6, category: "IT (LIMS, Cloud & Software)", target: 10000000, actual: 9800000, type: "Expense" }
  ]);

  const [newBudget, setNewBudget] = useState({ category: "", target: "", type: "Expense" });

  // Cost Centers states
  const [costCenters, setCostCenters] = useState([
    { code: "CC-HO", name: "Head Office (Corporate Finance)", type: "Admin", revenue: 0, expenses: 4500000, tests: 0 },
    { code: "CC-PC-CHE", name: "Chennai Processing Center", type: "Processing Center", revenue: 18500000, expenses: 6200000, tests: 125000 },
    { code: "CC-PC-BLR", name: "Bangalore Processing Center", type: "Processing Center", revenue: 15000000, expenses: 5400000, tests: 98000 },
    { code: "CC-PC-HYD", name: "Hyderabad Processing Center", type: "Processing Center", revenue: 12000000, expenses: 4800000, tests: 75000 },
    { code: "CC-COL-01", name: "Chennai T-Nagar CC", type: "Collection Center", revenue: 1850000, expenses: 450000, tests: 12200 },
    { code: "CC-COL-02", name: "Bangalore Indiranagar CC", type: "Collection Center", revenue: 1450000, expenses: 390000, tests: 9500 }
  ]);

  const [newCC, setNewCC] = useState({ code: "", name: "", type: "Collection Center" });

  // Chart of Accounts Tree (Interactive toggle)
  const [expandedCoa, setExpandedCoa] = useState({ assets: true, liabilities: false, income: false, expenses: false });

  const handleAddBudget = (e) => {
    e.preventDefault();
    if (!newBudget.category || !newBudget.target) return;
    const item = {
      id: Date.now(),
      category: newBudget.category,
      target: parseFloat(newBudget.target),
      actual: 0,
      type: newBudget.type
    };
    setBudgetItems(p => [...p, item]);
    onLogAudit("BUDGET", `Added budget target for '${item.category}' of ₹${item.target.toLocaleString()}`);
    setNewBudget({ category: "", target: "", type: "Expense" });
  };

  const handleAddCC = (e) => {
    e.preventDefault();
    if (!newCC.code || !newCC.name) return;
    const item = {
      ...newCC,
      revenue: 0,
      expenses: 0,
      tests: 0
    };
    setCostCenters(p => [...p, item]);
    onLogAudit("COST_CENTER", `Registered cost center: ${item.code} — ${item.name}`);
    setNewCC({ code: "", name: "", type: "Collection Center" });
  };

  const fmt = (v) => "₹" + v.toLocaleString("en-IN");

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={S.btn(subTab === "budget" ? "#059669" : "#E2E8F0", subTab === "budget" ? "#FFF" : "#475569")} onClick={() => setSubTab("budget")}>
          📅 Annual Corporate Budgeting
        </button>
        <button style={S.btn(subTab === "costcenters" ? "#059669" : "#E2E8F0", subTab === "costcenters" ? "#FFF" : "#475569")} onClick={() => setSubTab("costcenters")}>
          🏢 Cost Center Management
        </button>
        <button style={S.btn(subTab === "coa" ? "#059669" : "#E2E8F0", subTab === "coa" ? "#FFF" : "#475569")} onClick={() => setSubTab("coa")}>
          🗂️ Chart of Accounts (COA) Tree
        </button>
      </div>

      {/* SUB TAB 1: BUDGETING */}
      {subTab === "budget" && (
        featureFlags?.["accts_budgeting"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Annual Corporate Budgeting is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.grid(3)}>
            <div style={{ ...S.card, gridColumn: "span 2" }}>
              <h3 style={S.title}>FY 2026-27 Corporate Budget & Actual Variance</h3>
              <p style={S.subtitle}>Track targeted budget envelopes versus actual expenditures across centers.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Category</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Target Budget</th>
                      <th style={S.th}>Actual Spend</th>
                      <th style={S.th}>Variance</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetItems.map(item => {
                      const variance = item.target - item.actual;
                      const pct = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                      const isOver = item.type !== "Revenue" && pct > 100;
                      return (
                        <tr key={item.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{item.category}</td>
                          <td style={S.td}>
                            <span style={S.badge(item.type === "Revenue" ? "#ECFDF5" : item.type === "CAPEX" ? "#EEF2FF" : "#FFF1F2", item.type === "Revenue" ? "#059669" : item.type === "CAPEX" ? "#4F46E5" : "#BE123C")}>
                              {item.type}
                            </span>
                          </td>
                          <td style={S.td}>{fmt(item.target)}</td>
                          <td style={S.td}>{fmt(item.actual)}</td>
                          <td style={{ ...S.td, color: variance >= 0 ? "#059669" : "#BE123C", fontWeight: "bold" }}>
                            {variance >= 0 ? "+" : ""}{fmt(variance)} ({pct.toFixed(1)}%)
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(isOver ? "#FEE2E2" : "#ECFDF5", isOver ? "#EF4444" : "#059669")}>
                              {isOver ? "Exceeded" : "On Track"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={S.card}>
              <h3 style={S.title}>Add New Budget target</h3>
              <p style={S.subtitle}>Configure a new corporate target segment.</p>
              <form onSubmit={handleAddBudget} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Budget Category</label>
                  <input type="text" value={newBudget.category} onChange={e => setNewBudget(p => ({ ...p, category: e.target.value }))} style={S.inp} placeholder="e.g. Marketing, Manpower, Utility" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Budget Target Amount (INR)</label>
                  <input type="number" value={newBudget.target} onChange={e => setNewBudget(p => ({ ...p, target: e.target.value }))} style={S.inp} placeholder="₹" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Budget Class</label>
                  <select value={newBudget.type} onChange={e => setNewBudget(p => ({ ...p, type: e.target.value }))} style={S.inp}>
                    <option value="Expense">Operational Expense (OPEX)</option>
                    <option value="CAPEX">Equipment/Asset Cost (CAPEX)</option>
                    <option value="Revenue">Revenue Target</option>
                  </select>
                </div>
                <button type="submit" style={S.btn()}>Set Budget Limit</button>
              </form>
            </div>
          </div>
        )
      )}

      {/* SUB TAB 2: COST CENTERS */}
      {subTab === "costcenters" && (
        featureFlags?.["accts_cost_centers"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Branch Cost Center Management is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.grid(3)}>
            <div style={{ ...S.card, gridColumn: "span 2" }}>
              <h3 style={S.title}>Branch Cost Centers Profitability Tracker</h3>
              <p style={S.subtitle}>Centralized oversight on diagnostic centers & lab collection offices.</p>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Center Code</th>
                      <th style={S.th}>Name</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Test Volume</th>
                      <th style={S.th}>Center Revenue</th>
                      <th style={S.th}>Expenses</th>
                      <th style={S.th}>Margin / Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costCenters.map(cc => {
                      const margin = cc.revenue - cc.expenses;
                      return (
                        <tr key={cc.code}>
                          <td style={{ ...S.td, fontWeight: 700, color: "#059669" }}>{cc.code}</td>
                          <td style={S.td}>{cc.name}</td>
                          <td style={S.td}>
                            <span style={S.badge(cc.type === "Processing Center" ? "#E0F2FE" : cc.type === "Admin" ? "#F1F5F9" : "#F3E8FF", cc.type === "Processing Center" ? "#0369A1" : cc.type === "Admin" ? "#475569" : "#7E22CE")}>
                              {cc.type}
                            </span>
                          </td>
                          <td style={S.td}>{cc.tests.toLocaleString()} tests</td>
                          <td style={S.td}>{fmt(cc.revenue)}</td>
                          <td style={S.td}>{fmt(cc.expenses)}</td>
                          <td style={{ ...S.td, color: margin >= 0 ? "#059669" : "#BE123C", fontWeight: "bold" }}>
                            {fmt(margin)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={S.card}>
              <h3 style={S.title}>Register Cost Center</h3>
              <p style={S.subtitle}>Define Chennai/Bangalore cost center maps.</p>
              <form onSubmit={handleAddCC} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Center Code</label>
                  <input type="text" value={newCC.code} onChange={e => setNewCC(p => ({ ...p, code: e.target.value.toUpperCase() }))} style={S.inp} placeholder="e.g. CC-PC-MUM" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Center Name</label>
                  <input type="text" value={newCC.name} onChange={e => setNewCC(p => ({ ...p, name: e.target.value }))} style={S.inp} placeholder="e.g. Mumbai Processing Center" required />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 }}>Center Type</label>
                  <select value={newCC.type} onChange={e => setNewCC(p => ({ ...p, type: e.target.value }))} style={S.inp}>
                    <option value="Processing Center">Processing Center (Lab Facility)</option>
                    <option value="Collection Center">Collection Center (Phleb Booth)</option>
                    <option value="Admin">Head Office Department</option>
                  </select>
                </div>
                <button type="submit" style={S.btn()}>Initialize Cost Center</button>
              </form>
            </div>
          </div>
        )
      )}

      {/* SUB TAB 3: CHART OF ACCOUNTS */}
      {subTab === "coa" && (
        featureFlags?.["accts_chart_of_accounts"] === false ? (
          <div style={S.card}>
            <h3 style={S.title}>🔒 Feature Disabled</h3>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Chart of Accounts (COA) Directory Tree is currently disabled in the ERP Admin Master Control.
            </p>
          </div>
        ) : (
          <div style={S.card}>
            <h3 style={S.title}>Chart of Accounts (COA) Directory Registry</h3>
            <p style={S.subtitle}>Indian Private Limited corporate ledger map. Expand nodes to view ledger codes.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
              {/* ASSETS */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedCoa(p => ({ ...p, assets: !p.assets }))} style={{ background: "#F8FAFC", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13, borderBottom: expandedCoa.assets ? "1.5px solid #E2E8F0" : "none" }}>
                  <span>💰 1000 — ASSETS</span>
                  <span>{expandedCoa.assets ? "▼" : "▶"}</span>
                </div>
                {expandedCoa.assets && (
                  <div>
                    <div style={S.treeNode}>
                      <span>1100 - Cash & Bank balances</span>
                      <strong>₹8,45,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>1200 - Laboratory Equipment Assets</span>
                      <strong>₹14,50,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>1300 - Reagents & Consumables Inventory</span>
                      <strong>₹1,25,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>1400 - Patient & Client Receivables</span>
                      <strong>₹2,84,00,000</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* LIABILITIES */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedCoa(p => ({ ...p, liabilities: !p.liabilities }))} style={{ background: "#F8FAFC", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13, borderBottom: expandedCoa.liabilities ? "1.5px solid #E2E8F0" : "none" }}>
                  <span>🤝 2000 — LIABILITIES</span>
                  <span>{expandedCoa.liabilities ? "▼" : "▶"}</span>
                </div>
                {expandedCoa.liabilities && (
                  <div>
                    <div style={S.treeNode}>
                      <span>2100 - Vendor Payables (Reagents & Supply)</span>
                      <strong>₹1,82,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>2200 - Bank Loans & CAPEX Credits</span>
                      <strong>₹4,50,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>2300 - Accrued Salary & Expenses Payable</span>
                      <strong>₹95,00,000</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* INCOME */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedCoa(p => ({ ...p, income: !p.income }))} style={{ background: "#F8FAFC", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13, borderBottom: expandedCoa.income ? "1.5px solid #E2E8F0" : "none" }}>
                  <span>📈 3000 — INCOME</span>
                  <span>{expandedCoa.income ? "▼" : "▶"}</span>
                </div>
                {expandedCoa.income && (
                  <div>
                    <div style={S.treeNode}>
                      <span>3100 - Patient Walk-In Testing Revenue</span>
                      <strong>₹15,42,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>3200 - Hospital Billing Contracts</span>
                      <strong>₹18,20,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>3300 - Collection Center franchise revenue</span>
                      <strong>₹12,38,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>3400 - Corporate Health Check Contracts</span>
                      <strong>₹4,00,00,000</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* EXPENSES */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={() => setExpandedCoa(p => ({ ...p, expenses: !p.expenses }))} style={{ background: "#F8FAFC", padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13, borderBottom: expandedCoa.expenses ? "1.5px solid #E2E8F0" : "none" }}>
                  <span>📉 4000 — EXPENSES</span>
                  <span>{expandedCoa.expenses ? "▼" : "▶"}</span>
                </div>
                {expandedCoa.expenses && (
                  <div>
                    <div style={S.treeNode}>
                      <span>4100 - Reagents Consumed Ledger</span>
                      <strong>₹12,48,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>4200 - Employee Salary Expenses</span>
                      <strong>₹12,25,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>4300 - Rent & Utility Bills (Electricity)</span>
                      <strong>₹3,50,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>4400 - Cold Chain Transport & logistics</span>
                      <strong>₹1,80,00,000</strong>
                    </div>
                    <div style={S.treeNode}>
                      <span>4500 - Software licenses & IT maintenance</span>
                      <strong>₹98,00,000</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
