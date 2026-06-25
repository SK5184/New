import { useState, useEffect, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const DEPARTMENTS = [
  "Microbiology",
  "Serology",
  "Histopathology & Cytopathology",
  "Flow Cytometry",
  "Cytogenetics",
  "Biochemistry",
  "Haematology",
  "Clinical Pathology",
  "Molecular Biology",
  "Molecular Genetics"
];

const DEPT_ABBRS = {
  "Microbiology": "Micro",
  "Serology": "Serol",
  "Histopathology & Cytopathology": "Histo",
  "Flow Cytometry": "Flow",
  "Cytogenetics": "Cyto",
  "Biochemistry": "Bioc",
  "Haematology": "Haem",
  "Clinical Pathology": "ClinP",
  "Molecular Biology": "MolB",
  "Molecular Genetics": "MolG"
};

const DEPARTMENTAL_KPIS = [
  { id: "7.5.4", name: "Sample Rejection Rate", limit: 5.0, limitNote: "≤ 5.0%" },
  { id: "7.5.5", name: "Sample Processing Error Rate", limit: 2.0, limitNote: "≤ 2.0%" },
  { id: "7.5.6", name: "IQC Performance Failure Rate", limit: 10.0, limitNote: "≤ 10.0%" },
  { id: "7.5.7", name: "EQA Failure Rate (PT)", limit: 20.0, limitNote: "≤ 20.0%" },
  { id: "7.5.8", name: "Error in Reporting Results Rate", limit: 1.0, limitNote: "≤ 1.0%" },
  { id: "7.7.11", name: "TAT Breach Rate", limit: 10.0, limitNote: "≤ 10.0%" },
  { id: "7.7.15", name: "Coefficient of Variation percent (CV%)", limit: 10.0, limitNote: "≤ 10.0%" }
];

const GLOBAL_KPIS = [
  { id: "7.5.1", name: "7.5.1 Registration Error Rate", limit: 1.0, limitNote: "≤ 1.0%" },
  { id: "7.5.2", name: "7.5.2 Sample Collection Error Rate", limit: 1.0, limitNote: "≤ 1.0%" },
  { id: "7.5.3", name: "7.5.3 Sample Transport Temp Breach Rate", limit: 1.0, limitNote: "≤ 1.0%" },
  { id: "7.5.9", name: "7.5.9 Negative Customer Feedback Rate", limit: 2.0, limitNote: "≤ 2.0%" },
  { id: "7.6.10", name: "7.6.10 Equipment Downtime Rate", limit: 10.0, limitNote: "≤ 10.0%" },
  { id: "7.7.12", name: "7.7.12 Customer Complaint Rate", limit: 5.0, limitNote: "≤ 5.0%" },
  { id: "7.7.13", name: "7.7.13 Sample Transit Time Breach Rate", limit: 5.0, limitNote: "≤ 5.0%" },
  { id: "7.7.14", name: "7.7.14 Blood Culture Contamination Rate", limit: 3.0, limitNote: "< 3.0%" }
];

function calcPct(num, den) {
  const n = parseFloat(num);
  const d = parseFloat(den);
  if (!isNaN(n) && !isNaN(d) && d > 0) return (n / d) * 100;
  return null;
}

function getStatus(val, limit) {
  if (val === null) return "none";
  if (val <= limit * 0.8) return "pass";
  if (val <= limit) return "warn";
  return "fail";
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    opts.push({ key, label });
  }
  return opts;
}

