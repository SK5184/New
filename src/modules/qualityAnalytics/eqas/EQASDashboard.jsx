// EQASDashboard.jsx
// MBL QMS — Central External Quality Assessment & Alternative Assessment Analytics Hub
// Compliant with ISO 15189:2022 §7.3.7 requirements.
// Tracks PT coverage, Z-score historical plots, Alternative Assessment verifications, and Provider performance.

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { initialTests } from "../../../data/testMasterData";

const PROVIDERS = [
  "BIORAD EQAS",
  "CAP Surveys (College of American Pathologists)",
  "RCPA PT (Royal College of Pathologists of Australasia)",
  "CMC Vellore EQAS",
  "AIIMS EQAS",
  "NABL PT",
  "Alternative Methodology (No Formal EQA Available)",
  "Other Approved Indian Provider"
];

const ALTERNATIVES = [
  "Sample Exchange: Participation in sample exchanges with other laboratories.",
  "IQC Comparison: Interlaboratory comparisons of identical IQC materials.",
  "Calibrator Verification: Analysis of manufacturer calibrator/control lot.",
  "Split Testing: Split/blind testing by two persons, analyzers, or methods.",
  "Reference Materials: Analysis of commutable reference materials.",
  "Clinical Correlation: Analysis of samples from clinical correlation studies.",
  "Repository Materials: Analysis of materials from cell/tissue repositories."
];

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "88vh", color: "#0F172A" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderBottom: "1px solid #E2E8F0", paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0, letterSpacing: "-0.5px" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  tabs: { display: "flex", gap: 8, borderBottom: "2px solid #E2E8F0", marginBottom: 24, overflowX: "auto" },
  tab: (active) => ({
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    borderBottom: active ? "3px solid #534AB7" : "3px solid transparent",
    color: active ? "#534AB7" : "#64748B",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    outline: "none",
    whiteSpace: "nowrap",
    paddingBottom: 12
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 24 }),
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" },
  kpiTitle: { fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px" },
  kpiValue: { fontSize: 28, fontWeight: 700, color: "#0F172A", marginTop: 6 },
  kpiSub: { fontSize: 11.5, color: "#64748B", marginTop: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff" },
  th: { background: "#F8FAFC", padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "12px 16px", borderBottom: "1px solid #F1F5F9", color: "#334155", verticalAlign: "middle" },
  badge: (bg, color) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color: color, border: `0.5px solid ${color}50` }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12.5, background: "#fff", color: "#1E293B", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#534AB7", color: color || "#FFF", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s" })
};

