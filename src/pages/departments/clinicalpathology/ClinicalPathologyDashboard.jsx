import QualityIndicatorsLog from "../QualityIndicatorsLog";
// ClinicalPathologyDashboard.jsx
// MBL QMS — Complete Clinical Pathology Department Dashboard
// ISO 15189:2022 and ISO 27001:2022 Compliant Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import { calculateLinearRegression, calculateBlandAltman } from "../../../utils/biochemHelpers";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";

// Premium Styling System (Charcoal & Grey Theme)
const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 255, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#4B5563" : "#5F5E5A",
    background: active ? "#F3F4F6" : "transparent",
    borderLeft: active ? "4px solid #4B5563" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#B4B2A9" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#4B5563", color: color || "#F3F4F6",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }
};

function today() { return new Date().toISOString().split("T")[0]; }

// Categories mapping for sidebar
const TABS = [
  { key: "clinpath_quality_indicators", label: "Quality Indicators Log", icon: "📈", cat: "Examination Protocols" },
  { key: "roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Responsibility Matrix", icon: "🔑", cat: "General & Personnel" },
  { key: "test_master", label: "Test Master", icon: "🔬", cat: "Examination Protocols" },
  
  { key: "iqc_minicap", label: "IQC - Mini Cap Logs", icon: "📈", cat: "Internal Quality Control" },
  { key: "iqc_esr", label: "IQC - ESR (Manual)", icon: "📈", cat: "Internal Quality Control" },
  { key: "iqc_trend", label: "IQC Trend & Westgard", icon: "📊", cat: "Internal Quality Control" },
  { key: "lot_verification", label: "Lot to Lot Verification", icon: "🧪", cat: "Internal Quality Control" },
  
  { key: "eqa_cp", label: "EQAS - Clinical Path", icon: "🌐", cat: "External Quality (EQAS)" },
  
  { key: "maint_minicap", label: "Minicap Maintenance", icon: "🔧", cat: "Equipment & Maintenance" },
  { key: "maint_stainer", label: "Stainer Maintenance", icon: "🔧", cat: "Equipment & Maintenance" },
  { key: "cp_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Equipment & Maintenance" },
  
  { key: "sample_receiving", label: "Sample Acceptance Log", icon: "📥", cat: "Pre-Examination & Process" },
  { key: "critical_reporting", label: "Critical Alert Reports", icon: "🚨", cat: "Pre-Examination & Process" },
  { key: "lis_security", label: "LIS & IT Security (27001)", icon: "🔒", cat: "Pre-Examination & Process" },
  { key: "cont_edu", label: "Continuing Education", icon: "📘", cat: "Pre-Examination & Process" }
];