function getPastMonths(selectedMonthKey, count = 6) {
  const months = [];
  const [year, month] = selectedMonthKey.split("-").map(Number);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export default function KPIAnalytics() {
  const MONTH_OPTS = monthOptions();
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTS[0].key);
  const [selectedKPI, setSelectedKPI] = useState(DEPARTMENTAL_KPIS[0].id);
  const [selectedTrendDept, setSelectedTrendDept] = useState("Global");
  const [selectedTrendKPI, setSelectedTrendKPI] = useState(GLOBAL_KPIS[0].id);
  
  const [kpiDataMap, setKpiDataMap] = useState({});
  const [toggles, setToggles] = useState({});
  const [loading, setLoading] = useState(true);

  // Load KPI toggles
  useEffect(() => {
    async function loadToggles() {
      try {
        const snap = await getDoc(doc(db, "appSettings", "kpiToggles"));
        if (snap.exists()) setToggles(snap.data());
      } catch (e) {
        console.error("Error loading toggles:", e);
      }
    }
    loadToggles();
  }, []);

  // Bulk load 6 months of data for all departments + Global
  const loadAnalyticsData = useCallback(async (sm) => {
    setLoading(true);
    const months = getPastMonths(sm, 6);
    const tempMap = {};

    try {
      const promises = [];
      // Load departments
      DEPARTMENTS.forEach(dept => {
        tempMap[dept] = {};
        months.forEach(m => {
          const docRef = doc(db, "kpiData", dept, "monthlyData", m);
          promises.push(
            getDoc(docRef).then(snap => {
              tempMap[dept][m] = snap.exists() ? snap.data().indicators || {} : {};
            })
          );
        });
      });

      // Load Global
      tempMap["Global"] = {};
      months.forEach(m => {
        const docRef = doc(db, "kpiData", "Global", "monthlyData", m);
        promises.push(
          getDoc(docRef).then(snap => {
            tempMap["Global"][m] = snap.exists() ? snap.data().indicators || {} : {};
          })
        );
      });

      await Promise.all(promises);
      setKpiDataMap(tempMap);
    } catch (e) {
      console.error("Error loading analytics data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyticsData(selectedMonth);
  }, [selectedMonth, loadAnalyticsData]);

  // Calculations for current selected month comparisons
  const activeKPIObj = DEPARTMENTAL_KPIS.find(k => k.id === selectedKPI);
  const pastMonths = getPastMonths(selectedMonth, 6);

  // ─── CSV EXPORT ───────────────────────────────────────────────────────────
  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Department,Month,Indicator ID,Indicator Name,Numerator,Denominator,Value %\n";

    // Export Departmental KPIs
    DEPARTMENTS.forEach(dept => {
      pastMonths.forEach(m => {
        const indicators = kpiDataMap[dept]?.[m] || {};
        DEPARTMENTAL_KPIS.forEach(kpi => {
          const isEnabled = toggles[`${dept}_${kpi.id}`] !== false;
          if (!isEnabled) return;
          const entry = indicators[kpi.id] || {};
          const val = calcPct(entry.num, entry.den);
          const valStr = val !== null ? `${val.toFixed(2)}%` : "N/A";
          csvContent += `"${dept}","${m}","${kpi.id}","${kpi.name}",${entry.num || 0},${entry.den || 0},"${valStr}"\n`;
        });
      });
    });

    // Export Global KPIs
    pastMonths.forEach(m => {
      const indicators = kpiDataMap["Global"]?.[m] || {};
      GLOBAL_KPIS.forEach(kpi => {
        const entry = indicators[kpi.id] || {};
        const val = calcPct(entry.num, entry.den);
        const valStr = val !== null ? `${val.toFixed(2)}%` : "N/A";
        csvContent += `"Global","${m}","${kpi.id}","${kpi.name}",${entry.num || 0},${entry.den || 0},"${valStr}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QMS_KPI_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── PRINT PDF REPORT ─────────────────────────────────────────────────────
  const triggerPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888780", fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          border: "2px solid #E0DDD6", borderTopColor: "#0F6E56",
          animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
        }} />
        Analyzing quality metrics...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // Bar chart dataset for selected month
  const comparisonItems = DEPARTMENTS.map(dept => {
    const isEnabled = toggles[`${dept}_${selectedKPI}`] !== false;
    const entry = kpiDataMap[dept]?.[selectedMonth]?.[selectedKPI] || {};
    const val = isEnabled ? calcPct(entry.num, entry.den) : null;
    return {
      dept,
      abbr: DEPT_ABBRS[dept],
      val,
      isEnabled,
      limit: activeKPIObj.limit
    };
  });

  const maxCompareVal = Math.max(
    ...comparisonItems.map(i => i.val ?? 0),
    activeKPIObj.limit,
    1
  );

  // Historical Trend Dataset
  const trendKPIObj = selectedTrendDept === "Global"
    ? GLOBAL_KPIS.find(k => k.id === selectedTrendKPI)
    : DEPARTMENTAL_KPIS.find(k => k.id === selectedTrendKPI);
  
  const trendLimit = trendKPIObj?.limit || 10.0;

  const trendItems = pastMonths.map(m => {
    const entry = kpiDataMap[selectedTrendDept]?.[m]?.[selectedTrendKPI] || {};
    const val = calcPct(entry.num, entry.den);
    return { month: m, val };
  });

  const maxTrendVal = Math.max(
    ...trendItems.map(i => i.val ?? 0),
    trendLimit,
    1
  );

  const statusColor = (val, lim) => {
    if (val === null) return "#888780";
    if (val <= lim * 0.8) return "#1D9E75";
    if (val <= lim) return "#EF9F27";
    return "#E24B4A";
  };

  return (
    <div className="kpi-analytics-container" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .kpi-analytics-container, .kpi-analytics-container * {
            visibility: visible;
          }
          .kpi-analytics-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Control Actions Bar */}
      <div className="no-print" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, marginBottom: 14, background: "#fff",
        padding: "12px 18px", borderRadius: 8, border: "0.5px solid #E0DDD6"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>
              Reporting Month
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: "5px 10px", border: "0.5px solid #D3D1C7", borderRadius: 7,
                fontSize: 12, background: "#fff", color: "#2C2C2A", fontWeight: 500, outline: "none"
              }}
            >
              {MONTH_OPTS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={exportToCSV}
            style={{
              padding: "7px 16px", background: "#fff", color: "#2C2C2A",
              border: "0.5px solid #D3D1C7", borderRadius: 8, fontSize: 12,
              fontWeight: 500, cursor: "pointer", display: "flex", gap: 6, alignItems: "center"
            }}
          >
            📥 Export CSV Data
          </button>
          <button
            onClick={triggerPrint}
            style={{
              padding: "7px 16px", background: "#0F6E56", color: "#E1F5EE",
              border: "none", borderRadius: 8, fontSize: 12,
              fontWeight: 500, cursor: "pointer", display: "flex", gap: 6, alignItems: "center"
            }}
          >
            🖨️ Print Quality Report
          </button>
        </div>
      </div>

      {/* Grid: Comparison and Global metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        
        {/* Department Comparison Chart Card */}
        <div style={{
          background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: "16px",
          display: "flex", flexDirection: "column", minWidth: 0
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>
                Department-wise Comparison
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#888780" }}>
                KPI breach rates across technical divisions for {selectedMonth}
              </p>
            </div>
            <select
              value={selectedKPI}
              onChange={(e) => setSelectedKPI(e.target.value)}
              className="no-print"
              style={{
                padding: "4px 8px", border: "0.5px solid #D3D1C7", borderRadius: 6,
                fontSize: 11, background: "#fff", color: "#2C2C2A", outline: "none"
              }}
            >
              {DEPARTMENTAL_KPIS.map(k => (
                <option key={k.id} value={k.id}>{k.id} {k.name.replace("Rate", "")}</option>
              ))}
            </select>
          </div>

          {/* SVG Bar Chart */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 550 180" style={{ width: "100%", height: 160 }}>
              {/* Y Axis gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = 20 + ratio * 120;
                const val = maxCompareVal * (1 - ratio);
                return (
                  <g key={i}>
                    <line x1="45" y1={y} x2="530" y2={y} stroke="#F1EFE8" strokeWidth={1} />
                    <text x="35" y={y + 4} textAnchor="end" fontSize="9" fill="#888780">
                      {val.toFixed(1)}%
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {comparisonItems.map((item, i) => {
                const x = 55 + i * 47;
                const bw = 24;
                if (!item.isEnabled) {
                  return (
                    <g key={item.dept}>
                      <text x={x + bw / 2} y="80" textAnchor="middle" fontSize="8" fill="#B4B2A9" transform={`rotate(-45, ${x + bw / 2}, 80)`}>N/A</text>
                      <text x={x + bw / 2} y="160" textAnchor="middle" fontSize="9" fill="#888780">{item.abbr}</text>
                    </g>
                  );
                }
                const v = item.val ?? 0;
                const h = Math.max(2, (v / maxCompareVal) * 120);
                const y = 140 - h;
                const barColor = statusColor(item.val, item.limit);

                return (
                  <g key={item.dept}>
                    <rect x={x} y={y} width={bw} height={h} fill={barColor} rx={2} />
                    {item.val !== null && (
                      <text x={x + bw / 2} y={y - 4} textAnchor="middle" fontSize="8" fontWeight="600" fill={barColor}>
                        {item.val.toFixed(1)}
                      </text>
                    )}
                    <text x={x + bw / 2} y={160} textAnchor="middle" fontSize="9" fill="#888780">
                      {item.abbr}
                    </text>
                  </g>
                );
              })}

              {/* NABL Limit Line */}
              {(() => {
                const limitY = 140 - (activeKPIObj.limit / maxCompareVal) * 120;
                if (limitY >= 20 && limitY <= 140) {
                  return (
                    <g>
                      <line x1="45" y1={limitY} x2="530" y2={limitY} stroke="#E24B4A" strokeWidth={1.2} strokeDasharray="3 2" />
                      <text x="532" y={limitY + 3} textAnchor="start" fontSize="8" fontWeight="600" fill="#E24B4A">
                        Limit {activeKPIObj.limitNote}
                      </text>
                    </g>
                  );
                }
                return null;
              })()}
            </svg>
          </div>
        </div>

        {/* Global KPIs Card */}
        <div style={{
          background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: "16px",
          display: "flex", flexDirection: "column", minWidth: 0
        }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>
            Global / Central Quality Indicators
          </h4>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 180 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F7F6F2", borderBottom: "0.5px solid #E0DDD6" }}>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#888780", textAlign: "left", fontWeight: 500 }}>KPI ID & Name</th>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#888780", textAlign: "right", fontWeight: 500 }}>Value</th>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#888780", textAlign: "right", fontWeight: 500 }}>Limit</th>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#888780", textAlign: "center", fontWeight: 500 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {GLOBAL_KPIS.map(kpi => {
                  const indicators = kpiDataMap["Global"]?.[selectedMonth] || {};
                  const entry = indicators[kpi.id] || {};
                  const val = calcPct(entry.num, entry.den);
                  const status = getStatus(val, kpi.limit);
                  const isExceeded = status === "fail";

                  return (
                    <tr key={kpi.id} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                      <td style={{ padding: "6px 8px", fontSize: 11, color: "#2C2C2A", fontWeight: 500 }}>
                        {kpi.name}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 11, textAlign: "right", fontWeight: 600, color: statusColor(val, kpi.limit) }}>
                        {val !== null ? `${val.toFixed(2)}%` : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 11, textAlign: "right", color: "#888780" }}>
                        {kpi.limitNote}
                      </td>
                      <td style={{ padding: "6px 8px", fontSize: 10, textAlign: "center" }}>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 10, fontWeight: 600,
                          background: isExceeded ? "#FFF5F5" : val === null ? "#F1EFE8" : "#E1F5EE",
                          color: isExceeded ? "#A32D2D" : val === null ? "#5F5E5A" : "#085041"
                        }}>
                          {isExceeded ? "ALERT" : val === null ? "NO DATA" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 2: Historical Trends and Status Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        
        {/* Historical Trend Line Card */}
        <div style={{
          background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: "16px",
          display: "flex", flexDirection: "column", minWidth: 0
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>
                6-Month Trend Analysis
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 10, color: "#888780" }}>
                Historical timeline of selected indicator
              </p>
            </div>
            <div className="no-print" style={{ display: "flex", gap: 6 }}>
              <select
                value={selectedTrendDept}
                onChange={(e) => {
                  setSelectedTrendDept(e.target.value);
                  const isGlobal = e.target.value === "Global";
                  setSelectedTrendKPI(isGlobal ? GLOBAL_KPIS[0].id : DEPARTMENTAL_KPIS[0].id);
                }}
                style={{
                  padding: "4px 8px", border: "0.5px solid #D3D1C7", borderRadius: 6,
                  fontSize: 11, background: "#fff", color: "#2C2C2A", outline: "none"
                }}
              >
                <option value="Global">Global / Central</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={selectedTrendKPI}
                onChange={(e) => setSelectedTrendKPI(e.target.value)}
                style={{
                  padding: "4px 8px", border: "0.5px solid #D3D1C7", borderRadius: 6,
                  fontSize: 11, background: "#fff", color: "#2C2C2A", outline: "none",
                  maxWidth: 140
                }}
              >
                {selectedTrendDept === "Global" ? (
                  GLOBAL_KPIS.map(k => <option key={k.id} value={k.id}>{k.id}</option>)
                ) : (
                  DEPARTMENTAL_KPIS.map(k => <option key={k.id} value={k.id}>{k.id}</option>)
                )}
              </select>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 520 180" style={{ width: "100%", height: 160 }}>
              {/* Y Axis gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = 20 + ratio * 120;
                const val = maxTrendVal * (1 - ratio);
                return (
                  <g key={i}>
                    <line x1="45" y1={y} x2="480" y2={y} stroke="#F1EFE8" strokeWidth={1} />
                    <text x="35" y={y + 4} textAnchor="end" fontSize="9" fill="#888780">
                      {val.toFixed(1)}%
                    </text>
                  </g>
                );
              })}

              {/* X Axis month labels */}
              {trendItems.map((item, i) => {
                const x = 60 + i * 80;
                const displayMonth = item.month.substring(5) + "/" + item.month.substring(2, 4);
                return (
                  <text key={item.month} x={x} y="160" textAnchor="middle" fontSize="9" fill="#888780">
                    {displayMonth}
                  </text>
                );
              })}

              {/* Line & Dots */}
              {(() => {
                const points = trendItems
                  .map((item, i) => {
                    if (item.val === null) return null;
                    const x = 60 + i * 80;
                    const y = 140 - (item.val / maxTrendVal) * 120;
                    return { x, y, val: item.val };
                  })
                  .filter(p => p !== null);

                const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");

                return (
                  <g>
                    {points.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#0F6E56"
                        strokeWidth={2.5}
                        points={polylinePoints}
                      />
                    )}
                    {points.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={4.5} fill="#0F6E56" stroke="#fff" strokeWidth={1.5} />
                        <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="8" fontWeight="600" fill="#0F6E56">
                          {p.val.toFixed(1)}%
                        </text>
                      </g>
                    ))}
                  </g>
                );
              })()}

              {/* Limit line */}
              {(() => {
                const limitY = 140 - (trendLimit / maxTrendVal) * 120;
                if (limitY >= 20 && limitY <= 140) {
                  return (
                    <g>
                      <line x1="45" y1={limitY} x2="480" y2={limitY} stroke="#E24B4A" strokeWidth={1.2} strokeDasharray="3 2" />
                      <text x="482" y={limitY + 3} textAnchor="start" fontSize="8" fontWeight="600" fill="#E24B4A">
                        Limit {trendLimit}%
                      </text>
                    </g>
                  );
                }
                return null;
              })()}
            </svg>
          </div>
        </div>

        {/* Compliance Traffic Light Status Table Card */}
        <div style={{
          background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: "16px",
          display: "flex", flexDirection: "column", minWidth: 0
        }}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>
            Departmental KPI Status Matrix — {selectedMonth}
          </h4>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 180 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F7F6F2", borderBottom: "0.5px solid #E0DDD6" }}>
                  <th style={{ padding: "6px 8px", fontSize: 10, color: "#888780", textAlign: "left", fontWeight: 500 }}>Department</th>
                  {DEPARTMENTAL_KPIS.map(k => (
                    <th key={k.id} style={{ padding: "6px 4px", fontSize: 10, color: "#888780", textAlign: "center", fontWeight: 500 }} title={k.name}>
                      {k.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTS.map(dept => {
                  const indicators = kpiDataMap[dept]?.[selectedMonth] || {};
                  return (
                    <tr key={dept} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                      <td style={{ padding: "6px 8px", fontSize: 11, color: "#2C2C2A", fontWeight: 500 }}>
                        {dept}
                      </td>
                      {DEPARTMENTAL_KPIS.map(kpi => {
                        const isEnabled = toggles[`${dept}_${kpi.id}`] !== false;
                        const entry = indicators[kpi.id] || {};
                        const val = isEnabled ? calcPct(entry.num, entry.den) : null;
                        
                        let dotColor = "#F1EFE8"; // N/A
                        let titleText = "Not configured";
                        
                        if (isEnabled) {
                          if (val === null) {
                            dotColor = "#D3D1C7"; // Pending entry
                            titleText = "Pending entry";
                          } else {
                            const status = getStatus(val, kpi.limit);
                            dotColor = status === "pass" ? "#1D9E75" : status === "warn" ? "#EF9F27" : "#E24B4A";
                            titleText = `${val.toFixed(2)}% (Limit: ${kpi.limitNote})`;
                          }
                        }

                        return (
                          <td key={kpi.id} style={{ padding: "6px 4px", textAlign: "center" }}>
                            <div
                              title={titleText}
                              style={{
                                width: 14, height: 14, borderRadius: "50%",
                                background: dotColor, margin: "0 auto",
                                border: "0.5px solid rgba(0,0,0,0.1)"
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { color: "#1D9E75", label: "Compliant" },
              { color: "#EF9F27", label: "Warning Zone" },
              { color: "#E24B4A", label: "Exceeds Limit" },
              { color: "#D3D1C7", label: "Pending Entry" },
              { color: "#F1EFE8", label: "Disabled / N/A" }
            ].map(l => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: "#888780" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
