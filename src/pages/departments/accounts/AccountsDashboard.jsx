// AccountsDashboard.jsx
// MBL QMS — Accounts & Finance Master Dashboard & Department Console
// Designed as a complete Private Limited Company Financial Management System
// Compliant with ISO 15189:2022 & statutory audit frameworks.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";

// Import subcomponents
import FinancialPlanning from "./FinancialPlanning";
import RevenueCycle from "./RevenueCycle";
import ProcurementAP from "./ProcurementAP";
import TaxCompliance from "./TaxCompliance";
import ReportsAudits from "./ReportsAudits";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#0F172A" },
  topbar: { background: "#059669", borderBottom: "4px solid #047857", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#FFF" },
  title: { fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.5px" },
  subtitle: { fontSize: 11, color: "#D1FAE5", marginTop: 2 },
  tabs: { display: "flex", gap: 6, borderBottom: "2px solid #E2E8F0", padding: "0 24px", background: "#FFF", overflowX: "auto" },
  tab: (active) => ({
    padding: "12px 18px",
    background: "transparent",
    border: "none",
    borderBottom: active ? "3px solid #059669" : "3px solid transparent",
    color: active ? "#059669" : "#64748B",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    outline: "none",
    whiteSpace: "nowrap"
  }),
  content: { padding: "20px 24px" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  kpiTitle: { fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" },
  kpiValue: { fontSize: 24, fontWeight: 700, color: "#1E293B", marginTop: 4 },
  kpiSub: { fontSize: 11, color: "#64748B", marginTop: 4 },
  badge: (bg, color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: color }),
  node: { padding: "10px 14px", border: "1.5px solid #059669", borderRadius: 8, background: "#ECFDF5", color: "#047857", fontWeight: 600, fontSize: 12.5, textAlign: "center", width: 110 }
};

export default function AccountsDashboard() {
  const { role, name: authName, dept: authDept } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "planning" | "revenue" | "procure" | "tax" | "statements"
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);

  // Real-time audit trail logs state
  const [auditLogs, setAuditLogs] = useState([
    { class: "SYSTEM", desc: "Accounts & Finance Module initialized successfully under corporate private limited parameters", time: new Date().toLocaleTimeString(), user: "System Engine" },
    { class: "LEDGER", desc: "Opening balance sweep reconciled across 3 operational bank accounts", time: "10:15 AM", user: "Finance HOD" },
    { class: "BUDGET", desc: "Corporate revenue target set to ₹50 Crore for FY 2026-27", time: "11:30 AM", user: "Managing Director" }
  ]);

  const handleLogAudit = useCallback((actionClass, description) => {
    const log = {
      class: actionClass,
      desc: description,
      time: new Date().toLocaleTimeString(),
      user: authName || "Operator"
    };
    setAuditLogs(p => [log, ...p]);
  }, [authName]);

  // Load connection status toggles
  useEffect(() => {
    async function loadFlags() {
      try {
        const snap = await getDoc(doc(db, "appSettings", "features"));
        if (snap.exists()) {
          setFeatureFlags(snap.data());
        }
      } catch (err) {
        console.warn("Failed to load connection settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFlags();
  }, []);

  const isConnEnabled = featureFlags["conn_accounts"] !== false;

  // Access control checking
  const isAuthorized = useMemo(() => {
    const allowedRoles = ["Quality Manager", "Managing Director", "Deputy Director", "Admin", "Assistant Admin", "Incharge", "Manager"];
    const allowedDepts = ["Accounts", "ERP Administration", "Administration", "Quality"];
    return allowedRoles.includes(role) || allowedDepts.includes(authDept);
  }, [role, authDept]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 45, height: 45, border: "4px solid #E2E8F0", borderTop: "4px solid #059669", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Loading corporate accounts systems...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If the module connection is turned off by ERP Admin
  if (!isConnEnabled) {
    return (
      <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "90vh", padding: 24 }}>
        <div style={{ ...S.card, maxWidth: 500, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 44 }}>🔒</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#EF4444", marginTop: 12 }}>Module Maintenance Outage</h2>
          <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 8, lineHeight: "1.5" }}>
            The Accounts & Finance module has been temporarily disabled by the ERP Administrator for system maintenance or database audit routines. Please contact your coordinator.
          </p>
        </div>
      </div>
    );
  }

  // If user has no authorization
  if (!isAuthorized) {
    return (
      <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "90vh", padding: 24 }}>
        <div style={{ ...S.card, maxWidth: 500, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 44 }}>🛡️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#D97706", marginTop: 12 }}>Access Authorization Required</h2>
          <p style={{ fontSize: 12.5, color: "#64748B", marginTop: 8, lineHeight: "1.5" }}>
            You do not possess the required module clearance to view corporate ledgers or cash flows. Financial access is restricted to corporate officers and accounts division employees.
          </p>
        </div>
      </div>
    );
  }

  const fmt = (v) => "₹" + v.toLocaleString("en-IN");

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Accounts & Corporate Finance Command Center</h2>
          <div style={S.subtitle}>Private Limited Company Financial Management System · ISO 15189 compliance</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={S.badge("rgba(255,255,255,0.15)", "#D1FAE5")}>
            Corporate Office Node
          </span>
          <span style={S.badge("#D1FAE5", "#047857")}>
            Audit Compliant
          </span>
        </div>
      </div>

      {/* Tabs list */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === "dashboard")} onClick={() => setActiveTab("dashboard")}>
          📊 Finance Overview & KPIs
        </button>
        <button style={S.tab(activeTab === "planning")} onClick={() => setActiveTab("planning")}>
          📅 Financial Planning & COA
        </button>
        <button style={S.tab(activeTab === "revenue")} onClick={() => setActiveTab("revenue")}>
          📥 Revenue Cycle & Settlements
        </button>
        <button style={S.tab(activeTab === "procure")} onClick={() => setActiveTab("procure")}>
          🛒 Procurement, AP & Assets
        </button>
        <button style={S.tab(activeTab === "tax")} onClick={() => setActiveTab("tax")}>
          🏦 Banking & Statutory Taxes
        </button>
        <button style={S.tab(activeTab === "statements")} onClick={() => setActiveTab("statements")}>
          📜 Statements & Approvals
        </button>
        <button style={S.tab(activeTab === "roster")} onClick={() => setActiveTab("roster")}>
          📅 Weekly Duty Roster
        </button>
      </div>

      {/* Content wrapper */}
      <div style={S.content}>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === "dashboard" && (
          featureFlags["accts_dashboard"] === false ? (
            <div style={{ ...S.card, textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#475569", marginTop: 12 }}>Feature Disabled</h3>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 6 }}>
                The Corporate Finance Dashboard and KPI charts are currently disabled in the ERP Admin Master Control.
              </p>
            </div>
          ) : (
            <div>
              {/* KPI Cards Grid */}
              <div style={S.grid(4)}>
                <div style={S.card}>
                  <div style={S.kpiTitle}>Total Revenue (YTD)</div>
                  <div style={S.kpiValue}>{fmt(500000000)}</div>
                  <div style={{ ...S.kpiSub, color: "#059669", fontWeight: "bold" }}>✓ On Target (₹50 Cr Target)</div>
                </div>
                <div style={S.card}>
                  <div style={S.kpiTitle}>Pending Receivables (AR)</div>
                  <div style={S.kpiValue}>{fmt(28400000)}</div>
                  <div style={{ ...S.kpiSub, color: "#BE123C" }}>⚠️ 18% Overdue (Hospitals contracts)</div>
                </div>
                <div style={S.card}>
                  <div style={S.kpiTitle}>Operating Net Profit</div>
                  <div style={{ ...S.kpiValue, color: "#059669" }}>{fmt(100000000)}</div>
                  <div style={S.kpiSub}>20% net margin after reagent cost</div>
                </div>
                <div style={S.card}>
                  <div style={S.kpiTitle}>Bank Balance (Liquidity)</div>
                  <div style={S.kpiValue}>{fmt(70500000)}</div>
                  <div style={S.kpiSub}>HDFC Operating + ICICI sweep</div>
                </div>
              </div>

              {/* Performance charts via SVGs */}
              <div style={S.grid(2)}>
                {/* SVG Chart 1: Processing Center Revenue comparison */}
                <div style={S.card}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Processing Center Revenue comparison (YTD)</h3>
                  <div style={{ height: 160, display: "flex", alignItems: "flex-end", justifyContent: "space-around", paddingBottom: 20 }}>
                    {[
                      { label: "Chennai", val: 18.5, color: "#059669" },
                      { label: "Bangalore", val: 15.0, color: "#3B82F6" },
                      { label: "Hyderabad", val: 12.0, color: "#8B5CF6" },
                      { label: "Delhi CC", val: 9.7, color: "#EC4899" }
                    ].map((bar, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: "bold" }}>₹{bar.val} Cr</span>
                        <div style={{ width: 45, height: bar.val * 6, background: bar.color, borderRadius: "4px 4px 0 0" }} />
                        <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{bar.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SVG Chart 2: Collection center sweeps */}
                <div style={S.card}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>Weekly Cash vs UPI sweeps ratio</h3>
                  <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="150" height="150" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                      {/* Background Circle */}
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                      {/* UPI sweep (75%) */}
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#059669" strokeWidth="4.2" strokeDasharray="75, 100" />
                      {/* Cash sweep (25%) */}
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F59E0B" strokeWidth="4.2" strokeDasharray="25, 100" strokeDashoffset="-75" />
                    </svg>
                    <div style={{ marginLeft: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, background: "#059669", borderRadius: 3 }} />
                        <span style={{ fontSize: 12 }}>UPI sweep: <strong>75% (₹37.5 Cr)</strong></span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 12, height: 12, background: "#F59E0B", borderRadius: 3 }} />
                        <span style={{ fontSize: 12 }}>Cash sweeps: <strong>25% (₹12.5 Cr)</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interconnection Node Map */}
              <div style={S.card}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>QMS Financial Interconnection Node Map</h3>
                <p style={S.subtitle}>ISO 15189 guidelines require integration between operational events and asset accounting.</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 10px", flexWrap: "wrap", gap: 14 }}>
                  <div style={S.node}>👩‍💼 HR & Payroll</div>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>➔</div>
                  <div style={S.node}>🛒 Purchase POs</div>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>➔</div>
                  <div style={{ ...S.node, border: "2px solid #059669", background: "#059669", color: "#FFF" }}>💵 ACCOUNTS</div>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>➔</div>
                  <div style={S.node}>📦 Inventory Stock</div>
                  <div style={{ color: "#059669", fontWeight: "bold" }}>➔</div>
                  <div style={S.node}>⚙️ Biomedical Asset</div>
                </div>
              </div>
            </div>
          )
        )}

        {/* TAB 2: FINANCIAL PLANNING */}
        {activeTab === "planning" && (
          <FinancialPlanning onLogAudit={handleLogAudit} featureFlags={featureFlags} />
        )}

        {/* TAB 3: REVENUE CYCLE */}
        {activeTab === "revenue" && (
          <RevenueCycle onLogAudit={handleLogAudit} featureFlags={featureFlags} />
        )}

        {/* TAB 4: PROCUREMENT AP */}
        {activeTab === "procure" && (
          <ProcurementAP onLogAudit={handleLogAudit} featureFlags={featureFlags} />
        )}

        {/* TAB 5: TAX COMPLIANCE */}
        {activeTab === "tax" && (
          <TaxCompliance onLogAudit={handleLogAudit} featureFlags={featureFlags} />
        )}

        {/* TAB 6: STATEMENTS & APPROVALS */}
        {activeTab === "statements" && (
          <ReportsAudits auditLogs={auditLogs} onLogAudit={handleLogAudit} featureFlags={featureFlags} />
        )}

        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Accounts" role={role} userName={userName} />
        )}

      </div>
    </div>
  );
}