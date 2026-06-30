import QualityIndicatorsLog from "../QualityIndicatorsLog";
// HistopathologyCytopathologyDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Histopathology & Cytopathology Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 260, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#9A3412" : "#5F5E5A",
    background: active ? "#FFEDD5" : "transparent",
    borderLeft: active ? "4px solid #F97316" : "4px solid transparent",
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
    padding: "6px 12px", background: bg || "#F97316", color: color || "#FFF",
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
  { key: "histopath_quality_indicators", label: "Quality Indicators Log", icon: "📈", cat: "Examination Protocols" },
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "advisory", label: "Advisory Services", icon: "💬", cat: "General & Personnel" },
  { key: "communication", label: "Communication Log", icon: "📞", cat: "General & Personnel" },
  { key: "cont_edu", label: "Continuing Education & CME", icon: "📖", cat: "General & Personnel" },
  { key: "training_eval", label: "Training Evaluation", icon: "🎓", cat: "General & Personnel" },
  { key: "audit_eval", label: "Audit Evaluations", icon: "📋", cat: "General & Personnel" },
  
  { key: "test_master", label: "Test Master Database", icon: "🔬", cat: "Examination Protocols" },
  { key: "daily_worklist", label: "Daily Work List", icon: "📝", cat: "Examination Protocols" },
  { key: "slide_position", label: "Slide Position Log", icon: "📍", cat: "Examination Protocols" },
  { key: "test_requisition", label: "Test Requisition Log", icon: "📨", cat: "Examination Protocols" },
  { key: "correlation", label: "Histology-Cytology Correlation", icon: "🔄", cat: "Examination Protocols" },
  
  { key: "iqc_glass", label: "IQC - Glass Slides", icon: "🔍", cat: "Quality Control" },
  { key: "iqc_chemicals", label: "IQC - Chemicals", icon: "🧪", cat: "Quality Control" },
  { key: "iqc_microscopy", label: "IQC - Microscopy", icon: "🔬", cat: "Quality Control" },
  { key: "iqc_stains", label: "IQC - Stains", icon: "🎨", cat: "Quality Control" },
  { key: "comp_pathologist", label: "Comparison - Pathologist", icon: "👥", cat: "Quality Control" },
  { key: "comp_technicians", label: "Comparison - Technicians", icon: "🧑‍🔬", cat: "Quality Control" },
  { key: "eqa_log", label: "EQA Log", icon: "🌐", cat: "Quality Control" },
  { key: "outliers_iqc", label: "Corrective Action - IQC", icon: "🚨", cat: "Quality Control" },
  { key: "outliers_eqa", label: "Corrective Action - EQA", icon: "🚨", cat: "Quality Control" },
  
  { key: "maint_uprep", label: "Uprep Maintenance", icon: "⚙️", cat: "Equipment & Maintenance" },
  { key: "formalin_ph", label: "Formalin pH monitoring", icon: "🧪", cat: "Equipment & Maintenance" },
  { key: "housekeeping", label: "House Keeping Log", icon: "🧹", cat: "Equipment & Maintenance" },
  { key: "histo_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Equipment & Maintenance" },
  
  { key: "consent_fna", label: "Consent - FNA", icon: "✍️", cat: "Pre-Examination & Process" },
  { key: "critical_result", label: "Critical Result Log", icon: "📞", cat: "Pre-Examination & Process" },
  { key: "non_conformance", label: "Non-Conformance Log", icon: "⚠️", cat: "Pre-Examination & Process" },
  { key: "error_log", label: "Error Log", icon: "❌", cat: "Pre-Examination & Process" },
  { key: "sample_receiving_eqa", label: "Sample Receiving – EQA", icon: "📥", cat: "Pre-Examination & Process" },
  { key: "sample_receiving_dept", label: "Sample Receiving & Discard", icon: "🗑️", cat: "Pre-Examination & Process" }
];

export default function HistopathologyCytopathologyDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [testList, setTestList] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  

  // Forms
  const [testForm, setTestForm] = useState({
    testName: "", equipment: "Uprep Tissue Processor", method: "Paraffin Embedding & H&E Staining",
    unit: "N/A", refRanges: "Negative for malignancy", criticalLow: "Malignancy/Atypical", criticalHigh: "Malignancy/Atypical",
    qcMean: "1.0", qcSD: "0.05"
  });

  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
  });

  // Special Forms
  const [phForm, setPhForm] = useState({
    pHValue: "7.0", batchNo: "B-FOR-99", inspector: userName || "", remarks: ""
  });

  const [correlationForm, setCorrelationForm] = useState({
    caseId: "", cytologyDiagnosis: "Benign", histologyDiagnosis: "Benign", pathologist: userName || "", remarks: ""
  });

  const [comparisonForm, setComparisonForm] = useState({
    slideId: "", reviewer1: userName || "", diagnosis1: "Normal", reviewer2: "", diagnosis2: "Normal", isAgreed: "Yes", remarks: ""
  });

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());
      
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const testSnap = await getDocs(query(collection(db, "testMaster"), where("department", "==", "Histopathology")));
      setTestList(testSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabRecords = useCallback(async () => {
    try {
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Histopathology"), where("featureKey", "==", `histo_${activeTab}`), orderBy("createdAt", "desc")));
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

  ;

  const handleAddTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "testMaster"), {
        ...testForm,
        department: "Histopathology",
        createdAt: serverTimestamp(),
        createdBy: userName || "Admin"
      });
      alert("Test Master record added.");
      setTestForm({
        testName: "", equipment: "Uprep Tissue Processor", method: "Paraffin Embedding & H&E Staining",
        unit: "N/A", refRanges: "Negative for malignancy", criticalLow: "Malignancy/Atypical", criticalHigh: "Malignancy/Atypical",
        qcMean: "1.0", qcSD: "0.05"
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
        department: "Histopathology",
        featureKey: `histo_${activeTab}`,
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

  const handlePHSubmit = async (e) => {
    e.preventDefault();
    const phVal = parseFloat(phForm.pHValue) || 0;
    if (phVal < 6.8 || phVal > 7.2) {
      const logCapa = window.confirm(`pH value of ${phVal} is out of optimal formalin range (6.8 - 7.2). Would you like to log a CAPA request?`);
      if (logCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: "Histopathology Formalin pH Outlier",
            details: `Formalin pH read ${phVal} (Batch: ${phForm.batchNo}), which is out of range.`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Staff"
          });
          alert("CAPA Corrective Action Request successfully logged.");
        } catch (err) {
          console.error(err);
        }
      }
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Histopathology",
        featureKey: "histo_formalin_ph",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: phForm.inspector,
          val: `${phForm.pHValue} pH (Batch: ${phForm.batchNo})`,
          status: (phVal >= 6.8 && phVal <= 7.2) ? "Pass" : "Fail",
          remarks: phForm.remarks
        }
      });
      alert("Formalin pH record saved.");
      setPhForm({ pHValue: "7.0", batchNo: "B-FOR-99", inspector: userName || "", remarks: "" });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCorrelationSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const match = correlationForm.cytologyDiagnosis.toLowerCase() === correlationForm.histologyDiagnosis.toLowerCase() ? "Correlated" : "Mismatched";
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Histopathology",
        featureKey: "histo_correlation",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: correlationForm.pathologist,
          val: `Case ${correlationForm.caseId}: Cyto [${correlationForm.cytologyDiagnosis}] vs Histo [${correlationForm.histologyDiagnosis}]`,
          status: match,
          remarks: correlationForm.remarks
        }
      });
      alert(`Correlation saved. Result is: ${match}`);
      setCorrelationForm({ caseId: "", cytologyDiagnosis: "Benign", histologyDiagnosis: "Benign", pathologist: userName || "", remarks: "" });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleComparisonSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Histopathology",
        featureKey: `histo_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: comparisonForm.reviewer1,
          val: `Slide ${comparisonForm.slideId}: Rev1 [${comparisonForm.diagnosis1}] vs Rev2 [${comparisonForm.reviewer2 || "N/A"}: ${comparisonForm.diagnosis2}]`,
          status: comparisonForm.isAgreed === "Yes" ? "Agreed" : "Discrepant",
          remarks: comparisonForm.remarks
        }
      });
      alert("Comparative slide review recorded.");
      setComparisonForm({ slideId: "", reviewer1: userName || "", diagnosis1: "Normal", reviewer2: "", diagnosis2: "Normal", isAgreed: "Yes", remarks: "" });
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
        details: `Reported from Histopathology: ${details}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert(`Breakdown request logged with Biomedical Engineering for ${eqName}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerCAPARequest = async (title, val) => {
    const confirm = window.confirm(`Failed quality control detected (${val}). Would you like to log a CAPA request with the Quality Department?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: `Histopathology ${title} Failure`,
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

  const handleCMESubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "hrContinuingEducation"), {
        department: "Histopathology",
        employeeName: genericForm.inspector || userName || "Staff",
        topic: genericForm.val || "CME Training Session",
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

  const handleTrainingSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "hrTraining"), {
        department: "Histopathology",
        employeeName: genericForm.inspector || userName || "Staff",
        programName: genericForm.val || "Standard Training",
        score: genericForm.status || "100%",
        remarks: genericForm.remarks,
        createdAt: serverTimestamp()
      });
      alert("Staff Training Evaluation logged to HR Department.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`histo_${item.key}`] !== false);
  const categories = ["General & Personnel", "Examination Protocols", "Quality Control", "Equipment & Maintenance", "Pre-Examination & Process"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#7C2D12" }}>Histopathology Console</div>
          <div style={{ fontSize: 9.5, color: "#EA580C", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
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
            <div style={{ display: "flex", alignItems: "center", justifycontent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2C2C2A", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Department Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#888780" }}>
                  Active Section: Histopathology & Cytopathology | Operator: {userName || "Authorized Staff"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#FFEDD5", borderRadius: 8, border: "0.5px solid #FED7AA", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9A3412" }}>System Online (ISO 27001 Secured)</span>
              </div>
            </div>

            {/* Render Tabs content */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Histopathology & Cytopathology" role={role} userName={userName} />
        )}

            {activeTab === "test_master" && (
              <div style={S.grid(1)}>
                <div style={S.card}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Register New Test</div></div>
                  <div style={S.cardBody}>
                    <form onSubmit={handleAddTest} style={S.grid(4)}>
                      <div>
                        <span style={S.label}>Test Name</span>
                        <input type="text" placeholder="e.g. Fine Needle Aspiration" required value={testForm.testName} onChange={(e) => setTestForm({...testForm, testName: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Equipment/Stainer Used</span>
                        <input type="text" required value={testForm.equipment} onChange={(e) => setTestForm({...testForm, equipment: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Methodology</span>
                        <input type="text" required value={testForm.method} onChange={(e) => setTestForm({...testForm, method: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Critical/Alert Range</span>
                        <input type="text" required value={testForm.criticalLow} onChange={(e) => setTestForm({...testForm, criticalLow: e.target.value, criticalHigh: e.target.value})} style={S.inp} />
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
                          <th style={S.th}>Alert Threshold</th>
                          <th style={S.th}>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testList.length === 0 ? (
                          <tr>
                            <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#888780" }}>No tests registered. Please add one above.</td>
                          </tr>
                        ) : (
                          testList.map(t => (
                            <tr key={t.id}>
                              <td style={S.td}><strong>{t.testName}</strong></td>
                              <td style={S.td}>{t.equipment}</td>
                              <td style={S.td}>{t.method}</td>
                              <td style={S.td}>{t.criticalLow}</td>
                              <td style={S.td}>{t.createdBy}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Custom comparisons path/tech */}
            {(activeTab === "comp_pathologist" || activeTab === "comp_technicians") && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Comparative Slide Review Log ({activeTab === "comp_pathologist" ? "Pathologist Inter-Observer" : "Technician Preparation Review"})</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleComparisonSubmit} style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Slide ID / Accession No</span>
                      <input type="text" placeholder="e.g. S-2026-88" required value={comparisonForm.slideId} onChange={(e) => setComparisonForm({...comparisonForm, slideId: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Primary Evaluator</span>
                      <input type="text" required value={comparisonForm.reviewer1} onChange={(e) => setComparisonForm({...comparisonForm, reviewer1: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Primary Diagnosis/Result</span>
                      <input type="text" placeholder="e.g. Grade II Ductal Carcinoma" required value={comparisonForm.diagnosis1} onChange={(e) => setComparisonForm({...comparisonForm, diagnosis1: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Secondary Evaluator</span>
                      <input type="text" placeholder="Observer Name" required value={comparisonForm.reviewer2} onChange={(e) => setComparisonForm({...comparisonForm, reviewer2: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Secondary Diagnosis/Result</span>
                      <input type="text" placeholder="Diagnosis" required value={comparisonForm.diagnosis2} onChange={(e) => setComparisonForm({...comparisonForm, diagnosis2: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Diagnoses Concordance</span>
                      <select value={comparisonForm.isAgreed} onChange={(e) => setComparisonForm({...comparisonForm, isAgreed: e.target.value})} style={S.inp}>
                        <option value="Yes">Yes (Agreed)</option>
                        <option value="No">No (Discrepant)</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 3" }}>
                      <span style={S.label}>Discussions & Consensus Remarks</span>
                      <input type="text" placeholder="Remarks" value={comparisonForm.remarks} onChange={(e) => setComparisonForm({...comparisonForm, remarks: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 3", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>Save Review Log</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Custom Histology Cytology Correlation */}
            {activeTab === "correlation" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Cyto-Histo Correlation Register</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleCorrelationSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Patient Case/Accession ID</span>
                      <input type="text" required placeholder="e.g. H-2026-12" value={correlationForm.caseId} onChange={(e) => setCorrelationForm({...correlationForm, caseId: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Cytology Diagnosis</span>
                      <input type="text" required placeholder="e.g. High Grade Dysplasia" value={correlationForm.cytologyDiagnosis} onChange={(e) => setCorrelationForm({...correlationForm, cytologyDiagnosis: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Histology Diagnosis</span>
                      <input type="text" required placeholder="e.g. Squamous Cell Carcinoma" value={correlationForm.histologyDiagnosis} onChange={(e) => setCorrelationForm({...correlationForm, histologyDiagnosis: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Reporting Pathologist</span>
                      <input type="text" required value={correlationForm.pathologist} onChange={(e) => setCorrelationForm({...correlationForm, pathologist: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4" }}>
                      <span style={S.label}>Correlation Notes / Discrepancy Cause (if any)</span>
                      <input type="text" placeholder="e.g. sampling variance" value={correlationForm.remarks} onChange={(e) => setCorrelationForm({...correlationForm, remarks: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>Submit Correlation Record</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Custom Formalin pH */}
            {activeTab === "histo_temp_monitoring" && (
              <TemperatureDashboard department="Histopathology & Cytopathology" />
            )}

            {activeTab === "formalin_ph" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Formalin pH Quality Record (Target: 6.8 - 7.2)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handlePHSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>pH Measured Value</span>
                      <input type="number" step="0.01" required value={phForm.pHValue} onChange={(e) => setPhForm({...phForm, pHValue: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Formalin Batch / Lot No</span>
                      <input type="text" required value={phForm.batchNo} onChange={(e) => setPhForm({...phForm, batchNo: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Inspector</span>
                      <input type="text" required value={phForm.inspector} onChange={(e) => setPhForm({...phForm, inspector: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Remarks</span>
                      <input type="text" value={phForm.remarks} onChange={(e) => setPhForm({...phForm, remarks: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>Save pH Record</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generic interactive log form for checklists */}
            {activeTab !== "duty_roster" && activeTab !== "test_master" && activeTab !== "correlation" && activeTab !== "formalin_ph" && activeTab !== "comp_pathologist" && activeTab !== "comp_technicians" && activeTab !== "histo_temp_monitoring" && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>New Checklist / Observation entry</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={activeTab === "cont_edu" ? handleCMESubmit : (activeTab === "training_eval" ? handleTrainingSubmit : handleGenericLogSubmit)} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Staff / Inspector Name</span>
                      <input type="text" required value={genericForm.inspector} onChange={(e) => setGenericForm({ ...genericForm, inspector: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>
                        {activeTab === "cont_edu" ? "CME Training Topic" : (activeTab === "training_eval" ? "Training Program Name" : "Observation Value / Metric")}
                      </span>
                      <input type="text" placeholder="Details/Values" required value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>
                        {activeTab === "cont_edu" ? "Credit Hours Completed" : (activeTab === "training_eval" ? "Evaluation Score / Grade" : "Status / Result")}
                      </span>
                      {activeTab === "cont_edu" ? (
                        <input type="number" step="0.5" required placeholder="Hours" value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp} />
                      ) : activeTab === "training_eval" ? (
                        <input type="text" placeholder="e.g. 95% or Satisfactory" required value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp} />
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
                        {activeTab.startsWith("maint_") && (
                          <button type="button" onClick={() => triggerBreakdownReport("Uprep Tissue Processor")} style={S.btn("#DC2626", "#FEE2E2")}>
                            ⚠️ Report Equipment Breakdown
                          </button>
                        )}
                        {!activeTab.startsWith("maint_") && genericForm.status === "Fail" && (
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
                                background: log.data?.status === "Pass" || log.data?.status === "Correlated" || log.data?.status === "Agreed" ? "#D1FAE5" : "#FEE2E2",
                                color: log.data?.status === "Pass" || log.data?.status === "Correlated" || log.data?.status === "Agreed" ? "#065F46" : "#981B1B"
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
      {activeTab === "histopath_quality_indicators" && (
          <QualityIndicatorsLog department="Histopathology & Cytopathology" />
        )}
        </div>
    </div>
  );
}