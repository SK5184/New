import QualityIndicatorsLog from "../QualityIndicatorsLog";
// MicrobiologyDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Microbiology Module
// Rebuilt to include MLRS Vs VITEK Antibiotic Susceptibility Comparison System

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../../modules/TemperatureMonitoring/TemperatureDashboard";
import SampleRetentionView from "../biochemistry/SampleRetentionView";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 280, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "24px 32px" },
  
  // Sidebar Brand & Section Headers
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
  
  // Card & Container Styling
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 700, color: "#2C2C2A", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  
  // Input fields
  inp: { padding: "8px 12px", border: "1px solid #D3D1C7", borderRadius: 8, fontSize: 12.5, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none", transition: "border 0.15s" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0F6E56", color: color || "#E1F5EE", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", outline: "none", display: "flex", alignItems: "center", gap: 6 }),
  
  // Tabular Layout
  tableContainer: { overflowX: "auto", background: "#fff", borderRadius: 8, border: "0.5px solid #E0DDD6", marginBottom: 20 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { padding: "10px 12px", borderBottom: "2px solid #E0DDD6", color: "#5F5E5A", fontWeight: 600, textAlign: "left", background: "#FAFAF8", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" },
  
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 600, color: "#5F5E5A", display: "block", marginBottom: 6 },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, fontSize: 12.5, zIndex: 2000, display: "flex", alignItems: "center", gap: 8 }
};

const MENU_GROUPS = {
  "General & Personnel": [
    { key: "roster", label: "Weekly Duty Roster", icon: "📅" },
    { key: "auth_matrix", label: "Responsibility Matrix", icon: "🔑" },
    { key: "staff_training", label: "New Staff Training", icon: "🎓" }
  ],
  "Examination Protocols": [
    { key: "mlrs_vs_vitek", label: "AST Equipment Comparison", icon: "📊" },
    { key: "critical_list", label: "Critical Results List", icon: "🚨" },
    { key: "micro_sample_retention", label: "Sample Retention View", icon: "🗑️" },
    { key: "micro_quality_indicators", label: "Quality Indicators Log", icon: "📈" }
  ],
  "Internal Quality Control": [
    { key: "iqc_vitek", label: "IQC - Vitek 2 Compact", icon: "📈" },
    { key: "iqc_media", label: "IQC - Culture Media", icon: "🧫" },
    { key: "lot_verification", label: "Lot to Lot Verification", icon: "🧪" }
  ],
  "External Quality (EQAS)": [
    { key: "eqa_genexpert", label: "EQA - Gene Xpert", icon: "🌐" },
    { key: "split_sample", label: "Split Sample (Alternate EQA)", icon: "➗" }
  ],
  "Equipment & Maintenance": [
    { key: "hepa_filters", label: "HEPA Filter check logs", icon: "🌬️" },
    { key: "maint_vitek", label: "Vitek 2 Maintenance", icon: "⚙️" },
    { key: "micro_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️" }
  ]
};

const TABS = Object.values(MENU_GROUPS).flat();
const METHODS = ["MLRS", "Osiris", "Adagio", "Antiba", "BD", "Vitek"];

// Seed Antibiotics list for default isolate
const DEFAULT_ANTIBIOTICS = [
  { name: "Ampicillin", xMic: "2", xSir: "S", yMic: "2", ySir: "S", remarks: "Concordant" },
  { name: "Ceftriaxone", xMic: "0.25", xSir: "S", yMic: "0.5", ySir: "S", remarks: "Concordant" },
  { name: "Ciprofloxacin", xMic: "1", xSir: "I", yMic: "1", ySir: "I", remarks: "Concordant" },
  { name: "Gentamicin", xMic: "16", xSir: "R", yMic: "8", ySir: "R", remarks: "Concordant within 1 dilution" },
  { name: "Imipenem", xMic: "0.5", xSir: "S", yMic: "1", ySir: "S", remarks: "Concordant within 1 dilution" },
  { name: "Linezolid", xMic: "2", xSir: "S", yMic: "2", ySir: "S", remarks: "Concordant" },
  { name: "Vancomycin", xMic: "1", xSir: "S", yMic: "1", ySir: "S", remarks: "Concordant" }
];

