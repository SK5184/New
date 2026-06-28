import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext";

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

const DEPARTMENTAL_KPIS = [
  {
    id: "7.5.4",
    name: "7.5.4 Sample Rejection Rate",
    formula: "Rejected samples ÷ Total samples received × 100",
    numLabel: "Number of samples rejected",
    denLabel: "Total number of samples received",
    limit: 5.0,
    limitNote: "≤ 5.0%"
  },
  {
    id: "7.5.5",
    name: "7.5.5 Sample Processing Error Rate",
    formula: "Wrongly analyzed samples ÷ Total samples analyzed × 100",
    numLabel: "Number of samples analyzed wrongly",
    denLabel: "Total number of samples analyzed",
    limit: 2.0,
    limitNote: "≤ 2.0%"
  },
  {
    id: "7.5.6",
    name: "7.5.6 IQC Performance Failure Rate",
    formula: "Failed IQC values ÷ Total IQC values of the month × 100",
    numLabel: "Number of failed IQC results",
    denLabel: "Total number of IQC values recorded",
    limit: 10.0,
    limitNote: "≤ 10.0%"
  },
  {
    id: "7.5.7",
    name: "7.5.7 EQA Failure Rate (PT)",
    formula: "Failed proficiency tests ÷ Total proficiency tests × 100",
    numLabel: "Number of failed PT results",
    denLabel: "Total number of proficiency tests participated",
    limit: 20.0,
    limitNote: "≤ 20.0%"
  },
  {
    id: "7.5.8",
    name: "7.5.8 Error in Reporting Results Rate",
    formula: "Failed reports ÷ Total reports issued × 100",
    numLabel: "Number of failed / error reports",
    denLabel: "Total number of reports issued",
    limit: 1.0,
    limitNote: "≤ 1.0%"
  },
  {
    id: "7.7.11",
    name: "7.7.11 Turnaround Time (TAT) Breach Rate",
    formula: "Reports released beyond time ÷ Total reports released × 100",
    numLabel: "Number of reports released beyond TAT",
    denLabel: "Total number of reports released",
    limit: 10.0,
    limitNote: "≤ 10.0%"
  },
  {
    id: "7.7.15",
    name: "7.7.15 Coefficient of Variation percent (CV%)",
    formula: "Sum of CV% values recorded ÷ Number of analytes measured",
    numLabel: "Sum of CV% values",
    denLabel: "Number of analytes measured",
    limit: 10.0,
    limitNote: "≤ 10.0%"
  }
];

