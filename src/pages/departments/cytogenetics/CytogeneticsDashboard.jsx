// CytogeneticsDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Cytogenetics Module

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
import SampleRejectionDashboard from "../SampleRejection/SampleRejectionDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 260, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#3730A3" : "#5F5E5A",
    background: active ? "#EEF2FF" : "transparent",
    borderLeft: active ? "4px solid #6366F1" : "4px solid transparent",
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
    padding: "6px 12px", background: bg || "#3730A3", color: color || "#EEF2FF",
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
  { key: "roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Responsibility Matrix", icon: "🔑", cat: "General & Personnel" },
  { key: "sop_manual", label: "SOP Manual", icon: "📖", cat: "General & Personnel" },
  { key: "safety_data", label: "Safety Data Sheets (SDS)", icon: "⚠️", cat: "General & Personnel" },
  
  { key: "test_master", label: "Test Master", icon: "🔬", cat: "Examination Protocols" },
  
  { key: "iqc_data", label: "IQC Data Log", icon: "📈", cat: "Quality Control" },
  { key: "lot_verification", label: "Lot to Lot Verification", icon: "🧪", cat: "Quality Control" },
  { key: "eqa_log", label: "EQA Results & Reports", icon: "🌐", cat: "Quality Control" },
  { key: "eqa_sample_details", label: "EQAS Sample log", icon: "📦", cat: "Quality Control" },
  { key: "split_sample", label: "Split Sample Testing", icon: "➗", cat: "Quality Control" },
  { key: "inter_lab", label: "Inter-Lab Comparison", icon: "🔄", cat: "Quality Control" },
  { key: "audit", label: "Internal & External Audits", icon: "📋", cat: "Quality Control" },
  
  { key: "maint_centrifuge", label: "Centrifuge Maintenance", icon: "⚙️", cat: "Equipment & Logs" },
  { key: "maint_incubator", label: "Incubator Maintenance", icon: "🌡️", cat: "Equipment & Logs" },
  { key: "maint_safety_cabinet", label: "Safety Cabinet check", icon: "🛡️", cat: "Equipment & Logs" },
  { key: "cyto_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Equipment & Logs" },
  { key: "media_prep", label: "Media Prep & Aliquoting", icon: "🧪", cat: "Equipment & Logs" },
  { key: "surveillance", label: "Microbial Surveillance", icon: "🧫", cat: "Equipment & Logs" },
  { key: "uv_exposure", label: "UV Exposure logs", icon: "🔆", cat: "Equipment & Logs" },
  
  { key: "sample_receiving", label: "Sample receiving & discard", icon: "📥", cat: "Pre-Examination & Process" },
  { key: "sample_storage", label: "Slides & Suspensions Storage", icon: "🗄️", cat: "Pre-Examination & Process" },
  { key: "sample_rejection", label: "Sample Rejection Log", icon: "❌", cat: "Pre-Examination & Process" },
  { key: "critical_reporting", label: "Critical Result Reports", icon: "🚨", cat: "Pre-Examination & Process" },
  { key: "non_conformance", label: "Non-Conformance", icon: "⚠️", cat: "Pre-Examination & Process" },
  { key: "cont_edu", label: "Continuing Education", icon: "📘", cat: "Pre-Examination & Process" }
];

