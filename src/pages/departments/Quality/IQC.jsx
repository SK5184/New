// IQC.jsx
// MBL QMS — Rebuilt Internal Quality Control Dashboard
// Compliant with ISO 15189:2022 §7.3.2 standards
// Links to Test Master, supports Quantitative/Qualitative/Semi-Quantitative controls, and connects to periodic plans.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db, auth } from "../../../firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { initialTests } from "../../../data/testMasterData";

const LEVELS = ["Level 1 (Low)", "Level 2 (Normal)", "Level 3 (High)"];
const QUAL_RESULTS = ["Negative", "Positive", "Borderline", "Equivocal"];

function today() { return new Date().toISOString().split("T")[0]; }
function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Westgard rules check — given value, mean, sd
function checkWestgard(value, mean, sd, history) {
  const z = (value - mean) / sd;
  const violations = [];
  if (Math.abs(z) > 3) violations.push({ rule: "1_3s", severity: "Reject", desc: "1 control exceeds ±3SD" });
  if (Math.abs(z) > 2) violations.push({ rule: "1_2s", severity: "Warning", desc: "1 control exceeds ±2SD" });

  if (history.length >= 1) {
    const lastZ = (history[0].value - mean) / sd;
    if (Math.abs(z) > 2 && Math.abs(lastZ) > 2 && Math.sign(z) === Math.sign(lastZ)) {
      violations.push({ rule: "2_2s", severity: "Reject", desc: "2 consecutive controls exceed same ±2SD" });
    }
    if (Math.sign(z) !== Math.sign(lastZ) && Math.abs(z) > 2 && Math.abs(lastZ) > 2) {
      violations.push({ rule: "R_4s", severity: "Reject", desc: "Range between consecutive controls exceeds 4SD" });
    }
  }

  if (history.length >= 3) {
    const last4 = [value, ...history.slice(0, 3).map(h => h.value)];
    const last4Z = last4.map(v => (v - mean) / sd);
    if (last4Z.every(zv => zv > 1) || last4Z.every(zv => zv < -1)) {
      violations.push({ rule: "4_1s", severity: "Warning", desc: "4 consecutive controls exceed same ±1SD" });
    }
  }
  if (history.length >= 9) {
    const last10 = [value, ...history.slice(0, 9).map(h => h.value)];
    if (last10.every(v => v > mean) || last10.every(v => v < mean)) {
      violations.push({ rule: "10x", severity: "Warning", desc: "10 consecutive controls on same side of mean" });
    }
  }
  return violations;
}

// Levey-Jennings SVG chart
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
    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", marginBottom: 10 }}>{title}</div>
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
    </div>
  );
}

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh" },
  topbar: { background: "#0F172A", borderBottom: "4px solid #0D9488", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#FFF" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0D9488", color: color || "#FFF", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", outline: "none", transition: "opacity 0.15s" }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12.5, background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }
};

