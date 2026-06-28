// HomePage.jsx
// MBL QMS — Central Intranet Landing Portal & Operational Dashboard
// Compliant with ISO 15189:2022 & ISO 27001:2022 standards

import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from "firebase/firestore";
import NCRForm from "./NonConformity/NCRForm";

const S = {
  navBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#0F172A", color: "#fff", position: "sticky", top: 0, zIndex: 100, borderBottom: "4px solid #0D9488", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" },
  logoSection: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  navTabs: { display: "flex", gap: 20, alignItems: "center" },
  navTabWrap: { position: "relative" },
  navTab: (active) => ({ color: active ? "#38BDF8" : "#E2E8F0", cursor: "pointer", fontSize: 12.5, fontWeight: 500, padding: "6px 10px", borderRadius: 4, transition: "all 0.2s ease" }),
  dropdown: { position: "absolute", top: "100%", left: 0, background: "#1E293B", border: "1px solid #334155", borderRadius: 8, boxShadow: "0 10px 15px rgba(0,0,0,0.3)", padding: 6, minWidth: 200, display: "flex", flexDirection: "column", gap: 4, zIndex: 110, marginTop: 8 },
  dropItem: { padding: "8px 12px", color: "#E2E8F0", borderRadius: 4, fontSize: 11.5, cursor: "pointer", background: "transparent", border: "none", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" },
  content: { background: "#F8FAFC", minHeight: "calc(100vh - 60px)", padding: "24px 32px" },
  banner: { background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)", borderRadius: 14, padding: "24px 32px", color: "#fff", position: "relative", marginBottom: 24, border: "1px solid #334155", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" },
  bannerTitle: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" },
  bannerSub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  secTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }),
  deptCard: (bg, border) => ({ background: "#fff", border: `1.5px solid ${border || "#E2E8F0"}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "all 0.2s ease" }),
  
  // Premium modal styling
  overlay: { position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", border: "1px solid #E2E8F0", animation: "modalScale 0.2s ease-out" },
  modalHeader: { padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F8FAFC", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 14, fontWeight: 700, color: "#0F172A" },
  modalBody: { padding: 20 },
  inp: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0D9488", color: color || "#FFF", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none" })
};

const ALL_30_DEPARTMENTS = [
  { key: "quality", name: "Quality Department", icon: "🛡️" },
  { key: "biochemistry", name: "Biochemistry", icon: "🧪" },
  { key: "microbiology", name: "Microbiology", icon: "🔬" },
  { key: "serology", name: "Serology", icon: "🩸" },
  { key: "haematology", name: "Haematology", icon: "🩸" },
  { key: "histopathology", name: "Histopathology & Cytopathology", icon: "🔬" },
  { key: "flowcytometry", name: "Flow Cytometry", icon: "🧬" },
  { key: "cytogenetics", name: "Cytogenetics", icon: "🧬" },
  { key: "clinicalpathology", name: "Clinical Pathology", icon: "🔬" },
  { key: "molecularbiology", name: "Molecular Biology", icon: "🧬" },
  { key: "moleculargenetics", name: "Molecular Genetics", icon: "🧬" },
  { key: "hr", name: "Human Resources (HR)", icon: "👥" },
  { key: "biomedical", name: "Biomedical Engineering", icon: "⚙️" },
  { key: "purchase", name: "Purchase Department", icon: "🛒" },
  { key: "maintenance", name: "Maintenance & Engineering", icon: "🛠️" },
  { key: "housekeeping", name: "Housekeeping & Sanitation", icon: "🧹" },
  { key: "it", name: "Information Technology (IT)", icon: "💻" },
  { key: "kitchen", name: "Kitchen & Dietary Services", icon: "🍳" },
  { key: "security", name: "Security Services", icon: "🛡️" },
  { key: "phlebotomy", name: "Phlebotomy (Blood Collection)", icon: "💉" },
  { key: "reception", name: "Reception & Front Office", icon: "🛎️" },
  { key: "backoffice", name: "Back Office Logistics", icon: "📦" },
  { key: "samplecollection", name: "Central Sample Collection", icon: "🏥" },
  { key: "telecalling", name: "Telecalling & Call Center", icon: "📞" },
  { key: "accounts", name: "Accounts & Finance", icon: "💵" },
  { key: "administration", name: "General Administration", icon: "🏢" },
  { key: "design", name: "Design & Media", icon: "🎨" },
  { key: "marketing", name: "Marketing & Sales", icon: "📈" },
  { key: "erpadmin", name: "ERP Administration", icon: "⚙️" },
  { key: "collection", name: "Outstation Collection Centers", icon: "🏥" }
];

export default function HomePage({ setActivePage, userName, userDept, userRole }) {
  const [activeTab, setActiveTab] = useState("portal"); // "portal" | "dashboard"
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dropdown States
  const [openDropdown, setOpenDropdown] = useState(null); // "intro" | "depts" | "actions" | "services" | "help" | null
  
  // Modal State
  const [activeModal, setActiveModal] = useState(null); // "history" | "achievements" | "about" | "capa_form" | "ncr_form" | "help_guide" | null
  const [modalSaving, setModalSaving] = useState(false);

  // Secure reader and department SOPs modal state
  const [viewingDoc, setViewingDoc] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [securityAlert, setSecurityAlert] = useState(null);

  // Profile and Security settings states
  const [profilePhone, setProfilePhone] = useState("");
  const [profileQuestion, setProfileQuestion] = useState("What was the name of your first pet?");
  const [profileAnswer, setProfileAnswer] = useState("");
  const [profileNewPwd, setProfileNewPwd] = useState("");
  const [profileConfirmPwd, setProfileConfirmPwd] = useState("");
  const [profileCurrentPwd, setProfileCurrentPwd] = useState("");
  const [reauthRequired, setReauthRequired] = useState(false);
  const [profileTab, setProfileTab] = useState("profile"); // "profile" | "password"
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const handleOpenSettings = async () => {
    setProfileSuccess("");
    setProfileError("");
    setProfileNewPwd("");
    setProfileConfirmPwd("");
    setProfileCurrentPwd("");
    setReauthRequired(false);
    setProfileTab("profile");
    setActiveModal("profile_settings");
    setProfileLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", auth.currentUser?.email || "")
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uDoc = snap.docs[0].data();
        setProfilePhone(uDoc.phone || "");
        setProfileQuestion(uDoc.securityQuestion || "What was the name of your first pet?");
        setProfileAnswer(uDoc.securityAnswer || "");
      }
    } catch (err) {
      console.error("Error fetching profile settings:", err);
    }
    setProfileLoading(false);
  };

  const handleSaveProfileSettings = async (e) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");
    setProfileLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", auth.currentUser?.email || "")
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setProfileError("Could not locate your user profile.");
        setProfileLoading(false);
        return;
      }
      const userDocRef = doc(db, "users", snap.docs[0].id);
      await updateDoc(userDocRef, {
        phone: profilePhone,
        securityQuestion: profileQuestion,
        securityAnswer: profileAnswer,
        updatedAt: serverTimestamp(),
      });
      setProfileSuccess("Profile security settings updated successfully.");
    } catch (err) {
      console.error(err);
      setProfileError("Failed to save profile settings. " + err.message);
    }
    setProfileLoading(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");
    
    if (profileNewPwd !== profileConfirmPwd) {
      setProfileError("Passwords do not match.");
      return;
    }
    if (profileNewPwd.length < 6) {
      setProfileError("Password must be at least 6 characters long.");
      return;
    }

    setProfileLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setProfileError("No active user session.");
        setProfileLoading(false);
        return;
      }

      await updatePassword(user, profileNewPwd);
      setProfileSuccess("Password updated successfully in Firebase Authentication!");
      setProfileNewPwd("");
      setProfileConfirmPwd("");
      setProfileCurrentPwd("");
      setReauthRequired(false);
    } catch (err) {
      console.error("Password update error:", err);
      if (err.code === "auth/requires-recent-login") {
        setReauthRequired(true);
        setProfileError("For security, password changes require recent authentication. Please enter your current password to confirm.");
      } else {
        setProfileError("Failed to update password: " + err.message);
      }
    }
    setProfileLoading(false);
  };

  const handleReauthenticate = async (e) => {
    e.preventDefault();
    setProfileSuccess("");
    setProfileError("");
    if (!profileCurrentPwd) {
      setProfileError("Please enter your current password.");
      return;
    }
    setProfileLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, profileCurrentPwd);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, profileNewPwd);
      setProfileSuccess("Password updated successfully after reauthentication!");
      setProfileNewPwd("");
      setProfileConfirmPwd("");
      setProfileCurrentPwd("");
      setReauthRequired(false);
    } catch (err) {
      console.error("Reauthentication/update error:", err);
      setProfileError("Reauthentication failed: Incorrect password or connection error.");
    }
    setProfileLoading(false);
  };

  const handleOpenQualityManual = async () => {
    setOpenDropdown(null);
    try {
      const docRef = doc(db, "header_documents", "quality_manual");
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setViewingDoc({ id: "quality_manual", ...snap.data() });
      } else {
        setViewingDoc({
          id: "quality_manual",
          title: "MBL Quality Manual",
          docNumber: "QM-MBL-001",
          version: "1.0",
          effectiveDate: new Date().toISOString().split("T")[0],
          docType: "PDF",
          description: "Standard compliance manual. Please upload the actual PDF file in ERP Admin > Document Master."
        });
      }
    } catch (err) {
      console.error("Error reading Quality Manual:", err);
      setViewingDoc({
        id: "quality_manual",
        title: "MBL Quality Manual",
        docNumber: "QM-MBL-001",
        version: "1.0",
        effectiveDate: new Date().toISOString().split("T")[0],
        docType: "PDF",
        description: "Standard compliance manual. Please upload the actual PDF file in ERP Admin > Document Master."
      });
    }
  };

  const handleOpenDeptSop = async (deptKey, deptName) => {
    setActiveModal(null);
    try {
      const docId = `${deptKey}_sop`;
      const docRef = doc(db, "header_documents", docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setViewingDoc({ id: docId, ...snap.data() });
      } else {
        setViewingDoc({
          id: docId,
          title: `${deptName} Standard Operating Procedure`,
          docNumber: `SOP-${deptKey.substring(0, 4).toUpperCase()}-001`,
          version: "1.0",
          effectiveDate: new Date().toISOString().split("T")[0],
          docType: "PDF",
          description: `Standard operating procedure for the ${deptName} department. Please upload the actual PDF file in ERP Admin > Document Master.`
        });
      }
    } catch (err) {
      console.error("Error reading department SOP:", err);
      setViewingDoc({
        id: `${deptKey}_sop`,
        title: `${deptName} Standard Operating Procedure`,
        docNumber: `SOP-${deptKey.substring(0, 4).toUpperCase()}-001`,
        version: "1.0",
        effectiveDate: new Date().toISOString().split("T")[0],
        docType: "PDF",
        description: `Standard operating procedure for the ${deptName} department. Please upload the actual PDF file in ERP Admin > Document Master.`
      });
    }
  };

  // Quick Forms inside Modals
  const [capaForm, setCapaForm] = useState({ source: "MD Portal", details: "" });
  const [ncrForm, setNcrForm] = useState({ department: "Administration", description: "", actionProposed: "", isoClause: "§8.4 Nonconforming Work" });
  const [suggestionForm, setSuggestionForm] = useState({ title: "", category: "Workflow Efficiency", details: "" });

  // Feature Flags & Connection State
  const [featureFlags, setFeatureFlags] = useState({});
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [comingSoonDept, setComingSoonDept] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quality Department shifted to first icon
  const departmentsList = [
    { key: "quality", label: "Quality Department", icon: "🛡️", color: "#065F46", bg: "#E6FDF5", desc: "CAPAs, NCR audits, documents & complaints" },
    { key: "biochemistry", label: "Biochemistry", icon: "🧪", color: "#1E3A8A", bg: "#DBEAFE", desc: "Spectrophotometry, Cobas c311 & controls" },
    { key: "microbiology", label: "Microbiology", icon: "🔬", color: "#065F46", bg: "#D1FAE5", desc: "Cultures, AFB stains, GeneXpert & Vitek" },
    { key: "serology", label: "Serology", icon: "🩸", color: "#9D174D", bg: "#FDF2F8", desc: "Elisa, Liaison, viral markers & TORCH" },
    { key: "haematology", label: "Haematology", icon: "🩸", color: "#7F1D1D", bg: "#FEE2E2", desc: "Complete blood counts, Sysmex XN & coagulation" },
    { key: "histopathology", label: "Histopathology", icon: "🔬", color: "#7C2D12", bg: "#FFEDD5", desc: "Pathologist slides, tissue correlation & Formalin" },
    { key: "flowcytometry", label: "Flow Cytometry", icon: "🧬", color: "#5B21B6", bg: "#F5F3FF", desc: "CD3/CD4 cell counts & Westgard LJ charts" },
    { key: "cytogenetics", label: "Cytogenetics", icon: "🧬", color: "#701A75", bg: "#FDF4FF", desc: "Karyotyping, chromosomal analysis & cell culture logs" },
    { key: "clinicalpathology", label: "Clinical Pathology", icon: "🔬", color: "#065F46", bg: "#E6FDF5", desc: "Urine, semen analysis & body fluids microscopy" },
    { key: "molecularbiology", label: "Molecular Biology", icon: "🧬", color: "#5B21B6", bg: "#F5F3FF", desc: "PCR assays, DNA extractions & genetic testing" },
    { key: "moleculargenetics", label: "Molecular Genetics", icon: "🧬", color: "#701A75", bg: "#FDF4FF", desc: "Sequencing, genetic mapping & hereditary assays" },
    { key: "phlebotomy", label: "Phlebotomy", icon: "💉", color: "#0D9488", bg: "#E1F5EE", desc: "Sample collections, room temp logs, and patient operations" },
    { key: "reception", label: "Reception", icon: "🛎️", color: "#185FA5", bg: "#E6F1FB", desc: "Visitors register, batch special test schedules, and advisory services" },
    { key: "samplecollection", label: "Sample Collection Center", icon: "🏥", color: "#7C2D12", bg: "#FFEDD5", desc: "Central collection portal combining reception and phlebotomy logs" },
    { key: "collection", label: "Outstation Collection Centers", icon: "🏥", color: "#7F1D1D", bg: "#FEE2E2", desc: "Satellite collection, transport logs & transit TAT monitoring" },
    { key: "telecalling", label: "Telecalling & Call Center", icon: "📞", color: "#0D9488", bg: "#E1F5EE", desc: "Patient feedback, booking & outbound advisory calls" },
    { key: "it", label: "Information Technology", icon: "💻", color: "#0F357C", bg: "#EDF5FF", desc: "LIMS handshake, HL7 packets & security audits" },
    { key: "backoffice", label: "Back Office Logistics", icon: "📦", color: "#312E81", bg: "#EEF2FF", desc: "Cold chain box monitor & transit outliers" },
    { key: "hr", label: "Human Resources", icon: "👥", color: "#115E59", bg: "#E6FDF9", desc: "Duty rosters, employee files & CME training" },
    { key: "biomedical", label: "Biomedical Engineering", icon: "⚙️", color: "#1E50B3", bg: "#EFF6FF", desc: "Analyzer maintenance & breakdown workflow" },
    { key: "purchase", label: "Purchase & Store", icon: "🛒", color: "#0F6E56", bg: "#E1F5EE", desc: "Procurement, approved suppliers, stock register, and calibration logs" },
    { key: "maintenance", label: "Maintenance", icon: "🛠️", color: "#334155", bg: "#F1F5F9", desc: "UPS power check, gensets & extinguisher logs" },
    { key: "housekeeping", label: "Housekeeping", icon: "🧹", color: "#115E59", bg: "#F0FDFA", desc: "Facility cleaning, bleach reconstitution & BMW" },
    { key: "kitchen", label: "Kitchen & Dietary Services", icon: "🍳", color: "#854F0B", bg: "#FAEEDA", desc: "Patient food plans, hygiene & calorie logs" },
    { key: "security", label: "Security Services", icon: "🛡️", color: "#374151", bg: "#F3F4F6", desc: "CCTV checks, visitor registers & gate logs" },
    { key: "accounts", label: "Accounts & Finance", icon: "💵", color: "#0F6E56", bg: "#E1F5EE", desc: "Ledgers, invoices, payroll & audits" },
    { key: "administration", label: "General Administration", icon: "🏢", color: "#185FA5", bg: "#E6F1FB", desc: "Compliance, licensing, ops & executive reviews" },
    { key: "design", label: "Design & Media", icon: "🎨", color: "#7C2D12", bg: "#FFEDD5", desc: "Brochures, digital media & lab branding" },
    { key: "marketing", label: "Marketing & Sales", icon: "📈", color: "#115E59", bg: "#E6FDF9", desc: "B2B client growth, camps & marketing strategy" },
    { key: "erpadmin", label: "ERP Administration", icon: "⚙️", color: "#1E50B3", bg: "#EFF6FF", desc: "Configure system flags, active modules & users" }
  ];

  const quickLinks = [
    { key: "kpi",       icon: "📊", label: "KPI dashboard",     color: "#0F6E56", bg: "#E1F5EE", desc: "View all 15 quality indicators" },
    { key: "equipment", icon: "⚙",  label: "Equipment log",      color: "#185FA5", bg: "#E6F1FB", desc: "Calibration & breakdown records" },
    { key: "ncr",       icon: "⚠",  label: "NCR / CAPA",         color: "#A32D2D", bg: "#FCEBEB", desc: "Open non-conformances register" },
    { key: "documents", icon: "📄", label: "Document control",   color: "#534AB7", bg: "#EEEDFB", desc: "SOPs, manuals & forms" },
    { key: "training",  icon: "🎓", label: "Training matrix",    color: "#854F0B", bg: "#FAEEDA", desc: "Competency & CME training" },
    { key: "accesslog", icon: "🔒", label: "Access Control",     color: "#374151", bg: "#F3F4F6", desc: "IT logins & tamper alerts" }
  ];

  const alerts = [
    { color: "#A32D2D", bg: "#FCEBEB", text: "3 open NCRs — CAPA response required from Microbiology", time: "Today" },
    { color: "#854F0B", bg: "#FAEEDA", text: "Sysmex XN-1000 calibration due in 5 days",       time: "Jun 14" },
    { color: "#854F0B", bg: "#FAEEDA", text: "11 staff training records expired in HR",               time: "This week" },
    { color: "#185FA5", bg: "#E6F1FB", text: "LIMS Handshake test — sync latency verified",            time: "Today" }
  ];

  const kpiHighlights = [
    { label: "7.5.4 Sample Rejection Rate",  val: "0.8%",  limit: "≤1.0%",  pass: true },
    { label: "7.5.5 Sample Processing Error", val: "0.4%",  limit: "≤0.5%",  pass: true },
    { label: "7.5.6 IQC Outlier Frequency",   val: "1.2%",  limit: "≤2.0%",  pass: true },
    { label: "7.5.7 EQA Outlier Frequency",   val: "2.1%",  limit: "≤3.0%",  pass: true },
    { label: "7.5.8 Reporting Error Ratio",  val: "0.1%",  limit: "≤0.2%",  pass: true }
  ];

  useEffect(() => {
    const fetchFeatureFlags = async () => {
      setLoadingFlags(true);
      try {
        const docRef = doc(db, "appSettings", "features");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setFeatureFlags(snap.data());
        }
      } catch (err) {
        console.warn("Could not load feature flags for homepage connection:", err);
      } finally {
        setLoadingFlags(false);
      }
    };
    fetchFeatureFlags();
  }, []);

  const checkIsConnEnabled = (deptKey) => {
    if (featureFlags && featureFlags[`conn_${deptKey}`] === false) {
      return false;
    }
    try {
      const disabledJSON = localStorage.getItem("mbl_disabled_modules");
      if (disabledJSON) {
        const disabledList = JSON.parse(disabledJSON);
        if (Array.isArray(disabledList) && disabledList.includes(deptKey)) {
          return false;
        }
      }
    } catch (e) {
      console.warn("Error reading local disabled modules on check:", e);
    }
    return true;
  };

  const handleDeptClick = (deptKey, e) => {
    if (e) e.preventDefault();
    const isConnEnabled = checkIsConnEnabled(deptKey);
    if (!isConnEnabled) {
      const dept = departmentsList.find(d => d.key === deptKey);
      setComingSoonDept(dept || { key: deptKey, label: deptKey.toUpperCase(), icon: "🔒", desc: "This department dashboard is currently under configuration." });
      setActiveModal("coming_soon");
    } else {
      setActivePage(`dept/${deptKey}`);
    }
  };

  const handleCapaSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    try {
      await addDoc(collection(db, "capa"), {
        source: capaForm.source,
        details: capaForm.details,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("CAPA logged successfully.");
      setCapaForm({ source: "MD Portal", details: "" });
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Error saving CAPA.");
    } finally {
      setModalSaving(false);
    }
  };

  const handleNcrSubmit = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    try {
      await addDoc(collection(db, "ncr"), {
        department: ncrForm.department,
        description: ncrForm.description,
        actionProposed: ncrForm.actionProposed,
        isoClause: ncrForm.isoClause || "§8.4 Nonconforming Work",
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("NCR logged successfully.");
      setNcrForm({ department: "Administration", description: "", actionProposed: "", isoClause: "§8.4 Nonconforming Work" });
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Error saving NCR.");
    } finally {
      setModalSaving(false);
    }
  };

  const handleSuggestionSubmit = async (e) => {
    e.preventDefault();
    if (!suggestionForm.title || !suggestionForm.details) return;
    setModalSaving(true);
    try {
      await addDoc(collection(db, "staffSuggestions"), {
        ...suggestionForm,
        submittedBy: userName || "Staff",
        submittedByEmail: auth.currentUser?.email || "",
        department: userDept || "General",
        createdAt: serverTimestamp()
      });
      alert("Thank you! Your suggestion has been recorded in the QMS.");
      setSuggestionForm({ title: "", category: "Workflow Efficiency", details: "" });
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      alert("Error saving suggestion.");
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Intranet Navigation Header */}
      <nav style={S.navBar}>
        <div style={S.logoSection} onClick={() => { setActiveTab("portal"); setOpenDropdown(null); }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#0D9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔬</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>MBL LABORATORIES</div>
            <div style={{ fontSize: 9.5, color: "#38BDF8", fontWeight: 600 }}>QMS PORTAL · ISO 15189:2022</div>
          </div>
        </div>

        <div style={S.navTabs}>
          {/* 1. Introduction Dropdown */}
          <div 
            style={S.navTabWrap}
            onMouseEnter={() => setOpenDropdown("intro")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span style={S.navTab(openDropdown === "intro")}>Introduction ▾</span>
            {openDropdown === "intro" && (
              <div style={S.dropdown}>
                <button onClick={() => setActiveModal("about")} style={S.dropItem}>📖 About QMS</button>
                <button onClick={() => setActiveModal("history")} style={S.dropItem}>🕰️ QMS History</button>
                <button onClick={() => setActiveModal("achievements")} style={S.dropItem}>🏅 Achievements</button>
                <div style={{ borderTop: "1px solid #334155", margin: "4px 0" }} />
                <button onClick={handleOpenQualityManual} style={S.dropItem}>📄 Quality Manual</button>
                <button onClick={() => { setActiveModal("dept_sops_grid"); setOpenDropdown(null); }} style={S.dropItem}>📂 Department SOPs</button>
              </div>
            )}
          </div>

          {/* 2. Departments Dropdown */}
          <div 
            style={S.navTabWrap}
            onMouseEnter={() => setOpenDropdown("depts")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span style={S.navTab(openDropdown === "depts")}>Departments ▾</span>
            {openDropdown === "depts" && (
              <div style={{ ...S.dropdown, maxHeight: "300px", overflowY: "auto" }}>
                {departmentsList.map(dept => (
                  <button key={dept.key} onClick={() => handleDeptClick(dept.key)} style={S.dropItem}>
                    <span>{dept.icon}</span> <span>{dept.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Actions Dropdown */}
          <div 
            style={S.navTabWrap}
            onMouseEnter={() => setOpenDropdown("actions")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span style={S.navTab(openDropdown === "actions")}>Actions ▾</span>
            {openDropdown === "actions" && (
              <div style={S.dropdown}>
                <button onClick={() => setActiveModal("ncr_form")} style={S.dropItem}>⚠️ + Raise NCR (Non-Conformance)</button>
                <button onClick={() => setActiveModal("capa_form")} style={S.dropItem}>🚨 + Log CAPA (Corrective Action)</button>
                <button onClick={() => setActiveModal("suggestion_form")} style={S.dropItem}>💡 + Staff Suggestions</button>
              </div>
            )}
          </div>

          {/* 4. Services Dropdown */}
          <div 
            style={S.navTabWrap}
            onMouseEnter={() => setOpenDropdown("services")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span style={S.navTab(openDropdown === "services")}>Services ▾</span>
            {openDropdown === "services" && (
              <div style={S.dropdown}>
                <button onClick={() => handleDeptClick("it")} style={S.dropItem}>🤝 LIMS API Integration Status</button>
                <button onClick={() => handleDeptClick("it")} style={S.dropItem}>🧩 HL7 Packet Validator Tool</button>
                <button onClick={() => handleDeptClick("housekeeping")} style={S.dropItem}>🧪 Bleach Reconstitution Calc</button>
                <button onClick={() => handleDeptClick("backoffice")} style={S.dropItem}>⏱️ Transit Outliers Auditor</button>
              </div>
            )}
          </div>

          {/* 5. Help Dropdown */}
          <div 
            style={S.navTabWrap}
            onMouseEnter={() => setOpenDropdown("help")}
            onMouseLeave={() => setOpenDropdown(null)}
          >
            <span style={S.navTab(openDropdown === "help")}>Help ▾</span>
            {openDropdown === "help" && (
              <div style={S.dropdown}>
                <button onClick={() => setActiveModal("help_guide")} style={S.dropItem}>📘 QMS User Quick Guide</button>
                <button onClick={() => setActivePage("help")} style={S.dropItem}>❓ Help & Documentation Page</button>
              </div>
            )}
          </div>

          {/* 6. System Operations Tab */}
          <span 
            onClick={() => setActiveTab(activeTab === "portal" ? "dashboard" : "portal")} 
            style={{ ...S.navTab(activeTab === "dashboard"), background: "#1E293B", border: "1px solid #334155" }}
          >
            {activeTab === "portal" ? "⚡ Launch Operations Cockpit" : "🏠 Return to Main Portal"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{userName || "Quality Director"}</div>
            <div style={{ fontSize: 9.5, color: "#94A3B8" }}>{userRole || "Administrator"} ({userDept || "Quality"})</div>
          </div>
          <div style={{ borderLeft: "0.5px solid #334155", height: 24 }} />
          <button 
            onClick={handleOpenSettings}
            style={{ padding: "4px 10px", background: "#1E293B", color: "#38BDF8", border: "1px solid #334155", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            ⚙️ Settings
          </button>
          <button 
            onClick={() => {
              window.history.pushState({}, "", "/login");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            style={{ padding: "4px 10px", background: "#E24B4A", color: "#FFF", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Intranet Content */}
      <main style={S.content}>
        {/* Welcome Banner */}
        <div style={S.banner}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={S.bannerTitle}>Good {currentTime.getHours() < 12 ? "morning" : currentTime.getHours() < 17 ? "afternoon" : "evening"}, {userName?.split(" ")[0] || "User"} 👋</div>
              <div style={S.bannerSub}>Welcome to the centralized laboratory Quality Management System intranet portal.</div>
            </div>
            <div style={{ textAlign: "right", background: "rgba(255,255,255,0.05)", padding: "8px 16px", borderRadius: 8, border: "0.5px solid #334155" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#38BDF8" }}>
                {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>
                {currentTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        {/* VIEW 1: Main Intranet Portal View */}
        {activeTab === "portal" && (
          <div>
            {/* Quality Policy Core Section */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>📜 MBL Laboratory Quality Policy Statement</div>
              </div>
              <div style={{ ...S.cardBody, background: "#FFF" }}>
                <div style={{ borderLeft: "4px solid #0D9488", paddingLeft: 16, margin: "0 0 16px" }}>
                  <p style={{ fontStyle: "italic", fontSize: 13.5, color: "#1E293B", lineHeight: "1.6em" }}>
                    "MBL Laboratories is dedicated to delivering accurate, timely, and clinically reliable diagnostic services. We execute this by maintaining a rigorous Quality Management System under ISO 15189:2022 guidelines, employing trained professionals, validating equipment calibrations, and strictly safeguarding patient confidentiality in line with ISO 27001:2022 parameters."
                  </p>
                </div>

                <div style={S.grid(3)}>
                  <div style={{ padding: 12, background: "#F8FAFC", borderRadius: 8, border: "0.5px solid #E2E8F0" }}>
                    <strong style={{ fontSize: 12, color: "#0F6E56" }}>✓ Precision and Validity</strong>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Continuous monitoring of IQC runs, Westgard rules, and monthly EQA comparisons.</div>
                  </div>
                  <div style={{ padding: 12, background: "#F8FAFC", borderRadius: 8, border: "0.5px solid #E2E8F0" }}>
                    <strong style={{ fontSize: 12, color: "#0F6E56" }}>✓ Safety & Bio-Hazards</strong>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Proper dilution protocols for disinfectants and structured bio-medical waste dispatching.</div>
                  </div>
                  <div style={{ padding: 12, background: "#F8FAFC", borderRadius: 8, border: "0.5px solid #E2E8F0" }}>
                    <strong style={{ fontSize: 12, color: "#0F6E56" }}>✓ Security & Trust</strong>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Encrypting patient LIS transmission data. Tracking access control and LIMS server logins.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Navigator Grid */}
            <div style={S.secTitle}>
              <span>🏢</span>
              <span>Enterprise Department Console Navigator</span>
            </div>
            <p style={{ margin: "-10px 0 16px", fontSize: 11.5, color: "#64748B" }}>
              Select any department console below to visit its secure compliance registry.
            </p>

            <div style={S.grid(3)}>
              {departmentsList.map(dept => {
                const isConnEnabled = checkIsConnEnabled(dept.key);
                return (
                  <div 
                    key={dept.key} 
                    onClick={() => handleDeptClick(dept.key)}
                    style={{
                      ...S.deptCard(dept.bg, dept.key === "quality" ? "#34D399" : "#E2E8F0"),
                      ...(!isConnEnabled ? {
                        opacity: 0.65,
                        filter: "grayscale(70%)",
                        cursor: "not-allowed",
                        background: "#F1F5F9",
                        borderColor: "#CBD5E1"
                      } : {})
                    }}
                    onMouseOver={(e) => {
                      if (isConnEnabled) {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 6px 15px rgba(0,0,0,0.06)";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (isConnEnabled) {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 20 }}>{dept.icon}</span>
                      {!isConnEnabled ? (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 10, background: "#E2E8F0", color: "#64748B", fontWeight: 700 }}>
                          🔒 Coming Soon
                        </span>
                      ) : (
                        <span style={{ fontSize: 9.5, padding: "2px 6px", borderRadius: 10, background: dept.bg, color: dept.color, fontWeight: 700 }}>
                          {dept.key === "quality" ? "⭐ Primary Console" : "ACTIVE Console"}
                        </span>
                      )}
                    </div>
                    <strong style={{ fontSize: 13, color: "#1E293B", display: "block" }}>{dept.label}</strong>
                    <span style={{ fontSize: 11.5, color: "#64748B", display: "block", marginTop: 4, height: 32, overflow: "hidden" }}>
                      {dept.desc}
                    </span>
                    <div style={{ marginTop: 12, fontSize: 11, color: !isConnEnabled ? "#64748B" : "#0D9488", fontWeight: 600, textAlign: "right" }}>
                      {!isConnEnabled ? "🔒 Coming Soon" : "Visit Department →"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: Operational Dashboard Cockpit */}
        {activeTab === "dashboard" && (
          <div>
            {/* Summary Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
              {[
                { label: "Active Open CAPAs", val: "3", sub: "CAPA verification needed", color: "#A32D2D" },
                { label: "ISO 15189 Quality KPIs", val: "13/15", sub: "Normal range logs", color: "#0F6E56" },
                { label: "Scheduled Equipment Cal.", val: "2 due", sub: "Next 30 days calibration", color: "#854F0B" },
                { label: "Approved Document SOPs", val: "22 active", sub: "Quality manual approved", color: "#0066CC" }
              ].map((c, i) => (
                <div key={i} style={{ background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#888780", marginBottom: 4 }}>{c.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: c.color }}>{c.val}</div>
                  <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
              <div>
                {/* Quick Access Grid */}
                <div style={S.card}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Quick Access Operations Console</div></div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
                    {quickLinks.map((q, i) => (
                      <div
                        key={q.key}
                        onClick={() => setActivePage(q.key)}
                        style={{
                          padding: "16px",
                          borderRight: i % 3 !== 2 ? "0.5px solid #F1EFE8" : "none",
                          borderBottom: i < 3 ? "0.5px solid #F1EFE8" : "none",
                          cursor: "pointer", transition: "background 0.1s"
                        }}
                        onMouseOver={e => e.currentTarget.style.background = "#FAFAF8"}
                        onMouseOut={e => e.currentTarget.style.background = "#fff"}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: q.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>
                          {q.icon}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{q.label}</div>
                        <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{q.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPI highlights */}
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>Operational Quality KPI Highlights</div>
                    <div onClick={() => setActivePage("kpi")} style={{ fontSize: 11, color: "#059669", cursor: "pointer", fontWeight: 600 }}>View KPI Sheet →</div>
                  </div>
                  <div style={S.cardBody}>
                    {kpiHighlights.map((k, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: i < 4 ? "0.5px solid #F1EFE8" : "none", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75" }} />
                        <div style={{ flex: 1, fontSize: 12, color: "#2C2C2A" }}>{k.label}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#065F46" }}>{k.val}</div>
                        <div style={{ fontSize: 11, color: "#888780", width: 60, textAlign: "right" }}>{k.limit}</div>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "#E1F5EE", color: "#085041", fontWeight: 600 }}>Within Limit</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                {/* Alerts and notifications */}
                <div style={S.card}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Alerts & Notifications</div></div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {alerts.map((a, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: i < 3 ? "0.5px solid #F1EFE8" : "none", alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 4 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: "#2C2C2A", lineHeight: 1.4 }}>{a.text}</div>
                          <div style={{ fontSize: 10, color: "#B4B2A9", marginTop: 3 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ISO Reference quick map */}
                <div style={{ background: "#0F172A", borderRadius: 12, padding: "16px", border: "1px solid #1E293B", color: "#fff" }}>
                  <div style={{ fontSize: 11, color: "#38BDF8", marginBottom: 10, fontWeight: 600 }}>ISO 15189:2022 Quick Reference Mapping</div>
                  {[
                    { clause: "Clause 6.4", label: "Equipment & Calibration" },
                    { clause: "Clause 7.2", label: "Pre-analytical Handling" },
                    { clause: "Clause 7.3", label: "Analytical Examination" },
                    { clause: "Clause 7.5", label: "Quality Indicator KPIs" },
                    { clause: "Clause 8.4", label: "CAPA & Incident Control" }
                  ].map((c, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 4 ? "0.5px solid rgba(255,255,255,0.05)" : "none" }}>
                      <span style={{ fontSize: 11, color: "#38BDF8", fontFamily: "monospace" }}>{c.clause}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* POPUP MODAL DIALOGS ("Try another model") */}
      {activeModal && (
        <div style={S.overlay} onClick={() => setActiveModal(null)}>
          <div style={{ ...S.modal, maxWidth: activeModal === "dept_sops_grid" ? 900 : 580 }} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <span style={S.modalTitle}>
                {activeModal === "about" && "📖 About MBL QMS Architecture"}
                {activeModal === "history" && "🕰️ QMS Inception & Timeline History"}
                {activeModal === "achievements" && "🏅 Compliance Milestones & Certifications"}
                {activeModal === "capa_form" && "🚨 Log Corrective & Preventive Action (CAPA)"}
                {activeModal === "ncr_form" && "⚠️ Log Non-Conformance Report (NCR)"}
                {activeModal === "help_guide" && "📘 QMS User Quick-Reference Guide"}
                {activeModal === "coming_soon" && "🔒 Connection Status: Coming Soon"}
                {activeModal === "dept_sops_grid" && "📂 MBL QMS — Department SOPs (ISO 15189)"}
              </span>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 16 }}
              >
                ✕
              </button>
            </div>
            <div style={S.modalBody}>
              {/* Department SOPs Grid Modal */}
              {activeModal === "dept_sops_grid" && (
                <div>
                  <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#64748B", lineHeight: "1.5em" }}>
                    Select a department below to view its active Standard Operating Procedure (SOP) PDF in the secure document previewer. All access is audited under ISO 27001 guidelines.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
                    {ALL_30_DEPARTMENTS.map(d => (
                      <button
                        key={d.key}
                        onClick={() => handleOpenDeptSop(d.key, d.name)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          background: "#F8FAFC",
                          border: "1.5px solid #E2E8F0",
                          borderRadius: 8,
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                          outline: "none"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#0D9488";
                          e.currentTarget.style.background = "#F0FDFA";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#E2E8F0";
                          e.currentTarget.style.background = "#F8FAFC";
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{d.icon}</span>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{d.name} SOP</span>
                          <span style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Click to open SOP</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* About QMS */}
              {activeModal === "about" && (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#374151", lineHeight: "1.6em" }}>
                    The MBL QMS is a digital control cockpit mapped to the requirements of ISO 15189:2022 (Clinical Laboratory Competence) and ISO 27001:2022 (Information Security).
                  </p>
                  <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#374151", lineHeight: "1.6em" }}>
                    By enforcing standardized logging across all 13 medical divisions, the QMS tracks outliers in real-time. Any failed checklist or temperature breach generates a Quality CAPA ticket to secure laboratory outcomes.
                  </p>
                  <strong style={{ fontSize: 12, color: "#0D9488", display: "block", marginBottom: 8 }}>Three Pillars of Laboratory Custody:</strong>
                  <ul>
                    <li style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}><strong>Pre-analytical</strong>: Sample collection tracking, transit time calculator, and cold-chain temperature box audits.</li>
                    <li style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}><strong>Analytical</strong>: lot-to-lot reagent verification, calibrator runs, and Z-score alerts.</li>
                    <li style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}><strong>Post-analytical</strong>: LIMS sync logs, HL7 validator checks, and critical alert logs.</li>
                  </ul>
                </div>
              )}

              {/* QMS History */}
              {activeModal === "history" && (
                <div>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#374151", lineHeight: "1.6em" }}>
                    MBL QMS has grown from manual paper registries to a fully integrated real-time clinical tracking portal.
                  </p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Year</th>
                        <th style={S.th}>Milestone Achievements</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={S.td}><strong>2015</strong></td>
                        <td style={S.td}>PRIMARY biochemistry lab setup & basic SOP registry.</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>2020</strong></td>
                        <td style={S.td}>Initial NABL Certification (ISO 15189:2012) obtained.</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>2024</strong></td>
                        <td style={S.td}>Fully audited and certified under ISO 15189:2022.</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>2026</strong></td>
                        <td style={S.td}>Centralized QMS intranet console deployment (ISO 27001).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Achievements */}
              {activeModal === "achievements" && (
                <div>
                  <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#374151", lineHeight: "1.6em" }}>
                    MBL Laboratories is audited annually to ensure compliance with global diagnostic metrics.
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div style={{ background: "#F0FDF4", border: "1px solid #A7F3D0", padding: 12, borderRadius: 8 }}>
                      <strong style={{ fontSize: 12, color: "#065F46" }}>✓ NABL ISO 15189</strong>
                      <div style={{ fontSize: 11, color: "#047857", marginTop: 4 }}>Full accreditation score across all 13 medical divisions.</div>
                    </div>
                    <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", padding: 12, borderRadius: 8 }}>
                      <strong style={{ fontSize: 12, color: "#1E40AF" }}>✓ ISO 27001:2022</strong>
                      <div style={{ fontSize: 11, color: "#1D4ED8", marginTop: 4 }}>Daily database backups, sync validations, and access controls.</div>
                    </div>
                    <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", padding: 12, borderRadius: 8 }}>
                      <strong style={{ fontSize: 12, color: "#92400E" }}>✓ 99.8% LIMS Sync</strong>
                      <div style={{ fontSize: 11, color: "#B45309", marginTop: 4 }}>Negligible transcription errors through automated LIS links.</div>
                    </div>
                    <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", padding: 12, borderRadius: 8 }}>
                      <strong style={{ fontSize: 12, color: "#5B21B6" }}>✓ EQA Grade A</strong>
                      <div style={{ fontSize: 11, color: "#6D28D9", marginTop: 4 }}>100% proficiency score on external comparison tests.</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Log CAPA Form */}
              {activeModal === "capa_form" && (
                <form onSubmit={handleCapaSubmit}>
                  <div style={{ marginBottom: 12 }}>
                    <span style={S.label}>Source of Incident / Audit Findings</span>
                    <select 
                      value={capaForm.source} 
                      onChange={(e) => setCapaForm({ ...capaForm, source: e.target.value })}
                      style={S.inp}
                    >
                      <option value="MD Portal Direct Log">MD Portal Direct Log</option>
                      <option value="Intranet User Suggestion">Intranet User Suggestion</option>
                      <option value="Internal Audit finding">Internal Audit finding</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <span style={S.label}>Corrective Action Details</span>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Describe the incident and proposed preventive action plan..."
                      value={capaForm.details}
                      onChange={(e) => setCapaForm({ ...capaForm, details: e.target.value })}
                      style={{ ...S.inp, height: 80, resize: "none" }}
                    />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button type="submit" disabled={modalSaving} style={S.btn()}>
                      {modalSaving ? "Logging CAPA..." : "Create CAPA Record"}
                    </button>
                  </div>
                </form>
              )}

              {/* Log NCR Form */}
              {activeModal === "ncr_form" && (
                <NCRForm onComplete={() => setActiveModal(null)} onCancel={() => setActiveModal(null)} />
              )}

              {/* QMS User Quick Guide */}
              {activeModal === "help_guide" && (
                <div>
                  <h4 style={{ fontSize: 13, color: "#0F172A", margin: "0 0 8px" }}>QMS Operations Quick-Start:</h4>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: "1.5em", margin: "0 0 12px" }}>
                    1. **Department Navigator**: Select any department card on the main portal to launch its dashboard console.
                  </p>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: "1.5em", margin: "0 0 12px" }}>
                    2. **Operational Cockpit**: Click the top right launch button to display live summaries, alerts, and quick access links.
                  </p>
                  <p style={{ fontSize: 12, color: "#475569", lineHeight: "1.5em", margin: "0 0 12px" }}>
                    3. **Requests menu**: Use the top requests tab to log CAPAs or register Non-Conformances instantly from any view.
                  </p>
                  <div style={{ background: "#EDF5FF", border: "0.5px solid #BFDBFE", padding: 10, borderRadius: 6, fontSize: 11.5, color: "#1E40AF" }}>
                    <strong>Note:</strong> All transactions are signed with your operator ID ({userName}) and audited under ISO 27001 guidelines.
                  </div>
                </div>
              )}

              {/* Connection Disabled / Coming Soon Modal */}
              {activeModal === "coming_soon" && comingSoonDept && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>{comingSoonDept.icon || "🔒"}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", margin: "0 0 8px" }}>
                    {comingSoonDept.label} Dashboard Connection
                  </h3>
                  <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 8, padding: 12, margin: "16px 0", color: "#991B1B", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }}>
                    <strong>⚠️ Connection Disabled by ERP Admin</strong>
                    <span>
                      Access to the {comingSoonDept.label} compliance register is temporarily deactivated.
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748B", lineHeight: "1.5em", margin: "0 0 20px" }}>
                    This dashboard is currently marked as <strong>"Coming Soon"</strong> due to scheduled maintenance or compliance review cycles under ISO 15189:2022 guidelines.
                  </p>
                  <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <button 
                      onClick={() => setActiveModal(null)} 
                      style={S.btn("#64748B", "#FFF")}
                    >
                      Close Window
                    </button>
                    <button 
                      onClick={() => {
                        setActiveModal(null);
                        setActivePage("help");
                      }} 
                      style={S.btn("#0F172A", "#FFF")}
                    >
                      View QMS Help Guide
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Style Full-Screen Secure Reading Console */}
      {viewingDoc && (
        <div style={{
          position: "fixed", inset: 0, background: "#1F1F1F", zIndex: 10000,
          display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif"
        }}>
          {/* Google Drive Style Header Bar */}
          <div style={{
            background: "#1A1A1A", height: 56, display: "flex", alignItems: "center",
            justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid #333333",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            {/* Left Section: Doc Details */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                style={{
                  background: "transparent", border: "none", color: "#FFF", fontSize: 18,
                  cursor: "pointer", display: "flex", alignItems: "center", padding: 8, borderRadius: "50%"
                }}
                onClick={() => setViewingDoc(null)}
                title="Back to library"
              >
                ←
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>📕</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "#FFF", fontSize: 13, fontWeight: 600 }}>
                    {viewingDoc.title}
                  </span>
                  <span style={{ color: "#9A9A9A", fontSize: 11, fontFamily: "monospace" }}>
                    {viewingDoc.docNumber} (v{viewingDoc.version || "1.0"})
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Zoom Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D2D2D", borderRadius: 20, padding: "2px 8px" }}>
              <button
                style={{
                  background: "transparent", border: "none", color: "#FFF", fontSize: 14,
                  width: 24, height: 24, cursor: zoom <= 50 ? "not-allowed" : "pointer", opacity: zoom <= 50 ? 0.4 : 1
                }}
                disabled={zoom <= 50}
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                title="Zoom out"
              >
                −
              </button>
              <span style={{ color: "#FFF", fontSize: 11, minWidth: 40, textAlign: "center", fontWeight: "bold" }}>
                {zoom}%
              </span>
              <button
                style={{
                  background: "transparent", border: "none", color: "#FFF", fontSize: 14,
                  width: 24, height: 24, cursor: zoom >= 150 ? "not-allowed" : "pointer", opacity: zoom >= 150 ? 0.4 : 1
                }}
                disabled={zoom >= 150}
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                title="Zoom in"
              >
                +
              </button>
              <button
                style={{
                  background: "transparent", border: "none", color: "#38BDF8", fontSize: 10,
                  cursor: "pointer", fontWeight: "bold", padding: "0 6px"
                }}
                onClick={() => setZoom(100)}
              >
                Reset
              </button>
            </div>

            {/* Right Section: Audited Actions & Close */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                style={{
                  background: "transparent", border: "none", color: "#FFF", fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 4
                }}
                onClick={() => setSecurityAlert("print")}
                title="Print Document"
              >
                🖨️ <span style={{ fontSize: 11, color: "#D1D5DB" }}>Print</span>
              </button>
              <button
                style={{
                  background: "transparent", border: "none", color: "#FFF", fontSize: 16,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 4
                }}
                onClick={() => setSecurityAlert("download")}
                title="Download File"
              >
                📥 <span style={{ fontSize: 11, color: "#D1D5DB" }}>Download</span>
              </button>
              <button
                style={{
                  padding: "6px 14px", background: "#0D9488", color: "#FFF",
                  border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}
                onClick={() => setViewingDoc(null)}
              >
                Close
              </button>
            </div>
          </div>

          {/* Google Drive Style Document Sheet Container */}
          <div style={{
            flex: 1, background: "#282828", overflow: "auto", display: "flex",
            justifyContent: "center", padding: "24px 16px", position: "relative"
          }}>
            {/* Confidentially Watermark */}
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexWrap: "wrap",
              alignContent: "space-around", justifyContent: "space-around",
              pointerEvents: "none", zIndex: 1, opacity: 0.02, transform: "rotate(-15deg)",
              fontSize: 24, fontWeight: 800, color: "#FFF", letterSpacing: 2
            }}>
              {Array(24).fill("CONFIDENTIAL - MBL QMS - SECURE AUDIT").map((txt, i) => (
                <div key={i}>{txt}</div>
              ))}
            </div>

            {/* A4 Content Block */}
            {viewingDoc.fileUrl ? (
              <iframe
                src={`${viewingDoc.fileUrl}#toolbar=0`}
                style={{
                  width: "100%",
                  maxWidth: 850 * (zoom / 100),
                  height: "100%",
                  minHeight: "calc(100vh - 120px)",
                  background: "#FFF",
                  border: "none",
                  borderRadius: 4,
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                  zIndex: 2,
                  alignSelf: "flex-start",
                  transition: "all 0.1s ease-out"
                }}
                title={viewingDoc.title}
              />
            ) : (
              <div style={{
                width: "100%", maxWidth: 850 * (zoom / 100), background: "#FFF", color: "#1E293B",
                borderRadius: 4, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                padding: (60 * (zoom / 100)) + "px " + (80 * (zoom / 100)) + "px", boxSizing: "border-box", 
                position: "relative", zIndex: 2, minHeight: 1100 * (zoom / 100), alignSelf: "flex-start",
                transition: "all 0.1s ease-out"
              }}>
                {/* Letterhead */}
                <div style={{ textAlign: "center", borderBottom: (2 * (zoom / 100)) + "px solid #CBD5E1", paddingBottom: 20 * (zoom / 100), marginBottom: 30 * (zoom / 100) }}>
                  <h1 style={{ margin: 0, fontSize: 22 * (zoom / 100), fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" }}>
                    MBL DIAGNOSTIC LABORATORIES
                  </h1>
                  <span style={{ fontSize: 11 * (zoom / 100), color: "#0D9488", fontWeight: 700, letterSpacing: 2 * (zoom / 100), textTransform: "uppercase" }}>
                    Quality Management System
                  </span>
                </div>

                {/* Doc Details Grid */}
                <div style={{ 
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 * (zoom / 100), 
                  fontSize: 12 * (zoom / 100), marginBottom: 30 * (zoom / 100), 
                  borderBottom: (1 * (zoom / 100)) + "px dashed #CBD5E1", paddingBottom: 20 * (zoom / 100) 
                }}>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Document Title</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{viewingDoc.title}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Reference Code</div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{viewingDoc.docNumber}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Effective Date</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{viewingDoc.effectiveDate || new Date().toISOString().split("T")[0]}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Version</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>v{viewingDoc.version || "1.0"}</div>
                  </div>
                </div>

                {/* Simulated Content Warning */}
                <div style={{ 
                  background: "#FFFBEB", 
                  border: `${1 * (zoom / 100)}px solid #FDE68A`, 
                  borderRadius: 8 * (zoom / 100), 
                  padding: 16 * (zoom / 100),
                  fontSize: 12 * (zoom / 100), 
                  color: "#B45309", 
                  marginBottom: 30 * (zoom / 100),
                  lineHeight: 1.5
                }}>
                  <strong>⚠️ PDF ATTACHMENT PENDING</strong>
                  <p style={{ margin: "6px 0 0 0" }}>
                    This document record is successfully registered in the QMS Apex Hierarchy, but the PDF source file has not been uploaded to the database yet.
                  </p>
                  <p style={{ margin: "6px 0 0 0" }}>
                    If you are an administrator, please navigate to the <strong>ERP Admin Dashboard &gt; Document Master</strong> tab to attach the respective PDF.
                  </p>
                </div>

                <div style={{ fontSize: 13 * (zoom / 100), lineHeight: 1.7, color: "#334155" }}>
                  <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0" }}><strong>1.0 DESCRIPTION / METADATA:</strong></p>
                  <p style={{ margin: "0 0 " + 24 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                    {viewingDoc.description || "This document outlines standard operating procedures and compliance rules under ISO 15189."}
                  </p>
                </div>

                {/* Secure Seal Footer */}
                <div style={{
                  borderTop: (2 * (zoom / 100)) + "px solid #CBD5E1", paddingTop: 20 * (zoom / 100), marginTop: 40 * (zoom / 100),
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ fontSize: 10 * (zoom / 100), color: "#64748B" }}>
                    Generated dynamically for: <strong>{userName || "Lab Staff"}</strong> ({userRole || "Staff"}) <br />
                    Session ID: <code>{Math.random().toString(36).substring(2, 10).toUpperCase()}</code>
                  </div>
                  <div style={{
                    border: (1 * (zoom / 100)) + "px solid #10B981", borderRadius: 4 * (zoom / 100), padding: (4 * (zoom / 100)) + "px " + (12 * (zoom / 100)) + "px",
                    background: "#ECFDF5", color: "#047857", fontSize: 10 * (zoom / 100), fontWeight: 700
                  }}>
                    🛡️ AUDITED ISO 15189 COMPLIANT RECORD
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Alert Toast/Modal */}
      {securityAlert && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 11000, fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            background: "#FFF", borderRadius: 12, padding: 24, maxWidth: 450,
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", textAlign: "center",
            border: "1px solid #E2E8F0"
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <h3 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: 16, fontWeight: 700 }}>
              Security Action Blocked
            </h3>
            <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, margin: "0 0 20px" }}>
              Uncontrolled printing or downloading of QMS compliance documents is restricted under 
              <strong> ISO 15189 §8.3</strong> guidelines to prevent circulation of deprecated versions.
            </p>
            <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, fontSize: 11.5, color: "#475569", marginBottom: 20 }}>
              For offline distribution or print permissions, please raise a Document Change Request (DCR) or contact the Quality Department.
            </div>
            <button
              style={{
                padding: "8px 20px", background: "#0F172A", color: "#FFF",
                border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
              onClick={() => setSecurityAlert(null)}
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ── PROFILE & SECURITY SETTINGS MODAL ───────── */}
      {activeModal === "profile_settings" && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 500 }}>
            {/* Header */}
            <div style={S.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>⚙️</span>
                <span style={S.modalTitle}>Security & Profile Settings</span>
              </div>
              <button onClick={() => setActiveModal(null)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B"
              }}>✕</button>
            </div>

            {/* Tabs Selector */}
            <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              <button type="button" onClick={() => { setProfileTab("profile"); setProfileSuccess(""); setProfileError(""); }}
                style={{
                  flex: 1, padding: "12px", fontSize: 12.5, fontWeight: 600, background: "none", border: "none",
                  color: profileTab === "profile" ? "#0D9488" : "#64748B", cursor: "pointer",
                  borderBottom: profileTab === "profile" ? "2px solid #0D9488" : "2px solid transparent",
                }}>
                👤 Option 1: Profile Security
              </button>
              <button type="button" onClick={() => { setProfileTab("password"); setProfileSuccess(""); setProfileError(""); }}
                style={{
                  flex: 1, padding: "12px", fontSize: 12.5, fontWeight: 600, background: "none", border: "none",
                  color: profileTab === "password" ? "#0D9488" : "#64748B", cursor: "pointer",
                  borderBottom: profileTab === "password" ? "2px solid #0D9488" : "2px solid transparent",
                }}>
                🔑 Option 2: Change Password
              </button>
            </div>

            {/* Body */}
            <div style={S.modalBody}>
              {profileSuccess && (
                <div style={{
                  background: "#ECFDF5", border: "1px solid #34D399", borderRadius: 8,
                  padding: "10px 14px", fontSize: 12, color: "#065F46", marginBottom: 16
                }}>
                  ✅ {profileSuccess}
                </div>
              )}

              {profileError && (
                <div style={{
                  background: "#FCEBEB", border: "0.5px solid #E24B4A", borderRadius: 8,
                  padding: "10px 14px", fontSize: 12, color: "#791F1F", marginBottom: 16
                }}>
                  ⚠️ {profileError}
                </div>
              )}

              {profileLoading ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                  Processing changes... Please wait.
                </div>
              ) : (
                <>
                  {/* TAB 1: Profile Security (Phone + Security Question) */}
                  {profileTab === "profile" && (
                    <form onSubmit={handleSaveProfileSettings}>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                          Mobile Phone Number (for recovery via OTP)
                        </label>
                        <input style={S.inp} type="tel" placeholder="e.g. 9876543210" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} required />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                          Choose Security Question
                        </label>
                        <select style={S.inp} value={profileQuestion} onChange={e => setProfileQuestion(e.target.value)} required>
                          <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                          <option value="What city were you born in?">What city were you born in?</option>
                          <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                          <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                          <option value="What was your first car?">What was your first car?</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                          Security Answer
                        </label>
                        <input style={S.inp} type="text" placeholder="Type your answer here" value={profileAnswer} onChange={e => setProfileAnswer(e.target.value)} required />
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setActiveModal(null)} style={S.btn("#F1F5F9", "#475569")}>Cancel</button>
                        <button type="submit" style={S.btn("#0D9488", "#FFF")}>Save Details</button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: Change Password */}
                  {profileTab === "password" && (
                    <form onSubmit={reauthRequired ? handleReauthenticate : handleChangePassword}>
                      {reauthRequired ? (
                        /* Reauthentication Required Field */
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                            Confirm Current Password <span style={{ color: "#E24B4A" }}>*</span>
                          </label>
                          <input style={{ ...S.inp, border: "1.5px solid #FCD34D" }} type="password" placeholder="••••••••" value={profileCurrentPwd} onChange={e => setProfileCurrentPwd(e.target.value)} required />
                        </div>
                      ) : null}

                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                          New Password <span style={{ color: "#E24B4A" }}>*</span>
                        </label>
                        <input style={S.inp} type="password" placeholder="Min. 6 characters" value={profileNewPwd} onChange={e => setProfileNewPwd(e.target.value)} required />
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                          Confirm New Password <span style={{ color: "#E24B4A" }}>*</span>
                        </label>
                        <input style={S.inp} type="password" placeholder="Re-enter password" value={profileConfirmPwd} onChange={e => setProfileConfirmPwd(e.target.value)} required />
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => setActiveModal(null)} style={S.btn("#F1F5F9", "#475569")}>Cancel</button>
                        <button type="submit" style={S.btn(reauthRequired ? "#D97706" : "#0D9488", "#FFF")}>
                          {reauthRequired ? "Reauthenticate & Change" : "Change Password"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── STAFF SUGGESTION FORM MODAL ───────── */}
      {activeModal === "suggestion_form" && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 500 }}>
            <div style={S.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <span style={S.modalTitle}>Submit Staff Suggestion</span>
              </div>
              <button onClick={() => setActiveModal(null)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B"
              }}>✕</button>
            </div>
            <form onSubmit={handleSuggestionSubmit}>
              <div style={S.modalBody}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                    Suggestion Title *
                  </label>
                  <input style={S.inp} value={suggestionForm.title} onChange={e => setSuggestionForm(prev => ({ ...prev, title: e.target.value }))} placeholder="Brief title of your suggestion" required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                    Suggestion Category *
                  </label>
                  <select style={S.inp} value={suggestionForm.category} onChange={e => setSuggestionForm(prev => ({ ...prev, category: e.target.value }))} required>
                    <option>Workflow Efficiency</option>
                    <option>Quality & Safety</option>
                    <option>Equipment/Reagents</option>
                    <option>Training & Continuing Education</option>
                    <option>Other</option>
                  </select>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
                    Detailed Suggestion *
                  </label>
                  <textarea style={{ ...S.inp, height: 100 }} value={suggestionForm.details} onChange={e => setSuggestionForm(prev => ({ ...prev, details: e.target.value }))} placeholder="Provide details on how we can improve. Mention specific NABL or ISO clauses if applicable." required />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setActiveModal(null)} style={S.btn("#F1F5F9", "#475569")}>Cancel</button>
                  <button type="submit" style={S.btn("#0D9488", "#FFF")} disabled={modalSaving}>
                    {modalSaving ? "Submitting..." : "Submit Suggestion"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
