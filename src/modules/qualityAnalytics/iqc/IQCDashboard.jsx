// IQCDashboard.jsx
// MBL QMS — Quality Analytics IQC Dashboard
// Compliant with ISO 15189:2022 §7.6 standards
// Dynamically calculates statistics (CV, Bias, Sigma) and renders control charts.

import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { initialTests } from "../../../data/testMasterData";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh", color: "#1E293B" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 16, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 11, color: "#64748B", marginTop: 4 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  btn: (bg, color) => ({ padding: "6px 12px", background: bg || "#0D9488", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F8FAFC", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, outline: "none", background: "#fff" }
};

// Levey-Jennings SVG chart component
function LJChart({ data, mean, sd, title }) {
  const W = 620, H = 180, PAD = { l: 45, r: 15, t: 15, b: 24 };
  const maxY = mean + 4 * sd, minY = mean - 4 * sd;
  const yScale = (v) => H - PAD.b - ((v - minY) / (maxY - minY)) * (H - PAD.t - PAD.b);
  const xStep = data.length > 1 ? (W - PAD.l - PAD.r) / (data.length - 1) : 0;

  const sdLines = [-3, -2, -1, 0, 1, 2, 3].map(s => ({
    y: yScale(mean + s * sd),
    label: s === 0 ? "Mean" : `${s > 0 ? "+" : ""}${s}SD`,
    sd: s,
    value: (mean + s * sd).toFixed(2)
  }));

  const points = data.map((d, i) => ({ x: PAD.l + i * xStep, y: yScale(d.value), v: d }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      {sdLines.map((l, i) => (
        <g key={i}>
          <line x1={PAD.l} x2={W - PAD.r} y1={l.y} y2={l.y}
            stroke={l.sd === 0 ? "#0D9488" : Math.abs(l.sd) === 3 ? "#EF4444" : Math.abs(l.sd) === 2 ? "#F59E0B" : "#CBD5E1"}
            strokeWidth={l.sd === 0 ? 1.5 : 0.8} strokeDasharray={l.sd === 0 ? "none" : "3 3"} />
          <text x={2} y={l.y + 3} fontSize={8.5} fill="#475569" fontWeight={l.sd === 0 ? "bold" : "normal"}>{l.label}</text>
          <text x={W - 35} y={l.y - 2} fontSize={7.5} fill="#94A3B8" textAnchor="end">{l.value}</text>
        </g>
      ))}
      {points.length > 1 && (
        <polyline fill="none" stroke="#2563EB" strokeWidth={1.5}
          points={points.map(p => `${p.x},${p.y}`).join(" ")} />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4.5}
          fill={p.v.violations?.some(v => v.severity === "Reject") ? "#EF4444" : p.v.violations?.length > 0 ? "#F59E0B" : "#10B981"}
          stroke="#FFF" strokeWidth={1} />
      ))}
    </svg>
  );
}

