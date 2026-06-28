// FlowCytometryDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Flow Cytometry Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";
import SampleRejectionDashboard from "../SampleRejection/SampleRejectionDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 260, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#5B21B6" : "#5F5E5A",
    background: active ? "#F5F3FF" : "transparent",
    borderLeft: active ? "4px solid #8B5CF6" : "4px solid transparent",
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
    padding: "6px 12px", background: bg || "#8B5CF6", color: color || "#FFF",
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

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "advisory", label: "Advisory Services", icon: "💬", cat: "General & Personnel" },
  { key: "communication", label: "Communication Log", icon: "📞", cat: "General & Personnel" },
  { key: "cont_edu", label: "Continuing Education & Training", icon: "📖", cat: "General & Personnel" },
  { key: "suggestions", label: "Staff Suggestions Log", icon: "💡", cat: "General & Personnel" },
  { key: "sop", label: "SOP Manual", icon: "📕", cat: "General & Personnel" },

  { key: "test_master", label: "Test Master Database", icon: "🔬", cat: "Examination Protocols" },
  { key: "daily_cd", label: "Daily CD3/CD4/CD8 Count", icon: "📊", cat: "Examination Protocols" },
  { key: "daily_hlab27", label: "Daily HLA-B27 Results", icon: "📊", cat: "Examination Protocols" },
  
  { key: "iqc_cd", label: "IQC - CD Lymphocytes", icon: "📈", cat: "Internal Quality Control" },
  { key: "iqc_hlab27", label: "IQC - HLA-B27 Control", icon: "📈", cat: "Internal Quality Control" },
  { key: "iqc_lj", label: "Levey-Jennings Chart Analysis", icon: "📉", cat: "Internal Quality Control" },
  { key: "iqc_equip_lj", label: "Equipment LJ Chart", icon: "📉", cat: "Internal Quality Control" },
  { key: "iqc_trend", label: "IQC Trend Analysis", icon: "📊", cat: "Internal Quality Control" },
  { key: "lot_reagents", label: "Lot-to-Lot Reagents", icon: "🧪", cat: "Internal Quality Control" },
  { key: "inserts_qc", label: "Kit Inserts - QC", icon: "📄", cat: "Internal Quality Control" },
  { key: "inserts_reagents", label: "Kit Inserts - Reagents", icon: "📄", cat: "Internal Quality Control" },

  { key: "eqa_cd", label: "EQAS CD lymphocyte", icon: "🌐", cat: "External Quality (EQAS)" },
  { key: "inter_lab", label: "Inter-Lab Comparison", icon: "🔄", cat: "External Quality (EQAS)" },
  { key: "outliers_iqc", label: "Corrective Action - IQC Outliers", icon: "🚨", cat: "External Quality (EQAS)" },
  { key: "outliers_eqa", label: "Corrective Action - EQA Outliers", icon: "🚨", cat: "External Quality (EQAS)" },
  { key: "audit_eval", label: "Audits (Internal & External)", icon: "📋", cat: "External Quality (EQAS)" },

  { key: "maint", label: "Equipment Maintenance", icon: "⚙️", cat: "Equipment & Logs" },
  { key: "flow_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Equipment & Logs" },
  { key: "stock", label: "Stock Inventory", icon: "📦", cat: "Equipment & Logs" },
  
  { key: "sample_handling", label: "Sample receiving & handling", icon: "📥", cat: "Pre-Examination & Process" },
  { key: "sample_rejection", label: "Sample Rejection Log", icon: "❌", cat: "Pre-Examination & Process" },
  { key: "error_log", label: "Error Log", icon: "⚠️", cat: "Pre-Examination & Process" },
  { key: "non_conformance", label: "Non-Conformance", icon: "❌", cat: "Pre-Examination & Process" },
  { key: "repeat_sample", label: "Repeat Sample Log", icon: "🔄", cat: "Pre-Examination & Process" },
  { key: "revised_report", label: "Revised Report Log", icon: "📝", cat: "Pre-Examination & Process" }
];

