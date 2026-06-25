// TaxCompliance.jsx
// MBL QMS Accounts — GST Tax, TDS Compliance & Bank Reconciliation Modules
// Designed around standard Indian private limited financial statutes.

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

export default function TaxCompliance({ onLogAudit }) {
  const [subTab, setSubTab] = useState("gst"); // "gst" | "tds" | "banking"

  // GST State data
  const gstSummary = {
    outputGst: 3850000,  // GST collected on lab testing revenue (e.g. 18% standard where applicable or hospital billing)
    inputCredit: 2450000, // GST paid on reagents, consumables purchases (18% input credit ITC)
    netPayable: 1400000
  };

  const [gstReturns, setGstReturns] = useState([
    { period: "May 2026", form: "GSTR-3B", filingDate: "2026-06-20", grossTax: 1280000, status: "Filed" },
    { period: "May 2026", form: "GSTR-1", filingDate: "2026-06-11", grossTax: 1280000, status: "Filed" },
    { period: "June 2026", form: "GSTR-1", filingDate: "—", grossTax: 1400000, status: "Pending" },
    { period: "June 2026", form: "GSTR-3B", filingDate: "—", grossTax: 1400000, status: "Pending" }
  ]);

  // TDS State data
  const [tdsLedger, setTdsLedger] = useState([
    { id: 1, section: "Sec 192 (Salary TDS)", desc: "Monthly Staff Payroll withholdings", payable: 1245000, status: "Deposited (Challan 281)" },
    { id: 2, section: "Sec 194C (Contractors)", desc: "Housekeeping & cold chain transport", payable: 35000, status: "Pending Deposit" },
    { id: 3, section: "Sec 194J (Professional)", desc: "Consulting doctors & QMS auditors", payable: 185000, status: "Deposited (Challan 281)" },
    { id: 4, section: "Sec 194I (Rent)", desc: "Processing center leases", payable: 80000, status: "Pending Deposit" }
  ]);

  // Bank Accounts
  const [banks, setBanks] = useState([
    { code: "BNK-HDFC-OP", name: "HDFC Bank Operating A/c", acNo: "XXXXXX8945", balance: 52000000, unrecon: 150000 },
    { code: "BNK-ICICI-COLL", name: "ICICI Collection Sweep A/c", acNo: "XXXXXX2312", balance: 18500000, unrecon: 45000 },
    { code: "BNK-SBI-LOAN", name: "State Bank of India Term Loan", acNo: "XXXXXX5523", balance: -45000000, unrecon: 0 }
  ]);

  // Reconciliation simulator items
  const [reconItems, setReconItems] = useState([
    { id: 1, date: "2026-06-22", desc: "UPI Settlement sweep (100 Collection Centers)", bankAmt: 654000, ledgerAmt: 654000, status: "Unmatched" },
    { id: 2, date: "2026-06-22", desc: "Roche Diagnostics payment release (Chq 89452)", bankAmt: -1250000, ledgerAmt: -1250000, status: "Unmatched" },
    { id: 3, date: "2026-06-23", desc: "ABC Hospital NEFT remittance", bankAmt: 1800000, ledgerAmt: 1800000, status: "Unmatched" },
    { id: 4, date: "2026-06-23", desc: "Home collection center sweep", bankAmt: 45000, ledgerAmt: 42000, status: "Unmatched" } // Intentional mismatch
  ]);

  const handleFileGST = (period, form) => {
    setGstReturns(p => p.map(x => x.period === period && x.form === form ? { ...x, status: "Filed", filingDate: new Date().toISOString().split("T")[0] } : x));
    onLogAudit("TAX_GST", `Filed GST ${form} return for period ${period}`);
    alert(`GST return ${form} filed successfully for ${period}. Net payment ledger adjusted.`);
  };

  const handleDepositTDS = (id) => {
    setTdsLedger(p => p.map(x => x.id === id ? { ...x, status: "Deposited (Challan 281)" } : x));
    const item = tdsLedger.find(x => x.id === id);
    if (item) {
      onLogAudit("TAX_TDS", `Deposited TDS withholding under Section ${item.section.split(" ")[1]}: ₹${item.payable.toLocaleString()}`);
      alert(`TDS Challan generated for Section ${item.section.split(" ")[1]}. Payment released to NSDL.`);
    }
  };

  const handleMatchRecon = (id) => {
    setReconItems(p => p.map(x => x.id === id ? { ...x, status: "Reconciled" } : x));
    const item = reconItems.find(x => x.id === id);
    if (item) {
      onLogAudit("BANK_RECON", `Reconciled bank transaction: '${item.desc}' for amount ₹${item.bankAmt.toLocaleString()}`);
      // Decrease bank unrecon totals
      setBanks(p => p.map(b => b.code === "BNK-HDFC-OP" ? { ...b, unrecon: Math.max(0, b.unrecon - 50000) } : b));
    }
  };

  const fmt = (v) => {
    const isNeg = v < 0;
    return (isNeg ? "-" : "") + "₹" + Math.abs(v).toLocaleString("en-IN");
  };

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button style={S.btn(subTab === "gst" ? "#059669" : "#E2E8F0", subTab === "gst" ? "#FFF" : "#475569")} onClick={() => setSubTab("gst")}>
          🇮🇳 GST (Goods & Services Tax)
        </button>
        <button style={S.btn(subTab === "tds" ? "#059669" : "#E2E8F0", subTab === "tds" ? "#FFF" : "#475569")} onClick={() => setSubTab("tds")}>
          💸 TDS (Tax Deducted at Source)
        </button>
        <button style={S.btn(subTab === "banking" ? "#059669" : "#E2E8F0", subTab === "banking" ? "#FFF" : "#475569")} onClick={() => setSubTab("banking")}>
          🏦 Bank Accounts & Reconciliation
        </button>
      </div>

      {/* SUB TAB 1: GST */}
      {subTab === "gst" && (
        <div>
          <div style={S.grid(3)}>
            <div style={S.card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Output GST Collected</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", marginTop: 6 }}>{fmt(gstSummary.outputGst)}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Billed on laboratory testing revenues</div>
            </div>
            <div style={S.card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Input Tax Credit (ITC)</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#059669", marginTop: 6 }}>{fmt(gstSummary.inputCredit)}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Paid on reagents & laboratory supplies</div>
            </div>
            <div style={S.card}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Net GST Liability</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#BE123C", marginTop: 6 }}>{fmt(gstSummary.netPayable)}</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Payable via GSTR-3B monthly filing</div>
            </div>
          </div>

          <div style={S.card}>
            <h3 style={S.title}>GST Filing Compliance Register (GSTR-1 & 3B)</h3>
            <p style={S.subtitle}>Indian GST tax filing schedules and records.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Tax Period</th>
                    <th style={S.th}>Filing Form</th>
                    <th style={S.th}>Filing Date</th>
                    <th style={S.th}>Liability Amount</th>
                    <th style={S.th}>Filing Status</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gstReturns.map((ret, idx) => (
                    <tr key={idx}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{ret.period}</td>
                      <td style={S.td}>{ret.form}</td>
                      <td style={S.td}>{ret.filingDate}</td>
                      <td style={S.td}>{fmt(ret.grossTax)}</td>
                      <td style={S.td}>
                        <span style={S.badge(ret.status === "Filed" ? "#ECFDF5" : "#FEF3C7", ret.status === "Filed" ? "#059669" : "#D97706")}>
                          {ret.status}
                        </span>
                      </td>
                      <td style={S.td}>
                        {ret.status !== "Filed" ? (
                          <button style={S.btn()} onClick={() => handleFileGST(ret.period, ret.form)}>
                            File Return
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>✓ Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: TDS */}
      {subTab === "tds" && (
        <div style={S.card}>
          <h3 style={S.title}>TDS withholding & Quarterly Compliance ledger</h3>
          <p style={S.subtitle}>Withholdings mapped to direct Income Tax rules (Form 26Q & 24Q reporting).</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>TDS Section Map</th>
                  <th style={S.th}>Withholding Details</th>
                  <th style={S.th}>TDS Liability Outstanding</th>
                  <th style={S.th}>Compliance Status</th>
                  <th style={S.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tdsLedger.map(tds => (
                  <tr key={tds.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{tds.section}</td>
                    <td style={S.td}>{tds.desc}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{fmt(tds.payable)}</td>
                    <td style={S.td}>
                      <span style={S.badge(tds.status.includes("Deposited") ? "#ECFDF5" : "#FFF1F2", tds.status.includes("Deposited") ? "#059669" : "#BE123C")}>
                        {tds.status}
                      </span>
                    </td>
                    <td style={S.td}>
                      {!tds.status.includes("Deposited") ? (
                        <button style={S.btn()} onClick={() => handleDepositTDS(tds.id)}>
                          Deposit Tax (Challan 281)
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>✓ Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 3: BANKING & RECONCILIATION */}
      {subTab === "banking" && (
        <div>
          {/* Bank balances list */}
          <div style={S.card}>
            <h3 style={S.title}>Active Bank Accounts</h3>
            <p style={S.subtitle}>Consolidated balances across corporate bank gateways.</p>
            <div style={S.grid(3)}>
              {banks.map(bank => (
                <div key={bank.code} style={{ border: "1px solid #E2E8F0", padding: 16, borderRadius: 8, background: "#F8FAFC" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{bank.name}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{bank.acNo} · {bank.code}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 10, color: bank.balance >= 0 ? "#059669" : "#BE123C" }}>{fmt(bank.balance)}</div>
                  {bank.unrecon > 0 && (
                    <div style={{ fontSize: 11, color: "#D97706", fontWeight: "bold", marginTop: 4 }}>
                      ⚠️ {fmt(bank.unrecon)} unreconciled difference
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Bank Reconciliation Grid */}
          <div style={S.card}>
            <h3 style={S.title}>Interactive Bank Statement Reconciliation Tool</h3>
            <p style={S.subtitle}>Match bank sweeps directly against accounting general ledgers.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Tx Date</th>
                    <th style={S.th}>Transaction Description</th>
                    <th style={S.th}>Bank Amount</th>
                    <th style={S.th}>Ledger Amount</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reconItems.map(item => (
                    <tr key={item.id}>
                      <td style={S.td}>{item.date}</td>
                      <td style={{ ...S.td, fontWeight: 600 }}>{item.desc}</td>
                      <td style={{ ...S.td, color: item.bankAmt >= 0 ? "#059669" : "#BE123C", fontWeight: "bold" }}>{fmt(item.bankAmt)}</td>
                      <td style={{ ...S.td, color: item.ledgerAmt >= 0 ? "#059669" : "#BE123C", fontWeight: "bold" }}>{fmt(item.ledgerAmt)}</td>
                      <td style={S.td}>
                        <span style={S.badge(item.status === "Reconciled" ? "#ECFDF5" : "#FFF1F2", item.status === "Reconciled" ? "#059669" : "#BE123C")}>
                          {item.status}
                        </span>
                      </td>
                      <td style={S.td}>
                        {item.status !== "Reconciled" ? (
                          <button style={S.btn()} onClick={() => handleMatchRecon(item.id)}>
                            Match & Reconcile
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>✓ Reconciled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