export default function IQCDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  
  const [tests, setTests] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Selection States
  const [selectedQuantTest, setSelectedQuantTest] = useState("");
  const [selectedQuantLevel, setSelectedQuantLevel] = useState("Level 2 (Normal)");
  const [selectedQualTest, setSelectedQualTest] = useState("");
  const [selectedSemiTest, setSelectedSemiTest] = useState("");

  // Load Test Master & Firestore results
  useEffect(() => {
    const cachedTests = localStorage.getItem("mbl_test_master");
    let testList = cachedTests ? JSON.parse(cachedTests) : initialTests;
    setTests(testList);

    // Default selectors
    const quant = testList.find(t => t.type === "Quantitative");
    if (quant) setSelectedQuantTest(quant.mblCode);
    const qual = testList.find(t => t.type === "Qualitative");
    if (qual) setSelectedQualTest(qual.mblCode);
    const semi = testList.find(t => t.type === "Semi-Quantitative");
    if (semi) setSelectedSemiTest(semi.mblCode);

    async function loadResults() {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, "iqcResults"), orderBy("createdAt", "desc")));
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Failed to load IQC runs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadResults();
  }, []);

  // Filter lists
  const quantTests = tests.filter(t => t.type === "Quantitative");
  const qualTests = tests.filter(t => t.type === "Qualitative");
  const semiTests = tests.filter(t => t.type === "Semi-Quantitative");

  // Calculations for current selected Quantitative test & level
  const activeQuantObj = tests.find(t => t.mblCode === selectedQuantTest);
  const quantRuns = results
    .filter(r => r.testCode === selectedQuantTest && r.type === "Quantitative" && r.level === selectedQuantLevel)
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-20);

  // Statistics Calculator
  const getQuantStats = () => {
    if (quantRuns.length === 0) return { mean: 0, sd: 0, cv: 0, bias: 0, sigma: 0, status: "No Data" };
    
    const values = quantRuns.map(r => r.value);
    const count = values.length;
    const sum = values.reduce((a,b) => a + b, 0);
    const mean = sum / count;
    
    let variance = 0;
    if (count > 1) {
      variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (count - 1);
    }
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? (sd / mean) * 100 : 0;
    
    // Bias relative to target Mean configured in TestMaster or entered
    const targetMean = quantRuns[count - 1].mean || 100;
    const targetSd = quantRuns[count - 1].sd || 5;
    const bias = targetMean > 0 ? Math.abs(((mean - targetMean) / targetMean) * 100) : 0;
    
    // Assume 10% TEa (Total Allowable Error) limit as standard default if not specified
    const tea = 10; 
    const sigma = cv > 0 ? (tea - bias) / cv : 0;
    
    let status = "World Class (≥6σ)";
    if (sigma < 3) status = "Unacceptable (<3σ)";
    else if (sigma < 4) status = "Marginal (3σ - 4σ)";
    else if (sigma < 6) status = "Excellent (4σ - 6σ)";

    return {
      mean: mean.toFixed(2),
      sd: sd.toFixed(3),
      cv: cv.toFixed(2),
      bias: bias.toFixed(2),
      sigma: sigma.toFixed(2),
      status,
      targetMean,
      targetSd
    };
  };

  const qStats = getQuantStats();

  // Shift & Trend analysis
  const getShiftsAndTrends = () => {
    if (quantRuns.length < 6) return { shifts: "None", trends: "None" };
    
    const values = quantRuns.map(r => r.value);
    const targetMean = qStats.targetMean || 100;
    
    // Check Shift: 6 consecutive points on same side of mean
    let shiftDetected = false;
    for (let i = 0; i <= values.length - 6; i++) {
      const window = values.slice(i, i + 6);
      if (window.every(v => v > targetMean) || window.every(v => v < targetMean)) {
        shiftDetected = true;
        break;
      }
    }
    
    // Check Trend: 6 consecutive increasing or decreasing points
    let trendDetected = false;
    for (let i = 0; i <= values.length - 6; i++) {
      const window = values.slice(i, i + 6);
      let inc = true;
      let dec = true;
      for (let j = 1; j < 6; j++) {
        if (window[j] <= window[j - 1]) inc = false;
        if (window[j] >= window[j - 1]) dec = false;
      }
      if (inc || dec) {
        trendDetected = true;
        break;
      }
    }

    return {
      shifts: shiftDetected ? "⚠️ Shift detected (6+ consecutive points same side of Mean)" : "✅ Stable (No shift)",
      trends: trendDetected ? "⚠️ Trend detected (6+ consecutive points drift)" : "✅ Stable (No drift)"
    };
  };

  const alerts = getShiftsAndTrends();

  // Qualitative Analysis
  const activeQualObj = tests.find(t => t.mblCode === selectedQualTest);
  const qualRuns = results.filter(r => r.testCode === selectedQualTest && r.type === "Qualitative");
  const qualPassCount = qualRuns.filter(r => r.status === "Pass").length;
  const qualPassRate = qualRuns.length > 0 ? (qualPassCount / qualRuns.length) * 100 : 0;

  // Semi-Quantitative Analysis
  const activeSemiObj = tests.find(t => t.mblCode === selectedSemiTest);
  const semiRuns = results.filter(r => r.testCode === selectedSemiTest && r.type === "Semi-Quantitative");
  const semiPassCount = semiRuns.filter(r => r.status === "Pass").length;
  const semiPassRate = semiRuns.length > 0 ? (semiPassCount / semiRuns.length) * 100 : 0;

  // Calculate category frequencies for semi-quantitative test
  const getCategoryFrequencies = () => {
    const cats = (activeSemiObj?.semiQuantCategories || "Negative, Trace, 1+, 2+, 3+").split(",").map(c => c.trim());
    const freq = {};
    cats.forEach(c => { freq[c] = 0; });
    semiRuns.forEach(r => {
      if (freq[r.observedCategory] !== undefined) freq[r.observedCategory]++;
    });
    return { cats, freq };
  };

  const { cats: semiCats, freq: semiFreqs } = getCategoryFrequencies();

  return (
    <div style={S.wrap}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>IQC Quality Intelligence Dashboard</h2>
          <div style={S.subtitle}>ISO 15189:2022 §7.6 · Central Quality Indicators & Performance Analytics</div>
        </div>
        <div style={{ display: "flex", gap: 6, background: "#E2E8F0", padding: 4, borderRadius: 8 }}>
          {[
            { key: "overview", label: "General Overview" },
            { key: "quant", label: "Quantitative (L-J)" },
            { key: "qual", label: "Qualitative Reviews" },
            { key: "semi", label: "Semi-Quantitative" }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "6px 12px", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600,
                background: activeTab === t.key ? "#FFF" : "transparent",
                color: activeTab === t.key ? "#0D9488" : "#475569",
                cursor: "pointer", transition: "all 0.15s"
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading IQC statistical registers...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div style={S.grid(4)}>
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Total Runs logged</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{results.length}</div>
                </div>
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Global Pass Rate</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#0F766E", marginTop: 4 }}>
                    {(results.length > 0 ? (results.filter(r => r.status === "Pass").length / results.length) * 100 : 0).toFixed(1)}%
                  </div>
                </div>
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Westgard warning alerts</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#D97706", marginTop: 4 }}>
                    {results.filter(r => r.status === "Warning").length}
                  </div>
                </div>
                <div style={{ ...S.card, marginBottom: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase" }}>Runs Rejected (Fails)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#991B1B", marginTop: 4 }}>
                    {results.filter(r => r.status === "Fail").length}
                  </div>
                </div>
              </div>

              <div style={{ ...S.card, marginTop: 20 }}>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#1E293B", marginBottom: 14 }}>Dynamic Test Parameters IQC Compliance Grid</h3>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Code</th>
                      <th style={S.th}>Parameter Name</th>
                      <th style={S.th}>Department</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Runs logged</th>
                      <th style={S.th}>Pass Rate</th>
                      <th style={S.th}>Recent Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map(t => {
                      const testRuns = results.filter(r => r.testCode === t.mblCode);
                      const passCount = testRuns.filter(r => r.status === "Pass").length;
                      const rate = testRuns.length > 0 ? (passCount / testRuns.length) * 100 : 0;
                      const recent = testRuns[0];

                      return (
                        <tr key={t.mblCode}>
                          <td style={S.td}><code>{t.mblCode}</code></td>
                          <td style={S.td} style={{ fontWeight: 600 }}>{t.testName}</td>
                          <td style={S.td}>{t.department}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: t.type === "Quantitative" ? "#EFF6FF" : t.type === "Qualitative" ? "#F5F3FF" : "#FEF3C7",
                              color: t.type === "Quantitative" ? "#1E40AF" : t.type === "Qualitative" ? "#5B21B6" : "#B45309"
                            }}>{t.type}</span>
                          </td>
                          <td style={S.td}>{testRuns.length}</td>
                          <td style={S.td}>
                            {testRuns.length > 0 ? (
                              <strong style={{ color: rate >= 90 ? "#166534" : rate >= 75 ? "#D97706" : "#991B1B" }}>{rate.toFixed(1)}%</strong>
                            ) : "—"}
                          </td>
                          <td style={S.td}>
                            {recent ? (
                              <span style={{
                                padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                                background: recent.status === "Pass" ? "#DCFCE7" : recent.status === "Warning" ? "#FEF3C7" : "#FEE2E2",
                                color: recent.status === "Pass" ? "#166534" : recent.status === "Warning" ? "#92400E" : "#991B1B"
                              }}>{recent.status}</span>
                            ) : <span style={{ color: "#94A3B8" }}>No runs</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: QUANTITATIVE STATS */}
          {activeTab === "quant" && (
            <div>
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#1E293B", margin: 0 }}>Quantitative Analytical Statistics</h3>
                  <div style={{ display: "flex", gap: 10 }}>
                    <select
                      style={S.inp}
                      value={selectedQuantTest}
                      onChange={e => setSelectedQuantTest(e.target.value)}
                    >
                      {quantTests.map(t => (
                        <option key={t.mblCode} value={t.mblCode}>{t.testName} ({t.mblCode})</option>
                      ))}
                    </select>
                    <select
                      style={S.inp}
                      value={selectedQuantLevel}
                      onChange={e => setSelectedQuantLevel(e.target.value)}
                    >
                      <option>Level 1 (Low)</option>
                      <option>Level 2 (Normal)</option>
                      <option>Level 3 (High)</option>
                    </select>
                  </div>
                </div>

                {quantRuns.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748B", padding: "40px 0" }}>
                    No quantitative control runs found in database for this analyte level.
                  </div>
                ) : (
                  <div>
                    {/* Levey-Jennings chart */}
                    <LJChart data={quantRuns} mean={parseFloat(qStats.targetMean) || 100} sd={parseFloat(qStats.targetSd) || 5} title={`Levey-Jennings chart for ${activeQuantObj?.testName} — ${selectedQuantLevel}`} />

                    {/* Stats table */}
                    <div style={{ ...S.grid(4), marginTop: 20 }}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Calculated Mean</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{qStats.mean}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Target: {qStats.targetMean}</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Calculated CV%</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{qStats.cv}%</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Target Limit: &lt;5%</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Calculated Bias%</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{qStats.bias}%</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Limit (TEa): &lt;10%</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Sigma Metric (σ)</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: parseFloat(qStats.sigma) >= 4 ? "#166534" : "#991B1B", marginTop: 4 }}>{qStats.sigma}</div>
                        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{qStats.status}</div>
                      </div>
                    </div>

                    {/* Shifts & Trends alerts */}
                    <div style={{ ...S.grid(2), marginTop: 14 }}>
                      <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 11, color: "#92400E" }}>Shift Analysis (Systematic Error)</strong>
                        <div style={{ fontSize: 12.5, color: "#B45309", marginTop: 4 }}>{alerts.shifts}</div>
                      </div>
                      <div style={{ background: "#EFF6FF", border: "1px solid #3B82F6", borderRadius: 8, padding: 12 }}>
                        <strong style={{ fontSize: 11, color: "#1E40AF" }}>Trend Analysis (Reagent/Calibration Drift)</strong>
                        <div style={{ fontSize: 12.5, color: "#1D4ED8", marginTop: 4 }}>{alerts.trends}</div>
                      </div>
                    </div>

                    {/* Westgard violations list */}
                    <div style={{ marginTop: 20 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10 }}>Troubleshooting Register & Violations</h4>
                      <table style={S.table}>
                        <thead>
                          <tr style={{ background: "#F8FAFC" }}>
                            <th style={S.th}>Date</th>
                            <th style={S.th}>Observed Value</th>
                            <th style={S.th}>Target Mean/SD</th>
                            <th style={S.th}>Westgard Rules Violated</th>
                            <th style={S.th}>Troubleshooting Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quantRuns.filter(r => r.violations && r.violations.length > 0).map((r, idx) => (
                            <tr key={idx}>
                              <td style={S.td}>{fmtDate({ toDate: () => new Date(r.createdAt) })}</td>
                              <td style={S.td} style={{ fontWeight: 600, color: "#991B1B" }}>{r.value}</td>
                              <td style={S.td}>{r.mean} / {r.sd}</td>
                              <td style={S.td}>
                                {r.violations.map((v, vi) => (
                                  <span key={vi} style={{
                                    marginRight: 4, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                                    background: v.severity === "Reject" ? "#FEE2E2" : "#FEF3C7",
                                    color: v.severity === "Reject" ? "#991B1B" : "#B45309"
                                  }}>{v.rule} ({v.severity})</span>
                                ))}
                              </td>
                              <td style={S.td} style={{ fontStyle: "italic", fontSize: 11.5 }}>{r.remarks || "No remarks entered."}</td>
                            </tr>
                          ))}
                          {quantRuns.filter(r => r.violations && r.violations.length > 0).length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ padding: 14, textAlign: "center", color: "#94A3B8" }}>No Westgard violations observed on this parameter.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUALITATIVE STATS */}
          {activeTab === "qual" && (
            <div>
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#1E293B", margin: 0 }}>Qualitative Parameter Reviews</h3>
                  <select
                    style={S.inp}
                    value={selectedQualTest}
                    onChange={e => setSelectedQualTest(e.target.value)}
                  >
                    {qualTests.map(t => (
                      <option key={t.mblCode} value={t.mblCode}>{t.testName} ({t.mblCode})</option>
                    ))}
                  </select>
                </div>

                {qualRuns.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748B", padding: "40px 0" }}>
                    No qualitative control runs logged in database for this parameter.
                  </div>
                ) : (
                  <div>
                    <div style={S.grid(3)}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Total Control Runs</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{qualRuns.length}</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Control Success Rate</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: qualPassRate >= 95 ? "#166534" : "#991B1B", marginTop: 4 }}>{qualPassRate.toFixed(1)}%</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>NABL PT / EQAS mapping</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1E40AF", marginTop: 8 }}>{activeQualObj?.proficiencyTesting || "Unspecified"}</div>
                      </div>
                    </div>

                    <h4 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: 20, marginBottom: 10 }}>Control Validation Audit Trail</h4>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Date</th>
                          <th style={S.th}>Control Type</th>
                          <th style={S.th}>Expected Result</th>
                          <th style={S.th}>Observed Result</th>
                          <th style={S.th}>Status</th>
                          <th style={S.th}>Verifier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qualRuns.map((r, idx) => (
                          <tr key={idx}>
                            <td style={S.td}>{fmtDate({ toDate: () => new Date(r.createdAt) })}</td>
                            <td style={S.td}><strong>{r.controlType}</strong></td>
                            <td style={S.td}>{r.expectedResult}</td>
                            <td style={S.td} style={{ fontWeight: 600 }}>{r.observedResult}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 700,
                                background: r.status === "Pass" ? "#DCFCE7" : "#FEE2E2",
                                color: r.status === "Pass" ? "#166534" : "#991B1B"
                              }}>{r.status}</span>
                            </td>
                            <td style={S.td} style={{ color: "#64748B" }}>{r.enteredBy}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SEMI-QUANTITATIVE STATS */}
          {activeTab === "semi" && (
            <div>
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#1E293B", margin: 0 }}>Semi-Quantitative Parameter Review</h3>
                  <select
                    style={S.inp}
                    value={selectedSemiTest}
                    onChange={e => setSelectedSemiTest(e.target.value)}
                  >
                    {semiTests.map(t => (
                      <option key={t.mblCode} value={t.mblCode}>{t.testName} ({t.mblCode})</option>
                    ))}
                  </select>
                </div>

                {semiRuns.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748B", padding: "40px 0" }}>
                    No semi-quantitative control runs logged in database for this parameter.
                  </div>
                ) : (
                  <div>
                    <div style={S.grid(3)}>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Total Control Runs</div>
                        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{semiRuns.length}</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Validation Rate</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: semiPassRate >= 95 ? "#166534" : "#991B1B", marginTop: 4 }}>{semiPassRate.toFixed(1)}%</div>
                      </div>
                      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: "#64748B" }}>Expected Target / Range</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#B45309", marginTop: 6 }}>{activeSemiObj?.expectedRange || "Negative"}</div>
                      </div>
                    </div>

                    <div style={{ ...S.grid(2), marginTop: 20 }}>
                      {/* Categories frequency distribution */}
                      <div style={{ border: "1px solid #E2E8F0", padding: 16, borderRadius: 10 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Observed Categories Distribution</h4>
                        {semiCats.map(cat => {
                          const freq = semiFreqs[cat] || 0;
                          const pct = semiRuns.length > 0 ? (freq / semiRuns.length) * 100 : 0;
                          return (
                            <div key={cat} style={{ marginBottom: 10 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                                <span>{cat}</span>
                                <strong>{freq} times ({pct.toFixed(0)}%)</strong>
                              </div>
                              <div style={{ background: "#E2E8F0", height: 6, borderRadius: 3, overflow: "hidden" }}>
                                <div style={{ background: cat.toLowerCase() === "negative" ? "#10B981" : "#D97706", height: "100%", width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Detail audit log */}
                      <div style={{ border: "1px solid #E2E8F0", padding: 16, borderRadius: 10 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 12 }}>Recent Semi-Quant Logs</h4>
                        <div style={{ maxHeight: 240, overflowY: "auto" }}>
                          <table style={S.table}>
                            <thead>
                              <tr>
                                <th style={S.th} style={{ padding: 6 }}>Date</th>
                                <th style={S.th} style={{ padding: 6 }}>Observed Category</th>
                                <th style={S.th} style={{ padding: 6 }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {semiRuns.slice(0, 10).map((r, idx) => (
                                <tr key={idx}>
                                  <td style={S.td} style={{ padding: 6 }}>{fmtDate({ toDate: () => new Date(r.createdAt) }).split(" ")[0]}</td>
                                  <td style={S.td} style={{ padding: 6, fontWeight: 600 }}>{r.observedCategory}</td>
                                  <td style={S.td} style={{ padding: 6 }}>
                                    <span style={{
                                      padding: "1px 5px", borderRadius: 8, fontSize: 9.5, fontWeight: 700,
                                      background: r.status === "Pass" ? "#DCFCE7" : "#FEE2E2",
                                      color: r.status === "Pass" ? "#166534" : "#991B1B"
                                    }}>{r.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}