export default function EQASDashboard() {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "zscore" | "alternative" | "providers"
  const [tests, setTests] = useState([]);
  const [eqaRuns, setEqaRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states for Coverage tab
  const [searchQuery, setSearchQuery] = useState("");
  const [coverageDept, setCoverageDept] = useState("All");

  // Selected analyte for Z-Score analysis
  const [selectedAnalyte, setSelectedAnalyte] = useState("");

  // Corrective action edit states
  const [editingRunId, setEditingRunId] = useState(null);
  const [caText, setCaText] = useState("");
  const [savingCa, setSavingCa] = useState(false);

  // Load Test Master & Firestore Logs
  const loadData = async () => {
    setLoading(true);
    try {
      // Load Test Master from localStorage or initialTests
      const cached = localStorage.getItem("mbl_test_master");
      const testList = cached ? JSON.parse(cached) : initialTests;
      setTests(testList);

      // Fetch EQA logs from Firestore
      const snap = await getDocs(collection(db, "eqaResults"));
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort logs by createdAt descending
      logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEqaRuns(logs);

      // Default selected analyte to first test with logged EQA results
      const loggedTestCodes = new Set(logs.map(l => l.testCode));
      const firstLoggedTest = testList.find(t => loggedTestCodes.has(t.mblCode));
      if (firstLoggedTest) {
        setSelectedAnalyte(firstLoggedTest.mblCode);
      } else if (testList.length > 0) {
        setSelectedAnalyte(testList[0].mblCode);
      }
    } catch (err) {
      console.error("Failed to load EQAS Dashboard data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Seed Mock Data function (highly useful for developers & testers)
  const seedMockData = async () => {
    if (!window.confirm("This will write 12 months of simulation data for several analytes (Glucose, Creatinine, Sodium, CBC, Urine) into your Firebase eqaResults database. Proceed?")) return;
    setLoading(true);
    try {
      const { addDoc } = await import("firebase/firestore");
      const mockCycles = [];
      const years = [2025, 2026];
      
      const targets = {
        "MBL-0005": { name: "Adrenocorticotropic Hormone (ACTH)", prov: "BIORAD EQAS", alt: "", mean: 45.0, sd: 3.2, unit: "pg/ml", dept: "Biochemistry" },
        "MBL-0006": { name: "Ammonia", prov: "BIORAD EQAS", alt: "", mean: 80.0, sd: 5.5, unit: "umol/L", dept: "Biochemistry" },
        "MBL-0009": { name: "High Sensitive Troponin T", prov: "BIORAD EQAS", alt: "", mean: 14.5, sd: 1.1, unit: "ng/L", dept: "Biochemistry" },
        "MBL-0010": { name: "Lactate", prov: "Alternative Methodology (No Formal EQA Available)", alt: "Sample Exchange: Participation in sample exchanges with other laboratories.", mean: 12.0, sd: 0.8, unit: "mg/dL", dept: "Biochemistry" }
      };

      // Generate 6 cycles per test code
      for (const [code, meta] of Object.entries(targets)) {
        for (let i = 1; i <= 6; i++) {
          const isAlternative = meta.prov === "Alternative Methodology (No Formal EQA Available)";
          // Seed some outliers to test CAPA action
          let zScore = (Math.random() * 3.4 - 1.7).toFixed(2);
          if (i === 4) zScore = (2.45).toFixed(2); // Positive outlier
          if (i === 6 && code === "MBL-0005") zScore = (-3.12).toFixed(2); // Strong negative outlier

          const isMarginal = Math.abs(parseFloat(zScore)) > 2.0 && Math.abs(parseFloat(zScore)) <= 3.0;
          const isUnsat = Math.abs(parseFloat(zScore)) > 3.0;
          const status = isUnsat ? "Unsatisfactory" : (isMarginal ? "Marginal" : "Satisfactory");

          const labVal = (meta.mean + parseFloat(zScore) * meta.sd).toFixed(1);
          const targetVal = meta.mean.toFixed(1);

          const rDate = new Date();
          rDate.setMonth(rDate.getMonth() - (6 - i) * 2);
          const receivedDate = rDate.toISOString().split("T")[0];
          rDate.setDate(rDate.getDate() - 3);
          const submissionDate = rDate.toISOString().split("T")[0];

          mockCycles.push({
            testCode: code,
            testName: meta.name,
            department: meta.dept,
            eqaType: isAlternative ? "Alternative" : "Formal EQAS",
            provider: isAlternative ? "Alternative Methodology (No Formal EQA Available)" : meta.prov,
            alternativeMethodology: isAlternative ? meta.alt : "",
            cycleName: isAlternative ? `SE-2026-0${i}` : `${meta.prov.split(" ")[0]}-2026-C0${i}`,
            labResult: labVal,
            targetValue: targetVal,
            acceptableRange: `± 2.0 SD (± ${(meta.sd * 2 / meta.mean * 100).toFixed(0)}%)`,
            score: isAlternative ? "" : zScore, // Z-Score
            status: status,
            receivedDate: receivedDate,
            submissionDate: submissionDate,
            peerLabName: isAlternative ? "Apex Referral Labs, Mumbai" : "",
            comparatorMethod: isAlternative ? "Clinical Biochemistry AutoAnalyzer (Cobas Pro)" : "",
            correctiveAction: isUnsat ? "Root cause: Calibrator degradation. Corrective action: Replaced reagent pack, recalibrated instrument, and re-ran control. Values returned within ±1.0 SD limit." : "",
            enteredBy: "Simulator Admin",
            createdAt: new Date(receivedDate).toISOString()
          });
        }
      }

      // Add to Firestore
      for (const cycle of mockCycles) {
        await addDoc(collection(db, "eqaResults"), cycle);
      }
      alert("Simulated EQA data seeded successfully!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to seed mock data.");
    }
  };

  // Helper properties and filters
  const departments = useMemo(() => {
    const set = new Set(tests.map(t => t.department));
    return ["All", ...Array.from(set)];
  }, [tests]);

  // Overall calculations
  const stats = useMemo(() => {
    if (eqaRuns.length === 0) return { successRate: 100, activeRuns: 0, outliers: 0, pendingCapa: 0, altCount: 0 };
    const satisfactory = eqaRuns.filter(r => r.status === "Satisfactory").length;
    const outliers = eqaRuns.filter(r => r.status === "Marginal" || r.status === "Unsatisfactory").length;
    const pendingCapa = eqaRuns.filter(r => (r.status === "Marginal" || r.status === "Unsatisfactory") && !r.correctiveAction).length;
    const altCount = eqaRuns.filter(r => r.eqaType === "Alternative").length;
    return {
      successRate: Math.round((satisfactory / eqaRuns.length) * 100),
      activeRuns: eqaRuns.length,
      outliers,
      pendingCapa,
      altCount
    };
  }, [eqaRuns]);

  // Coverage maps statistics
  const ptCoverage = useMemo(() => {
    if (tests.length === 0) return { percent: 0, covered: 0, total: 0 };
    const covered = tests.filter(t => t.proficiencyTesting && t.proficiencyTesting !== "None").length;
    return {
      percent: Math.round((covered / tests.length) * 100),
      covered,
      total: tests.length
    };
  }, [tests]);

  // Filtered tests for Tab 1 Coverage table
  const filteredCoverageTests = useMemo(() => {
    return tests.filter(t => {
      const matchSearch = t.testName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.mblCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.nablCode && t.nablCode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchDept = coverageDept === "All" || t.department === coverageDept;
      return matchSearch && matchDept;
    });
  }, [tests, searchQuery, coverageDept]);

  // Active analyte runs for Tab 2
  const selectedAnalyteRuns = useMemo(() => {
    return eqaRuns
      .filter(r => r.testCode === selectedAnalyte && r.eqaType === "Formal EQAS")
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [eqaRuns, selectedAnalyte]);

  const selectedAnalyteMeta = useMemo(() => {
    return tests.find(t => t.mblCode === selectedAnalyte);
  }, [tests, selectedAnalyte]);

  // Analyte-specific stats
  const analyteStats = useMemo(() => {
    if (selectedAnalyteRuns.length === 0) return null;
    const scores = selectedAnalyteRuns.map(r => parseFloat(r.score)).filter(s => !isNaN(s));
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxVal = Math.max(...scores);
    const minVal = Math.min(...scores);
    const satisfactory = selectedAnalyteRuns.filter(r => r.status === "Satisfactory").length;
    return {
      total: selectedAnalyteRuns.length,
      avgZ: mean.toFixed(2),
      maxZ: maxVal.toFixed(2),
      minZ: minVal.toFixed(2),
      satisfactoryPct: Math.round((satisfactory / selectedAnalyteRuns.length) * 100)
    };
  }, [selectedAnalyteRuns]);

  // Filter alternative runs for Tab 3
  const alternativeRuns = useMemo(() => {
    return eqaRuns.filter(r => r.eqaType === "Alternative");
  }, [eqaRuns]);

  // Alternative stats
  const alternativeStats = useMemo(() => {
    if (alternativeRuns.length === 0) return { total: 0, complianceRate: 100, exchangeCount: 0, splitCount: 0 };
    const satisfactory = alternativeRuns.filter(r => r.status === "Satisfactory").length;
    const exchange = alternativeRuns.filter(r => r.alternativeMethodology?.toLowerCase().includes("sample exchange")).length;
    const split = alternativeRuns.filter(r => r.alternativeMethodology?.toLowerCase().includes("split testing")).length;
    return {
      total: alternativeRuns.length,
      complianceRate: Math.round((satisfactory / alternativeRuns.length) * 100),
      exchangeCount: exchange,
      splitCount: split
    };
  }, [alternativeRuns]);

  // Provider scorecard calculations for Tab 4
  const providerScorecard = useMemo(() => {
    const list = [];
    PROVIDERS.forEach(prov => {
      if (prov === "Alternative Methodology (No Formal EQA Available)") return;
      const runs = eqaRuns.filter(r => r.provider === prov);
      const registeredTests = tests.filter(t => t.proficiencyTesting === prov).length;
      if (runs.length === 0 && registeredTests === 0) return;

      const satisfactory = runs.filter(r => r.status === "Satisfactory").length;
      const satisfactoryPct = runs.length > 0 ? Math.round((satisfactory / runs.length) * 100) : "N/A";
      
      // Calculate average absolute Z-score (deviation index)
      const validScores = runs.map(r => Math.abs(parseFloat(r.score))).filter(s => !isNaN(s));
      const avgAbsZ = validScores.length > 0 ? (validScores.reduce((sum, s) => sum + s, 0) / validScores.length).toFixed(2) : "—";

      // Submission timeliness (simulated or based on date diffs)
      const onTimeRuns = runs.filter(r => {
        if (!r.submissionDate || !r.receivedDate) return true;
        return new Date(r.submissionDate) <= new Date(r.receivedDate);
      }).length;
      const timelinessPct = runs.length > 0 ? Math.round((onTimeRuns / runs.length) * 100) : 100;

      list.push({
        name: prov,
        registered: registeredTests,
        completed: runs.length,
        satisfactoryPct,
        avgAbsZ,
        timelinessPct
      });
    });
    return list;
  }, [eqaRuns, tests]);

  // Save CAPA action
  const handleSaveCAPA = async (runId) => {
    if (!caText.trim()) return;
    setSavingCa(true);
    try {
      await updateDoc(doc(db, "eqaResults", runId), {
        correctiveAction: caText
      });
      alert("Corrective Action & Root Cause analysis updated successfully.");
      setEditingRunId(null);
      setCaText("");
      // Reload logs
      const snap = await getDocs(collection(db, "eqaResults"));
      const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEqaRuns(logs);
    } catch (err) {
      console.error(err);
      alert("Failed to update corrective action.");
    }
    setSavingCa(false);
  };

  if (loading) {
    return (
      <div style={{ ...S.wrap, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", flexDirection: "column", gap: 14 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #E2E8F0", borderTop: "4px solid #534AB7", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Loading EQAS Consensus & Alternative Assessment Analytics...</span>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      {/* Header section */}
      <div style={S.header}>
        <div>
          <h2 style={S.title}>External Quality Assessment (EQAS) & Alternative Analytics</h2>
          <div style={S.subtitle}>ISO 15189:2022 §7.3.7 · Performance Evaluation & Interlaboratory Consensus Audits</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {eqaRuns.length === 0 && (
            <button onClick={seedMockData} style={S.btn("#0EA5E9")} id="btn_seed_mock">
              💡 Seed Mock Analytics Data
            </button>
          )}
          <button onClick={loadData} style={{ border: "1px solid #CBD5E1", ...S.btn("#FFF", "#475569") }}>
            🔄 Refresh Logs
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={S.tabs}>
        <button style={S.tab(activeTab === "overview")} onClick={() => setActiveTab("overview")} id="tab_overview">
          📊 EQA Overview & Coverage
        </button>
        <button style={S.tab(activeTab === "zscore")} onClick={() => setActiveTab("zscore")} id="tab_zscore">
          📉 SDI & Z-Score Historical Trends
        </button>
        <button style={S.tab(activeTab === "alternative")} onClick={() => setActiveTab("alternative")} id="tab_alternative">
          🔄 Alternative Assessment Audits
        </button>
        <button style={S.tab(activeTab === "providers")} onClick={() => setActiveTab("providers")} id="tab_providers">
          🏆 Provider evaluations
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          {/* KPI grid */}
          <div style={S.grid(4)}>
            <div style={S.card}>
              <div style={S.kpiTitle}>Global EQAS Success Rate</div>
              <div style={S.kpiValue}>{stats.activeRuns > 0 ? `${stats.successRate}%` : "100%"}</div>
              <div style={S.kpiSub}>
                {stats.activeRuns - stats.outliers} of {stats.activeRuns} runs satisfactory
              </div>
              <div style={{ position: "absolute", right: 16, top: 20 }}>
                <svg width="46" height="46" viewBox="0 0 36 36">
                  <path fill="none" stroke="#E2E8F0" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path fill="none" stroke={stats.successRate >= 90 ? "#10B981" : "#F59E0B"} strokeWidth="3.2" strokeDasharray={`${stats.activeRuns > 0 ? stats.successRate : 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.kpiTitle}>Test Parameter Coverage</div>
              <div style={S.kpiValue}>{ptCoverage.percent}%</div>
              <div style={S.kpiSub}>
                {ptCoverage.covered} of {ptCoverage.total} active tests covered
              </div>
            </div>

            <div style={S.card}>
              <div style={S.kpiTitle}>Outliers & CAPA Registry</div>
              <div style={{ ...S.kpiValue, color: stats.outliers > 0 ? "#EF4444" : "#0F172A" }}>
                {stats.outliers}
              </div>
              <div style={S.kpiSub}>
                {stats.pendingCapa > 0 ? (
                  <span style={{ color: "#EF4444", fontWeight: 600 }}>⚠️ {stats.pendingCapa} Pending CAPA Actions</span>
                ) : (
                  "All outliers resolved"
                )}
              </div>
            </div>

            <div style={S.card}>
              <div style={S.kpiTitle}>Alternative Assessments</div>
              <div style={S.kpiValue}>{stats.altCount}</div>
              <div style={S.kpiSub}>
                Active validations logged under §7.3.7.2
              </div>
            </div>
          </div>

          {/* Test Coverage Map Card */}
          <div style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#1E293B" }}>Active Parameter PT/EQA Coverage Registry</h3>
                <p style={{ fontSize: 11, color: "#64748B", margin: "4px 0 0" }}>ISO 15189 Requirement: Verify exam accuracy using external comparison programmes.</p>
              </div>
              <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 550, marginLeft: "auto" }}>
                <input
                  type="text"
                  placeholder="Search test name, code or method..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ flex: 1, ...S.inp }}
                />
                <select
                  value={coverageDept}
                  onChange={(e) => setCoverageDept(e.target.value)}
                  style={{ width: 180, ...S.inp }}
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Code</th>
                    <th style={S.th}>Parameter Name</th>
                    <th style={S.th}>Department</th>
                    <th style={S.th}>Test Type</th>
                    <th style={S.th}>Methodology</th>
                    <th style={S.th}>PT Coverage Program</th>
                    <th style={S.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCoverageTests.map((t, idx) => {
                    const hasPT = t.proficiencyTesting && t.proficiencyTesting !== "None";
                    const isAlternative = t.proficiencyTesting === "Alternative Methodology (No Formal EQA Available)";
                    
                    let badgeBg = "#FEF3C7";
                    let badgeColor = "#D97706";
                    let badgeLabel = "Not Mapped";
                    
                    if (hasPT) {
                      if (isAlternative) {
                        badgeBg = "#F3E8FF";
                        badgeColor = "#7E22CE";
                        badgeLabel = "Alternative Method";
                      } else {
                        badgeBg = "#ECFDF5";
                        badgeColor = "#047857";
                        badgeLabel = "Formal EQAS";
                      }
                    }

                    return (
                      <tr key={t.mblCode} style={{ background: idx % 2 === 1 ? "#F8FAFC" : "#fff" }}>
                        <td style={{ ...S.td, fontWeight: 600, color: "#534AB7" }}>{t.mblCode}</td>
                        <td style={{ ...S.td, fontWeight: 500 }}>{t.testName}</td>
                        <td style={S.td}>{t.department}</td>
                        <td style={S.td}>{t.type || "Quantitative"}</td>
                        <td style={{ ...S.td, color: "#64748B", fontSize: 12 }}>{t.testMethod || "N/A"}</td>
                        <td style={{ ...S.td, fontWeight: 500 }}>
                          {isAlternative ? (
                            <span title={t.alternativeMethodology} style={{ color: "#7E22CE", fontSize: 12, cursor: "help" }}>
                              {t.alternativeMethodology?.split(":")[0] || "Sample Exchange"}
                            </span>
                          ) : (
                            t.proficiencyTesting || "—"
                          )}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(badgeBg, badgeColor)}>{badgeLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCoverageTests.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748B" }}>
                        No test parameters match your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Z-SCORE & SDI TRENDS */}
      {activeTab === "zscore" && (
        <div>
          {/* Top selection strip */}
          <div style={{ ...S.card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 250 }}>
              <label style={S.label}>SELECT QUANTITATIVE PARAMETER TO ANALYZE</label>
              <select
                value={selectedAnalyte}
                onChange={(e) => setSelectedAnalyte(e.target.value)}
                style={S.inp}
                id="select_analyte"
              >
                <option value="">-- Choose Parameter --</option>
                {tests
                  .filter(t => t.type === "Quantitative" || !t.type)
                  .map(t => (
                    <option key={t.mblCode} value={t.mblCode}>
                      {t.mblCode} — {t.testName} ({t.department})
                    </option>
                  ))}
              </select>
            </div>
            {selectedAnalyteMeta && (
              <div style={{ display: "flex", gap: 24 }}>
                <div>
                  <span style={S.label}>PT PROVIDER</span>
                  <strong style={{ fontSize: 13.5, color: "#334155" }}>{selectedAnalyteMeta.proficiencyTesting || "N/A"}</strong>
                </div>
                <div>
                  <span style={S.label}>EQUIPMENT / METHOD</span>
                  <strong style={{ fontSize: 13.5, color: "#334155" }}>
                    {selectedAnalyteMeta.equipment || "N/A"} · {selectedAnalyteMeta.testMethod?.slice(0, 20) || "N/A"}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {selectedAnalyteRuns.length > 0 ? (
            <div style={S.grid(3)}>
              {/* SVG Trend Chart Card */}
              <div style={{ ...S.card, gridColumn: "span 2" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Proficiency Testing SDI (Z-Score) Trend</h3>
                <p style={{ fontSize: 11, color: "#64748B", margin: "4px 0 16px" }}>
                  Acceptable Consensus Limits: Z &lt; 2.0. Satisfactory (Teal), Warning (Amber), Out of Control (Red).
                </p>

                <div style={{ position: "relative" }}>
                  {/* SVG Plot */}
                  <svg viewBox="0 0 700 240" style={{ width: "100%", height: "auto", overflow: "visible" }}>
                    {/* Background Grid bands */}
                    {/* Satisfactory band (-2 to +2) */}
                    <rect x="50" y="60" width="620" height="80" fill="#ECFDF5" fillOpacity="0.4" />
                    {/* Marginal warning bands (2 to 3, -2 to -3) */}
                    <rect x="50" y="40" width="620" height="20" fill="#FFFBEB" fillOpacity="0.5" />
                    <rect x="50" y="140" width="620" height="20" fill="#FFFBEB" fillOpacity="0.5" />

                    {/* Horizontal limit lines */}
                    {/* Z=0 */}
                    <line x1="50" y1="100" x2="670" y2="100" stroke="#10B981" strokeWidth="1" />
                    {/* Z=+2.0 */}
                    <line x1="50" y1="60" x2="670" y2="60" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Z=-2.0 */}
                    <line x1="50" y1="140" x2="670" y2="140" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Z=+3.0 */}
                    <line x1="50" y1="40" x2="670" y2="40" stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" />
                    {/* Z=-3.0 */}
                    <line x1="50" y1="160" x2="670" y2="160" stroke="#EF4444" strokeWidth="1" strokeDasharray="3,3" />

                    {/* Axis Labels */}
                    <text x="15" y="44" fontSize="10.5" fill="#EF4444" fontWeight="600">+3.0 (Unsat)</text>
                    <text x="15" y="64" fontSize="10.5" fill="#D97706" fontWeight="600">+2.0 (Marg)</text>
                    <text x="15" y="104" fontSize="10.5" fill="#047857" fontWeight="600">0.0 (Target)</text>
                    <text x="15" y="144" fontSize="10.5" fill="#D97706" fontWeight="600">-2.0 (Marg)</text>
                    <text x="15" y="164" fontSize="10.5" fill="#EF4444" fontWeight="600">-3.0 (Unsat)</text>

                    {/* Plot Points and Connecting Line */}
                    {(() => {
                      const W = 620, PAD_L = 50;
                      const yScale = (val) => {
                        const clamped = Math.max(-3.5, Math.min(3.5, val));
                        return 100 - (clamped / 3.5) * 80;
                      };
                      const xStep = selectedAnalyteRuns.length > 1 ? W / (selectedAnalyteRuns.length - 1) : 0;

                      const points = selectedAnalyteRuns.map((r, i) => {
                        const score = parseFloat(r.score) || 0;
                        return {
                          x: PAD_L + i * xStep,
                          y: yScale(score),
                          score,
                          cycle: r.cycleName,
                          status: r.status,
                          result: r.labResult,
                          target: r.targetValue
                        };
                      });

                      const pathD = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

                      return (
                        <g>
                          {selectedAnalyteRuns.length > 1 && (
                            <path d={pathD} fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round" />
                          )}
                          {points.map((p, i) => {
                            let dotColor = "#10B981";
                            if (p.status === "Marginal") dotColor = "#F59E0B";
                            if (p.status === "Unsatisfactory") dotColor = "#EF4444";

                            return (
                              <g key={i}>
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r="5.5"
                                  fill={dotColor}
                                  stroke="#FFF"
                                  strokeWidth="1.5"
                                  style={{ cursor: "pointer" }}
                                />
                                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1E293B">
                                  {p.score > 0 ? `+${p.score}` : p.score}
                                </text>
                                <text x={p.x} y="195" textAnchor="middle" fontSize="9.5" fill="#475569" transform={`rotate(-15, ${p.x}, 200)`} fontWeight="500">
                                  {p.cycle}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Analyte stats card */}
              <div style={S.card}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1E293B" }}>Analyte EQA Metrics</h3>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748B", fontSize: 12.5 }}>Total Logged Cycles</span>
                    <strong style={{ fontSize: 13.5 }}>{analyteStats?.total}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748B", fontSize: 12.5 }}>Average absolute Z-Score</span>
                    <strong style={{ fontSize: 13.5 }}>{analyteStats?.avgZ}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748B", fontSize: 12.5 }}>Max Positive Z-score</span>
                    <strong style={{ fontSize: 13.5, color: parseFloat(analyteStats?.maxZ) > 2 ? "#EF4444" : "#1E293B" }}>
                      {analyteStats?.maxZ}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 8 }}>
                    <span style={{ color: "#64748B", fontSize: 12.5 }}>Max Negative Z-score</span>
                    <strong style={{ fontSize: 13.5, color: Math.abs(parseFloat(analyteStats?.minZ)) > 2 ? "#EF4444" : "#1E293B" }}>
                      {analyteStats?.minZ}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 4 }}>
                    <span style={{ color: "#64748B", fontSize: 12.5 }}>Acceptable Run Success %</span>
                    <strong style={{ fontSize: 14, color: analyteStats?.satisfactoryPct >= 90 ? "#10B981" : "#F59E0B" }}>
                      {analyteStats?.satisfactoryPct}%
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: 24, padding: "12px 14px", background: "#ECFDF5", borderRadius: 8, border: "0.5px solid #A7F3D0" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#065F46" }}>ISO 15189 Evaluation Status</div>
                  <p style={{ fontSize: 11, color: "#047857", margin: "4px 0 0", lineHeight: "1.4" }}>
                    {analyteStats?.satisfactoryPct >= 90 
                      ? "Consensus is excellent. Calibration and instrument precision comply with lab Quality Objectives."
                      : "Action recommended. Warning limit violations require review of trueness control documentation."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...S.card, textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 40 }}>🧪</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#475569", marginTop: 12 }}>No Formal EQA Data Available</h3>
              <p style={{ fontSize: 12, color: "#64748B", margin: "6px auto 16px", maxWidth: 450 }}>
                We could not find any logged formal EQAS/PT cycle runs for this analyte in Firestore. Tests utilizing alternative validation strategies are monitored in the Alternative Assessments tab.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {eqaRuns.length === 0 && (
                  <button onClick={seedMockData} style={S.btn("#534AB7")}>
                    💡 Seed Simulation Log Data
                  </button>
                )}
                <span style={{ fontSize: 12, color: "#64748B", alignSelf: "center" }}>
                  Or log a run in the department EQA cockpit workspace.
                </span>
              </div>
            </div>
          )}

          {/* Outliers and CAPA Audit registry for selected analyte */}
          {selectedAnalyteRuns.length > 0 && (
            <div style={S.card}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#EF4444" }}>Outliers Registry & Root Cause Analysis (CAPA)</h3>
              <p style={{ fontSize: 11, color: "#64748B", margin: "4px 0 16px" }}>
                ISO 15189 Compliance: Out-of-consensus evaluations (|SDI| &gt; 2.0) must document root-cause investigations (RCA) and corrective actions.
              </p>

              {selectedAnalyteRuns.filter(r => r.status !== "Satisfactory").length > 0 ? (
                <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Cycle Name</th>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Lab Result</th>
                        <th style={S.th}>Target</th>
                        <th style={S.th}>SDI / Z-Score</th>
                        <th style={S.th}>Status</th>
                        <th style={{ ...S.th, width: "35%" }}>Corrective Action & Root Cause</th>
                        <th style={S.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAnalyteRuns
                        .filter(r => r.status !== "Satisfactory")
                        .map((r, idx) => (
                          <tr key={r.id} style={{ background: idx % 2 === 1 ? "#F8FAFC" : "#fff" }}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{r.cycleName}</td>
                            <td style={S.td}>{r.receivedDate}</td>
                            <td style={S.td}>{r.labResult}</td>
                            <td style={S.td}>{r.targetValue}</td>
                            <td style={{ ...S.td, fontWeight: 700, color: "#EF4444" }}>{r.score}</td>
                            <td style={S.td}>
                              <span style={S.badge(r.status === "Unsatisfactory" ? "#FEE2E2" : "#FEF3C7", r.status === "Unsatisfactory" ? "#EF4444" : "#D97706")}>
                                {r.status}
                              </span>
                            </td>
                            <td style={S.td}>
                              {editingRunId === r.id ? (
                                <textarea
                                  value={caText}
                                  onChange={(e) => setCaText(e.target.value)}
                                  placeholder="Input root cause and corrective action..."
                                  style={{ ...S.inp, minHeight: 60, fontSize: 12, fontFamily: "inherit" }}
                                />
                              ) : (
                                <span style={{ fontSize: 12, color: r.correctiveAction ? "#334155" : "#EF4444", fontStyle: r.correctiveAction ? "normal" : "italic", fontWeight: r.correctiveAction ? 400 : 600 }}>
                                  {r.correctiveAction || "⚠️ CAPA Needed. No corrective action plan has been registered yet."}
                                </span>
                              )}
                            </td>
                            <td style={S.td}>
                              {editingRunId === r.id ? (
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    onClick={() => handleSaveCAPA(r.id)}
                                    disabled={savingCa}
                                    style={S.btn("#10B981")}
                                  >
                                    {savingCa ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => { setEditingRunId(null); setCaText(""); }}
                                    style={S.btn("#EF4444")}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingRunId(r.id); setCaText(r.correctiveAction || ""); }}
                                  style={S.btn("#534AB7")}
                                >
                                  Edit CAPA
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "16px 20px", background: "#ECFDF5", color: "#065F46", borderRadius: 8, fontSize: 12.5, fontWeight: 500 }}>
                  ✓ No outliers detected for this analyte. All logged cycles satisfy accuracy consensus targets.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: ALTERNATIVE ASSESSMENT AUDIT */}
      {activeTab === "alternative" && (
        <div>
          {/* Stats Bar */}
          <div style={S.grid(4)}>
            <div style={S.card}>
              <div style={S.kpiTitle}>Alternative Verification Cycles</div>
              <div style={S.kpiValue}>{alternativeStats.total}</div>
              <div style={S.kpiSub}>Total runs under ISO §7.3.7.2 logged</div>
            </div>
            <div style={S.card}>
              <div style={S.kpiTitle}>Verification Compliance Rate</div>
              <div style={S.kpiValue}>{alternativeStats.complianceRate}%</div>
              <div style={S.kpiSub}>Satisfactory alignment rates</div>
            </div>
            <div style={S.card}>
              <div style={S.kpiTitle}>Sample Exchanges Logged</div>
              <div style={S.kpiValue}>{alternativeStats.exchangeCount}</div>
              <div style={S.kpiSub}>Interlaboratory partner reviews</div>
            </div>
            <div style={S.card}>
              <div style={S.kpiTitle}>Split/Blind Testing runs</div>
              <div style={S.kpiValue}>{alternativeStats.splitCount}</div>
              <div style={S.kpiSub}>Operator/analyzer alignments</div>
            </div>
          </div>

          {/* Alternative audit registry table */}
          <div style={S.card}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Alternative Assessment Validation Register</h3>
            <p style={{ fontSize: 11, color: "#64748B", margin: "4px 0 16px" }}>
              Comprehensive log auditing accuracy for analytes where commercial proficiency testing programs are unavailable.
            </p>

            <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Test Parameter</th>
                    <th style={S.th}>Methodology</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Cycle Name</th>
                    <th style={S.th}>Lab Result</th>
                    <th style={S.th}>Target/Ref</th>
                    <th style={S.th}>Peer Lab / Comparator Info</th>
                    <th style={S.th}>Status</th>
                    <th style={{ ...S.th, width: "25%" }}>Corrective Action</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alternativeRuns.map((r, idx) => (
                    <tr key={r.id} style={{ background: idx % 2 === 1 ? "#F8FAFC" : "#fff" }}>
                      <td style={S.td}>
                        <strong style={{ color: "#534AB7" }}>{r.testCode}</strong>
                        <div style={{ fontSize: 11, color: "#64748B" }}>{r.testName}</div>
                      </td>
                      <td style={{ ...S.td, fontSize: 12, color: "#64748B" }}>
                        <span style={{ fontWeight: 500, color: "#4B5563" }}>{r.alternativeMethodology?.split(":")[0] || "Sample Exchange"}</span>
                        <div style={{ fontSize: 10, whiteSpace: "nowrap" }}>{r.alternativeMethodology?.split(":")[1]?.slice(0, 30) || "Interlab Comparison"}...</div>
                      </td>
                      <td style={S.td}>{r.receivedDate}</td>
                      <td style={S.td}>{r.cycleName}</td>
                      <td style={S.td}>{r.labResult}</td>
                      <td style={S.td}>{r.targetValue}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        {r.peerLabName && <div>🏫 {r.peerLabName}</div>}
                        {r.comparatorMethod && <div style={{ color: "#64748B", fontSize: 11 }}>⚙️ {r.comparatorMethod}</div>}
                      </td>
                      <td style={S.td}>
                        <span style={S.badge(r.status === "Satisfactory" ? "#ECFDF5" : "#FEF3C7", r.status === "Satisfactory" ? "#047857" : "#D97706")}>
                          {r.status}
                        </span>
                      </td>
                      <td style={S.td}>
                        {editingRunId === r.id ? (
                          <textarea
                            value={caText}
                            onChange={(e) => setCaText(e.target.value)}
                            placeholder="Input root cause and corrective action..."
                            style={{ ...S.inp, minHeight: 60, fontSize: 12, fontFamily: "inherit" }}
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: r.correctiveAction ? "#334155" : "#EF4444", fontStyle: r.correctiveAction ? "normal" : "italic", fontWeight: r.correctiveAction ? 400 : 600 }}>
                            {r.correctiveAction || (r.status !== "Satisfactory" ? "⚠️ CAPA Needed" : "None required")}
                          </span>
                        )}
                      </td>
                      <td style={S.td}>
                        {editingRunId === r.id ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              onClick={() => handleSaveCAPA(r.id)}
                              disabled={savingCa}
                              style={S.btn("#10B981")}
                            >
                              {savingCa ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => { setEditingRunId(null); setCaText(""); }}
                              style={S.btn("#EF4444")}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingRunId(r.id); setCaText(r.correctiveAction || ""); }}
                            style={S.btn("#534AB7")}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {alternativeRuns.length === 0 && (
                    <tr>
                      <td colSpan="10" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748B" }}>
                        No alternative assessment verifications logged.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: PROVIDER EVALUATION SCORECARD */}
      {activeTab === "providers" && (
        <div>
          <div style={S.card}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Approved PT / EQAS Provider Evaluations Scorecard</h3>
            <p style={{ fontSize: 11, color: "#64748B", margin: "4px 0 16px" }}>
              An annual evaluation is conducted on approved external comparison service reliability and consensus peer groups.
            </p>

            <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Proficiency Testing Program / Provider</th>
                    <th style={S.th}>Registered Analytes</th>
                    <th style={S.th}>Completed Cycles</th>
                    <th style={S.th}>Average Consensus Bias (Abs Z-score)</th>
                    <th style={S.th}>Satisfactory Run Success Rate</th>
                    <th style={S.th}>On-Time Submission Rate</th>
                    <th style={S.th}>Reliability Status</th>
                  </tr>
                </thead>
                <tbody>
                  {providerScorecard.map((p, idx) => {
                    let statusBg = "#ECFDF5";
                    let statusColor = "#047857";
                    let statusLabel = "High Reliability";

                    const satVal = typeof p.satisfactoryPct === "number" ? p.satisfactoryPct : 100;
                    if (satVal < 90 && satVal >= 80) {
                      statusBg = "#FFFBEB";
                      statusColor = "#D97706";
                      statusLabel = "Moderate Reliability";
                    } else if (satVal < 80) {
                      statusBg = "#FEE2E2";
                      statusColor = "#EF4444";
                      statusLabel = "Under Audit Review";
                    }

                    return (
                      <tr key={p.name} style={{ background: idx % 2 === 1 ? "#F8FAFC" : "#fff" }}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                        <td style={S.td}>{p.registered}</td>
                        <td style={S.td}>{p.completed}</td>
                        <td style={S.td}>
                          <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: "bold" }}>
                            {p.avgAbsZ}
                          </span>
                        </td>
                        <td style={S.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 600, color: satVal >= 90 ? "#10B981" : "#D97706" }}>
                              {p.satisfactoryPct}%
                            </span>
                            <div style={{ width: 60, height: 6, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ width: `${satVal}%`, height: "100%", background: satVal >= 90 ? "#10B981" : "#D97706" }} />
                            </div>
                          </div>
                        </td>
                        <td style={S.td}>
                          <strong style={{ color: p.timelinessPct >= 90 ? "#10B981" : "#D97706" }}>
                            {p.timelinessPct}%
                          </strong>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(statusBg, statusColor)}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {providerScorecard.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748B" }}>
                        No provider evaluation statistics available. Please seed simulation records or log runs.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}