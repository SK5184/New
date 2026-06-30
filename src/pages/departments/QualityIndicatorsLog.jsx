import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";

const DEPARTMENTAL_KPIS = [
  {
    id: "7.5.4",
    name: "7.5.4 Sample Rejection Rate",
    formula: "Rejected samples ÷ Total samples received × 100",
    numLabel: "Number of samples rejected",
    denLabel: "Total number of samples received",
    limit: 5.0,
    limitNote: "≤ 5.0%",
    source: "Sample Rejection Log"
  },
  {
    id: "7.5.5",
    name: "7.5.5 Sample Processing Error Rate",
    formula: "Wrongly analyzed samples ÷ Total samples analyzed × 100",
    numLabel: "Number of samples analyzed wrongly",
    denLabel: "Total number of samples analyzed",
    limit: 2.0,
    limitNote: "≤ 2.0%",
    source: "Manual Entry"
  },
  {
    id: "7.5.6",
    name: "7.5.6 IQC Performance Failure Rate",
    formula: "Failed IQC values ÷ Total IQC values of the month × 100",
    numLabel: "Number of failed IQC results",
    denLabel: "Total number of IQC values recorded",
    limit: 10.0,
    limitNote: "≤ 10.0%",
    source: "Daily QC Run Logs"
  },
  {
    id: "7.5.7",
    name: "7.5.7 EQA Failure Rate (PT)",
    formula: "Failed proficiency tests ÷ Total proficiency tests × 100",
    numLabel: "Number of failed PT results",
    denLabel: "Total number of proficiency tests participated",
    limit: 20.0,
    limitNote: "≤ 20.0%",
    source: "Manual Entry"
  },
  {
    id: "7.5.8",
    name: "7.5.8 Error in Reporting Results Rate",
    formula: "Failed reports ÷ Total reports issued × 100",
    numLabel: "Number of failed / error reports",
    denLabel: "Total number of reports issued",
    limit: 1.0,
    limitNote: "≤ 1.0%",
    source: "Error Records / NC Form"
  },
  {
    id: "7.7.11",
    name: "7.7.11 Turnaround Time (TAT) Breach Rate",
    formula: "Reports released beyond time ÷ Total reports released × 100",
    numLabel: "Number of reports released beyond TAT",
    denLabel: "Total number of reports released",
    limit: 10.0,
    limitNote: "≤ 10.0%",
    source: "Manual Entry"
  },
  {
    id: "7.7.15",
    name: "7.7.15 Coefficient of Variation percent (CV%)",
    formula: "Sum of CV% values recorded ÷ Number of analytes measured",
    numLabel: "Sum of CV% values",
    denLabel: "Number of analytes measured",
    limit: 10.0,
    limitNote: "≤ 10.0%",
    source: "Manual Entry"
  }
];

const S = {
  container: { fontFamily: "'Inter', sans-serif", color: "#2C2C2A" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "14px 18px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF9", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 18 },
  headerPanel: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 12, marginBottom: 14, background: "#fff",
    padding: "12px 18px", borderRadius: 8, border: "0.5px solid #E0DDD6"
  },
  select: {
    padding: "5px 10px", border: "0.5px solid #D3D1C7", borderRadius: 7,
    fontSize: 12, background: "#fff", color: "#2C2C2A", fontWeight: 500, outline: "none"
  },
  btn: (bg, color) => ({
    padding: "7px 16px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500,
    cursor: "pointer", display: "inline-flex", gap: 6, alignItems: "center", outline: "none"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12
  }),
  inp: {
    padding: "6px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "10px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "12px 12px", borderBottom: "0.5px solid #F1EFE8", verticalAlign: "middle" }
};

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

function StatusBadge({ status }) {
  const cfg = {
    pass: { bg: "#E1F5EE", color: "#085041", text: "Within Limit" },
    warn: { bg: "#FAEEDA", color: "#633806", text: "Near Limit" },
    fail: { bg: "#FCEBEB", color: "#791F1F", text: "Exceeds Limit" },
    none: { bg: "#F1EFE8", color: "#5F5E5A", text: "No Data Entered" },
  };
  const c = cfg[status] || cfg.none;
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 500,
      padding: "2px 9px", borderRadius: 20, background: c.bg, color: c.color,
      whiteSpace: "nowrap"
    }}>
      {c.text}
    </span>
  );
}

