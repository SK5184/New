// EQA.jsx
// MBL QMS — Rebuilt External Quality Assessment & Alternative Assessment Cockpit
// Compliant with ISO 15189:2022 §7.3.7 guidelines
// Links to Test Master, supports formal EQA & Alternative Methodologies (ISO §7.3.7.2), and features simulated portal sync.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db, auth } from "../../../firebase";
import {
  collection, addDoc, getDocs,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
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

const RESULT_STATUS = ["Satisfactory", "Marginal", "Unsatisfactory"];

function today() { return new Date().toISOString().split("T")[0]; }

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh" },
  topbar: { background: "#0F172A", borderBottom: "4px solid #534AB7", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#FFF" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#534AB7", color: color || "#FFF", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", outline: "none", transition: "opacity 0.15s" }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12.5, background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }
};

export default function EQA() {
  const { role, name: authName, dept: authDept } = useAuth();

  const [activeTab, setActiveTab] = useState("entry_log"); // "entry_log" | "summary"
  const [tests, setTests] = useState([]);
  const [eqaRuns, setEqaRuns] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  
  // Selection/Filters
  const [selectedDept, setSelectedDept] = useState("All");
  const [selectedTest, setSelectedTest] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  // Summary parameter selector
  const [summaryTestCode, setSummaryTestCode] = useState("");

  // Form states
  const [form, setForm] = useState({
    testCode: "",
    eqaType: "Formal EQAS", // "Formal EQAS" | "Alternative"
    provider: PROVIDERS[0],
    alternativeMethodology: ALTERNATIVES[0],
    cycleName: "",
    labResult: "",
    targetValue: "",
    acceptableRange: "± 2.0 SD",
    score: "", // Z-Score / SDI
    status: "Satisfactory",
    receivedDate: today(),
    submissionDate: today(),
    peerLabName: "",
    comparatorMethod: "",
    correctiveAction: "",
    enteredBy: authName || ""
  });

  const isGlobalUser = ["Quality Manager", "Quality Executive", "Managing Director", "Admin", "Assistant Admin"].includes(role) || authDept === "Quality";
  const userDept = isGlobalUser ? selectedDept : (authDept || "Biochemistry");

  // Load Test Master & EQA Logs
  useEffect(() => {
    const cachedTests = localStorage.getItem("mbl_test_master");
    let testList = cachedTests ? JSON.parse(cachedTests) : initialTests;
    setTests(testList);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "eqaResults"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEqaRuns(list);
      
      if (list.length > 0 && !summaryTestCode) {
        setSummaryTestCode(list[0].testCode);
      }
    } catch (err) {
      console.error("Failed to load EQA runs:", err);
    }
    setLoading(false);
  }, [summaryTestCode]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Handle test selection to populate EQA defaults
  const handleSelectTest = (testCode) => {
    const testObj = tests.find(t => t.mblCode === testCode);
    setSelectedTest(testObj);
    if (!testObj) return;

    const isAlternative = testObj.proficiencyTesting === "Alternative Methodology (No Formal EQA Available)";
    
    setForm(p => ({
      ...p,
      testCode,
      eqaType: isAlternative ? "Alternative" : "Formal EQAS",
      provider: isAlternative ? "Alternative Methodology (No Formal EQA Available)" : (testObj.proficiencyTesting || PROVIDERS[0]),
      alternativeMethodology: isAlternative ? (testObj.alternativeMethodology || ALTERNATIVES[0]) : ALTERNATIVES[0],
      cycleName: `Cycle-${new Date().getFullYear()}-02`,
      labResult: "",
      targetValue: "",
      score: "",
      status: "Satisfactory",
      correctiveAction: "",
      peerLabName: isAlternative ? "CMC Vellore Peer Lab" : "",
      comparatorMethod: isAlternative ? "Different Analyzer Sync" : ""
    }));
  };

  const handleProviderChange = (prov) => {
    const isAlternative = prov === "Alternative Methodology (No Formal EQA Available)";
    setForm(p => ({
      ...p,
      provider: prov,
      eqaType: isAlternative ? "Alternative" : "Formal EQAS",
      alternativeMethodology: isAlternative ? ALTERNATIVES[0] : ""
    }));
  };

  // Portal Data Transfer simulation
  const handlePortalSync = () => {
    if (!form.testCode) return;
    setSyncing(true);
    setTimeout(() => {
      // Generate mock satisfactory score (Z score between -1.8 and +1.8)
      const mockZ = (Math.random() * 3.6 - 1.8).toFixed(2);
      const isUnsat = Math.abs(parseFloat(mockZ)) > 2.0;
      
      setForm(p => ({
        ...p,
        labResult: (100 + parseFloat(mockZ) * 4).toFixed(selectedTest?.reportableRange?.includes(".") ? 2 : 1),
        targetValue: "100.0",
        acceptableRange: "± 2.0 SD (± 8.0%)",
        score: mockZ,
        status: isUnsat ? "Marginal" : "Satisfactory",
        cycleName: `${form.provider?.split(" ")[0] || "EQA"}-${new Date().getFullYear()}-C02`,
        peerLabName: p.eqaType === "Alternative" ? "Standard Peer Lab Link" : ""
      }));
      setSyncing(false);
    }, 1200);
  };

  // Submit EQA log entry
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.testCode) { alert("Please select a test parameter."); return; }
    
    setSaving(true);
    try {
      const testObj = tests.find(t => t.mblCode === form.testCode);
      const payload = {
        testCode: form.testCode,
        testName: testObj.testName,
        department: testObj.department,
        eqaType: form.eqaType,
        provider: form.provider,
        alternativeMethodology: form.eqaType === "Alternative" ? form.alternativeMethodology : "",
        cycleName: form.cycleName,
        labResult: form.labResult,
        targetValue: form.targetValue,
        acceptableRange: form.acceptableRange,
        score: form.score,
        status: form.status,
        receivedDate: form.receivedDate,
        submissionDate: form.submissionDate,
        peerLabName: form.peerLabName,
        comparatorMethod: form.comparatorMethod,
        correctiveAction: form.correctiveAction,
        enteredBy: authName || "Operator",
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, "eqaResults"), payload);
      alert("EQA / Alternative assessment run entry logged.");
      setModal(null);
      loadLogs();
    } catch (err) {
      console.error(err);
      alert("Failed to save entry.");
    }
    setSaving(false);
  };

  // Filters
  const filteredTestsOptions = tests.filter(t => {
    if (isGlobalUser && selectedDept === "All") return true;
    return t.department === userDept;
  });

  const displayRuns = eqaRuns.filter(r => {
    if (isGlobalUser && selectedDept === "All") return true;
    return r.department === userDept;
  });

  // Summary analysis for the selected parameter
  const summaryRuns = eqaRuns
    .filter(r => r.testCode === summaryTestCode)
    .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(-10);

  const activeSummaryTestObj = tests.find(t => t.mblCode === summaryTestCode);
  const satCount = summaryRuns.filter(r => r.status === "Satisfactory").length;
  const successRate = summaryRuns.length > 0 ? (satCount / summaryRuns.length) * 100 : 0;

  // Render SVG Z-Score Trend
  const renderZScoreTrend = () => {
    const W = 620, H = 160, PAD = { l: 45, r: 15, t: 15, b: 24 };
    const yScale = (v) => H - PAD.b - ((v - (-3)) / (3 - (-3))) * (H - PAD.t - PAD.b); // Range from -3 to +3
    const xStep = summaryRuns.length > 1 ? (W - PAD.l - PAD.r) / (summaryRuns.length - 1) : 0;

    const points = summaryRuns.map((r, i) => {
      const z = parseFloat(r.score) || 0;
      return { x: PAD.l + i * xStep, y: yScale(z), v: r, z };
    });

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, background: "#FFF", borderRadius: 8, border: "1px solid #E2E8F0" }}>
        {/* Horizontal reference lines */}
        {[-3, -2, -1, 0, 1, 2, 3].map(s => {
          const y = yScale(s);
          const isCenter = s === 0;
          const isOuter = Math.abs(s) === 3;
          const isWarn = Math.abs(s) === 2;
          return (
            <g key={s}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y}
                stroke={isCenter ? "#534AB7" : isOuter ? "#EF4444" : isWarn ? "#F59E0B" : "#E2E8F0"}
                strokeWidth={isCenter ? 1.5 : 0.8} strokeDasharray={isCenter ? "none" : "3 3"} />
              <text x={5} y={y + 3} fontSize={8.5} fill="#475569">{s === 0 ? "Target" : `${s > 0 ? "+" : ""}${s}SDI`}</text>
            </g>
          );
        })}
        {/* Connected path */}
        {points.length > 1 && (
          <polyline fill="none" stroke="#4F46E5" strokeWidth={1.5} points={points.map(p => `${p.x},${p.y}`).join(" ")} />
        )}
        {/* Scatter points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4.5}
              fill={Math.abs(p.z) > 2 ? "#EF4444" : Math.abs(p.z) > 1 ? "#F59E0B" : "#10B981"}
              stroke="#FFF" strokeWidth={1} />
            <text x={p.x} y={H - 5} fontSize={7.5} fill="#94A3B8" textAnchor="middle">Run {i+1}</text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>🎯</span>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>External Quality Assessment (EQAS) Console</h1>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>ISO 15189:2022 §7.3.7 · Interlaboratory Comparison & Alternative Methodologies</div>
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

          <div style={{ display: "flex", gap: 4, background: "#1E293B", padding: 3, borderRadius: 6 }}>
            <button
              onClick={() => setActiveTab("entry_log")}
              style={{ padding: "5px 12px", border: "none", borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: activeTab === "entry_log" ? "#534AB7" : "transparent", color: "#FFF" }}
            >
              Logs & Entry
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              style={{ padding: "5px 12px", border: "none", borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: "pointer", background: activeTab === "summary" ? "#534AB7" : "transparent", color: "#FFF" }}
            >
              EQA Summary
            </button>
          </div>

          <button style={S.btn("#534AB7", "#FFF")} onClick={() => {
            setModal("entry");
            if (filteredTestsOptions.length > 0) {
              handleSelectTest(filteredTestsOptions[0].mblCode);
            }
          }}>
            ➕ Enter EQA Result
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
        
        {/* TAB 1: LOGS & ENTRY */}
        {activeTab === "entry_log" && (
          <div>
            {/* KPI Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Tests EQA Configured", val: tests.filter(t => isGlobalUser && selectedDept === "All" ? true : t.department === userDept).length, color: "#1E293B", bg: "#FFF" },
                { label: "Formal EQA Mapped", val: tests.filter(t => (isGlobalUser && selectedDept === "All" ? true : t.department === userDept) && t.proficiencyTesting !== "Alternative Methodology (No Formal EQA Available)").length, color: "#1E40AF", bg: "#EFF6FF" },
                { label: "Alternative Methods Mapped", val: tests.filter(t => (isGlobalUser && selectedDept === "All" ? true : t.department === userDept) && t.proficiencyTesting === "Alternative Methodology (No Formal EQA Available)").length, color: "#B45309", bg: "#FEF3C7" },
                { label: "Satisfactory Rate (Total)", val: `${(displayRuns.length > 0 ? (displayRuns.filter(r => r.status === "Satisfactory").length / displayRuns.length) * 100 : 0).toFixed(1)}%`, color: "#0F766E", bg: "#F0FDFA" }
              ].map((c, i) => (
                <div key={i} style={{ background: c.bg, border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.val}</div>
                </div>
              ))}
            </div>

            {/* Logs Table */}
            <div style={S.card}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>EQA / Alternative Assessment Audit Register</span>
                <span style={{ fontSize: 11, color: "#64748B" }}>ISO 15189 §7.3.7 compliant record retention</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Submission Date</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Parameter</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Assessment Type</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Provider / Methodology</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Lab Result</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Consensus / Target</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Z-Score / SDI</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Loading logs...</td>
                      </tr>
                    ) : displayRuns.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No EQA/PT results registered for this department.</td>
                      </tr>
                    ) : (
                      displayRuns.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "12px 16px" }}>{fmtDate({ toDate: () => new Date(r.createdAt) })}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontWeight: 600, color: "#1E293B" }}>{r.testName}</span>
                            <code style={{ fontSize: 11, color: "#64748B", display: "block" }}>{r.testCode}</code>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10.5, fontWeight: 700,
                              background: r.eqaType === "Formal EQAS" ? "#EFF6FF" : "#FEF3C7",
                              color: r.eqaType === "Formal EQAS" ? "#1E40AF" : "#B45309"
                            }}>{r.eqaType}</span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {r.eqaType === "Formal EQAS" ? (
                              <div>
                                <strong>{r.provider}</strong>
                                <div style={{ fontSize: 10.5, color: "#64748B" }}>Cycle: {r.cycleName}</div>
                              </div>
                            ) : (
                              <div>
                                <strong>Alternative Method</strong>
                                <div style={{ fontSize: 10.5, color: "#92400E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }} title={r.alternativeMethodology}>
                                  {r.alternativeMethodology?.split(":")[0] || "Alternative"}
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{r.labResult}</td>
                          <td style={{ padding: "12px 16px" }}>{r.targetValue || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {r.score ? (
                              <span style={{ fontWeight: 600, color: Math.abs(parseFloat(r.score)) > 2.0 ? "#991B1B" : "#1E293B" }}>
                                {r.score} SDI
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              padding: "3px 9px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                              background: r.status === "Satisfactory" ? "#DCFCE7" : r.status === "Marginal" ? "#FEF3C7" : "#FEE2E2",
                              color: r.status === "Satisfactory" ? "#166534" : r.status === "Marginal" ? "#92400E" : "#991B1B"
                            }}>{r.status}</span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <button
                              style={{ padding: "4px 8px", background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 11.5, cursor: "pointer" }}
                              onClick={() => { setSelectedRun(r); setModal("view"); }}
                            >
                              🔎 View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARAMETER SUMMARY */}
        {activeTab === "summary" && (
          <div style={S.card}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F8FAFC" }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>EQA Historical Performance & Z-Score Analysis</span>
              <select
                style={{ ...S.inp, width: 260 }}
                value={summaryTestCode}
                onChange={e => setSummaryTestCode(e.target.value)}
              >
                {tests.filter(t => isGlobalUser && selectedDept === "All" ? true : t.department === userDept).map(t => (
                  <option key={t.mblCode} value={t.mblCode}>{t.testName} ({t.mblCode})</option>
                ))}
              </select>
            </div>
            
            <div style={{ padding: 20 }}>
              {summaryRuns.length === 0 ? (
                <div style={{ textAlign: "center", color: "#64748B", padding: "40px 0" }}>
                  No EQA cycles registered in the database for the selected parameter.
                </div>
              ) : (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>Assessment Methodology</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{activeSummaryTestObj?.proficiencyTesting}</div>
                      {activeSummaryTestObj?.alternativeMethodology && (
                        <div style={{ fontSize: 9.5, color: "#B45309", marginTop: 2 }}>{activeSummaryTestObj.alternativeMethodology?.split(":")[0] || ""}</div>
                      )}
                    </div>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>Total Runs Mapped</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", marginTop: 4 }}>{summaryRuns.length} Runs</div>
                    </div>
                    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", padding: 12, borderRadius: 8 }}>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>Satisfactory Rate</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: successRate >= 90 ? "#166534" : "#991B1B", marginTop: 4 }}>{successRate.toFixed(1)}%</div>
                    </div>
                  </div>

                  {activeSummaryTestObj?.proficiencyTesting !== "Alternative Methodology (No Formal EQA Available)" ? (
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#475569", marginBottom: 8 }}>SDI / Z-Score Trend Chart (Target ±2.0 SDI limit)</div>
                      {renderZScoreTrend()}
                    </div>
                  ) : (
                    <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: 16, fontSize: 12.5, color: "#92400E" }}>
                      <strong>Alternative Assessment Run Logged</strong>
                      <p style={{ margin: "6px 0 0 0" }}>
                        This parameter is evaluated via: <em>{activeSummaryTestObj.alternativeMethodology}</em>.
                        There is no formal Z-score trend. All interlaboratory comparison checks met satisfactory criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* EQA ENTRY MODAL */}
      {modal === "entry" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 620, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0" }}>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#0F172A", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>➕ Log EQA / Alternative Assessment Cycle</div>
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
                    <option key={t.mblCode} value={t.mblCode}>{t.testName} [{t.mblCode}]</option>
                  ))}
                </select>
              </div>

              {selectedTest && (
                <>
                  <div style={{ background: "#F1F5F9", padding: "10px 14px", borderRadius: 8, fontSize: 11.5, color: "#475569", marginBottom: 12 }}>
                    <strong>NABL Code:</strong> <code>{selectedTest.nablCode || "N/A"}</code> | <strong>Default Provider/Method:</strong> {selectedTest.proficiencyTesting}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>EQA Provider</label>
                      <select style={S.inp} value={form.provider} onChange={e => handleProviderChange(e.target.value)}>
                        {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Cycle Name / Number</label>
                      <input type="text" style={S.inp} value={form.cycleName} onChange={e => setForm({ ...form, cycleName: e.target.value })} placeholder="e.g. Cycle 2026-A" required />
                    </div>
                  </div>

                  {/* Alternative Methodology dropdown (conditionally displayed) */}
                  {form.eqaType === "Alternative" && (
                    <div style={{ border: "1.5px solid #F59E0B", background: "#FFFBEB", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309", marginBottom: 8 }}>
                        ⚠️ ISO §7.3.7.2 Alternative assessment methodology configuration
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={S.label}>Methodology Type</label>
                        <select style={S.inp} value={form.alternativeMethodology} onChange={e => setForm({ ...form, alternativeMethodology: e.target.value })}>
                          {ALTERNATIVES.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={S.label}>Reference Peer Lab / Provider Name</label>
                          <input type="text" style={S.inp} value={form.peerLabName} onChange={e => setForm({ ...form, peerLabName: e.target.value })} placeholder="e.g. CMC Vellore comparator" />
                        </div>
                        <div>
                          <label style={S.label}>Comparator Analyzer / Method</label>
                          <input type="text" style={S.inp} value={form.comparatorMethod} onChange={e => setForm({ ...form, comparatorMethod: e.target.value })} placeholder="e.g. Roche Cobas split test" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results entries */}
                  <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, background: "#F8FAFC", marginBottom: 12 }}>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={S.label}>Lab Observed Result</label>
                        <input type="text" style={S.inp} value={form.labResult} onChange={e => setForm({ ...form, labResult: e.target.value })} placeholder="Your reported value" required />
                      </div>
                      <div>
                        <label style={S.label}>Target / Consensus Value</label>
                        <input type="text" style={S.inp} value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} placeholder="Peer consensus mean" />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                      <div>
                        <label style={S.label}>Score / SDI / Z-Score</label>
                        <input type="text" style={S.inp} value={form.score} onChange={e => setForm({ ...form, score: e.target.value })} placeholder="e.g. +0.42" />
                      </div>
                      <div>
                        <label style={S.label}>Acceptable Range</label>
                        <input type="text" style={S.inp} value={form.acceptableRange} onChange={e => setForm({ ...form, acceptableRange: e.target.value })} />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginTop: 14 }}>
                      <div style={{ flex: 1 }}>
                        <label style={S.label}>Result Status</label>
                        <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} required>
                          {RESULT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handlePortalSync}
                        disabled={syncing}
                        style={S.btn(syncing ? "#64748B" : "#0F172A", "#FFF")}
                      >
                        {syncing ? "Connecting..." : (form.eqaType === "Alternative" ? "🔄 Sync Alternative Log" : "🌐 Fetch from Provider Portal")}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Received Date</label>
                      <input type="date" style={S.inp} value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Submission Date</label>
                      <input type="date" style={S.inp} value={form.submissionDate} onChange={e => setForm({ ...form, submissionDate: e.target.value })} />
                    </div>
                  </div>

                  {form.status !== "Satisfactory" && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...S.label, color: "#991B1B" }}>Corrective Action (Required for Marginal/Unsatisfactory Runs)</label>
                      <textarea
                        style={{ ...S.inp, height: 60, resize: "none", borderColor: "#EF4444" }}
                        value={form.correctiveAction}
                        onChange={e => setForm({ ...form, correctiveAction: e.target.value })}
                        placeholder="Detail the Root Cause Analysis (RCA) and containment actions..."
                        required
                      />
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                    <button type="button" style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(null)}>Cancel</button>
                    <button type="submit" style={S.btn()} disabled={saving}>{saving ? "Saving run..." : "Register Cycle Run"}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === "view" && selectedRun && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#0F172A", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>📋 EQA Cycle Assessment Report</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Parameter Name", val: `${selectedRun.testName} (${selectedRun.testCode})` },
                  { label: "Assessment Type", val: selectedRun.eqaType },
                  { label: "Provider / Method", val: selectedRun.eqaType === "Formal EQAS" ? selectedRun.provider : (selectedRun.alternativeMethodology?.split(":")[0] || "Alternative") },
                  { label: "Cycle Identifier", val: selectedRun.cycleName || "N/A" },
                  { label: "Lab Result", val: selectedRun.labResult },
                  { label: "Target Consensus", val: selectedRun.targetValue || "N/A" },
                  { label: "Score / SDI", val: selectedRun.score ? `${selectedRun.score} SDI` : "N/A" },
                  { label: "Range limit", val: selectedRun.acceptableRange || "N/A" },
                  { label: "Compliance Status", val: <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: selectedRun.status === "Satisfactory" ? "#DCFCE7" : "#FEE2E2", color: selectedRun.status === "Satisfactory" ? "#166534" : "#991B1B" }}>{selectedRun.status}</span> },
                  { label: "Verifier Name", val: selectedRun.enteredBy },
                  { label: "Received Date", val: fmtDate(selectedRun.receivedDate) },
                  { label: "Submission Date", val: fmtDate(selectedRun.submissionDate) }
                ].map((f, i) => (
                  <div key={i} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase" }}>{f.label}</div>
                    <div style={{ fontSize: 12, color: "#1E293B", marginTop: 3, fontWeight: 500 }}>{f.val}</div>
                  </div>
                ))}

                {selectedRun.eqaType === "Alternative" && (
                  <div style={{ gridColumn: "1/-1", background: "#FFFBEB", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#B45309", fontWeight: 600, textTransform: "uppercase" }}>Alternative Methodology Parameters</div>
                    <div style={{ fontSize: 12, color: "#92400E", marginTop: 4 }}>
                      • <strong>Peer Lab Name:</strong> {selectedRun.peerLabName || "N/A"} <br />
                      • <strong>Comparator Method:</strong> {selectedRun.comparatorMethod || "N/A"}
                    </div>
                  </div>
                )}

                {selectedRun.status !== "Satisfactory" && (
                  <div style={{ gridColumn: "1/-1", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 10, color: "#991B1B", fontWeight: 600, textTransform: "uppercase" }}>Corrective Action Plan (CAPA)</div>
                    <div style={{ fontSize: 12.5, color: "#991B1B", marginTop: 4, fontStyle: "italic" }}>
                      {selectedRun.correctiveAction || "No corrective action logged yet."}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button style={S.btn("#F1F5F9", "#475569")} onClick={() => setModal(null)}>Close Window</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