export default function MicrobiologyDashboard() {
  const { name: loggedInUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState("mlrs_vs_vitek");
  const [toast, setToast] = useState(null);
  
  // Left accordion section state
  const [expandedCats, setExpandedCats] = useState({
    "General & Personnel": true,
    "Examination Protocols": true,
    "Internal Quality Control": false,
    "External Quality (EQAS)": false,
    "Equipment & Maintenance": false
  });

  // MLRS vs VITEK Study State
  const [studyMeta, setStudyMeta] = useState({
    studyNo: "AST-COMP-2026-001",
    studyDate: new Date().toISOString().split("T")[0],
    performedBy: loggedInUser || "",
    reviewedBy: "Dr. Suresh Kumar",
    organism: "Escherichia coli (ATCC 25922)",
    isolateId: "ISO-2606-A1",
    specimenType: "Urine",
    guideline: "CLSI",
    guidelineOther: "",
    methodX: "MLRS",
    methodY: "Vitek"
  });

  const [antibioticsList, setAntibioticsList] = useState(DEFAULT_ANTIBIOTICS);
  const [studyHistory, setStudyHistory] = useState([]);

  useEffect(() => {
    const cached = localStorage.getItem("mbl_micro_studies");
    if (cached) {
      setStudyHistory(JSON.parse(cached));
    }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleCategory = (cat) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Parsing MIC value strings to numeric values
  const parseMic = (val) => {
    if (!val) return null;
    const cleaned = val.replace(/[<>=]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // MIC Agreement Calculation (difference <= 1 dilution log2 scale)
  const checkMicAgreement = (xValStr, yValStr) => {
    const xVal = parseMic(xValStr);
    const yVal = parseMic(yValStr);
    if (xVal === null || yVal === null) return "N/A";
    const diff = Math.abs(Math.log2(xVal) - Math.log2(yVal));
    return diff <= 1 ? "Y" : "N";
  };

  // Error Classification calculations
  const getDiscrepancyType = (xS, yS) => {
    if (!xS || !yS) return "None";
    if (xS === "S" && yS === "R") return "ME"; // Major Error
    if (xS === "R" && yS === "S") return "VME"; // Very Major Error
    if (xS === "I" && (yS === "S" || yS === "R")) return "mE"; // Minor Error
    if ((xS === "S" || xS === "R") && yS === "I") return "mE"; // Minor Error
    return "None";
  };

  const handleAddAntibiotic = () => {
    setAntibioticsList(prev => [
      ...prev,
      { name: "", xMic: "", xSir: "S", yMic: "", ySir: "S", remarks: "" }
    ]);
  };

  const handleRemoveAntibiotic = (idx) => {
    setAntibioticsList(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRowChange = (idx, field, value) => {
    setAntibioticsList(prev => prev.map((row, i) => {
      if (i === idx) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  // Recalculating Study Summary Totals
  const totalAntibiotics = antibioticsList.length;
  
  const categoryAgreements = antibioticsList.filter(a => a.xSir === a.ySir).length;
  const categoryAgreementPct = totalAntibiotics > 0 ? ((categoryAgreements / totalAntibiotics) * 100).toFixed(1) : "0.0";
  
  const micAgreements = antibioticsList.filter(a => checkMicAgreement(a.xMic, a.yMic) === "Y").length;
  const micAgreementPct = totalAntibiotics > 0 ? ((micAgreements / totalAntibiotics) * 100).toFixed(1) : "0.0";

  const minorErrors = antibioticsList.filter(a => getDiscrepancyType(a.xSir, a.ySir) === "mE").length;
  const majorErrors = antibioticsList.filter(a => getDiscrepancyType(a.xSir, a.ySir) === "ME").length;
  const veryMajorErrors = antibioticsList.filter(a => getDiscrepancyType(a.xSir, a.ySir) === "VME").length;

  const overallAcceptable = parseFloat(categoryAgreementPct) >= 90.0 && veryMajorErrors === 0 && majorErrors === 0;

  const handleSaveStudy = () => {
    const studyRecord = {
      ...studyMeta,
      id: Date.now(),
      antibiotics: antibioticsList,
      summary: {
        total: totalAntibiotics,
        catAgreement: categoryAgreements,
        catAgreementPct: categoryAgreementPct,
        micAgreement: micAgreements,
        micAgreementPct: micAgreementPct,
        minor: minorErrors,
        major: majorErrors,
        veryMajor: veryMajorErrors,
        acceptable: overallAcceptable ? "Yes" : "No"
      }
    };

    const updated = [studyRecord, ...studyHistory];
    setStudyHistory(updated);
    localStorage.setItem("mbl_micro_studies", JSON.stringify(updated));
    showToast(`Susceptibility comparison report '${studyMeta.studyNo}' successfully saved.`);
  };

  const handleDeleteStudy = (id) => {
    if (window.confirm("Are you sure you want to delete this study record?")) {
      const updated = studyHistory.filter(s => s.id !== id);
      setStudyHistory(updated);
      localStorage.setItem("mbl_micro_studies", JSON.stringify(updated));
      showToast("Study record deleted.");
    }
  };

  return (
    <div style={S.wrap}>
      {/* Sidebar navigation */}
      <div style={S.sidebar}>
        <div style={S.brandArea}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔬</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A" }}>Microbiology Division</div>
              <div style={{ fontSize: 9.5, color: "#0F6E56", fontWeight: 600 }}>COMPLIANCE COCKPIT · ISO 15189</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "8px 0" }}>
          {Object.keys(MENU_GROUPS).map(cat => {
            const list = MENU_GROUPS[cat];
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

      {/* Main Content Area */}
      <div style={S.content}>
        
        {/* MLRS Vs VITEK SUSCEPTIBILITY COMPARISON */}
        {activeTab === "mlrs_vs_vitek" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>
                  <span>📊</span>
                  <span>{studyMeta.methodX} vs {studyMeta.methodY} Antibiotic Susceptibility Comparison Study Form</span>
                </div>
                <span style={S.badge("#E1F5EE", "#0F6E56")}>ISO 15189 Method Correlation</span>
              </div>
              <div style={S.cardBody}>

                {/* Method/Equipment X and Y Variable Option Selectors */}
                <div style={{ ...S.grid(2), background: "#FAFAF8", padding: "16px 20px", borderRadius: 10, border: "0.5px solid #E0DDD6", marginBottom: 20 }}>
                  <div>
                    <label style={S.label}>Equipment/Method X (Reference)</label>
                    <select 
                      style={S.inp} 
                      value={studyMeta.methodX}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStudyMeta(prev => {
                          let nextY = prev.methodY;
                          if (nextY === val) {
                            nextY = METHODS.find(m => m !== val);
                          }
                          return { ...prev, methodX: val, methodY: nextY };
                        });
                      }}
                    >
                      {METHODS.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Equipment/Method Y (Comparator)</label>
                    <select 
                      style={S.inp} 
                      value={studyMeta.methodY}
                      onChange={(e) => setStudyMeta({ ...studyMeta, methodY: e.target.value })}
                    >
                      {METHODS.filter(m => m !== studyMeta.methodX).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Study Metadata Inputs */}
                <div style={S.grid(4)}>
                  <div>
                    <label style={S.label}>Comparison Study No</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      value={studyMeta.studyNo}
                      onChange={(e) => setStudyMeta({ ...studyMeta, studyNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Study Date</label>
                    <input 
                      type="date" 
                      style={S.inp} 
                      value={studyMeta.studyDate}
                      onChange={(e) => setStudyMeta({ ...studyMeta, studyDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Performed By</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      value={studyMeta.performedBy}
                      onChange={(e) => setStudyMeta({ ...studyMeta, performedBy: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Reviewed By</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      value={studyMeta.reviewedBy}
                      onChange={(e) => setStudyMeta({ ...studyMeta, reviewedBy: e.target.value })}
                    />
                  </div>
                </div>

                <div style={S.grid(3)}>
                  <div>
                    <label style={S.label}>Organism Name</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      placeholder="e.g. E. coli (ATCC 25922)"
                      value={studyMeta.organism}
                      onChange={(e) => setStudyMeta({ ...studyMeta, organism: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Isolate ID</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      placeholder="e.g. ISO-0921"
                      value={studyMeta.isolateId}
                      onChange={(e) => setStudyMeta({ ...studyMeta, isolateId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={S.label}>Specimen Type</label>
                    <input 
                      type="text" 
                      style={S.inp} 
                      placeholder="e.g. Urine, CSF, Blood"
                      value={studyMeta.specimenType}
                      onChange={(e) => setStudyMeta({ ...studyMeta, specimenType: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Reference Guideline Used</label>
                  <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                    <label style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="guideline" 
                        checked={studyMeta.guideline === "CLSI"}
                        onChange={() => setStudyMeta({ ...studyMeta, guideline: "CLSI" })}
                      /> CLSI
                    </label>
                    <label style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="guideline" 
                        checked={studyMeta.guideline === "EUCAST"}
                        onChange={() => setStudyMeta({ ...studyMeta, guideline: "EUCAST" })}
                      /> EUCAST
                    </label>
                    <label style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="guideline" 
                        checked={studyMeta.guideline === "Other"}
                        onChange={() => setStudyMeta({ ...studyMeta, guideline: "Other" })}
                      /> Other:
                    </label>
                    {studyMeta.guideline === "Other" && (
                      <input 
                        type="text" 
                        style={{ ...S.inp, width: 200, padding: "5px 10px" }}
                        placeholder="Specify guideline"
                        value={studyMeta.guidelineOther}
                        onChange={(e) => setStudyMeta({ ...studyMeta, guidelineOther: e.target.value })}
                      />
                    )}
                  </div>
                </div>

                {/* Susceptibility Antibiotic Grid Table */}
                <div style={S.tableContainer}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Antibiotic</th>
                        <th style={S.th}>{studyMeta.methodX} MIC</th>
                        <th style={S.th}>{studyMeta.methodX} S/I/R</th>
                        <th style={S.th}>{studyMeta.methodY} MIC</th>
                        <th style={S.th}>{studyMeta.methodY} S/I/R</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Category Agreement</th>
                        <th style={S.th} style={{ textAlign: "center" }}>MIC Agreement (±1 dil.)</th>
                        <th style={S.th}>Discrepancy Type</th>
                        <th style={S.th}>Remarks</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {antibioticsList.map((row, idx) => {
                        const isCatAgree = row.xSir === row.ySir;
                        const micAgree = checkMicAgreement(row.xMic, row.yMic);
                        const discType = getDiscrepancyType(row.xSir, row.ySir);
                        
                        return (
                          <tr key={idx}>
                            <td style={S.td}>
                              <input 
                                type="text" 
                                style={{ ...S.inp, padding: "5px 8px" }}
                                placeholder="Antibiotic Name"
                                value={row.name}
                                onChange={(e) => handleRowChange(idx, "name", e.target.value)}
                              />
                            </td>
                            <td style={S.td}>
                              <input 
                                type="text" 
                                style={{ ...S.inp, padding: "5px 8px", width: 90 }}
                                placeholder="MIC Value"
                                value={row.xMic}
                                onChange={(e) => handleRowChange(idx, "xMic", e.target.value)}
                              />
                            </td>
                            <td style={S.td}>
                              <select 
                                style={{ ...S.inp, padding: "5px 8px", width: 70 }}
                                value={row.xSir}
                                onChange={(e) => handleRowChange(idx, "xSir", e.target.value)}
                              >
                                <option value="S">S</option>
                                <option value="I">I</option>
                                <option value="R">R</option>
                              </select>
                            </td>
                            <td style={S.td}>
                              <input 
                                type="text" 
                                style={{ ...S.inp, padding: "5px 8px", width: 90 }}
                                placeholder="MIC Value"
                                value={row.yMic}
                                onChange={(e) => handleRowChange(idx, "yMic", e.target.value)}
                              />
                            </td>
                            <td style={S.td}>
                              <select 
                                style={{ ...S.inp, padding: "5px 8px", width: 70 }}
                                value={row.ySir}
                                onChange={(e) => handleRowChange(idx, "ySir", e.target.value)}
                              >
                                <option value="S">S</option>
                                <option value="I">I</option>
                                <option value="R">R</option>
                              </select>
                            </td>
                            <td style={S.td} style={{ textAlign: "center" }}>
                              <span style={S.badge(isCatAgree ? "#E6F4EA" : "#FCE8E6", isCatAgree ? "#137333" : "#C5221F")}>
                                {isCatAgree ? "Y" : "N"}
                              </span>
                            </td>
                            <td style={S.td} style={{ textAlign: "center" }}>
                              <span style={S.badge(
                                micAgree === "Y" ? "#E6F4EA" : micAgree === "N" ? "#FCE8E6" : "#F1F5F9", 
                                micAgree === "Y" ? "#137333" : micAgree === "N" ? "#C5221F" : "#475569"
                              )}>
                                {micAgree}
                              </span>
                            </td>
                            <td style={S.td}>
                              {discType === "None" ? (
                                <span style={S.badge("#F1F5F9", "#475569")}>No Discrepancy</span>
                              ) : discType === "mE" ? (
                                <span style={S.badge("#FEF7E0", "#B06000")}>Minor Error (mE)</span>
                              ) : discType === "ME" ? (
                                <span style={S.badge("#FCE8E6", "#C5221F")}>Major Error (ME)</span>
                              ) : (
                                <span style={{ ...S.badge("#FCE8E6", "#C5221F"), fontWeight: 800 }}>Very Major (VME)</span>
                              )}
                            </td>
                            <td style={S.td}>
                              <input 
                                type="text" 
                                style={{ ...S.inp, padding: "5px 8px" }}
                                placeholder="Remarks"
                                value={row.remarks}
                                onChange={(e) => handleRowChange(idx, "remarks", e.target.value)}
                              />
                            </td>
                            <td style={S.td} style={{ textAlign: "center" }}>
                              <button 
                                style={{ ...S.btn("#FEE2E2", "#991B1B"), padding: "4px 8px" }}
                                onClick={() => handleRemoveAntibiotic(idx)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <button style={S.btn("#EFF6FF", "#1E40AF")} onClick={handleAddAntibiotic}>
                    ➕ Add Antibiotic Row
                  </button>
                </div>

                {/* Dynamic Summary Cards */}
                <div style={{ ...S.grid(3), background: "#FAFAF8", padding: 20, borderRadius: 12, border: "0.5px solid #E0DDD6", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A", marginBottom: 10 }}>🔢 AST Comparison Totals</div>
                    <div style={{ fontSize: 12.5, color: "#5F5E5A" }}>
                      Total Compared: <strong>{totalAntibiotics}</strong><br/>
                      Category Agreements: <strong>{categoryAgreements} ({categoryAgreementPct}%)</strong><br/>
                      MIC Agreements: <strong>{micAgreements} ({micAgreementPct}%)</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A", marginBottom: 10 }}>⚠️ Discrepancy Counts</div>
                    <div style={{ fontSize: 12.5, color: "#5F5E5A" }}>
                      Minor Errors (mE): <strong style={{ color: minorErrors > 0 ? "#B06000" : "#2C2C2A" }}>{minorErrors}</strong><br/>
                      Major Errors (ME): <strong style={{ color: majorErrors > 0 ? "#C5221F" : "#2C2C2A" }}>{majorErrors}</strong><br/>
                      Very Major Errors (VME): <strong style={{ color: veryMajorErrors > 0 ? "#C5221F" : "#2C2C2A" }}>{veryMajorErrors}</strong>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#2C2C2A", marginBottom: 10 }}>🛡️ ISO 15189 Acceptability</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                      <span style={{ ...S.badge(overallAcceptable ? "#E6F4EA" : "#FCE8E6", overallAcceptable ? "#137333" : "#C5221F"), fontSize: 13, padding: "6px 14px", borderRadius: 8 }}>
                        Acceptable: {overallAcceptable ? "YES" : "NO"}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 8 }}>
                      *Acceptable requires Category Agreement ≥ 90% and zero Major/Very Major Errors.
                    </div>
                  </div>
                </div>

                {/* Comments & Approvals */}
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Comments / Corrective Action (if unacceptable)</label>
                  <textarea 
                    style={{ ...S.inp, height: 70, resize: "none" }}
                    placeholder="Enter correlation details, discrepancy resolution plan or calibration remarks..."
                  />
                </div>

                <div style={S.grid(3)}>
                  <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5F5E5A", marginBottom: 6 }}>Performed By</div>
                    <div style={{ fontSize: 12, color: "#2C2C2A" }}>Operator: {studyMeta.performedBy}</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 4 }}>Date: {studyMeta.studyDate}</div>
                  </div>
                  <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5F5E5A", marginBottom: 6 }}>Reviewed By</div>
                    <div style={{ fontSize: 12, color: "#2C2C2A" }}>Name: {studyMeta.reviewedBy}</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 4 }}>Status: Approved & Verified</div>
                  </div>
                  <div style={{ background: "#FAFAF8", padding: 12, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: "#5F5E5A", marginBottom: 6 }}>Approved By</div>
                    <div style={{ fontSize: 12, color: "#2C2C2A" }}>Lab Director Review</div>
                    <div style={{ fontSize: 11, color: "#888780", marginTop: 4 }}>Authorized Signature logged</div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
                  <button 
                    style={S.btn("secondary")}
                    onClick={() => {
                      setAntibioticsList(DEFAULT_ANTIBIOTICS);
                      showToast("susceptibility list reset to defaults.");
                    }}
                  >
                    Reset List
                  </button>
                  <button style={S.btn()} onClick={handleSaveStudy}>
                    💾 Save & Authorize Comparison Study
                  </button>
                </div>

              </div>
            </div>

            {/* Historical Correlation Reports List */}
            {studyHistory.length > 0 && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>📜 Historical Method Validation Studies</div>
                </div>
                <div style={{ padding: 0 }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Study No</th>
                        <th style={S.th}>Comparison</th>
                        <th style={S.th}>Organism</th>
                        <th style={S.th}>Specimen</th>
                        <th style={S.th}>Date</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Total Drugs</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Category Agreement</th>
                        <th style={S.th} style={{ textAlign: "center" }}>MIC Agreement</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Errors (VME/ME/mE)</th>
                        <th style={S.th} style={{ textAlign: "center" }}>ISO Acceptable</th>
                        <th style={S.th} style={{ textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studyHistory.map((s) => (
                        <tr key={s.id}>
                          <td style={S.td}><code>{s.studyNo}</code></td>
                          <td style={S.td}><strong>{s.methodX} vs {s.methodY}</strong></td>
                          <td style={S.td} style={{ fontWeight: 600 }}>{s.organism}</td>
                          <td style={S.td}>{s.specimenType}</td>
                          <td style={S.td}>{s.studyDate}</td>
                          <td style={S.td} style={{ textAlign: "center" }}>{s.summary.total}</td>
                          <td style={S.td} style={{ textAlign: "center" }}>{s.summary.catAgreementPct}%</td>
                          <td style={S.td} style={{ textAlign: "center" }}>{s.summary.micAgreementPct}%</td>
                          <td style={S.td} style={{ textAlign: "center" }}>
                            <span style={{ color: "#EF4444" }}>{s.summary.veryMajor}</span> / <span style={{ color: "#EF4444" }}>{s.summary.major}</span> / <span style={{ color: "#F59E0B" }}>{s.summary.minor}</span>
                          </td>
                          <td style={S.td} style={{ textAlign: "center" }}>
                            <span style={S.badge(s.summary.acceptable === "Yes" ? "#E6F4EA" : "#FCE8E6", s.summary.acceptable === "Yes" ? "#137333" : "#C5221F")}>
                              {s.summary.acceptable}
                            </span>
                          </td>
                          <td style={S.td} style={{ textAlign: "center" }}>
                            <button 
                              style={{ ...S.btn("#FEE2E2", "#991B1B"), padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handleDeleteStudy(s.id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Weekly Duty Roster Tab */}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Microbiology" role={role} userName={userName} />
        )}

        {/* Temperature & Humidity Monitoring */}
        {activeTab === "micro_temp_monitoring" && (
          <TemperatureDashboard department="Microbiology" />
        )}

        {activeTab === "micro_sample_retention" && (
          <SampleRetentionView department="Microbiology" />
        )}

        {/* Default / Fallback placeholders for other QMS tabs */}
        {activeTab !== "mlrs_vs_vitek" && activeTab !== "roster" && activeTab !== "micro_temp_monitoring" && activeTab !== "micro_sample_retention" && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>⚙️ Microbiology QMS Module: {TABS.find(t => t.key === activeTab)?.label}</div>
            </div>
            <div style={S.cardBody} style={{ textAlign: "center", padding: "60px 40px" }}>
              <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>
                {TABS.find(t => t.key === activeTab)?.icon || "📋"}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#2C2C2A" }}>
                {TABS.find(t => t.key === activeTab)?.label} Registry
              </h3>
              <p style={{ fontSize: 12.5, color: "#888780", maxWidth: 440, margin: "10px auto 20px auto", lineHeight: 1.5 }}>
                This QMS panel logs compliance indicators and scheduled validations in accordance with ISO 15189:2022 and laboratory policy.
              </p>
              
              {/* Form template */}
              <div style={{ maxWidth: 500, margin: "0 auto", textAlign: "left", background: "#FAFAF8", padding: 20, borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F6E56", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 6, marginBottom: 12 }}>
                  Log Verification Record
                </div>
                <div style={S.grid(2)}>
                  <div>
                    <label style={S.label}>Date Performed</label>
                    <input type="date" style={S.inp} defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div>
                    <label style={S.label}>Technician / Operator</label>
                    <input type="text" style={S.inp} defaultValue={loggedInUser || ""} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={S.label}>Verification Status / Results</label>
                  <select style={S.inp}>
                    <option value="Pass">Pass - Complies with requirements</option>
                    <option value="Outlier">Outlier - Action needed</option>
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Remarks / ISO Reference Clause</label>
                  <input type="text" style={S.inp} placeholder="e.g. Sterility check passed. ISO 15189 §6.6" />
                </div>
                <button style={S.btn()} onClick={() => showToast(`Log recorded for tab: ${activeTab}`)}>
                  💾 Save Entry to Logs
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "micro_quality_indicators" && (
          <QualityIndicatorsLog department="Microbiology" />
        )}
      </div>

      {/* TOAST DISPLAY */}
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}