export default function QualityIndicatorsLog({ department }) {
  const MONTH_OPTS = monthOptions();
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTS[0].key);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [popMsg, setPopMsg] = useState("");

  // Load Indicator values for selected month & department
  const loadIndicators = useCallback(async (mk) => {
    setLoading(true);
    setSaved(false);
    setPopMsg("");
    try {
      const docRef = doc(db, "kpiData", department, "monthlyData", mk);
      const snap = await getDoc(docRef);
      if (snap.exists() && snap.data().indicators) {
        setEntries(snap.data().indicators);
      } else {
        // Start fresh with blank entries
        const initial = {};
        DEPARTMENTAL_KPIS.forEach(kpi => {
          initial[kpi.id] = { num: "", den: "", pct: null, remarks: "" };
        });
        setEntries(initial);
      }
    } catch (e) {
      console.error("Error loading indicators:", e);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    loadIndicators(selectedMonth);
  }, [selectedMonth, loadIndicators]);

  const handleValueChange = (kpiId, field, val) => {
    setSaved(false);
    setEntries(prev => {
      const updatedItem = { ...(prev[kpiId] || {}), [field]: val };
      // Compute pct if both num and den exist
      const pct = calcPct(updatedItem.num, updatedItem.den);
      updatedItem.pct = pct !== null ? parseFloat(pct.toFixed(2)) : null;
      return { ...prev, [kpiId]: updatedItem };
    });
  };

  // Perform Firestore queries to auto-populate indicators where data is logged
  const handleAutoPopulate = async () => {
    setAutoPopulating(true);
    setPopMsg("Querying registers...");
    try {
      const newEntries = { ...entries };

      // 1. Auto-Populate Rejection Rate 7.5.4 from qualityKPI
      try {
        const qkpiDocRef = doc(db, "qualityKPI", `${department}_${selectedMonth}`);
        const qkpiSnap = await getDoc(qkpiDocRef);
        if (qkpiSnap.exists()) {
          const qkpiData = qkpiSnap.data();
          if (qkpiData.metrics) {
            const rejected = qkpiData.metrics.sampleRejected || 0;
            const received = qkpiData.metrics.sampleReceived || 0;
            newEntries["7.5.4"] = {
              num: String(rejected),
              den: String(received),
              pct: parseFloat(((rejected / received) * 100).toFixed(2)),
              remarks: qkpiData.topReasons ? `Auto-loaded. Top reasons: ${qkpiData.topReasons.join(", ")}` : "Auto-loaded from Rejection Log."
            };
          }
        }
      } catch (err) {
        console.warn("Failed loading sample rejection kpi data:", err);
      }

      // 2. Auto-Populate Error in Reporting Rate 7.5.8 from errorRecords
      try {
        const q = query(
          collection(db, "errorRecords"),
          where("department", "==", department)
        );
        const snap = await getDocs(q);
        let errorCount = 0;
        const [year, month] = selectedMonth.split("-").map(Number);
        
        snap.forEach(d => {
          const data = d.data();
          // Filter by dateOccurrence in selectedMonth
          if (data.dateOccurrence) {
            const occDate = new Date(data.dateOccurrence);
            if (occDate.getFullYear() === year && (occDate.getMonth() + 1) === month) {
              errorCount++;
            }
          }
        });

        if (errorCount > 0) {
          newEntries["7.5.8"] = {
            ...newEntries["7.5.8"],
            num: String(errorCount),
            remarks: `Auto-loaded: ${errorCount} nonconformities recorded this month.`
          };
        }
      } catch (err) {
        console.warn("Failed loading error records metrics:", err);
      }

      // 3. Auto-Populate IQC failure rate 7.5.6
      try {
        let totalQC = 0;
        let failedQC = 0;
        const [year, month] = selectedMonth.split("-").map(Number);

        if (department === "Biochemistry") {
          const qcSnap = await getDocs(collection(db, "biochemQC"));
          qcSnap.forEach(d => {
            const data = d.data();
            const created = data.createdAt?.toDate?.();
            if (created && created.getFullYear() === year && (created.getMonth() + 1) === month) {
              totalQC++;
              if (data.status === "Reject" || data.status === "Fail") {
                failedQC++;
              }
            }
          });
        } else {
          // Other technical departments log in interactiveLogs
          const q = query(
            collection(db, "interactiveLogs"),
            where("department", "==", department)
          );
          const qcSnap = await getDocs(q);
          qcSnap.forEach(d => {
            const data = d.data();
            // Check if featureKey ends with iqc or contains iqc
            if (data.featureKey && (data.featureKey.includes("iqc") || data.featureKey.includes("qc"))) {
              const created = data.createdAt?.toDate?.();
              if (created && created.getFullYear() === year && (created.getMonth() + 1) === month) {
                totalQC++;
                const status = data.data?.status || data.status;
                if (status === "Reject" || status === "Fail") {
                  failedQC++;
                }
              }
            }
          });
        }

        if (totalQC > 0) {
          newEntries["7.5.6"] = {
            num: String(failedQC),
            den: String(totalQC),
            pct: parseFloat(((failedQC / totalQC) * 100).toFixed(2)),
            remarks: `Auto-calculated: ${failedQC} failures out of ${totalQC} total runs.`
          };
        }
      } catch (err) {
        console.warn("Failed loading IQC run logs for KPI:", err);
      }

      setEntries(newEntries);
      setPopMsg("✓ Completed auto-population! Please review and enter any remaining manual parameters.");
    } catch (e) {
      console.error("Error auto-populating:", e);
      setPopMsg("⚠ Error during auto-population. Loaded partially where available.");
    } finally {
      setAutoPopulating(false);
    }
  };

  // Save the entries to Firestore
  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "kpiData", department, "monthlyData", selectedMonth);
      await setDoc(docRef, {
        month: selectedMonth,
        department,
        indicators: entries,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email || "unknown"
      }, { merge: true });
      setSaved(true);
    } catch (e) {
      console.error("Error saving indicators:", e);
      alert("Error saving data. Please check connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.container}>
      {/* Upper Control Bar */}
      <div style={S.headerPanel}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>
              Department Scope
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
              {department} Quality Indicators
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>
              Monitoring Period
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={S.select}
            >
              {MONTH_OPTS.map(m => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {popMsg && (
            <span style={{ fontSize: 11, color: popMsg.startsWith("✓") ? "#0F6E56" : "#A80000", fontWeight: 500 }}>
              {popMsg}
            </span>
          )}
          <button
            onClick={handleAutoPopulate}
            disabled={autoPopulating || loading}
            style={S.btn("#F1EFE8", "#2C2C2A")}
          >
            ⚡ {autoPopulating ? "Autopopulating..." : "Auto-Populate Data"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={S.btn(null, null)}
          >
            💾 {saving ? "Saving..." : "Save Log Parameters"}
          </button>
        </div>
      </div>

      {/* Main Parameters Sheet */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>
            ISO 15189:2022 §7.5-7.7 Quality Indicator Logs
          </span>
          {saved && (
            <span style={{ fontSize: 11, color: "#0F6E56", fontWeight: 500 }}>
              ✓ Saved to Monthly KPI Ledger
            </span>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#888780" }}>
              Loading indicator data sheet...
            </div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                  <th style={{ ...S.th, width: "30%" }}>Indicator Parameter Details</th>
                  <th style={{ ...S.th, width: "15%" }}>Formula / Rule</th>
                  <th style={{ ...S.th, width: "12%" }}>Numerator (A)</th>
                  <th style={{ ...S.th, width: "12%" }}>Denominator (B)</th>
                  <th style={{ ...S.th, width: "10%" }}>Result (A/B %)</th>
                  <th style={{ ...S.th, width: "12%" }}>Status Alert</th>
                  <th style={{ ...S.th, width: "18%" }}>Remarks / Comments</th>
                </tr>
              </thead>
              <tbody>
                {DEPARTMENTAL_KPIS.map(kpi => {
                  const entry = entries[kpi.id] || { num: "", den: "", pct: null, remarks: "" };
                  const status = getStatus(entry.pct, kpi.limit);

                  return (
                    <tr key={kpi.id}>
                      <td style={S.td}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: "#1F2937" }}>
                          {kpi.name}
                        </div>
                        <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>
                          Source: <span style={{ fontStyle: "italic" }}>{kpi.source}</span> (NABL target: {kpi.limitNote})
                        </div>
                      </td>
                      <td style={{ ...S.td, fontSize: 11, color: "#4B5563" }}>
                        {kpi.formula}
                      </td>
                      <td style={S.td}>
                        <input
                          type="number"
                          placeholder={kpi.numLabel}
                          value={entry.num || ""}
                          onChange={e => handleValueChange(kpi.id, "num", e.target.value)}
                          style={S.inp}
                        />
                      </td>
                      <td style={S.td}>
                        <input
                          type="number"
                          placeholder={kpi.denLabel}
                          value={entry.den || ""}
                          onChange={e => handleValueChange(kpi.id, "den", e.target.value)}
                          style={S.inp}
                        />
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, textAlign: "center", fontSize: 13, color: status === "fail" ? "#DC2626" : "#1F2937" }}>
                        {entry.pct !== null ? `${entry.pct}%` : "—"}
                      </td>
                      <td style={S.td}>
                        <StatusBadge status={status} />
                      </td>
                      <td style={S.td}>
                        <input
                          type="text"
                          placeholder="Action taken or notes"
                          value={entry.remarks || ""}
                          onChange={e => handleValueChange(kpi.id, "remarks", e.target.value)}
                          style={S.inp}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
