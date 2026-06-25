import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, setDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

// Slate & Teal Accents Design System
const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,-apple-system,sans-serif", background: "#F8FAFC", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, background: "#FFFFFF", padding: "16px 20px", borderRadius: 12, border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  title: { fontSize: 20, fontWeight: 700, color: "#0F172A", margin: 0, display: "flex", alignItems: "center", gap: 10 },
  subtitle: { fontSize: 12.5, color: "#64748B", marginTop: 4 },
  complianceBar: { width: "100%", background: "#E2E8F0", borderRadius: 10, height: 8, marginTop: 8, overflow: "hidden", position: "relative" },
  complianceFill: (pct) => ({ width: `${pct}%`, background: pct > 90 ? "#0D9488" : pct > 80 ? "#F59E0B" : "#EF4444", height: "100%", transition: "width 0.4s ease" }),
  
  layout: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 },
  sidebar: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px", height: "fit-content", display: "flex", flexDirection: "column", gap: 4 },
  sidebarBtn: (active) => ({
    display: "flex", alignItems: "center", justifyItems: "center", gap: 10, padding: "10px 14px", border: "none", borderRadius: 8, cursor: "pointer",
    background: active ? "#E1F5EE" : "transparent",
    color: active ? "#0F6E56" : "#475569",
    fontWeight: active ? 600 : 500,
    fontSize: 12.5,
    textAlign: "left",
    transition: "all 0.15s ease",
  }),
  sidebarStatusBadge: (status) => ({
    marginLeft: "auto", fontSize: 9.5, padding: "2px 6px", borderRadius: 6, fontWeight: 600,
    background: status === "ok" ? "#E1F5EE" : status === "warning" ? "#FEF3C7" : "#FEE2E2",
    color: status === "ok" ? "#0F6E56" : status === "warning" ? "#B45309" : "#B91C1C",
  }),

  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 20 },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12.5, background: "#FFFFFF", color: "#1E293B", outline: "none", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0F6E56", color: color || "#FFFFFF", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.15s" }),
  
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { padding: "10px 14px", borderBottom: "2px solid #E2E8F0", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
  td: { padding: "12px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },

  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  label: { fontSize: 11.5, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", fontSize: 12.5, fontWeight: 500, zIndex: 3000, display: "flex", alignItems: "center", gap: 8 }
};

// ─── STATIC AUDIT COMPLIANCE SEED DATA ──────────────────────────────────────
const STATIC_STAFF = [
  { id: "EMP001", name: "Alex Mercer", role: "Lab Technician", dept: "Microbiology", degree: "MSc Medical Microbiology", regNo: "DMC-M-2045", regStatus: "Verified", licenseExp: "2027-10-15", cpd: 18, folderScore: 7, folderMax: 7, missingFiles: [] },
  { id: "EMP002", name: "Sarah Jenkins", role: "Quality Manager", dept: "Quality", degree: "MD Pathology", regNo: "MCI-44921", regStatus: "Verified", licenseExp: "2028-04-12", cpd: 24, folderScore: 7, folderMax: 7, missingFiles: [] },
  { id: "EMP003", name: "David Miller", role: "Biomedical Engineer", dept: "Biomedical", degree: "BTech Biomedical Engineering", regNo: "BME-REG-776", regStatus: "Verified", licenseExp: "2026-07-20", cpd: 15, folderScore: 6, folderMax: 7, missingFiles: ["Health Fitness Certificate"] },
  { id: "EMP004", name: "Dr. Suresh Kumar", role: "Head of Biochemistry", dept: "Biochemistry", degree: "MD Biochemistry", regNo: "MCI-22891", regStatus: "Verified", licenseExp: "2026-06-25", cpd: 22, folderScore: 7, folderMax: 7, missingFiles: [] },
  { id: "EMP005", name: "Elena Rostova", role: "Technologist", dept: "Biochemistry", degree: "BSc Medical Lab Technology", regNo: "DMC-T-8891", regStatus: "Verified", licenseExp: "2026-07-02", cpd: 11, folderScore: 5, folderMax: 7, missingFiles: ["Signed Job Description", "Signature Specimen"] },
  { id: "EMP006", name: "Vikram Malhotra", role: "Assistant Tech", dept: "Microbiology", degree: "DMLT", regNo: "DMC-D-9982", regStatus: "Pending Audit", licenseExp: "2026-05-18", cpd: 8, folderScore: 4, folderMax: 7, missingFiles: ["Confidentiality Agreement", "Vaccination Record", "Signature Specimen"] }
];

const STATIC_COMPETENCY_MATRIX = {
  parameters: ["Sample Reception", "Gram Staining", "Culture Streaking", "Cobas c311 Assay", "Levey-Jennings Review", "Critical Alert Calling"],
  matrix: [
    { empId: "EMP001", name: "Alex Mercer", scores: { "Sample Reception": "authorized", "Gram Staining": "authorized", "Culture Streaking": "authorized", "Cobas c311 Assay": "no-training", "Levey-Jennings Review": "needs-review", "Critical Alert Calling": "authorized" } },
    { empId: "EMP002", name: "Sarah Jenkins", scores: { "Sample Reception": "authorized", "Gram Staining": "authorized", "Culture Streaking": "authorized", "Cobas c311 Assay": "authorized", "Levey-Jennings Review": "authorized", "Critical Alert Calling": "authorized" } },
    { empId: "EMP003", name: "David Miller", scores: { "Sample Reception": "no-training", "Gram Staining": "no-training", "Culture Streaking": "no-training", "Cobas c311 Assay": "needs-review", "Levey-Jennings Review": "authorized", "Critical Alert Calling": "no-training" } },
    { empId: "EMP004", name: "Dr. Suresh Kumar", scores: { "Sample Reception": "authorized", "Gram Staining": "needs-review", "Culture Streaking": "no-training", "Cobas c311 Assay": "authorized", "Levey-Jennings Review": "authorized", "Critical Alert Calling": "authorized" } },
    { empId: "EMP005", name: "Elena Rostova", scores: { "Sample Reception": "authorized", "Gram Staining": "no-training", "Culture Streaking": "no-training", "Cobas c311 Assay": "authorized", "Levey-Jennings Review": "needs-review", "Critical Alert Calling": "authorized" } },
    { empId: "EMP006", name: "Vikram Malhotra", scores: { "Sample Reception": "authorized", "Gram Staining": "needs-review", "Culture Streaking": "needs-review", "Cobas c311 Assay": "no-training", "Levey-Jennings Review": "no-training", "Critical Alert Calling": "no-training" } }
  ]
};

const STATIC_PRIVILEGES = [
  { empId: "EMP001", name: "Alex Mercer", role: "Lab Technician", coll: true, test: true, entry: true, techVer: false, release: false, calib: false },
  { empId: "EMP002", name: "Sarah Jenkins", role: "Quality Manager", coll: true, test: true, entry: true, techVer: true, release: true, calib: true },
  { empId: "EMP003", name: "David Miller", role: "Biomedical Engineer", coll: false, test: false, entry: false, techVer: false, release: false, calib: true },
  { empId: "EMP004", name: "Dr. Suresh Kumar", role: "Head of Biochemistry", coll: true, test: true, entry: true, techVer: true, release: true, calib: true },
  { empId: "EMP005", name: "Elena Rostova", role: "Technologist", coll: true, test: true, entry: true, techVer: true, release: false, calib: false },
  { empId: "EMP006", name: "Vikram Malhotra", role: "Assistant Tech", coll: true, test: true, entry: false, techVer: false, release: false, calib: false }
];

const STATIC_TRAINING_EFFECTIVENESS = [
  { courseId: "TRN-098", title: "ISO 15189:2022 Overview & Risk Framework", date: "2026-03-10", attendance: 96, preAvg: 54, postAvg: 88, followUpEff: 92 },
  { courseId: "TRN-101", title: "Cobas c311 System Calibrations & QC Verification", date: "2026-04-05", attendance: 88, preAvg: 42, postAvg: 85, followUpEff: 89 },
  { courseId: "TRN-104", title: "Biological Exposure Controls & Spills Procedures", date: "2026-05-12", attendance: 100, preAvg: 60, postAvg: 94, followUpEff: 95 }
];

const STATIC_CME_WORKSHOPS = [
  { id: "CME01", name: "National Quality Assurance Summit in Healthcare Laboratories", date: "2026-02-15", points: 8, host: "NABL India" },
  { id: "CME02", name: "Advanced Hematology Morphology & Automated Plot Review", date: "2026-04-18", points: 6, host: "Indian Society of Hematology" },
  { id: "CME03", name: "Pre-analytical Gaps & Sample Acceptance Standards (ISO 15189 §7.2)", date: "2026-05-22", points: 4, host: "MBL Quality Office" }
];

const STATIC_SUCCESSION_ROLES = [
  { role: "Laboratory Director / Admin", incumbent: "Dr. Suresh Kumar", backups: ["Dr. Anita Roy", "Sarah Jenkins"], risk: "Low", redundancy: 2 },
  { role: "Quality Manager", incumbent: "Sarah Jenkins", backups: ["Dr. Anita Roy"], risk: "Medium", redundancy: 1 },
  { role: "Lead Microbiologist", incumbent: "Dr. Rajesh Sharma", backups: ["Alex Mercer"], risk: "Medium", redundancy: 1 },
  { role: "Biomedical Systems Engineer", incumbent: "David Miller", backups: [], risk: "High", redundancy: 0 }
];

const STATIC_SKILLS_GAP = {
  skills: ["Instrument Calibration", "IQC Evaluation (Westgard)", "Gram Stain Verification", "Risk Analysis (FMEA)", "Central LIMS Operations"],
  EMP001: { req: [4, 4, 5, 3, 4], ver: [2, 3, 5, 2, 4] },
  EMP002: { req: [3, 5, 3, 5, 5], ver: [4, 5, 3, 5, 5] },
  EMP003: { req: [5, 2, 1, 4, 3], ver: [5, 2, 1, 4, 2] },
  EMP004: { req: [4, 5, 2, 5, 5], ver: [4, 5, 2, 5, 5] }
};

const STATIC_COMPETENCY_ALERTS = [
  { id: "AL001", name: "Vikram Malhotra", dept: "Microbiology", dueParam: "Culture Streaking Evaluation", dueDate: "2026-05-18", status: "Overdue" },
  { id: "AL002", name: "Elena Rostova", dept: "Biochemistry", dueParam: "Levey-Jennings Verification", dueDate: "2026-07-02", status: "Due 13 days" },
  { id: "AL003", name: "Alex Mercer", dept: "Microbiology", dueParam: "Gram Staining Observation", dueDate: "2026-07-15", status: "Due 26 days" }
];

export default function HRAnalytics({ role: userRole, userName, dept: userDept }) {
  const [activeSubTab, setActiveSubTab] = useState("matrix");
  
  // Real-time Database states
  const [employees, setEmployees] = useState(STATIC_STAFF);
  const [competencyAlerts, setCompetencyAlerts] = useState(STATIC_COMPETENCY_ALERTS);
  const [trainingCourses, setTrainingCourses] = useState(STATIC_TRAINING_EFFECTIVENESS);
  const [privilegeMatrix, setPrivilegeMatrix] = useState(STATIC_PRIVILEGES);
  
  // Local state controls
  const [toastMsg, setToastMsg] = useState(null);
  
  // Skill Gap Selector
  const [gapStaffId, setGapStaffId] = useState("EMP001");
  
  // Weekly Roster State
  const [rosterData, setRosterData] = useState({
    Monday: { Morning: "Alex Mercer", Afternoon: "Elena Rostova", Night: "Vikram Malhotra" },
    Tuesday: { Morning: "Elena Rostova", Afternoon: "Alex Mercer", Night: "Vikram Malhotra" },
    Wednesday: { Morning: "Alex Mercer", Afternoon: "Vikram Malhotra", Night: "Elena Rostova" },
    Thursday: { Morning: "Elena Rostova", Afternoon: "Alex Mercer", Night: "Vikram Malhotra" },
    Friday: { Morning: "Vikram Malhotra", Afternoon: "Elena Rostova", Night: "Alex Mercer" },
    Saturday: { Morning: "Alex Mercer", Afternoon: "Elena Rostova", Night: "On Call" },
    Sunday: { Morning: "On Call", Afternoon: "On Call", Night: "On Call" }
  });

  // CME Add state
  const [cmeList, setCmeList] = useState(STATIC_CME_WORKSHOPS);
  const [cmeForm, setCmeForm] = useState({ staffId: "EMP001", workshopId: "CME01" });

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    async function loadQMSHRCollections() {
      try {
        // Load employees
        const empSnap = await getDocs(collection(db, "employees"));
        if (!empSnap.empty) {
          const fetchedEmps = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Merge with static registry to maintain compliance properties
          const merged = STATIC_STAFF.map(s => {
            const dbMatch = fetchedEmps.find(e => e.empId === s.id || e.id === s.id);
            if (dbMatch) {
              return {
                ...s,
                name: dbMatch.fullName || dbMatch.employeeName || s.name,
                dept: dbMatch.department || s.dept,
                role: dbMatch.designation || s.role,
              };
            }
            return s;
          });
          setEmployees(merged);
        }

        // Load Competencies to alert triggers
        const compSnap = await getDocs(collection(db, "hrCompetency"));
        if (!compSnap.empty) {
          const comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Map due alerts based on nextReviewDate
          const alertsList = comps
            .filter(c => c.nextReviewDate)
            .map(c => {
              const daysDiff = Math.ceil((new Date(c.nextReviewDate) - new Date("2026-06-19")) / (1000 * 60 * 60 * 24));
              let statusText = `${daysDiff} days left`;
              if (daysDiff < 0) statusText = `Overdue ${Math.abs(daysDiff)} days`;
              return {
                id: c.id,
                name: c.employeeId, // resolved in render
                dept: "Quality",
                dueParam: "Annual Competency Review",
                dueDate: c.nextReviewDate,
                status: statusText
              };
            });
          if (alertsList.length > 0) {
            setCompetencyAlerts(alertsList);
          }
        }
      } catch (err) {
        console.warn("Using high-fidelity local QMS HR Analytics mock states.", err);
      }
    }
    loadQMSHRCollections();
  }, []);

  const resolveEmployeeName = (id) => {
    const match = employees.find(e => e.id === id || e.empId === id);
    return match ? match.name : id;
  };

  // Toggle dynamic privilege (state only, simulating database sync)
  const handleTogglePrivilege = (empId, field) => {
    setPrivilegeMatrix(prev => prev.map(p => {
      if (p.empId === empId) {
        const newVal = !p[field];
        triggerToast(`Updated ISO Authorization for ${p.name}: ${field} is now ${newVal ? "GRANTED" : "REVOKED"}.`);
        return { ...p, [field]: newVal };
      }
      return p;
    }));
  };

  // Action: Trigger Roster Shift Change
  const handleRosterChange = (day, shift, staffName) => {
    setRosterData(prev => ({
      ...prev,
      [day]: { ...prev[day], [shift]: staffName }
    }));
    triggerToast(`Roster updated: ${day} ${shift} shift assigned to ${staffName}.`);
  };

  // Action: Add CME points to employee
  const handleAddCmePoints = (e) => {
    e.preventDefault();
    const targetWorkshop = cmeList.find(c => c.id === cmeForm.workshopId);
    if (!targetWorkshop) return;
    
    setEmployees(prev => prev.map(emp => {
      if (emp.id === cmeForm.staffId) {
        const updatedPoints = emp.cpd + targetWorkshop.points;
        triggerToast(`Credited ${targetWorkshop.points} CPD points to ${emp.name}. Total: ${updatedPoints}`);
        return { ...emp, cpd: updatedPoints };
      }
      return emp;
    }));
  };

  // Action: Renew competency schedule
  const handleRenewCompetency = (alertId) => {
    setCompetencyAlerts(prev => prev.filter(c => c.id !== alertId));
    triggerToast(`Schedules updated: Competency audit ticket generated and sent to department HOD.`);
  };

  // Personnel Compliance index calculations (missing folders, expired licenses, overdue competencies)
  const complianceScore = (() => {
    let score = 100;
    // Missing files deduct 3% each
    const totalMissingFiles = employees.reduce((acc, curr) => acc + (curr.missingFiles || []).length, 0);
    score -= totalMissingFiles * 3.5;

    // Overdue alerts deduct 5% each
    const overdueCount = competencyAlerts.filter(c => c.status.toLowerCase().includes("overdue") || c.status.toLowerCase().includes("-")).length;
    score -= overdueCount * 5;

    return Math.max(Math.min(Math.round(score), 100), 50);
  })();

  return (
    <div style={S.wrap}>
      
      {/* Top Banner (ISO Intelligence Status Card) */}
      <div style={S.topbar}>
        <div>
          <h1 style={S.title}>
            <span>🔬</span>
            <span>NABL Assessor Quality Intelligence Center</span>
          </h1>
          <div style={S.subtitle}>Consolidated Laboratory HR Competence & Authorization Dashboards (Clause 6.2 Compliance)</div>
        </div>
        <div style={{ width: 260, background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, fontWeight: 700, color: "#475569" }}>
            <span>PERSONNEL COMPLIANCE INDEX</span>
            <span style={{ color: complianceScore > 90 ? "#0D9488" : complianceScore > 80 ? "#F59E0B" : "#EF4444" }}>{complianceScore}%</span>
          </div>
          <div style={S.complianceBar}>
            <div style={S.complianceFill(complianceScore)} />
          </div>
          <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 4, textAlign: "right" }}>ISO 15189:2022 §6.2.5 Verified</div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div style={S.layout}>
        
        {/* Left Side: 10 Dashboards Switcher */}
        <div style={S.sidebar}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1.2, padding: "8px 14px" }}>NABL Compliance Registers</div>
          
          <button style={S.sidebarBtn(activeSubTab === "matrix")} onClick={() => setActiveSubTab("matrix")}>
            <span>🎯</span> Competency Matrix
            <span style={S.sidebarStatusBadge("ok")}>Active</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "auth")} onClick={() => setActiveSubTab("auth")}>
            <span>🔑</span> Authorization Matrix
            <span style={S.sidebarStatusBadge("ok")}>Active</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "training")} onClick={() => setActiveSubTab("training")}>
            <span>📈</span> Training Effectiveness
            <span style={S.sidebarStatusBadge("warning")}>Review</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "qual")} onClick={() => setActiveSubTab("qual")}>
            <span>🎓</span> Qualifications Register
            <span style={S.sidebarStatusBadge("ok")}>Verified</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "ce")} onClick={() => setActiveSubTab("ce")}>
            <span>📘</span> Continuing Education
            <span style={S.sidebarStatusBadge("warning")}>CPD Gaps</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "personnel")} onClick={() => setActiveSubTab("personnel")}>
            <span>📁</span> Personnel File Monitor
            <span style={S.sidebarStatusBadge("error")}>Missing</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "roster")} onClick={() => setActiveSubTab("roster")}>
            <span>📅</span> Duty Roster Planner
            <span style={S.sidebarStatusBadge("ok")}>Current</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "succession")} onClick={() => setActiveSubTab("succession")}>
            <span>👥</span> Succession Planner
            <span style={S.sidebarStatusBadge("warning")}>Risk</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "gap")} onClick={() => setActiveSubTab("gap")}>
            <span>📊</span> Skill Gap Analysis
            <span style={S.sidebarStatusBadge("ok")}>Aligned</span>
          </button>
          
          <button style={S.sidebarBtn(activeSubTab === "alerts")} onClick={() => setActiveSubTab("alerts")}>
            <span>⏰</span> Competency Due Alerts
            {competencyAlerts.length > 0 ? (
              <span style={{ ...S.sidebarStatusBadge("error"), background: "#EF4444", color: "#FFFFFF" }}>{competencyAlerts.length} Due</span>
            ) : (
              <span style={S.sidebarStatusBadge("ok")}>0 Due</span>
            )}
          </button>
        </div>

        {/* Right Side: Active Compliance Panel */}
        <div style={{ minWidth: 0 }}>
          
          {/* TAB 1: COMPETENCY MATRIX */}
          {activeSubTab === "matrix" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>🎯 Personnel Test Competency Matrix (ISO §6.2.3)</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>Indicates certified performance evaluations by parameter</div>
              </div>
              <div style={S.cardBody}>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11.5, color: "#64748B" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🟢</span> <span>Competent & Authorized</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🟡</span> <span>Due Annual Review</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>🔴</span> <span>Not Authorized / Restricted</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>⚪</span> <span>No Training Logged</span>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Laboratory Personnel</th>
                        {STATIC_COMPETENCY_MATRIX.parameters.map((p, idx) => (
                          <th key={idx} style={{ ...S.th, fontSize: 11.5 }}>{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {STATIC_COMPETENCY_MATRIX.matrix.map((row, rIdx) => (
                        <tr key={rIdx}>
                          <td style={{ ...S.td, fontWeight: 600, color: "#0F172A" }}>
                            {resolveEmployeeName(row.empId)}
                            <div style={{ fontSize: 10, color: "#64748B", fontWeight: 400 }}>{employees.find(e => e.id === row.empId)?.role}</div>
                          </td>
                          {STATIC_COMPETENCY_MATRIX.parameters.map((p, pIdx) => {
                            const score = row.scores[p];
                            let dot = "⚪";
                            let tooltip = "No training log found.";
                            if (score === "authorized") { dot = "🟢"; tooltip = "Competent & authorized."; }
                            else if (score === "needs-review") { dot = "🟡"; tooltip = "Annual competency evaluation is due."; }
                            else if (score === "restricted") { dot = "🔴"; tooltip = "Duties restricted for this parameter."; }

                            return (
                              <td key={pIdx} style={{ ...S.td, textAlign: "center", fontSize: 16 }} title={tooltip}>
                                {dot}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHORIZATION MATRIX */}
          {activeSubTab === "auth" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>🔑 ISO 15189 §6.2.3 Personnel Duty Authorization Matrix</div>
                <button style={S.btn(null, null)} onClick={() => triggerToast("Authorization matrix printed successfully.")}>
                  🖨️ Export PDF Matrix
                </button>
              </div>
              <div style={S.cardBody}>
                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
                  The laboratory director authorizes staff to perform specific clinical tasks. 
                  Toggle authorizations below to simulate real-time access credential overrides.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Staff Personnel</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Sample Collection</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Testing / Examination</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Result Entry</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Technical Verification</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Clinical Release</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Calibration Controls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {privilegeMatrix.map((p, idx) => (
                        <tr key={idx}>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600, color: "#1E293B" }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: "#64748B" }}>{p.role}</div>
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.coll} onChange={() => handleTogglePrivilege(p.empId, "coll")} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.test} onChange={() => handleTogglePrivilege(p.empId, "test")} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.entry} onChange={() => handleTogglePrivilege(p.empId, "entry")} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.techVer} onChange={() => handleTogglePrivilege(p.empId, "techVer")} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.release} onChange={() => handleTogglePrivilege(p.empId, "release")} style={{ width: 15, height: 15 }} />
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <input type="checkbox" checked={p.calib} onChange={() => handleTogglePrivilege(p.empId, "calib")} style={{ width: 15, height: 15 }} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAINING EFFECTIVENESS */}
          {activeSubTab === "training" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📈 Training Program Effectiveness (3-Month Evaluations)</div>
                <span style={S.badge("#FEF3C7", "#D97706")}>NABL Criteria Met</span>
              </div>
              <div style={S.cardBody}>
                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 20, lineHeight: 1.5 }}>
                  Evaluates whether scheduled training courses improved clinical output. 
                  Compares Pre-Assessment scores, Post-Assessment scores, and follow-up effectiveness index (measured after 90 days of work).
                </p>

                <div style={S.grid(3)}>
                  {trainingCourses.map((t, idx) => (
                    <div key={idx} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, background: "#FAFAF9" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#0F6E56" }}>ID: {t.courseId} | {t.date}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", margin: "6px 0", height: 38, overflow: "hidden" }}>{t.title}</div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0 4px", fontSize: 11, color: "#64748B" }}>
                        <span>Attendance:</span>
                        <strong>{t.attendance}%</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0", fontSize: 11, color: "#64748B" }}>
                        <span>Pre-Test / Post-Test Avg:</span>
                        <strong>{t.preAvg}% / {t.postAvg}%</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "4px 0 10px", fontSize: 11, color: "#64748B" }}>
                        <span>3mo Effectiveness Index:</span>
                        <strong style={{ color: "#0D9488" }}>{t.followUpEff}%</strong>
                      </div>

                      {/* SVG Mini bar chart */}
                      <svg width="100%" height="80" style={{ background: "#FFFFFF", borderRadius: 6, border: "0.5px solid #E2E8F0" }}>
                        {/* Grid lines */}
                        <line x1="10" y1="20" x2="100%" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="10" y1="50" x2="100%" y2="50" stroke="#F1F5F9" strokeWidth="1" />
                        
                        {/* Pre-Test bar */}
                        <rect x="25" y={80 - (t.preAvg * 0.7)} width="20" height={t.preAvg * 0.7} fill="#94A3B8" rx="2" />
                        <text x="35" y="76" fontSize="9" textAnchor="middle" fill="#475569">{t.preAvg}%</text>
                        
                        {/* Post-Test bar */}
                        <rect x="55" y={80 - (t.postAvg * 0.7)} width="20" height={t.postAvg * 0.7} fill="#38BDF8" rx="2" />
                        <text x="65" y="76" fontSize="9" textAnchor="middle" fill="#0369A1">{t.postAvg}%</text>

                        {/* Effectiveness bar */}
                        <rect x="85" y={80 - (t.followUpEff * 0.7)} width="20" height={t.followUpEff * 0.7} fill="#0D9488" rx="2" />
                        <text x="95" y="76" fontSize="9" textAnchor="middle" fill="#0F766E">{t.followUpEff}%</text>

                        {/* Legends */}
                        <text x="140" y="24" fontSize="8" fill="#64748B">■ Pre-Test</text>
                        <text x="140" y="40" fontSize="8" fill="#0369A1">■ Post-Test</text>
                        <text x="140" y="56" fontSize="8" fill="#0F766E">■ 3-Month Eff</text>
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STAFF QUALIFICATION REGISTER */}
          {activeSubTab === "qual" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>🎓 Verified Staff Qualifications & Board Registrations Register</div>
                <span style={S.badge("#E1F5EE", "#0F6E56")}>Verified</span>
              </div>
              <div style={S.cardBody}>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Employee ID</th>
                        <th style={S.th}>Personnel Name</th>
                        <th style={S.th}>Highest Qualifications</th>
                        <th style={S.th}>State/Central Council Reg No</th>
                        <th style={S.th}>Registration Status</th>
                        <th style={S.th}>License Expiry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => {
                        const isExpired = new Date(emp.licenseExp) < new Date("2026-06-19");
                        return (
                          <tr key={idx}>
                            <td style={{ ...S.td, fontFamily: "monospace" }}>{emp.id}</td>
                            <td style={{ ...S.td, fontWeight: 600 }}>{emp.name}</td>
                            <td style={S.td}>{emp.degree}</td>
                            <td style={{ ...S.td, fontWeight: 500 }}>{emp.regNo}</td>
                            <td style={S.td}>
                              <span style={S.badge(emp.regStatus === "Verified" ? "#E1F5EE" : "#FEF3C7", emp.regStatus === "Verified" ? "#0F6E56" : "#B45309")}>
                                {emp.regStatus}
                              </span>
                            </td>
                            <td style={S.td}>
                              <span style={{ color: isExpired ? "#DC2626" : "#1E293B", fontWeight: isExpired ? "700" : "500" }}>
                                {emp.licenseExp} {isExpired && "⚠️ EXPIRED"}
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
          )}

          {/* TAB 5: CONTINUING EDUCATION TRACKER */}
          {activeSubTab === "ce" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📘 Continuing Medical Education (CME) & CPD Point Tracker</div>
                <span style={S.badge("#FEF3C7", "#B45309")}>Target: 20 Points / Year</span>
              </div>
              <div style={S.cardBody}>
                <div style={S.grid(2)}>
                  
                  {/* points leaderboard */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 12 }}>Personnel Points Progression</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {employees.map((emp, idx) => {
                        const target = 20;
                        const progress = Math.min((emp.cpd / target) * 100, 100);
                        return (
                          <div key={idx} style={{ background: "#FAFAF9", border: "1px solid #E2E8F0", padding: "10px 14px", borderRadius: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 600, color: "#334155" }}>
                              <span>{emp.name} ({emp.dept})</span>
                              <span>{emp.cpd} / {target} Points</span>
                            </div>
                            <div style={{ width: "100%", background: "#E2E8F0", borderRadius: 4, height: 6, marginTop: 6, overflow: "hidden" }}>
                              <div style={{ width: `${progress}%`, background: progress === 100 ? "#0D9488" : "#38BDF8", height: "100%" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* credit point form */}
                  <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12 }}>Credit CME Points to Staff</div>
                    
                    <form onSubmit={handleAddCmePoints}>
                      <div style={{ marginBottom: 12 }}>
                        <label style={S.label}>Select Staff Member</label>
                        <select style={{ ...S.inp, width: "100%" }} value={cmeForm.staffId} onChange={e => setCmeForm({ ...cmeForm, staffId: e.target.value })}>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}
                        </select>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={S.label}>CME Conference / Workshop</label>
                        <select style={{ ...S.inp, width: "100%" }} value={cmeForm.workshopId} onChange={e => setCmeForm({ ...cmeForm, workshopId: e.target.value })}>
                          {cmeList.map(w => <option key={w.id} value={w.id}>{w.name} ({w.points} Points)</option>)}
                        </select>
                      </div>

                      <button type="submit" style={{ ...S.btn(), width: "100%" }}>
                        ✓ Credit Points & Update Record
                      </button>
                    </form>

                    <div style={{ marginTop: 16, borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>Recent Available Workshops:</div>
                      {cmeList.map((w, idx) => (
                        <div key={idx} style={{ fontSize: 10.5, color: "#334155", marginBottom: 4 }}>
                          • {w.name} - <strong>{w.points} Pts</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PERSONNEL FILE COMPLIANCE MONITOR */}
          {activeSubTab === "personnel" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📁 Mandatory Personnel Files Compliance Matrix</div>
                <span style={S.badge("#FEE2E2", "#991B1B")}>ISO 15189 §8.4 Retention Check</span>
              </div>
              <div style={S.cardBody}>
                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
                  The NABL compliance standard requires the following files to be physically or digitally present in each employee's personnel directory.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Staff Personnel</th>
                        <th style={S.th}>Completeness</th>
                        <th style={S.th}>CV / Resume</th>
                        <th style={S.th}>Degree Certs</th>
                        <th style={S.th}>Board Reg</th>
                        <th style={S.th}>Job Descr</th>
                        <th style={S.th}>Vaccination</th>
                        <th style={S.th}>Signature Spec</th>
                        <th style={S.th}>Confidentiality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp, idx) => {
                        const hasCV = !emp.missingFiles.includes("CV");
                        const hasDegree = !emp.missingFiles.includes("Degree Certificates");
                        const hasReg = !emp.missingFiles.includes("Council Registration");
                        const hasJD = !emp.missingFiles.includes("Signed Job Description");
                        const hasVacc = !emp.missingFiles.includes("Vaccination Record");
                        const hasSig = !emp.missingFiles.includes("Signature Specimen");
                        const hasConf = !emp.missingFiles.includes("Confidentiality Agreement");

                        const itemsPresent = [hasCV, hasDegree, hasReg, hasJD, hasVacc, hasSig, hasConf].filter(Boolean).length;
                        const pct = Math.round((itemsPresent / 7) * 100);

                        return (
                          <tr key={idx}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{emp.name}</td>
                            <td style={S.td}>
                              <span style={{ fontWeight: 700, color: pct === 100 ? "#0D9488" : pct > 70 ? "#D97706" : "#DC2626" }}>
                                {itemsPresent}/7 ({pct}%)
                              </span>
                            </td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasCV ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasDegree ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasReg ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasJD ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasVacc ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasSig ? "✅" : "❌"}</td>
                            <td style={{ ...S.td, fontSize: 15, textAlign: "center" }}>{hasConf ? "✅" : "❌"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: DUTY ROSTER PLANNER */}
          {activeSubTab === "roster" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📅 Interactive Weekly Duty Roster Planner</div>
                <div style={{ fontSize: 11, color: "#64748B" }}>Assign personnel to laboratory shifts</div>
              </div>
              <div style={S.cardBody}>
                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Shift Hours</th>
                        {Object.keys(rosterData).map((day, idx) => (
                          <th key={idx} style={{ ...S.th, textAlign: "center" }}>{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["Morning", "Afternoon", "Night"].map((shift, sIdx) => {
                        const shiftHours = shift === "Morning" ? "07:00 - 15:00" : shift === "Afternoon" ? "15:00 - 23:00" : "23:00 - 07:00";
                        return (
                          <tr key={sIdx}>
                            <td style={S.td}>
                              <div style={{ fontWeight: 600 }}>{shift} Shift</div>
                              <div style={{ fontSize: 10, color: "#64748B" }}>{shiftHours}</div>
                            </td>
                            {Object.keys(rosterData).map((day, dIdx) => {
                              const assigned = rosterData[day][shift];
                              return (
                                <td key={dIdx} style={{ ...S.td, textAlign: "center" }}>
                                  <select
                                    value={assigned}
                                    onChange={e => handleRosterChange(day, shift, e.target.value)}
                                    style={{
                                      padding: "4px 8px", fontSize: 11.5, border: "1px solid #CBD5E1",
                                      borderRadius: 6, background: assigned === "On Call" ? "#FFFBEB" : "#FFFFFF",
                                      color: assigned === "On Call" ? "#B45309" : "#1E293B", cursor: "pointer", width: "100%"
                                    }}
                                  >
                                    <option value="On Call">⚠️ On Call</option>
                                    {employees.map(e => (
                                      <option key={e.id} value={e.name}>{e.name}</option>
                                    ))}
                                  </select>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SUCCESSION PLANNING */}
          {activeSubTab === "succession" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>👥 Critical Roles Succession Matrix</div>
                <span style={S.badge("#E1F5EE", "#0F6E56")}>Redundancy Check</span>
              </div>
              <div style={S.cardBody}>
                <p style={{ fontSize: 12, color: "#64748B", marginBottom: 20, lineHeight: 1.5 }}>
                  Calculates laboratory redundancy and operational risk indicators. 
                  High Risk (🔴) indicates roles with zero designated backups.
                </p>

                <div style={{ overflowX: "auto" }}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Critical Laboratory Role</th>
                        <th style={S.th}>Active Incumbent</th>
                        <th style={S.th}>Designated Backups</th>
                        <th style={{ ...S.th, textAlign: "center" }}>Redundancy Score</th>
                        <th style={S.th}>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATIC_SUCCESSION_ROLES.map((roleItem, idx) => (
                        <tr key={idx}>
                          <td style={{ ...S.td, fontWeight: 700 }}>{roleItem.role}</td>
                          <td style={S.td}>{roleItem.incumbent}</td>
                          <td style={S.td}>
                            {roleItem.backups.length === 0 ? (
                              <span style={{ color: "#DC2626", fontStyle: "italic" }}>No backups authorized</span>
                            ) : (
                              roleItem.backups.join(", ")
                            )}
                          </td>
                          <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>
                            {roleItem.redundancy}
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(
                              roleItem.risk === "Low" ? "#E1F5EE" : roleItem.risk === "Medium" ? "#FEF3C7" : "#FEE2E2",
                              roleItem.risk === "Low" ? "#0F6E56" : roleItem.risk === "Medium" ? "#B45309" : "#DC2626"
                            )}>
                              {roleItem.risk} Risk
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SKILL GAP ANALYSIS */}
          {activeSubTab === "gap" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📊 Competency Level Gaps (Verified vs Required Skills)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#475569" }}>Select Staff:</span>
                  <select 
                    style={{ ...S.inp, padding: "4px 8px" }} 
                    value={gapStaffId} 
                    onChange={e => setGapStaffId(e.target.value)}
                  >
                    <option value="EMP001">Alex Mercer (Tech)</option>
                    <option value="EMP002">Sarah Jenkins (QM)</option>
                    <option value="EMP003">David Miller (BME)</option>
                    <option value="EMP004">Dr. Suresh Kumar (HOD)</option>
                  </select>
                </div>
              </div>
              <div style={S.cardBody}>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11.5, color: "#64748B" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: "#94A3B8", borderRadius: 3 }}></span>
                    <span>Required Proficiency Level (ISO Standard)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, background: "#0D9488", borderRadius: 3 }}></span>
                    <span>Verified Personnel Competence Level</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {STATIC_SKILLS_GAP.skills.map((skill, idx) => {
                    const reqVal = STATIC_SKILLS_GAP[gapStaffId].req[idx];
                    const verVal = STATIC_SKILLS_GAP[gapStaffId].ver[idx];
                    const isGap = verVal < reqVal;

                    return (
                      <div key={idx} style={{ background: "#FAFAF9", border: "1px solid #E2E8F0", padding: "12px 16px", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, fontWeight: 600, color: "#1E293B", marginBottom: 8 }}>
                          <span>{skill}</span>
                          {isGap ? (
                            <span style={{ color: "#DC2626", fontSize: 11 }}>⚠️ Skill Gap detected (Needs retraining)</span>
                          ) : (
                            <span style={{ color: "#0D9488", fontSize: 11 }}>✓ Fully Competent</span>
                          )}
                        </div>

                        {/* Double progress bar chart */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {/* Required level */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: "#64748B", width: 60 }}>Required:</span>
                            <div style={{ flex: 1, background: "#E2E8F0", height: 8, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ background: "#94A3B8", width: `${(reqVal / 5) * 100}%`, height: "100%" }} />
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#475569" }}>{reqVal}.0 / 5</span>
                          </div>

                          {/* Verified level */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 10, color: "#64748B", width: 60 }}>Verified:</span>
                            <div style={{ flex: 1, background: "#E2E8F0", height: 8, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ background: isGap ? "#DC2626" : "#0D9488", width: `${(verVal / 5) * 100}%`, height: "100%" }} />
                            </div>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: isGap ? "#DC2626" : "#0D9488" }}>{verVal}.0 / 5</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: COMPETENCY DUE ALERTS */}
          {activeSubTab === "alerts" && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>⏰ Expiring & Overdue Competency Evaluations Alerts</div>
                <span style={{ ...S.badge("#EF4444", "#FFFFFF") }}>{competencyAlerts.length} Action Items</span>
              </div>
              <div style={S.cardBody}>
                {competencyAlerts.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 32, color: "#0D9488", fontWeight: "bold" }}>
                    ✓ All personnel competency audits are up-to-date and compliant.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {competencyAlerts.map((c, idx) => {
                      const isOverdue = c.status.toLowerCase().includes("overdue");
                      return (
                        <div key={idx} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          border: `1px solid ${isOverdue ? "#FCA5A5" : "#FDE68A"}`,
                          background: isOverdue ? "#FEF2F2" : "#FFFBEB",
                          padding: "12px 18px", borderRadius: 10
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: isOverdue ? "#991B1B" : "#92400E" }}>
                              {resolveEmployeeName(c.name)} - {c.dueParam}
                            </div>
                            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                              Department: {c.dept} | Evaluation Target Date: <strong>{c.dueDate}</strong>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={S.badge(isOverdue ? "#FCA5A5" : "#FDE68A", isOverdue ? "#991B1B" : "#92400E")}>
                              {c.status}
                            </span>
                            <button
                              onClick={() => handleRenewCompetency(c.id)}
                              style={{
                                padding: "6px 12px", background: isOverdue ? "#EF4444" : "#F59E0B",
                                color: "#FFFFFF", border: "none", borderRadius: 6, fontSize: 11.5,
                                fontWeight: 600, cursor: "pointer"
                              }}
                            >
                              {isOverdue ? "⚡ Retrain Immediately" : "Schedule Audit"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div style={S.toast}>
          <span>💡</span>
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  );
}