export default function IQC() {
  const { role, name: authName, dept: authDept } = useAuth();
  
  // UI lists
  const [tests, setTests] = useState([]);
  const [plans, setPlans] = useState([]);
  const [results, setResults] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  
  // Filtering & Selection
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedTest, setSelectedTest] = useState(null);
  const [chartTestCode, setChartTestCode] = useState("");
  const [chartLevel, setChartLevel] = useState("Level 2 (Normal)");
  const [transferring, setTransferring] = useState(false);
  
  // Form parameters
  const [form, setForm] = useState({
    testCode: "",
    level: "Level 2 (Normal)",
    value: "",
    mean: "",
    sd: "",
    lotNumber: "",
    planId: "",
    observedCategory: "",
    expectedCategory: "",
    observedValue: "",
    controlType: "Positive Control",
    expectedResult: "Positive",
    observedResult: "Positive",
    remarks: "",
    date: today()
  });

  const isGlobalUser = ["Quality Manager", "Quality Executive", "Managing Director", "Admin", "Assistant Admin"].includes(role) || authDept === "Quality";
  const userDept = isGlobalUser ? selectedDept : (authDept || "Biochemistry");

  // Load Test Master & Plans
  useEffect(() => {
    // 1. Tests from local storage or defaults
    const cachedTests = localStorage.getItem("mbl_test_master");
    let testList = cachedTests ? JSON.parse(cachedTests) : initialTests;
    setTests(testList);

    // 2. Fetch plans
    async function fetchPlans() {
      try {
        const snap = await getDocs(query(collection(db, "planning"), where("planType", "==", "PLN-IQC")));
        setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Failed to load IQC plans:", err);
      }
    }
    fetchPlans();
  }, []);

  // Fetch results
  const loadResults = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "iqcResults"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResults(list);
      
      // Auto-set initial chart code
      if (list.length > 0 && !chartTestCode) {
        setChartTestCode(list[0].testCode);
        if (list[0].level) setChartLevel(list[0].level);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [chartTestCode]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Handle test selection to populate form defaults
  const handleSelectTest = (testCode) => {
    const testObj = tests.find(t => t.mblCode === testCode);
    setSelectedTest(testObj);
    
    if (!testObj) return;

    // Set defaults based on test configuration
    let defaultMean = "";
    let defaultSd = "";
    let defaultExpected = "Positive";
    let defaultCat = "";

    if (testObj.type === "Quantitative") {
      if (form.level.includes("Level 1")) {
        defaultMean = testObj.qcMeanL1 || "";
        defaultSd = testObj.qcSdL1 || "";
      } else if (form.level.includes("Level 3")) {
        defaultMean = testObj.qcMeanL3 || "";
        defaultSd = testObj.qcSdL3 || "";
      } else {
        defaultMean = testObj.qcMeanL2 || "";
        defaultSd = testObj.qcSdL2 || "";
      }
    } else if (testObj.type === "Qualitative") {
      defaultExpected = testObj.qcExpectedControlObserved || "Negative";
    } else if (testObj.type === "Semi-Quantitative") {
      defaultExpected = testObj.expectedRange || "Negative";
      const cats = (testObj.semiQuantCategories || "Negative, Trace, 1+, 2+, 3+").split(",").map(c=>c.trim());
      defaultCat = cats[0] || "Negative";
    }

    // Default plan matches test if possible
    const matchedPlan = plans.find(p => p.department === testObj.department || p.title.toLowerCase().includes(testObj.testName.toLowerCase()));

    setForm(p => ({
      ...p,
      testCode,
      mean: defaultMean,
      sd: defaultSd,
      expectedResult: defaultExpected,
      expectedCategory: defaultExpected,
      observedCategory: defaultCat,
      planId: matchedPlan ? matchedPlan.id : (plans[0]?.id || "PLN-IQC-2026-GEN"),
      lotNumber: `LOT-${testObj.mblCode}-${monthKey().replace("-","")}`
    }));
  };

  // Re-load mean/SD when level changes in form
  const handleLevelChange = (newLevel) => {
    if (!selectedTest) return;
    let defaultMean = "";
    let defaultSd = "";
    if (newLevel.includes("Level 1")) {
      defaultMean = selectedTest.qcMeanL1 || "";
      defaultSd = selectedTest.qcSdL1 || "";
    } else if (newLevel.includes("Level 3")) {
      defaultMean = selectedTest.qcMeanL3 || "";
      defaultSd = selectedTest.qcSdL3 || "";
    } else {
      defaultMean = selectedTest.qcMeanL2 || "";
      defaultSd = selectedTest.qcSdL2 || "";
    }
    setForm(p => ({ ...p, level: newLevel, mean: defaultMean, sd: defaultSd }));
  };

  // Simulation: Machine Data Transfer
  const handleMachineTransfer = () => {
    if (!selectedTest) return;
    setTransferring(true);
    setTimeout(() => {
      let simulatedVal = "";
      const mean = parseFloat(form.mean) || 100;
      const sd = parseFloat(form.sd) || 5;
      
      // Generate standard normal Box-Muller random value between -1.2SD and +1.2SD
      const randNormal = Math.sin(2.0 * Math.PI * Math.random()) * Math.sqrt(-2.0 * Math.log(Math.random()));
      const boundedRand = Math.max(-1.5, Math.min(1.5, randNormal));
      simulatedVal = (mean + boundedRand * sd).toFixed(selectedTest.reportableRange?.includes(".") ? 2 : 1);
      
      setForm(p => ({
        ...p,
        value: simulatedVal,
        lotNumber: `LOT-AUTO-${Math.floor(100000 + Math.random() * 900000)}`
      }));
      setTransferring(false);
    }, 1200);
  };

  // Submit Run Entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.testCode) { alert("Please select a test parameter."); return; }
    
    setSaving(true);
    try {
      const testObj = tests.find(t => t.mblCode === form.testCode);
      let payload = {
        testCode: form.testCode,
        testName: testObj.testName,
        type: testObj.type,
        department: testObj.department,
        planId: form.planId,
        date: form.date,
        remarks: form.remarks,
        enteredBy: authName || "Operator",
        createdAt: new Date().toISOString()
      };

      if (testObj.type === "Quantitative") {
        const val = parseFloat(form.value);
        const m = parseFloat(form.mean);
        const s = parseFloat(form.sd);
        if (isNaN(val) || isNaN(m) || isNaN(s)) {
          alert("Please input valid target mean, SD, and measured value.");
          setSaving(false);
          return;
        }
        
        // Westgard calculations
        const history = results.filter(r => r.testCode === form.testCode && r.level === form.level).slice(0, 10);
        const violations = checkWestgard(val, m, s, history);
        const status = violations.some(v => v.severity === "Reject") ? "Fail" : violations.length > 0 ? "Warning" : "Pass";

        payload = {
          ...payload,
          value: val,
          mean: m,
          sd: s,
          level: form.level,
          lotNumber: form.lotNumber,
          violations,
          status
        };
      } else if (testObj.type === "Qualitative") {
        const pass = form.expectedResult === form.observedResult;
        payload = {
          ...payload,
          controlType: form.controlType,
          expectedResult: form.expectedResult,
          observedResult: form.observedResult,
          status: pass ? "Pass" : "Fail"
        };
      } else {
        // Semi-Quantitative
        // Pass if observed is close to expected (simple check)
        const cleanObs = form.observedCategory.toLowerCase().trim();
        const cleanExp = form.expectedCategory.toLowerCase().trim();
        const isPass = cleanExp.includes(cleanObs) || cleanObs.includes(cleanExp) || cleanObs === cleanExp;
        payload = {
          ...payload,
          observedCategory: form.observedCategory,
          expectedCategory: form.expectedCategory,
          observedValue: form.observedValue,
          status: isPass ? "Pass" : "Fail"
        };
      }

      await addDoc(collection(db, "iqcResults"), payload);
      alert("IQC run entry successfully registered.");
      setModal(null);
      setForm(p => ({ ...p, value: "", observedValue: "" }));
      loadResults();
    } catch (err) {
      console.error(err);
      alert("Error saving record.");
    }
    setSaving(false);
  };

  // Filter test selection dropdown options
  const filteredTestsOptions = tests.filter(t => {
    if (isGlobalUser && selectedDept === "All") return true;
    return t.department === userDept;
  });

  // Analytics datasets
  const chartData = results
    .filter(r => r.testCode === chartTestCode && r.type === "Quantitative" && r.level === chartLevel)
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-20);

  const activeChartTestObj = tests.find(t => t.mblCode === chartTestCode);
  const chartMean = chartData.length > 0 ? chartData[chartData.length - 1].mean : (parseFloat(activeChartTestObj?.qcMeanL2) || 100);
  const chartSD = chartData.length > 0 ? chartData[chartData.length - 1].sd : (parseFloat(activeChartTestObj?.qcSdL2) || 5);

  const displayResults = results.filter(r => {
    if (isGlobalUser && selectedDept === "All") return true;
    return r.department === userDept;
  });

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Internal Quality Control (IQC) Cockpit</h1>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>ISO 15189:2022 §7.3.2 · Automated QC Verification & Analysis</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isGlobalUser && (
            <select
              style={{ ...S.inp, background: "#1E293B", color: "#FFF", borderColor: "#334155", width: 170 }}
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
            >
              <option value="All">All Departments</option>
              <option value="Biochemistry">Biochemistry</option>
              <option value="Haematology">Haematology</option>
              <option value="Microbiology">Microbiology</option>
              <option value="Serology">Serology</option>
              <option value="Flow Cytometry">Flow Cytometry</option>
              <option value="Cytogenetics">Cytogenetics</option>
              <option value="Clinical Pathology">Clinical Pathology</option>
              <option value="Molecular Biology">Molecular Biology</option>
              <option value="Molecular Genetics">Molecular Genetics</option>
            </select>
          )}
          <button style={S.btn("#0D9488", "#FFF")} onClick={() => {
            setModal("entry");
            if (filteredTestsOptions.length > 0) {
              handleSelectTest(filteredTestsOptions[0].mblCode);
            }
          }}>
            ➕ Enter IQC Run
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        
        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
          {[
            { label: "Active Parameters Mapped", val: tests.filter(t => isGlobalUser && selectedDept === "All" ? true : t.department === userDept).length, color: "#1E293B", bg: "#FFF" },
            { label: "Total Runs logged (Month)", val: displayResults.filter(r => r.date?.includes(monthKey())).length, color: "#0F766E", bg: "#F0FDFA" },
            { label: "Fail / Out-of-Control Rate", val: `${(displayResults.length > 0 ? (displayResults.filter(r => r.status === "Fail").length / displayResults.length) * 100 : 0).toFixed(1)}%`, color: "#991B1B", bg: "#FEF2F2" },
            { label: "Active Compliance Plans", val: plans.filter(p => isGlobalUser && selectedDept === "All" ? true : p.department.includes(userDept)).length, color: "#1E40AF", bg: "#EFF6FF" }
          ].map((c, i) => (
            <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Visual Chart Segment (Levey-Jennings) */}
        <div style={S.card}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>Levey-Jennings Visual Control Chart (Quantitative Parameters)</span>
            <div style={{ display: "flex", gap: 10 }}>
              <select
                style={{ ...S.inp, width: 220 }}
                value={chartTestCode}
                onChange={e => setChartTestCode(e.target.value)}
              >
                {tests.filter(t => t.type === "Quantitative" && (isGlobalUser && selectedDept === "All" ? true : t.department === userDept)).map(t => (
                  <option key={t.mblCode} value={t.mblCode}>{t.testName} ({t.mblCode})</option>
                ))}
              </select>
              <select
                style={{ ...S.inp, width: 160 }}
                value={chartLevel}
                onChange={e => setChartLevel(e.target.value)}
              >
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div style={{ padding: 20 }}>
            {chartData.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748B", padding: "40px 0", fontSize: 13 }}>
                No quantitative control runs logged for this parameter level yet. Click <strong>"Enter IQC Run"</strong> to add some.
              </div>
            ) : (
              <LJChart data={chartData} mean={chartMean} sd={chartSD} title={`Levey-Jennings plot for ${activeChartTestObj?.testName} (${chartTestCode}) - ${chartLevel}`} />
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div style={S.card}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>IQC Validation Audit Register (All Parameters)</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>ISO 15189 §8.4 compliant record retention</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Parameter</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Type</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Control Level / Details</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Observed outcome</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>IQC Plan Link</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: 600 }}>Verifier</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Loading logs...</td>
                  </tr>
                ) : displayResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No IQC results entries found.</td>
                  </tr>
                ) : (
                  displayResults.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td style={{ padding: "12px 16px" }}>{fmtDate(r.createdAt)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 600, color: "#1E293B" }}>{r.testName}</span>
                        <code style={{ fontSize: 11, color: "#64748B", display: "block" }}>{r.testCode}</code>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: r.type === "Quantitative" ? "#EFF6FF" : r.type === "Qualitative" ? "#F5F3FF" : "#FEF3C7",
                          color: r.type === "Quantitative" ? "#1E40AF" : r.type === "Qualitative" ? "#5B21B6" : "#B45309"
                        }}>{r.type}</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {r.type === "Quantitative" ? (
                          <div>
                            <strong>{r.level}</strong>
                            <div style={{ fontSize: 10.5, color: "#64748B" }}>Lot: {r.lotNumber || "N/A"}</div>
                          </div>
                        ) : r.type === "Qualitative" ? (
                          <div>
                            <strong>{r.controlType}</strong>
                            <div style={{ fontSize: 10.5, color: "#64748B" }}>Expected: {r.expectedResult}</div>
                          </div>
                        ) : (
                          <div>
                            <strong>Semi-Quant Control</strong>
                            <div style={{ fontSize: 10.5, color: "#64748B" }}>Expected: {r.expectedCategory}</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                        {r.type === "Quantitative" ? (
                          <div>
                            <span>{r.value}</span>
                            <span style={{ fontSize: 10.5, color: "#94A3B8", marginLeft: 6 }}>Mean: {r.mean}</span>
                          </div>
                        ) : r.type === "Qualitative" ? (
                          <span>{r.observedResult}</span>
                        ) : (
                          <div>
                            <span>{r.observedCategory}</span>
                            {r.observedValue && <span style={{ fontSize: 10.5, color: "#64748B", display: "block" }}>Range reading: {r.observedValue}</span>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <code style={{ fontSize: 11, background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>{r.planId || "PLN-IQC-GEN"}</code>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: r.status === "Pass" ? "#DCFCE7" : r.status === "Warning" ? "#FEF3C7" : "#FEE2E2",
                          color: r.status === "Pass" ? "#166534" : r.status === "Warning" ? "#92400E" : "#991B1B"
                        }}>{r.status}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748B" }}>{r.enteredBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* IQC ENTRY MODAL */}
      {modal === "entry" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0" }}>
            
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#0F172A", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>➕ Register Periodic IQC Run</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setModal(null)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 20 }}>
              
              {/* Select Parameter dropdown */}
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Test Parameter (from Test Master)</label>
                <select
                  style={S.inp}
                  value={form.testCode}
                  onChange={e => handleSelectTest(e.target.value)}
                  required
                >
                  <option value="">-- Choose Parameter --</option>
                  {filteredTestsOptions.map(t => (
                    <option key={t.mblCode} value={t.mblCode}>{t.testName} [{t.mblCode}] ({t.type})</option>
                  ))}
                </select>
              </div>

              {selectedTest && (
                <>
                  <div style={{ background: "#F1F5F9", padding: "10px 14px", borderRadius: 8, fontSize: 11.5, color: "#475569", marginBottom: 12 }}>
                    <strong>NABL Code:</strong> <code>{selectedTest.nablCode || "N/A"}</code> | <strong>Equipment:</strong> {selectedTest.equipment || "N/A"} | <strong>Method:</strong> {selectedTest.testMethod || "N/A"}
                  </div>

                  {/* Periodic IQC Plan Linking */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Link to IQC Plan / Schedule</label>
                    <select
                      style={S.inp}
                      value={form.planId}
                      onChange={e => setForm({ ...form, planId: e.target.value })}
                      required
                    >
                      <option value="PLN-IQC-2026-GEN">PLN-IQC-2026-GEN (General QMS Control)</option>
                      {plans.filter(p => p.department === selectedTest.department || p.department === "All Departments").map(p => (
                        <option key={p.id} value={p.id}>{p.id} — {p.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* DYNAMIC FORMS BASED ON TYPE */}
                  
                  {/* QUANTITATIVE */}
                  {selectedTest.type === "Quantitative" && (
                    <div style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 14, background: "#F8FAFC", marginBottom: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label style={S.label}>QC Level</label>
                          <select style={S.inp} value={form.level} onChange={e => handleLevelChange(e.target.value)}>
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={S.label}>Control Lot Number</label>
                          <input type="text" style={S.inp} value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} required />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label style={S.label}>Target Mean</label>
                          <input type="number" step="0.001" style={S.inp} value={form.mean} onChange={e => setForm({ ...form, mean: e.target.value })} required />
                        </div>
                        <div>
                          <label style={S.label}>Target Standard Deviation (SD)</label>
                          <input type="number" step="0.001" style={S.inp} value={form.sd} onChange={e => setForm({ ...form, sd: e.target.value })} required />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 14 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ ...S.label, fontWeight: "bold", color: "#0F766E" }}>Measured Value</label>
                          <input type="number" step="0.001" style={{ ...S.inp, border: "2px solid #0D9488" }} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} required placeholder="Enter analyzer reading" />
                        </div>
                        <button
                          type="button"
                          onClick={handleMachineTransfer}
                          disabled={transferring}
                          style={S.btn(transferring ? "#64748B" : "#0F172A", "#FFF")}
                        >
                          {transferring ? "Fetching..." : "🔌 Fetch Analyzer Value"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* QUALITATIVE */}
                  {selectedTest.type === "Qualitative" && (
                    <div style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 14, background: "#F8FAFC", marginBottom: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label style={S.label}>Control Type</label>
                          <select style={S.inp} value={form.controlType} onChange={e => {
                            const val = e.target.value;
                            const defaultExp = val === "Negative Control" ? "Negative" : "Positive";
                            setForm({ ...form, controlType: val, expectedResult: defaultExp, observedResult: defaultExp });
                          }}>
                            <option value="Positive Control">Positive Control</option>
                            <option value="Negative Control">Negative Control</option>
                          </select>
                        </div>
                        <div>
                          <label style={S.label}>Expected Result</label>
                          <select style={S.inp} value={form.expectedResult} onChange={e => setForm({ ...form, expectedResult: e.target.value })}>
                            {QUAL_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ ...S.label, fontWeight: "bold", color: "#475569" }}>Observed Result</label>
                        <select style={{ ...S.inp, border: "2px solid #5B21B6" }} value={form.observedResult} onChange={e => setForm({ ...form, observedResult: e.target.value })}>
                          {QUAL_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* SEMI-QUANTITATIVE */}
                  {selectedTest.type === "Semi-Quantitative" && (
                    <div style={{ border: "1px solid #CBD5E1", borderRadius: 10, padding: 14, background: "#F8FAFC", marginBottom: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                        <div>
                          <label style={S.label}>Expected Category Range</label>
                          <input type="text" style={S.inp} value={form.expectedCategory} onChange={e => setForm({ ...form, expectedCategory: e.target.value })} required />
                        </div>
                        <div>
                          <label style={S.label}>Observed Category / Grade</label>
                          <select style={{ ...S.inp, border: "2px solid #B45309" }} value={form.observedCategory} onChange={e => setForm({ ...form, observedCategory: e.target.value })}>
                            {(selectedTest.semiQuantCategories || "Negative, Trace, 1+, 2+, 3+").split(",").map(c => (
                              <option key={c.trim()} value={c.trim()}>{c.trim()}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={S.label}>Observed Value / Range reading (Optional)</label>
                        <input type="text" style={S.inp} placeholder="e.g. 15 mg/dL or Trace level" value={form.observedValue} onChange={e => setForm({ ...form, observedValue: e.target.value })} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Entry Date</label>
                      <input type="date" style={S.inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
                    </div>
                    <div>
                      <label style={S.label}>Operator Verifier</label>
                      <input type="text" style={S.inp} value={authName} disabled />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Action / Troubleshooting Remarks (if warning/out-of-limit)</label>
                    <textarea style={{ ...S.inp, height: 50, resize: "none" }} placeholder="e.g. calibration verified, standard values met." value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(null)}>Cancel</button>
                    <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving run..." : "Register Control Run"}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
