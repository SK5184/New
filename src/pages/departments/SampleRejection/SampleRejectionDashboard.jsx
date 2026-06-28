// SampleRejectionDashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import SampleAcceptanceCriteriaMaster from "./SampleAcceptanceCriteriaMaster";
import SampleAcceptanceForm from "./SampleAcceptanceForm";
import SampleExceptionForm from "./SampleExceptionForm";
import { syncMonthlyKPI, getMonthKey, getMonthLabel, getKpiStatus } from "./sampleRejectionService";

export default function SampleRejectionDashboard({ department }) {
  const { role } = useAuth();
  
  // Tab control
  const [activeSubTab, setActiveSubTab] = useState("overview");

  // Selection state
  const isCentralAdmin = !department;
  const [selectedDept, setSelectedDept] = useState(department || "Biochemistry");
  
  const now = new Date();
  const defaultMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonthKey);

  // KPI States
  const [kpiData, setKpiData] = useState(null);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Exception link state
  const [linkedAssessment, setLinkedAssessment] = useState(null);

  const loadKpiStats = useCallback(async (dep, mk) => {
    setLoadingKpi(true);
    try {
      const docRef = doc(db, "qualityKPI", `${dep}_${mk}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setKpiData(snap.data());
      } else {
        setKpiData(null);
      }
    } catch (err) {
      console.error("Error loading quality KPI stats:", err);
    } finally {
      setLoadingKpi(false);
    }
  }, []);

  useEffect(() => {
    loadKpiStats(selectedDept, selectedMonth);
  }, [selectedDept, selectedMonth, loadKpiStats]);

  const handleSyncKpi = async () => {
    setSyncing(true);
    try {
      const stats = await syncMonthlyKPI(selectedDept, selectedMonth);
      alert("Monthly Quality KPIs successfully calculated and synced with central QMS.");
      loadKpiStats(selectedDept, selectedMonth);
    } catch (err) {
      alert("Error calculating monthly stats. Make sure raw assessment logs exist.");
    } finally {
      setSyncing(false);
    }
  };

  const handleLogExceptionLink = (assessment) => {
    setLinkedAssessment(assessment);
    setActiveSubTab("exceptions");
  };

  const handleClearExceptionLink = () => {
    setLinkedAssessment(null);
  };

  const S = {
    wrap: { fontFamily: "'Inter', sans-serif", width: "100%", boxSizing: "border-box" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, borderBottom: "1px solid #E2E8F0", paddingBottom: 12 },
    title: { fontSize: 18, fontWeight: 700, color: "#1E293B" },
    tabBar: { display: "flex", gap: 6, borderBottom: "1.5px solid #E2E8F0", marginBottom: 16 },
    tab: (active) => ({
      padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontWeight: active ? 600 : 400,
      color: active ? "#0F6E56" : "#475569",
      borderBottom: active ? "3px solid #0F6E56" : "3px solid transparent",
      transition: "all 0.15s ease",
      background: "transparent", borderLeft: "none", borderRight: "none", borderTop: "none"
    }),
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    cardBody: { padding: 16 },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 },
    statCard: (bg, border) => ({
      background: bg || "#fff", border: `0.5px solid ${border || "#CBD5E1"}`, borderRadius: 10, padding: 14,
      display: "flex", flexDirection: "column", gap: 4
    }),
    statNum: (color) => ({ fontSize: 24, fontWeight: 700, color: color || "#1E293B" }),
    statLabel: { fontSize: 10.5, fontWeight: 500, color: "#64748B", textTransform: "uppercase" }
  };

  const DEPT_OPTS = [
    "Biochemistry", "Haematology", "Microbiology", "Serology", 
    "Flow Cytometry", "Cytogenetics", "Clinical Pathology", 
    "Molecular Biology", "Molecular Genetics"
  ];

  const monthOptions = () => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      opts.push({ key, label });
    }
    return opts;
  };

  const MONTH_OPTS = monthOptions();

  return (
    <div style={S.wrap}>
      {/* Header and filters */}
      <div style={S.header}>
        <div>
          <div style={S.title}>Sample Acceptance & Rejection Management Console</div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            ISO 15189:2022 §7.2.5 Pre-Examination Compliance Cockpit
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {isCentralAdmin ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B" }}>Department Scope</span>
              <select 
                value={selectedDept} 
                onChange={e => setSelectedDept(e.target.value)}
                style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
              >
                {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          ) : (
            <span style={{ fontSize: 12, background: "#D1FAE5", color: "#065F46", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
              🏢 {selectedDept} Department
            </span>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B" }}>Monitoring Month</span>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
            >
              {MONTH_OPTS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        <button onClick={() => setActiveSubTab("overview")} style={S.tab(activeSubTab === "overview")}>
          📊 Quality KPI Overview
        </button>
        <button onClick={() => setActiveSubTab("entry")} style={S.tab(activeSubTab === "entry")}>
          📥 Sample Acceptance checklist
        </button>
        <button onClick={() => setActiveSubTab("exceptions")} style={S.tab(activeSubTab === "exceptions")}>
          ⚠️ Deviation Exception Approvals
        </button>
        <button onClick={() => setActiveSubTab("criteria")} style={S.tab(activeSubTab === "criteria")}>
          📕 Acceptance Criteria Master
        </button>
      </div>

      {/* Content panes */}
      {activeSubTab === "overview" && (
        <div>
          {/* Stats cards */}
          {loadingKpi ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading monthly KPIs...</div>
          ) : kpiData ? (
            <div>
              <div style={S.statGrid}>
                <div style={S.statCard(null, null)}>
                  <span style={S.statLabel}>Total Samples Received</span>
                  <span style={S.statNum()}>{kpiData.metrics?.sampleReceived}</span>
                  <span style={{ fontSize: 9, color: "#64748B" }}>Total checks logged</span>
                </div>
                <div style={S.statCard(null, null)}>
                  <span style={S.statLabel}>Samples Rejected</span>
                  <span style={S.statNum("#991B1B")}>{kpiData.metrics?.sampleRejected}</span>
                  <span style={{ fontSize: 9, color: "#991B1B", fontWeight: 500 }}>discard/repeat requests</span>
                </div>
                <div style={S.statCard(
                  kpiData.metrics?.rejectionRate <= 2.0 ? "#ECFDF5" : "#FEF2F2",
                  kpiData.metrics?.rejectionRate <= 2.0 ? "#A7F3D0" : "#FCA5A5"
                )}>
                  <span style={S.statLabel}>Rejection Rate %</span>
                  <span style={S.statNum(kpiData.metrics?.rejectionRate <= 2.0 ? "#047857" : "#B91C1C")}>
                    {kpiData.metrics?.rejectionRate?.toFixed(2)}%
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: kpiData.metrics?.rejectionRate <= 2.0 ? "#047857" : "#B91C1C" }}>
                    Target: &lt; 2.0%
                  </span>
                </div>
                <div style={S.statCard(
                  kpiData.metrics?.rejectionRate <= 2.0 ? "#ECFDF5" : "#FEF2F2",
                  kpiData.metrics?.rejectionRate <= 2.0 ? "#A7F3D0" : "#FCA5A5"
                )}>
                  <span style={S.statLabel}>Quality KPI Status</span>
                  <span style={S.statNum(kpiData.metrics?.rejectionRate <= 2.0 ? "#047857" : "#B91C1C")}>
                    {kpiData.metrics?.rejectionRate <= 2.0 ? "GREEN" : "RED"}
                  </span>
                  <span style={{ fontSize: 9, color: "#64748B" }}>ISO Pre-Analytical indicator</span>
                </div>
              </div>

              {/* Top reasons charts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Bar chart reasons */}
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <span style={S.cardTitle}>Top Rejection Reason Analysis</span>
                  </div>
                  <div style={S.cardBody}>
                    {kpiData.topReasons?.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 12 }}>
                        No rejection reasons logged for this month.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {kpiData.topReasons?.map((reason, i) => {
                          const pct = kpiData.reasonsBreakdown?.[reason] || 0.0;
                          return (
                            <div key={reason}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                <span style={{ fontWeight: 600, color: "#334155" }}>
                                  {i + 1}. {reason}
                                </span>
                                <span style={{ fontWeight: 700, color: "#475569" }}>{pct}%</span>
                              </div>
                              {/* Custom Bar Chart */}
                              <div style={{ width: "100%", height: 10, background: "#E2E8F0", borderRadius: 20, overflow: "hidden" }}>
                                <div style={{
                                  width: `${pct}%`, height: "100%",
                                  background: i === 0 ? "#DC2626" : i === 1 ? "#F59E0B" : "#3B82F6",
                                  borderRadius: 20
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ISO Alignment details */}
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <span style={S.cardTitle}>ISO 15189:2022 Compliance Overview</span>
                  </div>
                  <div style={S.cardBody}>
                    <div style={{ fontSize: 12, color: "#334155", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div>
                        <strong>§7.2.5 Sample Acceptance Criteria</strong>
                        <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: 11.5 }}>
                          The laboratory must have documented procedures for sample receipt and handling, and clear acceptance criteria for specimen collection.
                        </p>
                      </div>
                      <div>
                        <strong>§7.10 Nonconforming Work Handling</strong>
                        <p style={{ margin: "2px 0 0", color: "#64748B", fontSize: 11.5 }}>
                          All conditional approvals of deviating samples must undergo documented clinical risk justifications (Exception approvals).
                        </p>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                        <button 
                          onClick={handleSyncKpi} 
                          disabled={syncing}
                          style={S.btn("#0F6E56", "#FFF")}
                        >
                          {syncing ? "Syncing QMS KPIs..." : "🔄 Recalculate & Sync Monthly KPI"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: "40px 20px", textAlign: "center", color: "#64748B",
              background: "#fff", borderRadius: 12, border: "0.5px solid #CBD5E1"
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>No Monthly KPI data aggregated</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, marginBottom: 14 }}>
                Rejection statistics for {selectedDept} in period {getMonthLabel(selectedMonth)} have not been calculated yet.
              </div>
              <button onClick={handleSyncKpi} disabled={syncing} style={S.btn(null, null)}>
                {syncing ? "Aggregating logs..." : "Aggregate Monthly Stats"}
              </button>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "entry" && (
        <SampleAcceptanceForm 
          department={selectedDept} 
          onLogException={handleLogExceptionLink} 
        />
      )}

      {activeSubTab === "exceptions" && (
        <SampleExceptionForm 
          department={selectedDept} 
          selectedAssessment={linkedAssessment}
          onClearAssessment={handleClearExceptionLink}
        />
      )}

      {activeSubTab === "criteria" && (
        <SampleAcceptanceCriteriaMaster 
          department={selectedDept} 
        />
      )}
    </div>
  );
}