export default function FlowCytometryDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [testList, setTestList] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  

  // Forms
  const [testForm, setTestForm] = useState({
    testName: "", equipment: "BD FACSLyric", method: "Direct Immunofluorescence flow cytometry",
    unit: "cells/µL", refRanges: "CD4: 500-1500", criticalLow: "CD4 < 200", criticalHigh: "CD4 > 2000",
    qcMean: "800", qcSD: "50"
  });

  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
  });

  // Levey Jennings / IQC form
  const [iqcRunForm, setIqcRunForm] = useState({
    testId: "", level: "Normal Control", value: "", mean: "", sd: "", lotNo: "LOT-FL-88", remarks: ""
  });

  const [calculatedZ, setCalculatedZ] = useState(null);
  const [westgardAlert, setWestgardAlert] = useState("");

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());
      
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const testSnap = await getDocs(query(collection(db, "testMaster"), where("department", "==", "Flow Cytometry")));
      const loadedTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTestList(loadedTests);

      if (loadedTests.length > 0) {
        setIqcRunForm(prev => ({
          ...prev,
          testId: loadedTests[0].id,
          mean: loadedTests[0].qcMean || "800",
          sd: loadedTests[0].qcSD || "50"
        }));
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabRecords = useCallback(async () => {
    try {
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Flow Cytometry"), where("featureKey", "==", `flow_${activeTab}`), orderBy("createdAt", "desc")));
        setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      
    } catch (e) {
      console.warn(e);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadTabRecords();
  }, [loadTabRecords]);

  // Recalculate Z score and Westgard rules when input value changes
  useEffect(() => {
    const val = parseFloat(iqcRunForm.value);
    const mean = parseFloat(iqcRunForm.mean);
    const sd = parseFloat(iqcRunForm.sd);
    if (!isNaN(val) && !isNaN(mean) && !isNaN(sd) && sd > 0) {
      const z = (val - mean) / sd;
      setCalculatedZ(z.toFixed(2));
      if (Math.abs(z) >= 3.0) {
        setWestgardAlert("Violation: 1-3s Rule (Out of control - action required!)");
      } else if (Math.abs(z) >= 2.0) {
        setWestgardAlert("Warning: 1-2s Rule (Violates warning limit - review trend)");
      } else {
        setWestgardAlert("Normal (Within +/- 2 SD)");
      }
    } else {
      setCalculatedZ(null);
      setWestgardAlert("");
    }
  }, [iqcRunForm.value, iqcRunForm.mean, iqcRunForm.sd]);

  ;

  const handleAddTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "testMaster"), {
        ...testForm,
        department: "Flow Cytometry",
        createdAt: serverTimestamp(),
        createdBy: userName || "Admin"
      });
      alert("Test Master record added.");
      setTestForm({
        testName: "", equipment: "BD FACSLyric", method: "Direct Immunofluorescence flow cytometry",
        unit: "cells/µL", refRanges: "CD4: 500-1500", criticalLow: "CD4 < 200", criticalHigh: "CD4 > 2000",
        qcMean: "800", qcSD: "50"
      });
      loadInitial();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Flow Cytometry",
        featureKey: `flow_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: genericForm.inspector,
          val: genericForm.val,
          status: genericForm.status,
          remarks: genericForm.remarks
        }
      });
      alert("Log successfully recorded.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleIQCSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const zScore = parseFloat(calculatedZ) || 0;
    const statusVal = Math.abs(zScore) >= 3.0 ? "Fail" : (Math.abs(zScore) >= 2.0 ? "Warning" : "Pass");

    if (statusVal === "Fail") {
      const confirmCapa = window.confirm(`Levey-Jennings violation detected (Z-Score: ${calculatedZ}). Would you like to log a corrective action (CAPA) with the Quality Department?`);
      if (confirmCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: "Flow Cytometry IQC Outlier",
            details: `IQC Run value ${iqcRunForm.value} yielded a Z-score of ${calculatedZ} against Mean ${iqcRunForm.mean} (Lot: ${iqcRunForm.lotNo}).`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Staff"
          });
          alert("CAPA logged successfully.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      const selectedTestName = testList.find(t => t.id === iqcRunForm.testId)?.testName || "Flow Test";
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Flow Cytometry",
        featureKey: `flow_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `${selectedTestName} Control Run: ${iqcRunForm.value} (Target Mean: ${iqcRunForm.mean}, SD: ${iqcRunForm.sd}, Z-Score: ${calculatedZ})`,
          status: statusVal,
          remarks: `${iqcRunForm.remarks} | Lot: ${iqcRunForm.lotNo}`
        }
      });
      alert("IQC run saved successfully.");
      setIqcRunForm(prev => ({ ...prev, value: "", remarks: "" }));
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCMESubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "hrContinuingEducation"), {
        department: "Flow Cytometry",
        employeeName: genericForm.inspector || userName || "Staff",
        topic: genericForm.val || "Flow CME Training Session",
        hours: parseFloat(genericForm.status) || 1,
        date: new Date().toISOString().split("T")[0],
        remarks: genericForm.remarks,
        createdAt: serverTimestamp()
      });
      alert("CME Continuing Education logged to HR Department.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const triggerBreakdownReport = async (eqName) => {
    const details = window.prompt(`Report equipment breakdown for ${eqName}. Please enter failure details:`);
    if (!details) return;
    try {
      await addDoc(collection(db, "actionRequests"), {
        addressedDepartment: "Biomedical",
        status: "Open",
        equipment: eqName,
        details: `Reported from Flow Cytometry: ${details}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert(`Breakdown request logged with Biomedical Engineering for ${eqName}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerCAPARequest = async (title, val) => {
    const confirm = window.confirm(`Failed quality control check (${val}). Would you like to log a CAPA request with the Quality Department?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: `Flow Cytometry ${title} Failure`,
        details: `IQC run or check yielded fail value: ${val}.`,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("CAPA Corrective Action Request successfully logged.");
    } catch (e) {
      console.error(e);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`flow_${item.key}`] !== false);
  const categories = ["General & Personnel", "Examination Protocols", "Internal Quality Control", "External Quality (EQAS)", "Equipment & Logs", "Pre-Examination & Process"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4C1D95" }}>Flow Cytometry Console</div>
          <div style={{ fontSize: 9.5, color: "#8B5CF6", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
        </div>
        {categories.map(cat => {
          const items = visibleItems.filter(i => i.cat === cat);
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div style={S.sectionHeader}>{cat}</div>
              {items.map(item => (
                <div
                  key={item.key}
                  onClick={() => { setActiveTab(item.key); setLogs([]); }}
                  style={S.navItem(activeTab === item.key)}
                >
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Main Work Area */}
      <div style={S.content}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888780", fontSize: 13 }}>Loading department configurations...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2C2C2A", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Department Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#888780" }}>
                  Active Section: Flow Cytometry | Operator: {userName || "Authorized Staff"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#F5F3FF", borderRadius: 8, border: "0.5px solid #DDD6FE", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B5CF6" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#5B21B6" }}>System Online (ISO 27001 Secured)</span>
              </div>
            </div>

            {/* Render Tabs content */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Flow Cytometry" role={role} userName={userName} />
        )}

            {activeTab === "test_master" && (
              <div style={S.grid(1)}>
                <div style={S.card}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Register New Flow Test Profile</div></div>
                  <div style={S.cardBody}>
                    <form onSubmit={handleAddTest} style={S.grid(4)}>
                      <div>
                        <span style={S.label}>Test Name</span>
                        <input type="text" placeholder="e.g. CD4 Lymphocytes" required value={testForm.testName} onChange={(e) => setTestForm({...testForm, testName: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Equipment Used</span>
                        <input type="text" required value={testForm.equipment} onChange={(e) => setTestForm({...testForm, equipment: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Methodology</span>
                        <input type="text" required value={testForm.method} onChange={(e) => setTestForm({...testForm, method: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Unit of Measure</span>
                        <input type="text" required value={testForm.unit} onChange={(e) => setTestForm({...testForm, unit: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Target QC Mean</span>
                        <input type="number" required value={testForm.qcMean} onChange={(e) => setTestForm({...testForm, qcMean: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>QC Standard Dev (SD)</span>
                        <input type="number" step="0.01" required value={testForm.qcSD} onChange={(e) => setTestForm({...testForm, qcSD: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Critical Low Threshold</span>
                        <input type="text" required value={testForm.criticalLow} onChange={(e) => setTestForm({...testForm, criticalLow: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Critical High Threshold</span>
                        <input type="text" required value={testForm.criticalHigh} onChange={(e) => setTestForm({...testForm, criticalHigh: e.target.value})} style={S.inp} />
                      </div>
                      <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                        <button type="submit" disabled={saving} style={S.btn()}>Add to Test Master</button>
                      </div>
                    </form>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Local Test Master Registry</div></div>
                  <div style={S.cardBody}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Test Name</th>
                          <th style={S.th}>Equipment</th>
                          <th style={S.th}>Methodology</th>
                          <th style={S.th}>Target Mean</th>
                          <th style={S.th}>SD Limit</th>
                          <th style={S.th}>Alert Limits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testList.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ ...S.td, textAlign: "center", color: "#888780" }}>No tests registered. Please add one above.</td>
                          </tr>
                        ) : (
                          testList.map(t => (
                            <tr key={t.id}>
                              <td style={S.td}><strong>{t.testName}</strong></td>
                              <td style={S.td}>{t.equipment}</td>
                              <td style={S.td}>{t.method}</td>
                              <td style={S.td}>{t.qcMean} {t.unit}</td>
                              <td style={S.td}>{t.qcSD}</td>
                              <td style={S.td}>{t.criticalLow} / {t.criticalHigh}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Custom IQC Levey Jennings Runs */}
            {(activeTab === "iqc_cd" || activeTab === "iqc_hlab27") && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Record Flow Cytometry Control Run</div></div>
                <div style={S.cardBody}>
                  {testList.length === 0 ? (
                    <div style={{ padding: 12, textTransform: "italic", color: "#888780", fontSize: 12 }}>Please register a test in the Test Master tab first to record IQC runs.</div>
                  ) : (
                    <form onSubmit={handleIQCSubmit}>
                      <div style={S.grid(4)}>
                        <div>
                          <span style={S.label}>Select Test Profile</span>
                          <select
                            value={iqcRunForm.testId}
                            onChange={(e) => {
                              const selectedTest = testList.find(t => t.id === e.target.value);
                              setIqcRunForm({
                                ...iqcRunForm,
                                testId: e.target.value,
                                mean: selectedTest?.qcMean || "800",
                                sd: selectedTest?.qcSD || "50"
                              });
                            }}
                            style={S.inp}
                          >
                            {testList.map(t => (
                              <option key={t.id} value={t.id}>{t.testName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span style={S.label}>Control Level</span>
                          <select value={iqcRunForm.level} onChange={(e) => setIqcRunForm({ ...iqcRunForm, level: e.target.value })} style={S.inp}>
                            <option value="Low Control">Low Control</option>
                            <option value="Normal Control">Normal Control</option>
                            <option value="High Control">High Control</option>
                          </select>
                        </div>
                        <div>
                          <span style={S.label}>Target Mean ({testList.find(t => t.id === iqcRunForm.testId)?.unit})</span>
                          <input type="number" readOnly value={iqcRunForm.mean} style={{ ...S.inp, background: "#F3F4F6", color: "#6B7280" }} />
                        </div>
                        <div>
                          <span style={S.label}>Target SD</span>
                          <input type="number" readOnly value={iqcRunForm.sd} style={{ ...S.inp, background: "#F3F4F6", color: "#6B7280" }} />
                        </div>
                      </div>

                      <div style={{ ...S.grid(3), marginTop: 12 }}>
                        <div>
                          <span style={S.label}>Control Lot Number</span>
                          <input type="text" required value={iqcRunForm.lotNo} onChange={(e) => setIqcRunForm({ ...iqcRunForm, lotNo: e.target.value })} style={S.inp} />
                        </div>
                        <div>
                          <span style={S.label}>Measured Value</span>
                          <input type="number" required placeholder="Enter value" value={iqcRunForm.value} onChange={(e) => setIqcRunForm({ ...iqcRunForm, value: e.target.value })} style={S.inp} />
                        </div>
                        <div>
                          <span style={S.label}>Remarks</span>
                          <input type="text" placeholder="Remarks" value={iqcRunForm.remarks} onChange={(e) => setIqcRunForm({ ...iqcRunForm, remarks: e.target.value })} style={S.inp} />
                        </div>
                      </div>

                      {calculatedZ !== null && (
                        <div style={{ padding: "12px 16px", background: Math.abs(calculatedZ) >= 3.0 ? "#FEE2E2" : (Math.abs(calculatedZ) >= 2.0 ? "#FEF3C7" : "#D1FAE5"), borderRadius: 8, marginTop: 16, border: "0.5px solid transparent" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: Math.abs(calculatedZ) >= 3.0 ? "#991B1B" : (Math.abs(calculatedZ) >= 2.0 ? "#92400E" : "#065F46") }}>
                                Z-Score: {calculatedZ} Standard Deviations
                              </div>
                              <div style={{ fontSize: 11, color: Math.abs(calculatedZ) >= 3.0 ? "#B91C1C" : (Math.abs(calculatedZ) >= 2.0 ? "#B45309" : "#047857"), marginTop: 2 }}>
                                Rule Check: {westgardAlert}
                              </div>
                            </div>
                            <div>
                              <button type="submit" disabled={saving} style={S.btn(Math.abs(calculatedZ) >= 3.0 ? "#DC2626" : null)}>
                                {saving ? "Saving Run..." : "Approve & Save Run"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            )}

            {activeTab === "flow_temp_monitoring" && (
              <TemperatureDashboard department="Flow Cytometry" />
            )}

            {activeTab === "sample_rejection" && (
              <SampleRejectionDashboard department="Flow Cytometry" />
            )}

            {/* Generic interactive log form for checklists */}
            {activeTab !== "duty_roster" && activeTab !== "test_master" && activeTab !== "iqc_cd" && activeTab !== "iqc_hlab27" && activeTab !== "flow_temp_monitoring" && activeTab !== "sample_rejection" && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>New Checklist / Observation entry</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={activeTab === "cont_edu" ? handleCMESubmit : handleGenericLogSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Staff / Operator Name</span>
                      <input type="text" required value={genericForm.inspector} onChange={(e) => setGenericForm({ ...genericForm, inspector: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>
                        {activeTab === "cont_edu" ? "CME Training Topic" : "Observation Value / Metric"}
                      </span>
                      <input type="text" placeholder="Details/Values" required value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>
                        {activeTab === "cont_edu" ? "Credit Hours Completed" : "Status / Result"}
                      </span>
                      {activeTab === "cont_edu" ? (
                        <input type="number" step="0.5" required placeholder="Hours" value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp} />
                      ) : (
                        <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                          <option value="Pass">Pass / Satisfactory</option>
                          <option value="Fail">Fail / Action Required</option>
                        </select>
                      )}
                    </div>
                    <div>
                      <span style={S.label}>Remarks / CAPA Trigger</span>
                      <input type="text" placeholder="Remarks" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {activeTab === "maint" && (
                          <button type="button" onClick={() => triggerBreakdownReport("BD FACSLyric")} style={S.btn("#DC2626", "#FEE2E2")}>
                            ⚠️ Report Analyzer Breakdown
                          </button>
                        )}
                        {activeTab !== "maint" && genericForm.status === "Fail" && (
                          <button type="button" onClick={() => triggerCAPARequest(TABS.find(t => t.key === activeTab)?.label, genericForm.val)} style={S.btn("#DC2626", "#FEE2E2")}>
                            🚨 Create CAPA Log
                          </button>
                        )}
                      </div>
                      <button type="submit" disabled={saving} style={S.btn()}>Record Log Entry</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Display historic logs */}
            {activeTab !== "duty_roster" && activeTab !== "test_master" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Quality Logs History</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Inspector/Operator</th>
                        <th style={S.th}>Observations</th>
                        <th style={S.th}>Status/Value</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#888780" }}>No logs recorded for this section.</td>
                        </tr>
                      ) : (
                        logs.map(log => (
                          <tr key={log.id}>
                            <td style={S.td}>{log.data?.date || log.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</td>
                            <td style={S.td}><strong>{log.data?.inspector || log.createdBy}</strong></td>
                            <td style={S.td}>{log.data?.val}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 10.5,
                                fontWeight: 600,
                                background: log.data?.status === "Pass" ? "#D1FAE5" : (log.data?.status === "Warning" ? "#FEF3C7" : "#FEE2E2"),
                                color: log.data?.status === "Pass" ? "#065F46" : (log.data?.status === "Warning" ? "#92400E" : "#981B1B")
                              }}>
                                {log.data?.status}
                              </span>
                            </td>
                            <td style={S.td}>{log.data?.remarks}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}