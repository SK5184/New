// BiochemistryDashboard.jsx
// MBL QMS — Biochemistry Department Dashboard (Analytical Phase Only)
// ISO 15189:2012 Compliant Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import {
  calculateLinearRegression,
  calculateBlandAltman,
  TEA_LIMITS,
  REFERENCE_RANGES,
  CLINICAL_DECISION_LEVELS,
  TIME_LIMITS,
  RETENTION_SCHEDULE,
  HIL_INTEGRITY_GRADES,
  WEEKLY_ROSTER,
  MOCK_LOT_COMPARISON_DATA,
  MOCK_ANALYZER_COMPARISON_DATA
} from "../../../utils/biochemHelpers";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import SampleIntegrityChecks from "../SampleIntegrityChecks";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";
import SampleRejectionDashboard from "../SampleRejection/SampleRejectionDashboard";
import SampleRetentionView from "./SampleRetentionView";
import IntraDeptMeetingForm from "../IntraDeptMeetingForm";
import WorkHandover from "../../WorkHandover";
import ReagentCalibrationDashboard from "../../../modules/ReagentCalibration/ReagentCalibrationDashboard";
import ErrorRecords from "../ErrorRecords";
import QualityIndicatorsLog from "../QualityIndicatorsLog";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 280, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  
  // Sidebar styling
  brandArea: { padding: "16px 16px 12px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8" },
  catHeader: (expanded) => ({
    padding: "10px 16px 6px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#888780", display: "flex", justifyContent: "space-between",
    alignItems: "center", cursor: "pointer", userSelect: "none", marginTop: 8
  }),
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "8.5px 18px", cursor: "pointer", fontSize: 12,
    color: active ? "#0F6E56" : "#5F5E5A",
    background: active ? "#E1F5EE" : "transparent",
    borderLeft: active ? "4px solid #0F6E56" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.1s ease"
  }),
  
  // Card and Form styling
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 16 },
  
  inp: { padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (bg, color) => ({ padding: "6px 12px", background: bg || "#0F6E56", color: color || "#E1F5EE", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none" }),
  
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }
};

// All 107+ sub-features mapped by category
const TABS = [
  // General & Personnel
  { key: "biochem_duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "biochem_auth_matrix", label: "Responsibility & Auth Matrix", icon: "🔑", cat: "General & Personnel" },
  { key: "biochem_cont_edu", label: "Continuing Education", icon: "📘", cat: "General & Personnel" },
  { key: "biochem_training_eval", label: "Training Effectiveness", icon: "🎓", cat: "General & Personnel" },
  { key: "biochem_meeting_form", label: "Intra-Dept Meeting Form", icon: "🤝", cat: "General & Personnel" },

  // Pre-Examination & Process
  { key: "biochem_sample_integrity", label: "Stored Sample Stability Verification", icon: "📥", cat: "Pre-Examination & Process" },
  { key: "biochem_sample_rejection", label: "Sample Rejection Log", icon: "❌", cat: "Pre-Examination & Process" },
  { key: "biochem_sample_retention", label: "Sample Retention Policy", icon: "📁", cat: "Pre-Examination & Process" },
  { key: "biochem_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Pre-Examination & Process" },
  { key: "biochem_deionized_water", label: "Deionized Water Quality", icon: "🚰", cat: "Pre-Examination & Process" },
  { key: "biochem_work_handover", label: "Pending Work Handover", icon: "🔄", cat: "Pre-Examination & Process" },
  { key: "biochem_housekeeping_conn", label: "Housekeeping Connection", icon: "🧹", cat: "Pre-Examination & Process" },

  // Examination Protocols
  { key: "biochem_advisory", label: "Advisory Services Form", icon: "📖", cat: "Examination Protocols" },
  { key: "biochem_reagent_calib", label: "Reagent Calibration", icon: "🧪", cat: "Examination Protocols" },
  { key: "biochem_error_records", label: "Error Records", icon: "⚠️", cat: "Examination Protocols" },
  { key: "biochem_quality_indicators", label: "Quality Indicators Log", icon: "📈", cat: "Examination Protocols" },
  { key: "biochem_revised_report", label: "Revised Report Log", icon: "📝", cat: "Examination Protocols" },

  // Internal Quality Control (IQC)
  { key: "biochem_iqc_cockpit", label: "IQC Cockpit Integration", icon: "🎛️", cat: "Internal Quality Control" },
  { key: "biochem_iqc_analysis", label: "IQC L-J & Westgard", icon: "📈", cat: "Internal Quality Control" },
  { key: "biochem_trend_shift_iqc", label: "Trend & Shift Analysis", icon: "📉", cat: "Internal Quality Control" },
  { key: "biochem_qc_reconstitution", label: "QC Reconstitution Log", icon: "🧪", cat: "Internal Quality Control" },
  { key: "biochem_lot_to_lot", label: "Lot to Lot Verification", icon: "🧪", cat: "Internal Quality Control" },
  { key: "biochem_lot_qc_material", label: "QC Material Lot Check", icon: "🧪", cat: "Internal Quality Control" },
  { key: "biochem_corrective_iqc", label: "Corrective Actions: IQC", icon: "🛠️", cat: "Internal Quality Control" },

  // Machine IQC logs (24)
  { key: "biochem_iqc_log_access2", label: "IQC Result: Access 2", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_acl_acustar", label: "IQC Result: ACL Acustar", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_agilent", label: "IQC Result: Agilent", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_alinity_ci1_am", label: "IQC Result: Alinity (1) AM", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_alinity_ci1_pm", label: "IQC Result: Alinity (1) PM", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_alinity_ci2_am", label: "IQC Result: Alinity (2) AM", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_alinity_ci2_pm", label: "IQC Result: Alinity (2) PM", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_atellica_neph630", label: "IQC Result: Atellica Neph", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_avl", label: "IQC Result: AVL", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_cobas6000", label: "IQC Result: Cobas 6000", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_iflash", label: "IQC Result: i Flash", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_kryptor_compact", label: "IQC Result: Kryptor Compact", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_maglumi800", label: "IQC Result: Maglumi 800", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_minicap_pepp", label: "IQC Result: Minicap (PEPP)", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_minicap_ifepp", label: "IQC Result: Minicap (IFEPP)", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_minividas", label: "IQC Result: Mini Vidas", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_osmometer", label: "IQC Result: Osmometer", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_secomam", label: "IQC Result: Secomam", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_shimadzu", label: "IQC Result: Shimadzu HPLC", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_tosoh_g8_g11", label: "IQC Result: Tosoh G8/G11", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_v8_nexus_pepp", label: "IQC Result: V8 Nexus (PEPP)", icon: "📊", cat: "Machine IQC Logs" },
  { key: "biochem_iqc_log_v8_nexus_ifepp", label: "IQC Result: V8 Nexus (IFEPP)", icon: "📊", cat: "Machine IQC Logs" },

  // Calibration Machine Verification (12)
  { key: "biochem_cal_lot_acl_acustar", label: "Cal/Lot: ACL Acustar", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_agilent", label: "Cal/Lot: Agilent", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_alinity_c1_1", label: "Cal/Lot: Alinity C1 (1)", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_alinity_ci_2", label: "Cal/Lot: Alinity CI (2)", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_atellica_neph630", label: "Cal/Lot: Atellica Neph", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_cobas6000", label: "Cal/Lot: Cobas 6000", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_iflash", label: "Cal/Lot: i Flash", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_kryptor_compact", label: "Cal/Lot: Kryptor Compact", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_maglumi800", label: "Cal/Lot: Maglumi 800", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_minividas", label: "Cal/Lot: Mini Vidas", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_shimadzu", label: "Cal/Lot: Shimadzu HPLC", icon: "🧪", cat: "Machine Cal & Verification" },
  { key: "biochem_cal_lot_tosoh_g8_g11", label: "Cal/Lot: Tosoh G8 and G11", icon: "🧪", cat: "Machine Cal & Verification" },

  // External Quality Assessment (EQAS)
  { key: "biochem_eqa_program", label: "EQAS Program Overview", icon: "🌐", cat: "External Quality (EQAS)" },
  { key: "biochem_eqa_sample_details", label: "EQA Sample Registry", icon: "📦", cat: "External Quality (EQAS)" },
  { key: "biochem_trend_shift_eqa", label: "Trend & Shift - EQA", icon: "📈", cat: "External Quality (EQAS)" },
  { key: "biochem_corrective_eqa", label: "Corrective Actions: EQA", icon: "🛠️", cat: "External Quality (EQAS)" },
  { key: "biochem_eqa_alternative", label: "EQA Alternate Methods", icon: "➗", cat: "External Quality (EQAS)" },

  // EQAS Logs (18)
  { key: "biochem_eqa_biorad_clinchem", label: "EQA: BioRad ClinChem", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_biorad_cardiac", label: "EQA: BioRad Cardiac", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_biorad_ethanol", label: "EQA: BioRad Ethanol", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_biorad_hemo", label: "EQA: BioRad Hemoglobin", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_biorad_immuno", label: "EQA: BioRad Immunoassay", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_biorad_urine", label: "EQA: BioRad Urine Chem", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_cystatin", label: "EQA: CAP Cystatin", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_electro", label: "EQA: CAP Electrophoresis", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_immuno_diag", label: "EQA: CAP Immuno Diag", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_immuno_spec", label: "EQA: CAP Immuno Special", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_maternal", label: "EQA: CAP Maternal Screen", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_pct", label: "EQA: CAP Procalcitonin", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_cap_flc", label: "EQA: CAP Serum FLC", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_neuqap_spec", label: "EQA: NEUQAP Special Chem", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_rcpa_endocrine", label: "EQA: RCPA Endocrine", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_rcpa_g6pd", label: "EQA: RCPA G6PD", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_rcpa_immuno", label: "EQA: RCPA Immunosuppress", icon: "🌐", cat: "EQAS Program Logs" },
  { key: "biochem_eqa_rcpa_lipids", label: "EQA: RCPA Special Lipids", icon: "🌐", cat: "EQAS Program Logs" },

  // Equipment & Maintenance
  { key: "biochem_equip_calib", label: "Calibration Status Board", icon: "🖥️", cat: "Equipment & Maintenance" },
  { key: "biochem_comparability", label: "Method/Instrument Comp", icon: "⚖️", cat: "Equipment & Maintenance" },
  { key: "biochem_maint_module", label: "Maintenance Scheduler", icon: "⚙️", cat: "Equipment & Maintenance" },
  { key: "biochem_eval_external_audit", label: "External Audit Eval", icon: "📋", cat: "Equipment & Maintenance" },
  { key: "biochem_eval_internal_audit", label: "Internal Audit Eval", icon: "📋", cat: "Equipment & Maintenance" },
  { key: "biochem_kit_inserts", label: "Kit Inserts Archive", icon: "📁", cat: "Equipment & Maintenance" },

  // Machine Maintenance Logs (20)
  { key: "biochem_maint_access2", label: "Maint: Access 2", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_acl_acustar", label: "Maint: ACL Acustar", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_agilent1260", label: "Maint: Agilent 1260", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_alinity1", label: "Maint: Alinity CI (1)", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_alinity2", label: "Maint: Alinity CI (2)", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_atellica", label: "Maint: Atellica Neph", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_avl", label: "Maint: AVL Electrolytes", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_centrifuge", label: "Maint: Centrifuge", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_cobas6000", label: "Maint: COBAS 6000", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_iflash", label: "Maint: i Flash", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_kryptor", label: "Maint: Kryptor Compact", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_maglumi800", label: "Maint: Maglumi 800", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_minicap", label: "Maint: Minicap", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_minividas", label: "Maint: Minividas", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_osmometer", label: "Maint: Osmometer", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_secomam", label: "Maint: Secomam", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_shimadzu", label: "Maint: Shimadzu HPLC", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_tosoh_g8", label: "Maint: Tosoh G8", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_tosoh_g11", label: "Maint: Tosoh G11", icon: "🔧", cat: "Machine Maintenance Logs" },
  { key: "biochem_maint_v8_nexus", label: "Maint: V8 Nexus Helena", icon: "🔧", cat: "Machine Maintenance Logs" }
];

export default function BiochemistryDashboard() {
  const { name, role, dept } = useAuth();
  const [activeTab, setActiveTab] = useState("biochem_duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [testCatalog, setTestCatalog] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  // Accordion Sidebar state
  const [expandedCats, setExpandedCats] = useState({
    "General & Personnel": true,
    "Pre-Examination & Process": false,
    "Examination Protocols": false,
    "Internal Quality Control": false,
    "Machine IQC Logs": false,
    "Machine Cal & Verification": false,
    "External Quality (EQAS)": false,
    "EQAS Program Logs": false,
    "Equipment & Maintenance": false,
    "Machine Maintenance Logs": false
  });

  // Dynamic log states
  const [interactiveLogs, setInteractiveLogs] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  // IQC States
  const [qcForm, setQcForm] = useState({ analyte: "", level: "Level 1 (Low)", value: "", mean: "100", sd: "5", lotNumber: "QC-BIO-GLU" });
  const [qcLogs, setQcLogs] = useState([]);
  
  // Lot verification and comparisons
  const [selectedAnalyte, setSelectedAnalyte] = useState("Glucose");
  const [lotData, setLotData] = useState(MOCK_LOT_COMPARISON_DATA);
  const [lotRegression, setLotRegression] = useState(null);
  const [lotBlandAltman, setLotBlandAltman] = useState(null);
  const [currentLotNo, setCurrentLotNo] = useState("GLU-LOT-C");
  const [newLotNo, setNewLotNo] = useState("GLU-LOT-N");

  // Comparability state
  const [compData, setCompData] = useState(MOCK_ANALYZER_COMPARISON_DATA);
  const [compRegression, setCompRegression] = useState(null);
  const [compBlandAltman, setCompBlandAltman] = useState(null);

  // Generic form dynamic states
  const [genericForm, setGenericForm] = useState({ date: new Date().toISOString().split("T")[0], parameter: "", operator: name || "", value: "", status: "Pass", signature: "", remarks: "" });

  // Load flags, employees, test catalog, and log records
  const loadData = useCallback(async () => {
    try {
      // Feature Toggles
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) {
        setFeatureFlags(settingsSnap.data());
      }
      
      // Employees
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Load interactive log entries for active tab
      const q = query(
        collection(db, "interactiveLogs"),
        where("department", "==", "Biochemistry"),
        where("featureKey", "==", activeTab),
        orderBy("createdAt", "desc")
      );
      const logSnap = await getDocs(q);
      setInteractiveLogs(logSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Load specific QC logs if activeTab is biochem_iqc_analysis
      if (activeTab === "biochem_iqc_analysis") {
        const qSnap = await getDocs(query(collection(db, "biochemQC"), orderBy("createdAt", "desc")));
        setQcLogs(qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (e) {
      console.warn("Firestore database read failed/offline. Operating in local mode.", e);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTab]);

  // Load Central Test Master
  useEffect(() => {
    const localTests = localStorage.getItem("mbl_test_master");
    if (localTests) {
      try {
        const parsed = JSON.parse(localTests);
        const filtered = parsed.filter(t => t.department === "Biochemistry" || t.department === "Clinical Biochemistry");
        setTestCatalog(filtered);
        if (filtered.length > 0) {
          setQcForm(prev => ({ ...prev, analyte: filtered[0].testName, mean: filtered[0].qcMean || "100", sd: filtered[0].qcSD || "5" }));
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      // Fallback default list
      const defaults = [
        { testName: "Glucose", testCode: "GLU", methodology: "Hexokinase", qcMean: "92", qcSD: "4.2", unit: "mg/dL" },
        { testName: "Creatinine", testCode: "CREA", methodology: "Modified Jaffe", qcMean: "1.10", qcSD: "0.06", unit: "mg/dL" },
        { testName: "Sodium", testCode: "NA", methodology: "Indirect ISE", qcMean: "140", qcSD: "2.8", unit: "mmol/L" },
        { testName: "Potassium", testCode: "K", methodology: "Indirect ISE", qcMean: "4.2", qcSD: "0.12", unit: "mmol/L" }
      ];
      setTestCatalog(defaults);
      setQcForm(prev => ({ ...prev, analyte: "Glucose", mean: "92", sd: "4.2" }));
    }
  }, []);

  // Compute regressions
  useEffect(() => {
    const x = lotData.map(d => d.currentLot);
    const y = lotData.map(d => d.newLot);
    setLotRegression(calculateLinearRegression(x, y));
    setLotBlandAltman(calculateBlandAltman(x, y));
  }, [lotData]);

  useEffect(() => {
    const x = compData.map(d => d.cobas);
    const y = compData.map(d => d.atellica);
    setCompRegression(calculateLinearRegression(x, y));
    setCompBlandAltman(calculateBlandAltman(x, y));
  }, [compData]);

  const toggleCategory = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleGenericSubmit = async (e) => {
    e.preventDefault();
    if (!genericForm.signature) return alert("Please sign with your credentials.");
    setFormLoading(true);

    const payload = {
      ...genericForm,
      featureKey: activeTab,
      department: "Biochemistry",
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "interactiveLogs"), payload);
      alert("Log recorded successfully!");
      setGenericForm({ date: new Date().toISOString().split("T")[0], parameter: "", operator: name || "", value: "", status: "Pass", signature: "", remarks: "" });
      loadData();
    } catch {
      setInteractiveLogs(prev => [payload, ...prev]);
      alert("Saved locally (Offline Mode).");
    }
    setFormLoading(false);
  };

  const handleQcSubmit = async (e) => {
    e.preventDefault();
    const val = parseFloat(qcForm.value);
    const m = parseFloat(qcForm.mean);
    const s = parseFloat(qcForm.sd);
    if (isNaN(val) || isNaN(m) || isNaN(s)) return alert("Please enter valid numeric parameters");

    const zScore = parseFloat(((val - m) / s).toFixed(2));
    const cv = ((s / m) * 100).toFixed(2);
    let status = "Pass";
    let violation = "None";

    if (Math.abs(zScore) > 3) {
      status = "Reject";
      violation = "1_3s Westgard Rule Violation";
    } else if (Math.abs(zScore) > 2) {
      status = "Warning";
      violation = "1_2s Warning Alert";
    }

    const payload = {
      ...qcForm,
      value: val,
      mean: m,
      sd: s,
      zScore,
      cv,
      status,
      violation,
      enteredBy: name || "Staff",
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, "biochemQC"), payload);
      alert("QC point logged successfully!");
      setQcForm(prev => ({ ...prev, value: "" }));
      loadData();
    } catch {
      setQcLogs(prev => [payload, ...prev]);
    }
  };

  // Group tabs by category and filter using featureFlags
  const groupedMenu = {};
  TABS.forEach(tab => {
    // Only display if feature is not disabled in ERP Controls
    if (featureFlags[tab.key] !== false) {
      if (!groupedMenu[tab.cat]) groupedMenu[tab.cat] = [];
      groupedMenu[tab.cat].push(tab);
    }
  });

  return (
    <div style={S.wrap}>
      {/* 1. Left Accordion Sidebar */}
      <div style={S.sidebar}>
        <div style={S.brandArea}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🧪</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A" }}>Clinical Biochemistry</div>
              <div style={{ fontSize: 9.5, color: "#0F6E56", fontWeight: 600 }}>ANALYTICAL PHASE · ISO 15189</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "8px 0" }}>
          {Object.keys(groupedMenu).map(cat => {
            const list = groupedMenu[cat];
            const expanded = expandedCats[cat];
            return (
              <div key={cat} style={{ marginBottom: 6 }}>
                <div style={S.catHeader(expanded)} onClick={() => toggleCategory(cat)}>
                  <span>{cat} ({list.length})</span>
                  <span>{expanded ? "▾" : "▸"}</span>
                </div>
                {expanded && list.map(item => {
                  const active = activeTab === item.key;
                  return (
                    <div
                      key={item.key}
                      style={S.navItem(active)}
                      onClick={() => setActiveTab(item.key)}
                      onMouseOver={e => { if(!active) e.currentTarget.style.background = "#F7F6F2"; }}
                      onMouseOut={e => { if(!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div style={S.content}>
        {/* Header Ribbon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#2C2C2A", margin: 0 }}>
              {TABS.find(t => t.key === activeTab)?.label || "Biochemistry Register"}
            </h2>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 3 }}>
              ISO 15189:2012 Aligned Quality Documentation System · Department of Pathology
            </div>
          </div>
          <span style={{ fontSize: 11, background: "#E1F5EE", color: "#0F6E56", padding: "4px 10px", borderRadius: 12, fontWeight: 600 }}>
            HOD Approved Workflow
          </span>
        </div>

        {/* Weekly Duty Roster Tab */}
        {activeTab === "biochem_duty_roster" && (
          <WeeklyDutyRoster department="Biochemistry" role={role} userName={name} />
        )}

        {/* ── SUB-FEATURE: AUTHORIZATION MATRIX ── */}
        {activeTab === "biochem_auth_matrix" && (
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Responsibility & Equipment Authorization Matrix (Clause 6.2.5)</span></div>
            <div style={S.cardBody}>
              <table style={S.table}>
                <thead>
                  <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                    <th style={S.th}>Staff Name</th>
                    <th style={S.th}>Role / Designation</th>
                    <th style={S.th}>Authorized Analyzers</th>
                    <th style={S.th}>IQC Approval Rights</th>
                    <th style={S.th}>Report Validation Authority</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{emp.fullName || emp.employeeName}</td>
                      <td style={S.td}>{emp.designation}</td>
                      <td style={S.td}>Roche Cobas, Atellica CH, AVL ISE</td>
                      <td style={S.td}>
                        <span style={{ color: ["HOD", "Supervisor", "Quality Manager"].includes(emp.designation) ? "#0F6E56" : "#888780", fontWeight: 600 }}>
                          {["HOD", "Supervisor", "Quality Manager"].includes(emp.designation) ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ color: ["HOD", "Supervisor"].includes(emp.designation) ? "#0F6E56" : "#888780", fontWeight: 600 }}>
                          {["HOD", "Supervisor"].includes(emp.designation) ? "Yes (Authorized)" : "No (Junior Staff)"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SUB-FEATURE: IQC L-J ANALYSIS ── */}
        {activeTab === "biochem_iqc_analysis" && (
          <div>
            <div style={S.grid(3)}>
              {/* Form */}
              <div style={{ ...S.card, gridColumn: "span 1" }}>
                <div style={S.cardHeader}><span style={S.cardTitle}>Daily IQC Result Log</span></div>
                <form onSubmit={handleQcSubmit} style={S.cardBody}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={S.label}>Select Dynamic Analyte (Test Master Catalog) *</label>
                      <select style={S.inp} value={qcForm.analyte} onChange={e => {
                        const match = testCatalog.find(t => t.testName === e.target.value);
                        setQcForm(prev => ({
                          ...prev,
                          analyte: e.target.value,
                          mean: match?.qcMean || "100",
                          sd: match?.qcSD || "5"
                        }));
                      }}>
                        {testCatalog.map((t, i) => <option key={i}>{t.testName}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>QC Level</label>
                      <select style={S.inp} value={qcForm.level} onChange={e => setQcForm(prev => ({ ...prev, level: e.target.value }))}>
                        <option>Level 1 (Low)</option>
                        <option>Level 2 (Normal)</option>
                        <option>Level 3 (High)</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Measured QC Value *</label>
                      <input type="number" step="0.01" style={S.inp} value={qcForm.value} onChange={e => setQcForm(prev => ({ ...prev, value: e.target.value }))} required />
                    </div>
                    <div style={S.grid(2)}>
                      <div>
                        <label style={S.label}>QC Mean</label>
                        <input style={S.inp} value={qcForm.mean} readOnly />
                      </div>
                      <div>
                        <label style={S.label}>QC SD</label>
                        <input style={S.inp} value={qcForm.sd} readOnly />
                      </div>
                    </div>
                    <button type="submit" style={S.btn()}>Submit & Check Westgard Rules</button>
                  </div>
                </form>
              </div>

              {/* L-J Plot */}
              <div style={{ ...S.card, gridColumn: "span 2" }}>
                <div style={S.cardHeader}>
                  <span style={S.cardTitle}>Levey-Jennings Quality Control Plot</span>
                  <span style={{ fontSize: 11, color: "#0F6E56", fontWeight: 600 }}>Active Control Limits</span>
                </div>
                <div style={S.cardBody}>
                  <div style={{ background: "#FAFAF8", borderRadius: 8, padding: 12, border: "0.5px solid #E0DDD6" }}>
                    <svg viewBox="0 0 600 180" style={{ width: "100%", height: 180 }}>
                      {[-3, -2, -1, 0, 1, 2, 3].map(sd => {
                        const y = 90 - sd * 24;
                        const isMean = sd === 0;
                        const isViol = Math.abs(sd) === 3;
                        return (
                          <g key={sd}>
                            <line x1="50" x2="570" y1={y} y2={y} stroke={isMean ? "#0F6E56" : isViol ? "#E24B4A" : "#D3D1C7"} strokeWidth={isMean ? 1.5 : 0.8} strokeDasharray={isMean ? "none" : "3 3"} />
                            <text x="10" y={y + 3} fontSize="9.5" fill="#5F5E5A" fontWeight={isMean ? "bold" : "normal"}>
                              {sd === 0 ? "Mean" : `${sd > 0 ? "+" : ""}${sd}SD`}
                            </text>
                          </g>
                        );
                      })}
                      {/* Connection Line */}
                      <polyline
                        fill="none"
                        stroke="#185FA5"
                        strokeWidth="1.5"
                        points="70,95 120,88 170,91 220,82 270,90 320,114 370,89 420,93 470,118 520,162"
                      />
                      {/* Control points */}
                      {[
                        { x: 70, y: 95, date: "15-Jun" },
                        { x: 120, y: 88, date: "16-Jun" },
                        { x: 170, y: 91, date: "17-Jun" },
                        { x: 220, y: 82, date: "18-Jun" },
                        { x: 270, y: 90, date: "19-Jun" },
                        { x: 320, y: 114, date: "20-Jun" },
                        { x: 370, y: 89, date: "21-Jun" },
                        { x: 420, y: 93, date: "22-Jun" },
                        { x: 470, y: 118, date: "23-Jun AM" },
                        { x: 520, y: 162, date: "23-Jun PM", alert: true }
                      ].map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" fill={p.alert ? "#E24B4A" : "#0F6E56"} />
                          <text x={p.x - 10} y={p.y - 7} fontSize="8.5" fill="#888780">{p.date}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  {/* Warning banner */}
                  <div style={{ marginTop: 12, background: "#FCEBEB", border: "0.5px solid #E24B4A", borderRadius: 8, padding: 10, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div style={{ fontSize: 11, color: "#791F1F" }}>
                      <strong>Westgard Violation Alert:</strong> Last measured value for {qcForm.analyte} Level 1 exceeded -3SD (1_3s rule violation). Reagent calibration or pump check required.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QC History table */}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Historical QC Results</span></div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                      <th style={S.th}>Timestamp</th>
                      <th style={S.th}>Analyte</th>
                      <th style={S.th}>Level</th>
                      <th style={S.th}>Value</th>
                      <th style={S.th}>Z-Score</th>
                      <th style={S.th}>Westgard Status</th>
                      <th style={S.th}>Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qcLogs.length === 0 ? (
                      <tr><td colSpan="7" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No QC points recorded.</td></tr>
                    ) : (
                      qcLogs.map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                          <td style={S.td}>{new Date(q.createdAt).toLocaleString("en-IN")}</td>
                          <td style={S.td}>{q.analyte}</td>
                          <td style={S.td}>{q.level}</td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{q.value}</td>
                          <td style={S.td}>{q.zScore} SD</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 600,
                              background: q.status === "Pass" ? "#E1F5EE" : q.status === "Warning" ? "#FAEEDA" : "#FCEBEB",
                              color: q.status === "Pass" ? "#0F6E56" : q.status === "Warning" ? "#854F0B" : "#A32D2D"
                            }}>{q.status} {q.violation !== "None" && `(${q.violation})`}</span>
                          </td>
                          <td style={S.td}>{q.enteredBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-FEATURE: REAGENT LOT TO LOT VERIFICATION ── */}
        {activeTab === "biochem_lot_to_lot" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Method Lot-to-Lot Verification (Clause 6.6)</span></div>
              <div style={S.cardBody}>
                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>Analyte</label>
                    <select style={S.inp} value={selectedAnalyte} onChange={e => setSelectedAnalyte(e.target.value)}>
                      <option>Glucose</option>
                      <option>Creatinine</option>
                      <option>Sodium</option>
                    </select>
                    <div style={{ marginTop: 10 }}>
                      <label style={S.label}>Current Lot No.</label>
                      <input style={S.inp} value={currentLotNo} onChange={e => setCurrentLotNo(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={S.label}>New Lot No.</label>
                      <input style={S.inp} value={newLotNo} onChange={e => setNewLotNo(e.target.value)} />
                    </div>
                    <div style={{ marginTop: 16, background: "#FAFAF8", padding: 10, borderRadius: 8, border: "0.5px solid #E0DDD6", fontSize: 11.5 }}>
                      <strong>Allowable TEa target:</strong> ±6.0% (CLIA 2024 limit for Glucose)
                    </div>
                  </div>

                  <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 6 }}>Correlation Analysis ($N=20$)</div>
                    {lotRegression && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                        <div>Slope: <strong>{lotRegression.slope}</strong></div>
                        <div>Intercept: <strong>{lotRegression.intercept}</strong></div>
                        <div>Coefficient ($R^2$): <strong>{lotRegression.r2}</strong></div>
                        <div>Systematic Bias: <strong>{lotBlandAltman?.meanDifference}%</strong></div>
                        <div style={{ borderTop: "0.5px solid #E0DDD6", paddingTop: 6, marginTop: 4 }}>
                          {Math.abs(lotBlandAltman?.meanDifference || 0) < 6.0 ? (
                            <span style={{ color: "#0F6E56", fontWeight: "bold" }}>✓ PASS (Bias &lt; TEa Limit)</span>
                          ) : (
                            <span style={{ color: "#E24B4A", fontWeight: "bold" }}>✗ FAIL (Out of limit)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2C2C2A", marginBottom: 6 }}>Bland-Altman Bias Plot (% Bias)</div>
                    <svg viewBox="0 0 200 120" style={{ width: "100%", height: 120, background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8 }}>
                      <line x1="10" x2="190" y1="60" y2="60" stroke="#0F6E56" strokeWidth="1" />
                      <line x1="10" x2="190" y1="30" y2="30" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="2 2" />
                      <line x1="10" x2="190" y1="90" y2="90" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="2 2" />
                      <text x="12" y="26" fontSize="7" fill="#E24B4A">+1.96 SD</text>
                      <text x="12" y="98" fontSize="7" fill="#E24B4A">-1.96 SD</text>
                      {/* Scatter diff points */}
                      {lotBlandAltman?.pctDifferences.map((d, i) => (
                        <circle key={i} cx={30 + i * 8} cy={60 - d * 3} r="2.5" fill="#185FA5" />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-FEATURE: COMPARABILITY OF EQUIPMENTS ── */}
        {activeTab === "biochem_comparability" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Comparability of Test Results between Analyzers (Roche Cobas vs Siemens Atellica CH)</span></div>
              <div style={S.cardBody}>
                <div style={S.grid(3)}>
                  <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 6 }}>Method Comparison Summary ($N=20$)</div>
                    {compRegression && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                        <div>Slope: <strong>{compRegression.slope}</strong></div>
                        <div>Intercept: <strong>{compRegression.intercept}</strong></div>
                        <div>Coefficient ($R^2$): <strong>{compRegression.r2}</strong></div>
                        <div>Mean Difference Bias: <strong>{compBlandAltman?.meanDifference}%</strong></div>
                        <div style={{ borderTop: "0.5px solid #E0DDD6", paddingTop: 6, marginTop: 4 }}>
                          <span style={{ color: "#0F6E56", fontWeight: "bold" }}>✓ Verified Comparable (Regression slope close to 1.0)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2C2C2A", marginBottom: 6 }}>Deming Regression Curve ($N=20$)</div>
                    <svg viewBox="0 0 200 120" style={{ width: "100%", height: 120, background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8 }}>
                      <line x1="10" x2="190" y1="110" y2="10" stroke="#888780" strokeWidth="0.5" strokeDasharray="3 3" /> {/* Line of identity */}
                      <line x1="10" x2="190" y1="108" y2="12" stroke="#0F6E56" strokeWidth="1.2" /> {/* Regression line */}
                      {compData.map((d, i) => (
                        <circle key={i} cx={20 + d.cobas * 30} cy={110 - d.atellica * 20} r="2.5" fill="#185FA5" />
                      ))}
                    </svg>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2C2C2A", marginBottom: 6 }}>Bland-Altman Bias Plot</div>
                    <svg viewBox="0 0 200 120" style={{ width: "100%", height: 120, background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8 }}>
                      <line x1="10" x2="190" y1="60" y2="60" stroke="#0F6E56" strokeWidth="1" />
                      <line x1="10" x2="190" y1="35" y2="35" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="2 2" />
                      <line x1="10" x2="190" y1="85" y2="85" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="2 2" />
                      {compBlandAltman?.pctDifferences.map((d, i) => (
                        <circle key={i} cx={25 + i * 8} cy={60 - d * 2} r="2.5" fill="#185FA5" />
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SUB-FEATURE: ADVISORY SERVICES FORM ── */}
        {activeTab === "biochem_advisory" && (
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Clinical Advisory Services Form (Clause 4.7)</span></div>
            <form onSubmit={handleGenericSubmit} style={S.cardBody}>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Consulting Doctor / Clinician *</label>
                  <input style={S.inp} placeholder="Doctor Name" value={genericForm.parameter} onChange={e => setGenericForm({ ...genericForm, parameter: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Patient Ref / Lab ID</label>
                  <input style={S.inp} placeholder="Lab Sample ID" value={genericForm.value} onChange={e => setGenericForm({ ...genericForm, value: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Clinical Interpretation Advice Given *</label>
                <textarea style={{ ...S.inp, height: 70 }} value={genericForm.remarks} onChange={e => setGenericForm({ ...genericForm, remarks: e.target.value })} placeholder="Details of advice regarding clinical significance, interference, or critical levels..." required />
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Advisor Signature (HOD / Pathologist) *</label>
                  <input style={S.inp} placeholder="Sign with full name" value={genericForm.signature} onChange={e => setGenericForm({ ...genericForm, signature: e.target.value })} required />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" style={{ ...S.btn(), width: "100%" }} disabled={formLoading}>Submit Advisory Record</button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── SUB-FEATURE: STORED SAMPLE STABILITY VERIFICATION ── */}
        {activeTab === "biochem_sample_integrity" && (
          <SampleIntegrityChecks department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: TEMPERATURE & HUMIDITY MONITORING ── */}
        {activeTab === "biochem_temp_monitoring" && (
          <TemperatureDashboard department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: SAMPLE REJECTION MANAGEMENT ── */}
        {activeTab === "biochem_sample_rejection" && (
          <SampleRejectionDashboard department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: SAMPLE RETENTION POLICY ── */}
        {activeTab === "biochem_sample_retention" && (
          <SampleRetentionView department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: INTRA-DEPARTMENT MEETING MINUTES ── */}
        {activeTab === "biochem_meeting_form" && (
          <IntraDeptMeetingForm department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: WORK HANDOVER ── */}
        {activeTab === "biochem_work_handover" && (
          <WorkHandover department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: REAGENT CALIBRATION ── */}
        {activeTab === "biochem_reagent_calib" && (
          <ReagentCalibrationDashboard department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: ERROR RECORDS & NC CAPA ── */}
        {activeTab === "biochem_error_records" && (
          <ErrorRecords department="Biochemistry" />
        )}

        {/* ── SUB-FEATURE: QUALITY INDICATORS LOG ── */}
        {activeTab === "biochem_quality_indicators" && (
          <QualityIndicatorsLog department="Biochemistry" />
        )}

        {/* ── GENERAL / DYNAMIC LOG TEMPLATE (Covers remaining ~100 sub-features) ── */}
        {!["biochem_duty_roster", "biochem_auth_matrix", "biochem_iqc_analysis", "biochem_lot_to_lot", "biochem_comparability", "biochem_advisory", "biochem_sample_integrity", "biochem_temp_monitoring", "biochem_sample_rejection", "biochem_sample_retention", "biochem_meeting_form", "biochem_work_handover", "biochem_reagent_calib", "biochem_error_records", "biochem_quality_indicators"].includes(activeTab) && (
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Standard Workflow Parameter Entry (ISO Compliant Audit Trail)</span></div>
            <form onSubmit={handleGenericSubmit} style={S.cardBody}>
              <div style={S.grid(3)}>
                <div>
                  <label style={S.label}>Date *</label>
                  <input type="date" style={S.inp} value={genericForm.date} onChange={e => setGenericForm({ ...genericForm, date: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Log Parameter Name / Item / Machine *</label>
                  <input style={S.inp} placeholder="e.g. Temperature, Reagent Lot No, Check status" value={genericForm.parameter} onChange={e => setGenericForm({ ...genericForm, parameter: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Observed Value / Reading *</label>
                  <input style={S.inp} placeholder="e.g. 24°C, Pass, Operational, Lot ID" value={genericForm.value} onChange={e => setGenericForm({ ...genericForm, value: e.target.value })} required />
                </div>
              </div>
              <div style={S.grid(3)}>
                <div>
                  <label style={S.label}>Compliance Status</label>
                  <select style={S.inp} value={genericForm.status} onChange={e => setGenericForm({ ...genericForm, status: e.target.value })}>
                    <option>Pass</option>
                    <option>Warning</option>
                    <option>Fail</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>Technologist Full Name *</label>
                  <input style={S.inp} value={genericForm.operator} onChange={e => setGenericForm({ ...genericForm, operator: e.target.value })} required />
                </div>
                <div>
                  <label style={S.label}>Sign (Validation Password/Initial) *</label>
                  <input style={S.inp} placeholder="Sign initials" value={genericForm.signature} onChange={e => setGenericForm({ ...genericForm, signature: e.target.value })} required />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Verification Remarks / Action Taken</label>
                <input style={S.inp} placeholder="Any deviations or actions taken" value={genericForm.remarks} onChange={e => setGenericForm({ ...genericForm, remarks: e.target.value })} />
              </div>
              <button type="submit" style={S.btn()} disabled={formLoading}>{formLoading ? "Saving Log..." : "Submit Log Entry"}</button>
            </form>
          </div>
        )}

        {/* 3. Historical logs list */}
        {!["biochem_iqc_analysis", "biochem_sample_integrity", "biochem_temp_monitoring", "biochem_sample_rejection", "biochem_sample_retention", "biochem_meeting_form", "biochem_work_handover", "biochem_reagent_calib", "biochem_error_records", "biochem_quality_indicators"].includes(activeTab) && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Activity Logs & Verification History (Audit Trail)</span>
              <button onClick={loadData} style={S.btn("#FAFAF8", "#0F6E56")}>🔄 Refresh</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                    <th style={S.th}>Timestamp</th>
                    <th style={S.th}>Parameter/Item</th>
                    <th style={S.th}>Logged Value</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Staff Name</th>
                    <th style={S.th}>Validation Signature</th>
                    <th style={S.th}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {interactiveLogs.length === 0 ? (
                    <tr><td colSpan="7" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No audit trails recorded yet.</td></tr>
                  ) : (
                    interactiveLogs.map((log, idx) => (
                      <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                        <td style={S.td}>{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                        <td style={S.td}>{log.parameter}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{log.value}</td>
                        <td style={S.td}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: log.status === "Pass" ? "#E1F5EE" : log.status === "Warning" ? "#FAEEDA" : "#FCEBEB",
                            color: log.status === "Pass" ? "#0F6E56" : log.status === "Warning" ? "#854F0B" : "#A32D2D"
                          }}>{log.status}</span>
                        </td>
                        <td style={S.td}>{log.operator}</td>
                        <td style={{ ...S.td, fontFamily: "monospace" }}>{log.signature}</td>
                        <td style={{ ...S.td, color: "#5F5E5A" }}>{log.remarks || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