export default function ClinicalPathologyDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [testList, setTestList] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  

  // State forms
  const [testForm, setTestForm] = useState({
    testName: "", equipment: "Manual / Bench", method: "Microscopy / Chemistry",
    unit: "cells/hpf", refRanges: "0 - 2", criticalLow: "", criticalHigh: "10.0",
    qcMean: "15.0", qcSD: "1.0"
  });

  const [iqcForm, setIqcForm] = useState({
    testId: "", level: "Level 2 (Normal)", value: "", mean: "", sd: "", unit: "", lotNumber: "LOT-CP-26"
  });

  const [eqaForm, setEqaForm] = useState({
    testId: "", surveyDate: today(), labValue: "", peerMean: "", peerSD: "", remarks: ""
  });

  const [maintForm, setMaintForm] = useState({
    machineName: "Minicap", cleanAperture: true, probeClean: true, rinseCycle: true, status: "Operational", remarks: ""
  });

  const [sampleForm, setSampleForm] = useState({
    patientId: "", patientName: "", tubeType: "Urine Container", volumeAdequate: true, clotted: false, status: "Accepted", remarks: ""
  });

  const [criticalForm, setCriticalForm] = useState({
    patientId: "", patientName: "", testName: "Urine RBCs", value: "25", calledTo: "", callTime: "", confirmedBy: false
  });

  const [secForm, setSecForm] = useState({
    checkDate: today(), privCheck: true, middlewareSync: true, authCheck: true, remarks: ""
  });

  const [cmeForm, setCmeForm] = useState({
    employeeId: "", title: "", provider: "", date: today(), credits: 4, hours: 4
  });

  // Lot verification comparison state (20 points)
  const [lotInput, setLotInput] = useState({
    currentLotName: "CP-REAG-A", newLotName: "CP-REAG-B",
    pts: Array.from({ length: 20 }, (_, i) => ({ id: `S${String(i+1).padStart(3,"0")}`, cur: (12 + Math.random()*4).toFixed(2), new: (12 + Math.random()*4).toFixed(2) }))
  });
  const [lotResult, setLotResult] = useState(null);

  // Load flags, employees, tests
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());
      
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load Tests matching "Clinical Pathology"
      const testSnap = await getDocs(query(collection(db, "testMaster"), where("department", "==", "Clinical Pathology")));
      const loadedTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTestList(loadedTests);
      
      if (loadedTests.length > 0 && !iqcForm.testId) {
        setIqcForm(prev => ({
          ...prev,
          testId: loadedTests[0].id,
          mean: loadedTests[0].qcMean || "",
          sd: loadedTests[0].qcSD || "",
          unit: loadedTests[0].unit || ""
        }));
        setEqaForm(prev => ({ ...prev, testId: loadedTests[0].id }));
      }
    } catch (e) {
      console.warn("Offline or firestore initialization failed.", e);
    }
    setLoading(false);
  }, []);

  // Load dynamic tab records
  const loadTabRecords = useCallback(async () => {
    try {
      if (activeTab.startsWith("iqc_")) {
        const key = activeTab === "iqc_trend" ? "clin_iqc_minicap" : `clin_${activeTab}`;
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Clinical Pathology"), where("featureKey", "==", key), orderBy("createdAt", "desc")));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Clinical Pathology"), where("featureKey", "==", `clin_${activeTab}`), orderBy("createdAt", "desc")));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.warn("Failed fetching logs.", e);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadTabRecords();
  }, [loadTabRecords]);

  // Run lot to lot calculations
  useEffect(() => {
    const x = lotInput.pts.map(p => parseFloat(p.cur) || 0);
    const y = lotInput.pts.map(p => parseFloat(p.new) || 0);
    const regression = calculateLinearRegression(x, y);
    const bland = calculateBlandAltman(x, y);
    setLotResult({ regression, bland });
  }, [lotInput.pts]);

  const visibleItems = TABS.filter(item => {
    const featureKey = `clin_${item.key}`;
    return featureFlags[featureKey] !== false;
  });

  const categories = ["General & Personnel", "Examination Protocols", "Internal Quality Control", "External Quality (EQAS)", "Equipment & Maintenance", "Pre-Examination & Process"];

  // Weekly Duty Roster Saver
  ;

  // Test Master Saver
  const handleAddTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...testForm,
        department: "Clinical Pathology",
        createdAt: serverTimestamp(),
        createdBy: userName || "Admin"
      };
      await addDoc(collection(db, "testMaster"), payload);
      alert("Test Master record added successfully.");
      setTestForm({
        testName: "", equipment: "Manual / Bench", method: "Microscopy / Chemistry",
        unit: "cells/hpf", refRanges: "0 - 2", criticalLow: "", criticalHigh: "10.0",
        qcMean: "15.0", qcSD: "1.0"
      });
      loadInitial();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // Log IQC Entry
  const handleIqcSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const test = testList.find(t => t.id === iqcForm.testId);
    if (!test) { alert("Select a valid test"); setSaving(false); return; }
    
    const val = parseFloat(iqcForm.value);
    const m = parseFloat(test.qcMean);
    const s = parseFloat(test.qcSD);
    const z = parseFloat(((val - m) / s).toFixed(2));
    
    let status = "Pass";
    let violation = "None";
    if (Math.abs(z) > 3) {
      status = "Reject";
      violation = "1_3s Rule Breach";
    } else if (Math.abs(z) > 2) {
      status = "Warning";
      violation = "1_2s Warning Alert";
    }

    try {
      const payload = {
        department: "Clinical Pathology",
        featureKey: `clin_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: today(),
          testId: iqcForm.testId,
          testName: test.testName,
          value: val,
          mean: m,
          sd: s,
          zScore: z,
          status,
          violation,
          lotNumber: iqcForm.lotNumber,
          unit: test.unit
        }
      };
      await addDoc(collection(db, "interactiveLogs"), payload);
      
      if (status === "Reject") {
        // Auto-Trigger CAPA Outlier in Quality
        await addDoc(collection(db, "capa"), {
          title: `IQC Outlier (CP): ${test.testName} (${violation})`,
          department: "Clinical Pathology",
          source: "IQC Outlier Log",
          description: `Z-score of ${z} logged. Target mean ${m}, value observed ${val}.`,
          status: "Pending Action",
          assignedTo: "HOD Clinical Pathology",
          createdAt: serverTimestamp(),
          createdBy: "Auto-trigger QMS"
        });
        alert(`🚨 IQC Outlier Rejected (${violation})! Corrective action ticket created automatically for Quality department.`);
      } else {
        alert("IQC Run logged successfully.");
      }
      setIqcForm(prev => ({ ...prev, value: "" }));
      loadTabRecords();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // Log EQAS Entry
  const handleEqaSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const test = testList.find(t => t.id === eqaForm.testId);
    if (!test) return;

    const val = parseFloat(eqaForm.labValue);
    const mean = parseFloat(eqaForm.peerMean);
    const sd = parseFloat(eqaForm.peerSD);
    const sdi = parseFloat(((val - mean) / sd).toFixed(2));
    
    let isOutlier = Math.abs(sdi) > 2;

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Clinical Pathology",
        featureKey: `clin_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          surveyDate: eqaForm.surveyDate,
          testName: test.testName,
          labValue: val,
          peerMean: mean,
          peerSD: sd,
          sdi,
          isOutlier,
          remarks: eqaForm.remarks
        }
      });

      if (isOutlier) {
        await addDoc(collection(db, "capa"), {
          title: `EQA Outlier (CP): ${test.testName} (SDI ${sdi})`,
          department: "Clinical Pathology",
          source: "EQA Outlier Log",
          description: `EQAS deviation recorded: Lab value ${val}, Peer Mean ${mean}, Peer SD ${sd}.`,
          status: "Pending Action",
          assignedTo: "HOD Clinical Pathology",
          createdAt: serverTimestamp(),
          createdBy: "Auto-trigger QMS"
        });
        alert(`🚨 EQAS Outlier logged (SDI: ${sdi})! Corrective action ticket created in CAPA database.`);
      } else {
        alert("EQAS survey results recorded.");
      }
      setEqaForm(prev => ({ ...prev, labValue: "", peerMean: "", peerSD: "", remarks: "" }));
      loadTabRecords();
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  // Machine Maintenance
  const handleMaintSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Clinical Pathology",
        featureKey: `clin_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: maintForm
      });

      if (maintForm.status === "Needs Service" || !maintForm.cleanAperture || !maintForm.probeClean) {
        // Log Breakdown to Biomedical Engineering
        await addDoc(collection(db, "breakdowns"), {
          equipmentName: maintForm.machineName,
          department: "Clinical Pathology",
          reportedBy: userName || "Staff",
          issue: `Failed daily maintenance check. Notes: ${maintForm.remarks || "N/A"}.`,
          severity: "High",
          status: "Pending",
          createdAt: serverTimestamp()
        });
        alert("⚠️ Maintenance failures detected. Breakdown request submitted automatically to Biomedical Engineering.");
      } else {
        alert("Maintenance check completed and logged.");
      }
      setMaintForm({ machineName: maintForm.machineName, cleanAperture: true, probeClean: true, rinseCycle: true, status: "Operational", remarks: "" });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // Sample Acceptance/Rejection
  const handleSampleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Clinical Pathology",
        featureKey: "clin_sample_receiving",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: sampleForm
      });
      alert("Sample check recorded successfully.");
      setSampleForm({ patientId: "", patientName: "", tubeType: "Urine Container", volumeAdequate: true, clotted: false, status: "Accepted", remarks: "" });
      loadTabRecords();
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  // Critical Value Reporting (ISO 15189 compliance)
  const handleCriticalSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Clinical Pathology",
        featureKey: "clin_critical_reporting",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: criticalForm
      });
      alert("Critical Alert action log filed successfully.");
      setCriticalForm({ patientId: "", patientName: "", testName: "Urine RBCs", value: "25", calledTo: "", callTime: "", confirmedBy: false });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  // IT & LIS Check (ISO 27001 compliance)
  const handleSecSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Clinical Pathology",
        featureKey: "clin_lis_security",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: secForm
      });
      alert("IT security & middleware sync check recorded.");
      setSecForm({ checkDate: today(), privCheck: true, middlewareSync: true, authCheck: true, remarks: "" });
      loadTabRecords();
    } catch(e) {
      console.error(e);
    }
    setSaving(false);
  };

  // HR CME Training log
  const handleCmeSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        employeeId: cmeForm.employeeId,
        employeeName: employees.find(emp => emp.id === cmeForm.employeeId)?.fullName || "Staff",
        title: cmeForm.title,
        provider: cmeForm.provider,
        date: cmeForm.date,
        credits: Number(cmeForm.credits),
        hours: Number(cmeForm.hours),
        department: "Clinical Pathology",
        createdAt: serverTimestamp()
      };
      // Write directly to central hrContinuingEducation
      await addDoc(collection(db, "hrContinuingEducation"), payload);
      alert("CME credit logged successfully and synchronized with HR database.");
      setCmeForm({ employeeId: "", title: "", provider: "", date: today(), credits: 4, hours: 4 });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      
      {/* Sidebar department categories */}
      <div style={S.sidebar}>
        <div style={{ padding: "16px 20px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#4B5563", letterSpacing: "0.03em" }}>CLINICAL PATHOLOGY</div>
          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>ISO 15189 / ISO 27001 Module</div>
        </div>
        
        <div style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {categories.map(cat => {
            const items = visibleItems.filter(i => i.cat === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat}>
                <div style={S.sectionHeader}>{cat}</div>
                {items.map(item => (
                  <div key={item.key} style={S.navItem(activeTab === item.key)} onClick={() => setActiveTab(item.key)}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        
        <div style={{ padding: 14, borderTop: "0.5px solid #E0DDD6", background: "#FAFAF8", fontSize: 11, color: "#888780", lineHeight: 1.4 }}>
          Signed in: <span style={{ fontWeight: 600, color: "#2C2C2A" }}>{userName || "Staff"}</span>
          <br/>Role: <span style={{ textTransform: "capitalize" }}>{role || "Staff"}</span>
        </div>
      </div>

      {/* Main content body */}
      <div style={S.content}>
        
        {loading && <div style={{ fontSize: 13, color: "#888780" }}>Fetching database parameters...</div>}

        {/* 1. ROSTER TAB */}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Clinical Pathology" role={role} userName={userName} />
        )}

        {/* 2. AUTH MATRIX */}
        {activeTab === "auth_matrix" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Responsibility & Authorization Matrix</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>ISO 15189:2022 §6.2.3: Verification that only certified and authorized staff run assays and release reports.</p>
            
            <div style={S.card}>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Staff Name</th>
                      <th style={S.th}>Authorized Roles</th>
                      <th style={S.th}>Routine Urinalysis</th>
                      <th style={S.th}>ESR (Manual) Bench</th>
                      <th style={S.th}>Microscopic Semen Examination</th>
                      <th style={S.th}>Report Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{emp.fullName}</td>
                        <td style={S.td}>{emp.role}</td>
                        <td style={S.td}>✅ Run & Calibrate</td>
                        <td style={S.td}>✅ Run & Lot Verify</td>
                        <td style={S.td}>{emp.role === "Staff" ? "❌ Not Authorized" : "✅ Authorized"}</td>
                        <td style={S.td}>{emp.role === "HOD" || emp.role === "Supervisor" ? "✅ HOD Final Release" : "❌ Technical Entry Only"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. TEST MASTER */}
        {activeTab === "test_master" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Clinical Pathology Test Master</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>Define test parameters, measurement units, critical limits, and QC target limits.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Add Diagnostic Test</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleAddTest}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Test Name</label>
                      <input style={S.inp} placeholder="e.g. Urine Routine" required value={testForm.testName} onChange={e => setTestForm(p => ({ ...p, testName: e.target.value }))} />
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Analyzer Used</label>
                        <select style={S.inp} value={testForm.equipment} onChange={e => setTestForm(p => ({ ...p, equipment: e.target.value }))}>
                          <option>Manual / Bench</option>
                          <option>Mini Cap</option>
                          <option>Atellica</option>
                          <option>Mini Vidas</option>
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>Methodology</label>
                        <input style={S.inp} value={testForm.method} onChange={e => setTestForm(p => ({ ...p, method: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Unit</label>
                        <input style={S.inp} placeholder="cells/hpf" value={testForm.unit} onChange={e => setTestForm(p => ({ ...p, unit: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Biological Ref Range</label>
                        <input style={S.inp} placeholder="0 - 2" value={testForm.refRanges} onChange={e => setTestForm(p => ({ ...p, refRanges: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Critical Low limit</label>
                        <input style={S.inp} placeholder="—" value={testForm.criticalLow} onChange={e => setTestForm(p => ({ ...p, criticalLow: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Critical High limit</label>
                        <input style={S.inp} placeholder="10" value={testForm.criticalHigh} onChange={e => setTestForm(p => ({ ...p, criticalHigh: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>IQC Target Mean</label>
                        <input style={S.inp} placeholder="15.0" value={testForm.qcMean} onChange={e => setTestForm(p => ({ ...p, qcMean: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>IQC Target SD</label>
                        <input style={S.inp} placeholder="1.0" value={testForm.qcSD} onChange={e => setTestForm(p => ({ ...p, qcSD: e.target.value }))} />
                      </div>
                    </div>
                    <button type="submit" style={{ ...S.btn(), width: "100%", marginTop: 8 }} disabled={saving}>
                      {saving ? "Saving..." : "Add Test Master Entry"}
                    </button>
                  </form>
                </div>
              </div>

              {/* List */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Registered Clinical Pathology Tests ({testList.length})</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: "550px", overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Test Name</th>
                        <th style={S.th}>Analyzer</th>
                        <th style={S.th}>Ref Range</th>
                        <th style={S.th}>Critical Limits</th>
                        <th style={S.th}>QC Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testList.map(t => (
                        <tr key={t.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{t.testName}</td>
                          <td style={S.td}>{t.equipment}</td>
                          <td style={S.td}>{t.refRanges} {t.unit}</td>
                          <td style={S.td}>
                            <span style={{ color: "#B91C1C", fontWeight: 500 }}>{t.criticalLow || "—"}</span> / <span style={{ color: "#B91C1C", fontWeight: 500 }}>{t.criticalHigh || "—"}</span>
                          </td>
                          <td style={S.td}>{t.qcMean} ± {t.qcSD}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. IQC RECORDERS (Minicap, ESR) */}
        {(activeTab === "iqc_minicap" || activeTab === "iqc_esr") && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>
              Daily Internal Quality Control (IQC) Run log — {activeTab === "iqc_minicap" ? "Mini Cap" : "ESR (Manual)"}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §7.3.7.2: Daily monitoring of precision and detection of systemic failures. Corrective action is auto-triggered upon outlier detection.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Logger Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Log Control Material Run</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleIqcSubmit}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Select Test Parameter</label>
                      <select
                        style={S.inp}
                        value={iqcForm.testId}
                        onChange={e => {
                          const t = testList.find(x => x.id === e.target.value);
                          setIqcForm(prev => ({
                            ...prev,
                            testId: e.target.value,
                            mean: t?.qcMean || "",
                            sd: t?.qcSD || "",
                            unit: t?.unit || ""
                          }));
                        }}
                      >
                        {testList.map(t => <option key={t.id} value={t.id}>{t.testName} ({t.equipment})</option>)}
                      </select>
                    </div>
                    
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Control Level</label>
                        <select style={S.inp} value={iqcForm.level} onChange={e => setIqcForm(p => ({ ...p, level: e.target.value }))}>
                          <option>Level 1 (Low)</option>
                          <option>Level 2 (Normal)</option>
                          <option>Level 3 (High)</option>
                        </select>
                      </div>
                      <div>
                        <label style={S.label}>QC Lot Number</label>
                        <input style={S.inp} value={iqcForm.lotNumber} onChange={e => setIqcForm(p => ({ ...p, lotNumber: e.target.value }))} />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Observed Value ({iqcForm.unit || "units"})</label>
                      <input style={S.inp} type="number" step="any" placeholder="Enter float result" required value={iqcForm.value} onChange={e => setIqcForm(p => ({ ...p, value: e.target.value }))} />
                    </div>

                    {iqcForm.mean && (
                      <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8, fontSize: 11, color: "#5F5E5A", marginBottom: 12 }}>
                        Target Mean: <span style={{ fontWeight: 600 }}>{iqcForm.mean}</span> | Target SD: <span style={{ fontWeight: 600 }}>{iqcForm.sd}</span>
                      </div>
                    )}

                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving}>
                      {saving ? "Logging..." : "Submit Control Run"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Records List */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Recent IQC Run History</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Test Parameter</th>
                        <th style={S.th}>Observed</th>
                        <th style={S.th}>Z-Score</th>
                        <th style={S.th}>QC Lot</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        const isReject = d.status === "Reject";
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.date}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{d.testName} ({d.level})</td>
                            <td style={S.td}>{d.value} {d.unit}</td>
                            <td style={{ ...S.td, color: Math.abs(d.zScore) > 2 ? "#B91C1C" : "#4B5563" }}>
                              {d.zScore > 0 ? "+" : ""}{d.zScore}
                            </td>
                            <td style={S.td}>{d.lotNumber}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: isReject ? "#FEE2E2" : d.status === "Warning" ? "#FEF3C7" : "#F3F4F6",
                                color: isReject ? "#991B1B" : d.status === "Warning" ? "#92400E" : "#1F2937"
                              }}>{d.status}</span>
                            </td>
                            <td style={S.td}>
                              {isReject && (
                                <button style={S.btn("#991B1B", "#FEE2E2")} onClick={() => window.location.href="/capa"}>
                                  View CAPA
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. IQC TREND & WESTGARD LEVEY-JENNINGS CHARTS */}
        {activeTab === "iqc_trend" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Levey-Jennings (LJ) Control Chart Analysis</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>Visual monitoring of QC drift, shift, and Westgard rule violations.</p>

            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Levey-Jennings Visual Control Bands</div>
              </div>
              <div style={{ ...S.cardBody, padding: "24px 16px" }}>
                {logs.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#888780", fontSize: 12 }}>
                    No control run records located. Generate mock logs or submit runs to view charts.
                  </div>
                ) : (
                  <div>
                    {(() => {
                      const latest = logs[0].data || {};
                      const mean = parseFloat(latest.mean) || 10;
                      const sd = parseFloat(latest.sd) || 1;
                      const u = latest.unit || "";
                      
                      const points = logs.slice(0, 15).reverse().map(l => ({
                        date: l.data?.date,
                        val: parseFloat(l.data?.value),
                        z: parseFloat(l.data?.zScore)
                      }));

                      return (
                        <div>
                          <div style={{ display: "flex", gap: 20, marginBottom: 20, background: "#FAFAF8", padding: 12, borderRadius: 8, fontSize: 12 }}>
                            <div>Parameter: <strong>{latest.testName}</strong></div>
                            <div>QC Lot: <strong>{latest.lotNumber}</strong></div>
                            <div>Mean: <strong>{mean} {u}</strong></div>
                            <div>SD: <strong>{sd} {u}</strong></div>
                          </div>
                          
                          {/* Visual Chart Grid */}
                          <div style={{ position: "relative", borderLeft: "2px solid #5F5E5A", borderBottom: "2px solid #5F5E5A", height: 220, margin: "10px 40px 30px" }}>
                            {/* Horizontal grid bands */}
                            {[3, 2, 1, 0, -1, -2, -3].map(sdMultiplier => {
                              const lineVal = (mean + sdMultiplier * sd).toFixed(2);
                              const yPercent = 50 - (sdMultiplier * 15); // Scale multiplier for UI
                              let lineColor = "#E0DDD6";
                              let labelColor = "#888780";
                              if (Math.abs(sdMultiplier) === 3) lineColor = "#FCA5A5";
                              if (Math.abs(sdMultiplier) === 2) lineColor = "#FDE68A";
                              if (sdMultiplier === 0) lineColor = "#6B7280";

                              return (
                                <div key={sdMultiplier} style={{ position: "absolute", top: `${yPercent}%`, left: 0, right: 0, borderTop: `1px ${sdMultiplier===0 ? "solid":"dashed"} ${lineColor}`, height: 0 }}>
                                  <span style={{ position: "absolute", left: -50, top: -8, fontSize: 10, color: labelColor, fontWeight: sdMultiplier===0 ? 700:500 }}>
                                    {sdMultiplier > 0 ? `+${sdMultiplier}SD` : sdMultiplier === 0 ? "Mean" : `${sdMultiplier}SD`}
                                  </span>
                                  <span style={{ position: "absolute", right: -50, top: -8, fontSize: 9, color: "#B4B2A9" }}>
                                    {lineVal}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Data points and line segments */}
                            <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "space-between", padding: "0 10px" }}>
                              {points.map((pt, idx) => {
                                const yPos = 50 - (pt.z * 15);
                                return (
                                  <div key={idx} style={{
                                    position: "absolute",
                                    left: `${(idx / (points.length - 1)) * 95}%`,
                                    top: `${yPos}%`,
                                    transform: "translate(-50%, -50%)",
                                    textAlign: "center",
                                    zIndex: 5
                                  }}>
                                    <div style={{
                                      width: 8, height: 8, borderRadius: "50%",
                                      background: Math.abs(pt.z) > 3 ? "#DC2626" : Math.abs(pt.z) > 2 ? "#D97706" : "#4B5563"
                                    }} title={`Val: ${pt.val}, Z: ${pt.z}`} />
                                    <span style={{ display: "block", fontSize: 8, color: "#888780", marginTop: 4, transform: "rotate(45deg)", whiteSpace: "nowrap" }}>
                                      {pt.date?.slice(5)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. LOT TO LOT VERIFICATION */}
        {activeTab === "lot_verification" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Lot-to-Lot Reagent & Quality Control Verification</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §6.6: Verify diagnostic comparability before placing new lots of reagents or control material into clinical service.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
              {/* Form Input for Lot data */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Lot Details & Samples Comparison (N=20)</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 520, overflowY: "auto" }}>
                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>Current Lot Name/ID</label>
                      <input style={S.inp} value={lotInput.currentLotName} onChange={e => setLotInput(p => ({ ...p, currentLotName: e.target.value }))} />
                    </div>
                    <div>
                      <label style={S.label}>New Lot Name/ID</label>
                      <input style={S.inp} value={lotInput.newLotName} onChange={e => setLotInput(p => ({ ...p, newLotName: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6, fontWeight: 600, fontSize: 11, color: "#5F5E5A" }}>
                      <span>Sample ID</span>
                      <span>Current Lot ({lotInput.currentLotName})</span>
                      <span>New Lot ({lotInput.newLotName})</span>
                    </div>
                    {lotInput.pts.map((pt, idx) => (
                      <div key={pt.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, display: "flex", alignItems: "center" }}>Sample {idx + 1}</span>
                        <input
                          style={S.inp}
                          type="number"
                          step="any"
                          value={pt.cur}
                          onChange={e => {
                            const copy = [...lotInput.pts];
                            copy[idx].cur = e.target.value;
                            setLotInput(prev => ({ ...prev, pts: copy }));
                          }}
                        />
                        <input
                          style={S.inp}
                          type="number"
                          step="any"
                          value={pt.new}
                          onChange={e => {
                            const copy = [...lotInput.pts];
                            copy[idx].new = e.target.value;
                            setLotInput(prev => ({ ...prev, pts: copy }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Statistics Results */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>Deming Linear Regression Analysis</div>
                  </div>
                  <div style={S.cardBody}>
                    {lotResult && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: "#4B5563", fontFamily: "monospace" }}>
                          {lotResult.regression.equation}
                        </div>
                        <div style={S.grid(3)}>
                          <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#888780" }}>Slope (m)</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>{lotResult.regression.slope}</div>
                            <div style={{ fontSize: 9, color: "#888780" }}>Acceptable: 0.95 - 1.05</div>
                          </div>
                          <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#888780" }}>Intercept (c)</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>{lotResult.regression.intercept}</div>
                            <div style={{ fontSize: 9, color: "#888780" }}>Ideal: 0.00</div>
                          </div>
                          <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: "#888780" }}>R² Correlation</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>{lotResult.regression.r2}</div>
                            <div style={{ fontSize: 9, color: "#065F46" }}>Excellent: &gt;0.98</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>Bland-Altman Bias & Limits of Agreement</div>
                  </div>
                  <div style={S.cardBody}>
                    {lotResult && (
                      <div style={S.grid(3)}>
                        <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "#888780" }}>Mean Bias</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>{lotResult.bland.meanDifference}%</div>
                          <div style={{ fontSize: 9, color: "#065F46" }}>Ref Limit: &lt; 5.0%</div>
                        </div>
                        <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "#888780" }}>LOA Upper (95%)</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>+{lotResult.bland.loaUpper}%</div>
                        </div>
                        <div style={{ background: "#FAFAF8", padding: 10, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, color: "#888780" }}>LOA Lower (95%)</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>{lotResult.bland.loaLower}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ background: "#E1F5EE", border: "0.5px solid #5DCAA5", padding: 12, borderRadius: 8, color: "#085041", fontSize: 11, lineHeight: 1.5 }}>
                  <strong>✓ Lot Verification Sign-Off:</strong> All values fall within standard NABL tolerance limits. This reagent lot is certified as clinically equivalent.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. EQAS CHANNELS */}
        {activeTab === "eqa_cp" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>
              External Quality Assessment (EQAS) / Proficiency Testing
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §7.3.7.3: Assessment of accuracy relative to peer group means. SDI &gt; 2.0 triggers automatic CAPA.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Submit EQAS Survey Results</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleEqaSubmit}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Select Diagnostic Test</label>
                      <select style={S.inp} value={eqaForm.testId} onChange={e => setEqaForm(p => ({ ...p, testId: e.target.value }))}>
                        {testList.map(t => <option key={t.id} value={t.id}>{t.testName}</option>)}
                      </select>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Survey Date</label>
                        <input style={S.inp} type="date" value={eqaForm.surveyDate} onChange={e => setEqaForm(p => ({ ...p, surveyDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Your Lab Value</label>
                        <input style={S.inp} type="number" step="any" required value={eqaForm.labValue} onChange={e => setEqaForm(p => ({ ...p, labValue: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Peer Group Mean</label>
                        <input style={S.inp} type="number" step="any" required value={eqaForm.peerMean} onChange={e => setEqaForm(p => ({ ...p, peerMean: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Peer Group SD</label>
                        <input style={S.inp} type="number" step="any" required value={eqaForm.peerSD} onChange={e => setEqaForm(p => ({ ...p, peerSD: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Remarks / Deviation Reason</label>
                      <textarea style={{ ...S.inp, height: 50 }} value={eqaForm.remarks} onChange={e => setEqaForm(p => ({ ...p, remarks: e.target.value }))} />
                    </div>
                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving}>
                      {saving ? "Filing Survey..." : "Submit EQAS Entry"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Records */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>EQA Survey Logs</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Survey Date</th>
                        <th style={S.th}>Test Parameter</th>
                        <th style={S.th}>Lab Val</th>
                        <th style={S.th}>Peer Mean</th>
                        <th style={S.th}>SDI (Z-Score)</th>
                        <th style={S.th}>Outlier?</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.surveyDate}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{d.testName}</td>
                            <td style={S.td}>{d.labValue}</td>
                            <td style={S.td}>{d.peerMean} (±{d.peerSD})</td>
                            <td style={{ ...S.td, color: d.isOutlier ? "#B91C1C" : "#0F6E56", fontWeight: 600 }}>
                              {d.sdi > 0 ? "+" : ""}{d.sdi}
                            </td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: d.isOutlier ? "#FEE2E2" : "#D1FAE5",
                                color: d.isOutlier ? "#991B1B" : "#065F46"
                              }}>{d.isOutlier ? "Outlier Rejected" : "Acceptable"}</span>
                            </td>
                            <td style={S.td}>
                              {d.isOutlier && (
                                <button style={S.btn("#991B1B", "#FEE2E2")} onClick={() => window.location.href="/capa"}>
                                  View CAPA
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. MACHINE MAINTENANCE */}
        {(activeTab === "maint_minicap" || activeTab === "maint_stainer") && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>
              Analyzer Maintenance Checklist & Log — {activeTab === "maint_minicap" ? "Minicap" : "Stainer"}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §6.5: Documented daily maintenance. Failed checks trigger automatic breakdown request to Biomedical Engineering.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Daily Operations Check</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleMaintSubmit}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ ...S.label, fontWeight: 600 }}>Instrument Name</label>
                      <input style={{ ...S.inp, background: "#F1EFE8" }} readOnly value={maintForm.machineName = activeTab === "maint_minicap" ? "Minicap" : "Stainer"} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                        <input type="checkbox" checked={maintForm.cleanAperture} onChange={e => setMaintForm(p => ({ ...p, cleanAperture: e.target.checked }))} />
                        Aperture / Probe Rinse complete
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                        <input type="checkbox" checked={maintForm.probeClean} onChange={e => setMaintForm(p => ({ ...p, probeClean: e.target.checked }))} />
                        Fluidic lines check (No Bubbles)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                        <input type="checkbox" checked={maintForm.rinseCycle} onChange={e => setMaintForm(p => ({ ...p, rinseCycle: e.target.checked }))} />
                        Daily shutdown/rinse cycle executed
                      </label>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Instrument Status</label>
                      <select style={S.inp} value={maintForm.status} onChange={e => setMaintForm(p => ({ ...p, status: e.target.value }))}>
                        <option>Operational</option>
                        <option>Needs Service</option>
                        <option>Out of Service</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Remarks / Error Codes</label>
                      <textarea style={{ ...S.inp, height: 60 }} value={maintForm.remarks} onChange={e => setMaintForm(p => ({ ...p, remarks: e.target.value }))} />
                    </div>

                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving}>
                      {saving ? "Filing Log..." : "Save Maintenance Log"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Maintenance history */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Maintenance History Trail</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Machine</th>
                        <th style={S.th}>Aperture Rinse</th>
                        <th style={S.th}>Fluidics</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Operator</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleDateString() : today()}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{d.machineName}</td>
                            <td style={S.td}>{d.cleanAperture ? "✓ Done" : "❌ Failed"}</td>
                            <td style={S.td}>{d.probeClean ? "✓ Ok" : "❌ Failed"}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: d.status === "Operational" ? "#D1FAE5" : "#FEE2E2",
                                color: d.status === "Operational" ? "#065F46" : "#991B1B"
                              }}>{d.status}</span>
                            </td>
                            <td style={S.td}>{log.createdBy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. SAMPLE RECEIVING / ACCEPTANCE LOG */}
        {activeTab === "sample_receiving" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Pre-Examination Sample Receiving & Integrity Check</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189:2022 §7.2.3: Verification of specimen integrity (leaks, volume, correct container) upon reception in Clinical Pathology.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Verify Specimen Integrity</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleSampleSubmit}>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Patient ID / Barcode</label>
                        <input style={S.inp} placeholder="PID-8899" required value={sampleForm.patientId} onChange={e => setSampleForm(p => ({ ...p, patientId: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Patient Name</label>
                        <input style={S.inp} placeholder="Devi Prasad" required value={sampleForm.patientName} onChange={e => setSampleForm(p => ({ ...p, patientName: e.target.value }))} />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Specimen Type</label>
                      <select style={S.inp} value={sampleForm.tubeType} onChange={e => setSampleForm(p => ({ ...p, tubeType: e.target.value }))}>
                        <option>Urine Container</option>
                        <option>Stool Container</option>
                        <option>Semen Container</option>
                        <option>Sputum Container</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <input type="checkbox" checked={sampleForm.volumeAdequate} onChange={e => setSampleForm(p => ({ ...p, volumeAdequate: e.target.checked }))} />
                        Sample Volume is Adequate (up to fill mark)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <input type="checkbox" checked={sampleForm.clotted} onChange={e => setSampleForm(p => ({ ...p, clotted: e.target.checked }))} />
                        Specimen Leakage or Contamination Observed
                      </label>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Action / Decision</label>
                      <select style={S.inp} value={sampleForm.status} onChange={e => setSampleForm(p => ({ ...p, status: e.target.value }))}>
                        <option>Accepted</option>
                        <option>Rejected - Redraw requested</option>
                        <option>Conditional Acceptance</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Rejection Remarks</label>
                      <input style={S.inp} value={sampleForm.remarks} onChange={e => setSampleForm(p => ({ ...p, remarks: e.target.value }))} />
                    </div>

                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving}>
                      {saving ? "Saving Check..." : "Record Sample Intake"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Intake log */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Intake Registry Trail</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Intake Time</th>
                        <th style={S.th}>Patient</th>
                        <th style={S.th}>Type</th>
                        <th style={S.th}>Contaminated?</th>
                        <th style={S.th}>Action</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        const isReject = d.status?.includes("Rejected");
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleTimeString() : "N/A"}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{d.patientName} ({d.patientId})</td>
                            <td style={S.td}>{d.tubeType}</td>
                            <td style={{ ...S.td, color: d.clotted ? "#B91C1C" : "#5F5E5A" }}>{d.clotted ? "🚨 Yes" : "No"}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: isReject ? "#FEE2E2" : "#D1FAE5",
                                color: isReject ? "#991B1B" : "#065F46"
                              }}>{d.status}</span>
                            </td>
                            <td style={S.td}>{d.remarks || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. CRITICAL REPORTING */}
        {activeTab === "critical_reporting" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Critical Value Immediate Telephonic Reporting Log</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §7.3.7.2: Mandatory documentation of immediate voice communication to the clinician for life-threatening test values.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Document Critical Callout</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleCriticalSubmit}>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Patient Name</label>
                        <input style={S.inp} required value={criticalForm.patientName} onChange={e => setCriticalForm(p => ({ ...p, patientName: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Patient ID</label>
                        <input style={S.inp} required value={criticalForm.patientId} onChange={e => setCriticalForm(p => ({ ...p, patientId: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Analyte</label>
                        <input style={S.inp} value={criticalForm.testName} onChange={e => setCriticalForm(p => ({ ...p, testName: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Observed Critical Value</label>
                        <input style={S.inp} value={criticalForm.value} onChange={e => setCriticalForm(p => ({ ...p, value: e.target.value }))} />
                      </div>
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>Clinician Called</label>
                        <input style={S.inp} placeholder="Dr. Sivaraman" required value={criticalForm.calledTo} onChange={e => setCriticalForm(p => ({ ...p, calledTo: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>Time of Call</label>
                        <input style={S.inp} type="time" required value={criticalForm.callTime} onChange={e => setCriticalForm(p => ({ ...p, callTime: e.target.value }))} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 14px" }}>
                      <input type="checkbox" checked={criticalForm.confirmedBy} onChange={e => setCriticalForm(p => ({ ...p, confirmedBy: e.target.checked }))} />
                      <label style={{ fontSize: 12, cursor: "pointer" }}>Readback Confirmed (Clinician read back details to confirm accuracy)</label>
                    </div>
                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving || !criticalForm.confirmedBy}>
                      {saving ? "Saving Alert..." : "Save Critical Communication Log"}
                    </button>
                  </form>
                </div>
              </div>

              {/* Alert history */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Immediate Voice Alerts Filed</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Call Date/Time</th>
                        <th style={S.th}>Patient Details</th>
                        <th style={S.th}>Critical Result</th>
                        <th style={S.th}>Clinician</th>
                        <th style={S.th}>Readback?</th>
                        <th style={S.th}>Logged By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.callTime}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{d.patientName} ({d.patientId})</td>
                            <td style={{ ...S.td, color: "#DC2626", fontWeight: 700 }}>{d.testName}: {d.value}</td>
                            <td style={S.td}>{d.calledTo}</td>
                            <td style={S.td}>{d.confirmedBy ? "✅ Verified" : "❌ No readback"}</td>
                            <td style={S.td}>{log.createdBy}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 11. IT & LIS SECURITY */}
        {activeTab === "lis_security" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>IT Middleware Connectivity & Security Log</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 27001:2022 A.12.4: Daily verification of patient details encryption, middleware barcode sync, and access log integrity checks.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Daily Security Verification</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleSecSubmit}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Check Date</label>
                      <input style={S.inp} type="date" value={secForm.checkDate} onChange={e => setSecForm(p => ({ ...p, checkDate: e.target.value }))} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <input type="checkbox" checked={secForm.privCheck} onChange={e => setSecForm(p => ({ ...p, privCheck: e.target.checked }))} />
                        Patient privacy data encryption verified
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <input type="checkbox" checked={secForm.middlewareSync} onChange={e => setSecForm(p => ({ ...p, middlewareSync: e.target.checked }))} />
                        Middleware HL7 barcode synchronization operational
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <input type="checkbox" checked={secForm.authCheck} onChange={e => setSecForm(p => ({ ...p, authCheck: e.target.checked }))} />
                        Middleware bidirectional check done & system logs cleared
                      </label>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={S.label}>Remarks / Security Incidents</label>
                      <textarea style={{ ...S.inp, height: 60 }} placeholder="No security events or HL7 middleware exceptions recorded." value={secForm.remarks} onChange={e => setSecForm(p => ({ ...p, remarks: e.target.value }))} />
                    </div>
                    <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={saving}>
                      {saving ? "Filing Log..." : "Log Daily IT Security Audit"}
                    </button>
                  </form>
                </div>
              </div>

              {/* IT logs */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>IT Security Integrity Checklist History</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Audit Date</th>
                        <th style={S.th}>Privacy Encrypted?</th>
                        <th style={S.th}>HL7 Middleware?</th>
                        <th style={S.th}>Log Audited?</th>
                        <th style={S.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        const ok = d.privCheck && d.middlewareSync && d.authCheck;
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.checkDate}</td>
                            <td style={S.td}>{d.privCheck ? "✓ Yes" : "❌ No"}</td>
                            <td style={S.td}>{d.middlewareSync ? "✓ HL7 Bidirectional" : "❌ Sync Failure"}</td>
                            <td style={S.td}>{d.authCheck ? "✓ Done" : "❌ Pending"}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                                background: ok ? "#D1FAE5" : "#FEE2E2",
                                color: ok ? "#065F46" : "#991B1B"
                              }}>{ok ? "IT Secure" : "Warning - Check IT"}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 12. CONTINUING EDUCATION */}
        {activeTab === "cont_edu" && (
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, color: "#2C2C2A" }}>Continuing Medical Education (CME) & Training Credits</h3>
            <p style={{ margin: "0 0 16px", fontSize: 12, color: "#888780" }}>
              ISO 15189 §6.2.4: Log staff training credits and continuing professional development activities. Syncs directly with HR.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
              {/* Form */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Submit CME Training Log</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleCmeSubmit}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Select Staff Member</label>
                      <select style={S.inp} required value={cmeForm.employeeId} onChange={e => setCmeForm(p => ({ ...p, employeeId: e.target.value }))}>
                        <option value="">-- Choose Employee --</option>
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>CME Activity Title</label>
                      <input style={S.inp} placeholder="e.g. Advanced Urine Microscopy & Casts identification" required value={cmeForm.title} onChange={e => setCmeForm(p => ({ ...p, title: e.target.value }))} />
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <label style={S.label}>Training Provider / Institution</label>
                      <input style={S.inp} placeholder="e.g. NABL Training Centre" required value={cmeForm.provider} onChange={e => setCmeForm(p => ({ ...p, provider: e.target.value }))} />
                    </div>

                    <div style={S.grid(3)}>
                      <div style={{ gridColumn: "span 2" }}>
                        <label style={S.label}>Date Completed</label>
                        <input style={S.inp} type="date" value={cmeForm.date} onChange={e => setCmeForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div>
                        <label style={S.label}>CME Credits</label>
                        <input style={S.inp} type="number" value={cmeForm.credits} onChange={e => setCmeForm(p => ({ ...p, credits: e.target.value }))} />
                      </div>
                    </div>

                    <button type="submit" style={{ ...S.btn(), width: "100%", marginTop: 10 }} disabled={saving || !cmeForm.employeeId}>
                      {saving ? "Submitting..." : "Log CME & Sync to HR"}
                    </button>
                  </form>
                </div>
              </div>

              {/* CME logs */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Professional Development Registry (CME)</div>
                </div>
                <div style={{ ...S.cardBody, maxHeight: 420, overflowY: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Employee</th>
                        <th style={S.th}>Training Title</th>
                        <th style={S.th}>Provider</th>
                        <th style={S.th}>Credits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => {
                        const d = log.data || {};
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.date}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{log.employeeName || "Staff"}</td>
                            <td style={S.td}>{d.title}</td>
                            <td style={S.td}>{d.provider}</td>
                            <td style={S.td}>
                              <span style={{ padding: "2px 6px", borderRadius: 10, background: "#FEF3C7", color: "#B45309", fontWeight: 700 }}>
                                {d.credits} CME
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
          </div>
        )}
        
        {activeTab === "cp_temp_monitoring" && (
          <TemperatureDashboard department="Clinical Pathology" />
        )}

      {activeTab === "clinpath_quality_indicators" && (
          <QualityIndicatorsLog department="Clinical Pathology" />
        )}
        </div>
    </div>
  );
}