export default function CytogeneticsDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [testList, setTestList] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  

  // Forms
  const [testForm, setTestForm] = useState({
    testName: "", equipment: "Microscope Zeiss", method: "Karyotyping",
    unit: "N/A", refRanges: "Normal Karyotype", criticalLow: "Abnormal", criticalHigh: "Abnormal",
    qcMean: "1.0", qcSD: "0.1"
  });

  const [iqcForm, setIqcForm] = useState({
    testId: "", level: "Level 1", value: "", mean: "", sd: "", unit: "", lotNumber: "LOT-CY-26"
  });

  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
  });

  const [lotInput, setLotInput] = useState({
    currentLotName: "LOT-CY-A", newLotName: "LOT-CY-B",
    pts: Array.from({ length: 20 }, (_, i) => ({ id: `S${String(i+1).padStart(3,"0")}`, cur: (10 + Math.random()*2).toFixed(2), new: (10 + Math.random()*2).toFixed(2) }))
  });
  const [lotResult, setLotResult] = useState(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());
      
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const testSnap = await getDocs(query(collection(db, "testMaster"), where("department", "==", "Cytogenetics")));
      const loadedTests = testSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTestList(loadedTests);
      
      if (loadedTests.length > 0) {
        setIqcForm(prev => ({
          ...prev,
          testId: loadedTests[0].id,
          mean: loadedTests[0].qcMean || "",
          sd: loadedTests[0].qcSD || "",
          unit: loadedTests[0].unit || ""
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
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Cytogenetics"), where("featureKey", "==", `cyto_${activeTab}`), orderBy("createdAt", "desc")));
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

  useEffect(() => {
    const x = lotInput.pts.map(p => parseFloat(p.cur) || 0);
    const y = lotInput.pts.map(p => parseFloat(p.new) || 0);
    const regression = calculateLinearRegression(x, y);
    const bland = calculateBlandAltman(x, y);
    setLotResult({ regression, bland });
  }, [lotInput.pts]);

  ;

  const handleAddTest = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "testMaster"), {
        ...testForm,
        department: "Cytogenetics",
        createdAt: serverTimestamp(),
        createdBy: userName || "Admin"
      });
      alert("Test Master record added.");
      setTestForm({
        testName: "", equipment: "Microscope Zeiss", method: "Karyotyping",
        unit: "N/A", refRanges: "Normal Karyotype", criticalLow: "Abnormal", criticalHigh: "Abnormal",
        qcMean: "1.0", qcSD: "0.1"
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
        department: "Cytogenetics",
        featureKey: `cyto_${activeTab}`,
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

  const triggerBreakdownReport = async (eqName) => {
    const details = window.prompt(`Report equipment breakdown for ${eqName}. Please enter failure details:`);
    if (!details) return;
    try {
      await addDoc(collection(db, "actionRequests"), {
        addressedDepartment: "Biomedical",
        status: "Open",
        equipment: eqName,
        details: `Reported from Cytogenetics: ${details}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert(`Breakdown request logged with Biomedical Engineering for ${eqName}.`);
    } catch (e) {
      console.error(e);
    }
  };

  const triggerCAPARequest = async (title, val) => {
    const confirm = window.confirm(`Failed quality check detected (${val}). Would you like to log a CAPA request with the Quality Department?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: "Cytogenetics IQC Failure",
        details: `IQC run for ${title} yielded value ${val} which exceeds limit.`,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("CAPA Corrective Action Request successfully logged.");
    } catch (e) {
      console.error(e);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`cyto_${item.key}`] !== false);
  const categories = ["General & Personnel", "Examination Protocols", "Quality Control", "Equipment & Logs", "Pre-Examination & Process"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E1B4B" }}>Cytogenetics Console</div>
          <div style={{ fontSize: 9.5, color: "#6366F1", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
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
                  style={S.navItem(activeTab === item.key)}
                  onClick={() => setActiveTab(item.key)}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Main Content Pane */}
      <div style={S.content}>
        {/* Weekly Duty Roster */}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Cytogenetics" role={role} userName={userName} />
        )}

        {/* Test Master */}
        {activeTab === "test_master" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Add Diagnostic Examination Protocol (Test Master)</span>
              </div>
              <div style={S.cardBody}>
                <form onSubmit={handleAddTest}>
                  <div style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Test Name</span>
                      <input style={S.inp} value={testForm.testName} onChange={e => setTestForm(p => ({ ...p, testName: e.target.value }))} placeholder="e.g. Karyotyping Blood" required />
                    </div>
                    <div>
                      <span style={S.label}>Equipment/Analyzer</span>
                      <input style={S.inp} value={testForm.equipment} onChange={e => setTestForm(p => ({ ...p, equipment: e.target.value }))} placeholder="e.g. Magnus G3" />
                    </div>
                    <div>
                      <span style={S.label}>Methodology</span>
                      <input style={S.inp} value={testForm.method} onChange={e => setTestForm(p => ({ ...p, method: e.target.value }))} placeholder="e.g. Giemsa Banding" />
                    </div>
                  </div>
                  <div style={S.grid(4)}>
                    <div>
                      <span style={S.label}>QC Expected Mean</span>
                      <input style={S.inp} value={testForm.qcMean} onChange={e => setTestForm(p => ({ ...p, qcMean: e.target.value }))} placeholder="1.0" />
                    </div>
                    <div>
                      <span style={S.label}>QC SD Limit</span>
                      <input style={S.inp} value={testForm.qcSD} onChange={e => setTestForm(p => ({ ...p, qcSD: e.target.value }))} placeholder="0.1" />
                    </div>
                    <div>
                      <span style={S.label}>Unit</span>
                      <input style={S.inp} value={testForm.unit} onChange={e => setTestForm(p => ({ ...p, unit: e.target.value }))} placeholder="N/A" />
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end" }}>
                      <button style={{ ...S.btn(), width: "100%" }} type="submit" disabled={saving}>+ Add Test</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Registered Cytogenetics Tests</span></div>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Test Name</th>
                      <th style={S.th}>Equipment</th>
                      <th style={S.th}>Method</th>
                      <th style={S.th}>QC Mean</th>
                      <th style={S.th}>QC SD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testList.length === 0 ? (
                      <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No tests configured. Use form above to add.</td></tr>
                    ) : (
                      testList.map(t => (
                        <tr key={t.id}>
                          <td style={S.td}>{t.testName}</td>
                          <td style={S.td}>{t.equipment}</td>
                          <td style={S.td}>{t.method}</td>
                          <td style={S.td}>{t.qcMean}</td>
                          <td style={S.td}>{t.qcSD}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Lot to Lot verification */}
        {activeTab === "lot_verification" && (
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Lot to Lot Reagent Verification (20 Sample Runs)</span></div>
            <div style={S.cardBody}>
              <div style={S.grid(2)}>
                <div>
                  <span style={S.label}>Current Lot Name</span>
                  <input style={S.inp} value={lotInput.currentLotName} onChange={e => setLotInput(p => ({ ...p, currentLotName: e.target.value }))} />
                </div>
                <div>
                  <span style={S.label}>New Lot Name</span>
                  <input style={S.inp} value={lotInput.newLotName} onChange={e => setLotInput(p => ({ ...p, newLotName: e.target.value }))} />
                </div>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto", border: "0.5px solid #E0DDD6", borderRadius: 8, padding: 10, margin: "14px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", fontWeight: 600, fontSize: 11, paddingBottom: 6 }}>
                  <span>Sample</span>
                  <span>Current Lot Run</span>
                  <span>New Lot Run</span>
                </div>
                {lotInput.pts.map((pt, i) => (
                  <div key={pt.id} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr", gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: "#888780" }}>{pt.id}</span>
                    <input
                      type="number" step="0.01" style={S.inp} value={pt.cur}
                      onChange={(e) => {
                        const copy = [...lotInput.pts];
                        copy[i].cur = e.target.value;
                        setLotInput(prev => ({ ...prev, pts: copy }));
                      }}
                    />
                    <input
                      type="number" step="0.01" style={S.inp} value={pt.new}
                      onChange={(e) => {
                        const copy = [...lotInput.pts];
                        copy[i].new = e.target.value;
                        setLotInput(prev => ({ ...prev, pts: copy }));
                      }}
                    />
                  </div>
                ))}
              </div>
              {lotResult && (
                <div style={{ background: "#EEF2FF", border: "0.5px solid #C7D2FE", borderRadius: 8, padding: 12, fontSize: 12, color: "#3730A3" }}>
                  <strong>Linear Regression:</strong> Slope: {lotResult.regression?.slope?.toFixed(3)} | Intercept: {lotResult.regression?.intercept?.toFixed(3)} | R: {lotResult.regression?.r?.toFixed(4)}
                  <br />
                  <strong>Mean Bias:</strong> {lotResult.bland?.meanBias?.toFixed(2)}% &nbsp; (NABL Limit: &le; 10% bias for compliance approval)
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "cyto_temp_monitoring" && (
          <TemperatureDashboard department="Cytogenetics" />
        )}

        {activeTab === "sample_rejection" && (
          <SampleRejectionDashboard department="Cytogenetics" />
        )}

        {/* Dynamic Generic Forms & Logs */}
        {activeTab !== "roster" && activeTab !== "test_master" && activeTab !== "lot_verification" && activeTab !== "cyto_temp_monitoring" && activeTab !== "sample_rejection" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Log New Entry — {TABS.find(t => t.key === activeTab)?.label}</span>
                {activeTab.startsWith("maint_") && (
                  <button style={S.btn("#A32D2D", "#FFF5F5")} onClick={() => triggerBreakdownReport(TABS.find(t => t.key === activeTab)?.label)}>
                    🚨 Report Equipment Breakdown
                  </button>
                )}
              </div>
              <div style={S.cardBody}>
                <form onSubmit={handleGenericLogSubmit}>
                  <div style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Inspector / Operator</span>
                      <input style={S.inp} value={genericForm.inspector} readOnly />
                    </div>
                    <div>
                      <span style={S.label}>Status / Observation</span>
                      <select style={S.inp} value={genericForm.status} onChange={e => setGenericForm(p => ({ ...p, status: e.target.value }))}>
                        <option value="Pass">Pass / Normal</option>
                        <option value="Fail">Fail / Outlier</option>
                        <option value="N/A">Not Applicable</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Value / Measurement (if any)</span>
                      <input style={S.inp} value={genericForm.val} onChange={e => setGenericForm(p => ({ ...p, val: e.target.value }))} placeholder="e.g. 7.3 pH, 22°C" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={S.label}>Remarks / Actions taken</span>
                    <input style={S.inp} value={genericForm.remarks} onChange={e => setGenericForm(p => ({ ...p, remarks: e.target.value }))} placeholder="Details or comments..." />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={S.btn()} type="submit" disabled={saving}>Save Log</button>
                  </div>
                </form>
              </div>
            </div>

            {/* Historical logs */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Historical Log History</span></div>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Inspector</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Value</th>
                      <th style={S.th}>Remarks</th>
                      <th style={S.th}>Supportive Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No audit logs recorded for this category yet.</td></tr>
                    ) : (
                      logs.map(log => {
                        const d = log.data || {};
                        return (
                          <tr key={log.id}>
                            <td style={S.td}>{d.date || log.createdAt?.toDate?.().toISOString().split("T")[0] || "—"}</td>
                            <td style={S.td}>{d.inspector || log.createdBy}</td>
                            <td style={S.td}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                                background: d.status === "Pass" ? "#E1F5EE" : "#FFF5F5",
                                color: d.status === "Pass" ? "#085041" : "#A32D2D"
                              }}>{d.status}</span>
                            </td>
                            <td style={S.td}>{d.val || "—"}</td>
                            <td style={S.td}>{d.remarks || "—"}</td>
                            <td style={S.td}>
                              {d.status === "Fail" && (
                                <button
                                  onClick={() => triggerCAPARequest(TABS.find(t => t.key === activeTab)?.label, d.val || "Fail")}
                                  style={{ ...S.btn("#FFF5F5", "#A32D2D"), padding: "2px 6px", fontSize: 10 }}
                                >
                                  ⚠️ Raise CAPA
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}