const GLOBAL_KPIS = [
  {
    id: "7.5.1",
    name: "7.5.1 Registration Error Rate",
    formula: "Errors in registration ÷ Total registrations × 100",
    numLabel: "Registration errors",
    denLabel: "Total registrations",
    limit: 1.0,
    limitNote: "≤ 1.0%"
  },
  {
    id: "7.5.2",
    name: "7.5.2 Sample Collection Error Rate",
    formula: "Errors in collection ÷ Total samples collected × 100",
    numLabel: "Collection errors",
    denLabel: "Total samples collected",
    limit: 1.0,
    limitNote: "≤ 1.0%"
  },
  {
    id: "7.5.3",
    name: "7.5.3 Sample Transport Temperature Breach Rate",
    formula: "Out-of-range temp readings ÷ Total samples transported × 100",
    numLabel: "Out-of-range temperature readings",
    denLabel: "Samples transported",
    limit: 1.0,
    limitNote: "≤ 1.0%"
  },
  {
    id: "7.5.9",
    name: "7.5.9 Negative Customer Feedback Rate",
    formula: "Negative feedback ÷ Total feedback received × 100",
    numLabel: "Negative feedback count",
    denLabel: "Total feedback received",
    limit: 2.0,
    limitNote: "≤ 2.0%"
  },
  {
    id: "7.6.10",
    name: "7.6.10 Equipment Downtime Rate",
    formula: "Machine breakdowns ÷ Total breakdown events × 100",
    numLabel: "Machine breakdowns (auto-calculated from Biomedical)",
    denLabel: "Total breakdown events",
    limit: 10.0,
    limitNote: "≤ 10.0%",
    autoFromBiomedical: true
  },
  {
    id: "7.7.12",
    name: "7.7.12 Customer Complaint Rate",
    formula: "Complaints ÷ Total patients × 100",
    numLabel: "Total complaints",
    denLabel: "Total patients",
    limit: 5.0,
    limitNote: "≤ 5.0%"
  },
  {
    id: "7.7.13",
    name: "7.7.13 Sample Transit Time Breach Rate",
    formula: "Samples out of transit time limit ÷ Total samples × 100",
    numLabel: "Samples out of time limit",
    denLabel: "Total samples",
    limit: 5.0,
    limitNote: "≤ 5.0%"
  },
  {
    id: "7.7.14",
    name: "7.7.14 Blood Culture Contamination Rate",
    formula: "Contaminated cultures ÷ Total blood cultures × 100",
    numLabel: "Contaminated cultures",
    denLabel: "Total blood cultures",
    limit: 3.0,
    limitNote: "< 3.0%"
  }
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

function StatusBadge({ status }) {
  const cfg = {
    pass: { bg: "#E1F5EE", color: "#085041", text: "Within limit" },
    warn: { bg: "#FAEEDA", color: "#633806", text: "Near limit" },
    fail: { bg: "#FCEBEB", color: "#791F1F", text: "Exceeds limit" },
    none: { bg: "#F1EFE8", color: "#5F5E5A", text: "No data" },
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

export default function KPIEntry() {
  const { dept, role } = useAuth();
  const MONTH_OPTS = monthOptions();
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTS[0].key);
  
  // Roles allowed to choose any department and enter global KPIs
  const isQMOrExecutive = role === "Quality Manager" || role === "Quality Executive";
  const isMD = role === "Managing Director" || role === "Deputy Director";
  const isERPAdmin = role === "Admin" || role === "Assistant Admin" || dept === "ERP Administration";
  const hasCentralAccess = isQMOrExecutive || isMD || isERPAdmin;

  // Determine initial department selection
  const isTechDept = DEPARTMENTS.includes(dept);
  const defaultDept = hasCentralAccess ? "Global" : (isTechDept ? dept : null);
  const [selectedDept, setSelectedDept] = useState(defaultDept);
  
  const [entries, setEntries] = useState({});
  const [toggles, setToggles] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Equipment breakdown count (auto-filled for Global KPI 7.6.10)
  const [eqBreakdowns, setEqBreakdowns] = useState(0);

  // Load KPI toggles (Master Control grid settings)
  useEffect(() => {
    async function loadToggles() {
      try {
        const docRef = doc(db, "appSettings", "kpiToggles");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setToggles(snap.data());
        }
      } catch (err) {
        console.error("Error loading KPI toggles:", err);
      }
    }
    loadToggles();
  }, []);

  // Load Equipment downtime records from actionRequests
  const loadEquipmentDowntime = useCallback(async (mk) => {
    if (selectedDept !== "Global") return;
    try {
      const [year, month] = mk.split("-").map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);

      const q = query(
        collection(db, "actionRequests"),
        where("status", "==", "Closed"),
        where("addressedDepartment", "==", "Biomedical")
      );
      const snap = await getDocs(q);
      let count = 0;
      snap.forEach((d) => {
        const data = d.data();
        const created = data.createdAt?.toDate?.();
        if (created && created >= start && created < end) {
          count++;
        }
      });
      setEqBreakdowns(count);
    } catch (e) {
      console.error("Error loading equipment data for auto-fill:", e);
    }
  }, [selectedDept]);

  // Load KPI entries for selected month and department
  const loadKpiData = useCallback(async (mk, dep) => {
    if (!dep) return;
    setLoading(true);
    setSaved(false);
    try {
      let docRef;
      if (dep === "Global") {
        docRef = doc(db, "kpiData", "Global", "monthlyData", mk);
      } else {
        docRef = doc(db, "kpiData", dep, "monthlyData", mk);
      }
      const snap = await getDoc(docRef);
      let loadedEntries = {};
      if (snap.exists()) {
        loadedEntries = snap.data().indicators || {};
      }

      // Merge Sample Rejection Rate from qualityKPI
      if (dep !== "Global") {
        const qkpiDocRef = doc(db, "qualityKPI", `${dep}_${mk}`);
        const qkpiSnap = await getDoc(qkpiDocRef);
        if (qkpiSnap.exists()) {
          const qkpiData = qkpiSnap.data();
          if (qkpiData.metrics) {
            loadedEntries["7.5.4"] = {
              num: String(qkpiData.metrics.sampleRejected || 0),
              den: String(qkpiData.metrics.sampleReceived || 0),
              pct: qkpiData.metrics.rejectionRate || 0,
              status: loadedEntries["7.5.4"]?.status || getStatus(qkpiData.metrics.rejectionRate, 5.0),
              remarks: loadedEntries["7.5.4"]?.remarks || (qkpiData.topReasons ? `Top reasons: ${qkpiData.topReasons.join(", ")}` : "")
            };
          }
        }
      }

      setEntries(loadedEntries);
    } catch (e) {
      console.error("Error loading KPI data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKpiData(selectedMonth, selectedDept);
    loadEquipmentDowntime(selectedMonth);
  }, [selectedMonth, selectedDept, loadKpiData, loadEquipmentDowntime]);

  // Handle auto-fill logic for Equipment Downtime rate 7.6.10
  useEffect(() => {
    if (selectedDept === "Global" && eqBreakdowns > 0) {
      setEntries((prev) => ({
        ...prev,
        "7.6.10": {
          num: String(eqBreakdowns),
          den: prev["7.6.10"]?.den || String(eqBreakdowns)
        }
      }));
    }
  }, [eqBreakdowns, selectedDept]);

  const handleEntryChange = (kpiId, field, value) => {
    setEntries((prev) => ({
      ...prev,
      [kpiId]: { ...(prev[kpiId] || {}), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedDept) return;
    setSaving(true);
    try {
      let docRef;
      if (selectedDept === "Global") {
        docRef = doc(db, "kpiData", "Global", "monthlyData", selectedMonth);
      } else {
        docRef = doc(db, "kpiData", selectedDept, "monthlyData", selectedMonth);
      }
      await setDoc(
        docRef,
        {
          month: selectedMonth,
          department: selectedDept,
          indicators: entries,
          updatedAt: serverTimestamp(),
          updatedBy: auth.currentUser?.email || "unknown",
        },
        { merge: true }
      );
      setSaved(true);
    } catch (e) {
      console.error("Error saving KPI data:", e);
      alert("Error saving data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (selectedDept === null) {
    return (
      <div style={{
        padding: "40px 20px", textAlign: "center", color: "#888780",
        background: "#fff", borderRadius: 12, border: "0.5px solid #E0DDD6"
      }}>
        <div style={{ fontSize: 24, marginBottom: 10 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#2C2C2A" }}>KPI Entry Module</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>
          KPI data entry is only required for the 10 technical laboratory departments.
          Your current department ({dept}) does not require local entry. 
          To view or enter global KPIs, please contact the Quality Department.
        </div>
      </div>
    );
  }

  // Choose the KPI definition set
  const kpisToRender = selectedDept === "Global"
    ? GLOBAL_KPIS
    : DEPARTMENTAL_KPIS.filter(kpi => toggles[`${selectedDept}_${kpi.id}`] !== false);

  const monthLabel = MONTH_OPTS.find((m) => m.key === selectedMonth)?.label || selectedMonth;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Selection Control Panel */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, marginBottom: 14, background: "#fff",
        padding: "12px 18px", borderRadius: 8, border: "0.5px solid #E0DDD6"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Department Dropdown (Central Roles Only) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>
              Department scope
            </span>
            {hasCentralAccess ? (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  padding: "5px 10px", border: "0.5px solid #D3D1C7", borderRadius: 7,
                  fontSize: 12, background: "#fff", color: "#2C2C2A", fontWeight: 500, outline: "none"
                }}
              >
                <option value="Global">Global / Central KPIs (8)</option>
                <option disabled>── TECHNICAL DEPARTMENTS (7) ──</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
                {selectedDept} Department
              </span>
            )}
          </div>

          {/* Month Dropdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#888780", textTransform: "uppercase" }}>
              Monitoring Period
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

        {/* Save button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved && (
            <span style={{ fontSize: 11, color: "#0F6E56", fontWeight: 500 }}>
              ✓ Data saved successfully
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: "7px 18px", background: "#0F6E56", color: "#E1F5EE",
              border: "none", borderRadius: 8, fontSize: 12, fontWeight: 500,
              cursor: "pointer", display: "flex", gap: 6, alignItems: "center"
            }}
          >
            {saving ? "Saving..." : "Save Indicators"}
          </button>
        </div>
      </div>

      {/* Main KPI Form Container */}
      <div style={{
        background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden"
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF9",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#2C2C2A" }}>
              {selectedDept === "Global" ? "Global indicators" : `${selectedDept} Department Indicators`}
            </span>
            <span style={{ fontSize: 11, color: "#888780", marginLeft: 8 }}>
              {monthLabel}
            </span>
          </div>
          <span style={{ fontSize: 10, background: "#E1F5EE", color: "#085041", padding: "2px 8px", borderRadius: 12, border: "0.5px solid #5DCAA5" }}>
            ISO 15189:2022 §7.5-7.7
          </span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888780" }}>
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid #E0DDD6", borderTopColor: "#0F6E56",
              animation: "spin 0.8s linear infinite", margin: "0 auto 10px"
            }} />
            Retrieving monthly data entries...
          </div>
        ) : kpisToRender.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888780", fontSize: 12 }}>
            No active KPIs configured for this department in Master Control.
          </div>
        ) : (
          <div>
            {kpisToRender.map((kpi) => {
              const e = entries[kpi.id] || {};
              const val = calcPct(e.num, e.den);
              const status = getStatus(val, kpi.limit);
              const valColor =
                status === "pass" ? "#0F6E56" :
                status === "warn" ? "#854F0B" :
                status === "fail" ? "#A32D2D" : "#888780";

              return (
                <div key={kpi.id} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 180px 100px 110px",
                  padding: "14px 16px",
                  borderBottom: "0.5px solid #F1EFE8",
                  alignItems: "center",
                  gap: 12
                }}>
                  {/* KPI Label and Formula */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A" }}>
                      {kpi.name}
                    </div>
                    <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>
                      {kpi.formula}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 500, color: "#E24B4A", marginTop: 4 }}>
                      Limit: {kpi.limitNote}
                    </div>
                    {kpi.autoFromBiomedical && (
                      <div style={{ fontSize: 10, color: "#185FA5", marginTop: 4, fontWeight: 500 }}>
                        ↳ Auto-filled: {eqBreakdowns} closed breakdown requests from Biomedical.
                      </div>
                    )}
                  </div>

                  {/* Numerator Field */}
                  <div>
                    <div style={{ fontSize: 10, color: "#888780", marginBottom: 4 }}>{kpi.numLabel}</div>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      readOnly={kpi.autoFromBiomedical}
                      value={e.num || ""}
                      onChange={(ev) => handleEntryChange(kpi.id, "num", ev.target.value)}
                      style={{
                        padding: "5px 8px", border: "0.5px solid #D3D1C7", borderRadius: 7,
                        fontSize: 12, background: kpi.autoFromBiomedical ? "#F7F6F2" : "#fff",
                        color: "#2C2C2A", width: "100%", boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Denominator Field */}
                  <div>
                    <div style={{ fontSize: 10, color: "#888780", marginBottom: 4 }}>{kpi.denLabel}</div>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={e.den || ""}
                      onChange={(ev) => handleEntryChange(kpi.id, "den", ev.target.value)}
                      style={{
                        padding: "5px 8px", border: "0.5px solid #D3D1C7", borderRadius: 7,
                        fontSize: 12, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Calculated Value */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#888780", marginBottom: 4 }}>Value %</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: valColor }}>
                      {val !== null ? `${val.toFixed(2)}%` : "—"}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: "#888780", marginBottom: 6 }}>Status</div>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div style={{
          padding: "12px 16px", background: "#F7F6F2", borderTop: "0.5px solid #E0DDD6",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: 10, color: "#888780" }}>
            Entries logged in collection path: kpiData / {selectedDept} / monthlyData
          </span>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: "5px 14px", background: "#0F6E56", color: "#E1F5EE",
              border: "none", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer"
            }}
          >
            {saving ? "Saving..." : "Save all"}
          </button>
        </div>
      </div>
    </div>
  );
}
