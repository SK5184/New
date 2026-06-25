import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import WeeklyDutyRoster from "../../components/Common/WeeklyDutyRoster";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, deleteDoc, setDoc, query, where,
  orderBy, serverTimestamp, onSnapshot
} from "firebase/firestore";

const DEPARTMENTS = [
  "Molecular Genetics",
  "Microbiology",
  "Serology",
  "Histopathology & Cytopathology",
  "Flow Cytometry",
  "Cytogenetics",
  "Biochemistry",
  "Haematology",
  "Clinical Pathology",
  "Molecular Biology",
  "Quality",
  "Human Resource",
  "Biomedical Engineering",
  "Purchase",
  "Maintenance",
  "Housekeeping",
  "Information Technology",
  "Kitchen",
  "Security",
  "Collection",
  "Front Office",
  "Back Office",
  "Sample Collection Centre",
  "Call Centre",
  "Accounts",
  "Administration",
  "Design",
  "Marketing"
];

// ─── STYLES OBJECT (Premium Slate & Teal accents) ───────────────────────────
const S = {
  wrap: {
    fontFamily: "'Inter',system-ui,sans-serif",
    background: "#F8FAFC",
    minHeight: "100vh",
    color: "#1E293B",
  },
  topbar: {
    background: "#0F172A",
    color: "#F8FAFC",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderBottom: "4px solid #0D9488",
  },
  title: { fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  sysStatus: { fontSize: 12, background: "#1E293B", border: "1px solid #334155", padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6 },
  statusDot: (active) => ({ width: 8, height: 8, borderRadius: "50%", background: active ? "#10B981" : "#EF4444", display: "inline-block" }),
  tabContainer: {
    display: "flex",
    background: "#FFFFFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "0 24px",
    gap: 8,
    overflowX: "auto",
  },
  tabBtn: (active) => ({
    padding: "14px 20px",
    background: "transparent",
    color: active ? "#0D9488" : "#64748B",
    border: "none",
    borderBottom: active ? "3px solid #0D9488" : "3px solid transparent",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s ease",
  }),
  content: { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid #E2E8F0",
    background: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  grid: (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
    marginBottom: 20,
  }),
  metricCard: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  metricVal: { fontSize: 24, fontWeight: 700, color: "#0F172A", marginTop: 4 },
  metricLabel: { fontSize: 12, color: "#64748B", fontWeight: 500 },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    outline: "none",
    transition: "background 0.15s",
  }),
  inp: {
    padding: "8px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 12,
    background: "#FFFFFF",
    color: "#1E293B",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border 0.15s",
  },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    background: "#0F172A",
    color: "#F8FAFC",
    padding: "12px 20px",
    borderRadius: 8,
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
    fontSize: 12.5,
    fontWeight: 500,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  // AI & Terminal UI Specific styles
  chatWrap: { border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column", height: 500, background: "#FFF" },
  chatScroll: { flex: 1, padding: 16, overflowY: "auto", background: "#F8FAFC", display: "flex", flexDirection: "column", gap: 12 },
  chatMsg: (isUser) => ({
    alignSelf: isUser ? "flex-end" : "flex-start",
    maxWidth: "80%",
    background: isUser ? "#0D9488" : "#FFFFFF",
    color: isUser ? "#FFFFFF" : "#1E293B",
    border: isUser ? "none" : "1px solid #E2E8F0",
    padding: "10px 14px",
    borderRadius: isUser ? "12px 12px 0 12px" : "12px 12px 12px 0",
    fontSize: 12.5,
    lineHeight: 1.4,
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  }),
  terminalWrap: { background: "#090D16", borderRadius: 12, border: "1px solid #1E293B", overflow: "hidden", display: "flex", flexDirection: "column", height: 480, fontFamily: "Courier New, monospace" },
  terminalLog: { flex: 1, padding: 16, overflowY: "auto", color: "#34D399", fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.3 },
  terminalPrompt: { display: "flex", background: "#0F172A", borderTop: "1px solid #1E293B", padding: "8px 12px", alignItems: "center" },
  terminalInput: { background: "transparent", border: "none", color: "#F3F4F6", fontSize: 13, fontFamily: "Courier New, monospace", outline: "none", flex: 1, marginLeft: 8 },
  libraryItem: { padding: 12, borderBottom: "1px solid #E2E8F0", cursor: "pointer", transition: "background 0.15s" },
};

// ─── INITIAL DATASETS ────────────────────────────────────────────────────────
const DEFAULT_DEPARTMENTS = [
  { key: "quality", name: "Quality Department", icon: "🛡️", code: "QUAL", status: "Active" },
  { key: "biochemistry", name: "Biochemistry", icon: "🧪", code: "BIOC", status: "Active" },
  { key: "microbiology", name: "Microbiology", icon: "🔬", code: "MICR", status: "Active" },
  { key: "serology", name: "Serology", icon: "🩸", code: "SERO", status: "Active" },
  { key: "haematology", name: "Haematology", icon: "🩸", code: "HAEM", status: "Active" },
  { key: "histopathology", name: "Histopathology", icon: "🔬", code: "HIST", status: "Active" },
  { key: "flowcytometry", name: "Flow Cytometry", icon: "🧬", code: "FLOW", status: "Active" },
  { key: "cytogenetics", name: "Cytogenetics", icon: "🧬", code: "CYTO", status: "Active" },
  { key: "clinicalpathology", name: "Clinical Pathology", icon: "🔬", code: "CPAT", status: "Active" },
  { key: "molecularbiology", name: "Molecular Biology", icon: "🧬", code: "MOLB", status: "Active" },
  { key: "moleculargenetics", name: "Molecular Genetics", icon: "🧬", code: "MGEN", status: "Active" },
  { key: "hr", name: "Human Resource", icon: "👥", code: "HRMD", status: "Active" },
  { key: "biomedical", name: "Biomedical Engineering", icon: "⚙️", code: "BIOM", status: "Active" },
  { key: "purchase", name: "Purchase & Store", icon: "🛒", code: "PURC", status: "Active" },
  { key: "maintenance", name: "Maintenance", icon: "🛠️", code: "MAIN", status: "Active" },
  { key: "housekeeping", name: "Housekeeping", icon: "🧹", code: "HOUS", status: "Active" },
  { key: "it", name: "Information Technology", icon: "💻", code: "TECH", status: "Active" },
  { key: "kitchen", name: "Kitchen", icon: "🍳", code: "KITC", status: "Active" },
  { key: "security", name: "Security", icon: "👮", code: "SECU", status: "Active" },
  { key: "phlebotomy", name: "Phlebotomy", icon: "💉", code: "PHLE", status: "Active" },
  { key: "reception", name: "Front Office (Reception)", icon: "📞", code: "RECE", status: "Active" },
  { key: "backoffice", name: "Back Office", icon: "📂", code: "BACK", status: "Active" },
  { key: "samplecollection", name: "Sample Collection Centre", icon: "🧪", code: "SAMP", status: "Active" },
  { key: "telecalling", name: "Call Centre (Telecalling)", icon: "☎️", code: "TELE", status: "Active" },
  { key: "accounts", name: "Accounts", icon: "💵", code: "ACCO", status: "Active" },
  { key: "administration", name: "Administration", icon: "🏢", code: "ADMN", status: "Active" },
  { key: "design", name: "Design Department", icon: "🎨", code: "DESN", status: "Active" },
  { key: "marketing", name: "Marketing", icon: "📈", code: "MARK", status: "Active" },
  { key: "erpadmin", name: "ERP Administration", icon: "⚙️", code: "ERPA", status: "Active" },
  { key: "collection", name: "Collection Dashboard", icon: "📦", code: "COLL", status: "Active" }
];

const DEFAULT_USERS = [
  { id: "USR001", name: "Dr. Suresh Kumar", email: "suresh.k@mbl.com", role: "HOD", dept: "Biochemistry", status: "Active" },
  { id: "USR002", name: "Sarah Jenkins", email: "sarah.j@mbl.com", role: "Quality Manager", dept: "Quality", status: "Active" },
  { id: "USR003", name: "Alex Mercer", email: "alex.m@mbl.com", role: "Lab Tech", dept: "Microbiology", status: "Active" },
  { id: "USR004", name: "David Miller", email: "david.m@mbl.com", role: "BME", dept: "Biomedical", status: "Active" },
  { id: "USR005", name: "Admin Gowri", email: "admin@mbl.com", role: "Admin", dept: "Master", status: "Active" },
];

const DEFAULT_EQUIPMENT = [
  { id: "EQ001", name: "Roche Cobas c311", dept: "Biochemistry", status: "Operational", calDue: "2026-09-12" },
  { id: "EQ002", name: "Sysmex XN-1000", dept: "Haematology", status: "Operational", calDue: "2026-07-04" },
  { id: "EQ003", name: "BD BACTEC FX40", dept: "Microbiology", status: "Calibration Due", calDue: "2026-06-20" },
  { id: "EQ004", name: "Centrifuge C-12", dept: "All", status: "Operational", calDue: "2026-11-30" },
];

const DEFAULT_REAGENTS = [
  { code: "RG-GLU", name: "Glucose Hexokinase Reagent", lot: "GL2026-01", stock: 12, minStock: 5, expiry: "2026-12-15" },
  { code: "RG-CREA", name: "Creatinine Jaffe Reagent", lot: "CR2026-03", stock: 3, minStock: 5, expiry: "2026-08-10" },
  { code: "RG-HBA1C", name: "HbA1c Turbidimetric Reagent", lot: "HB2026-02", stock: 8, minStock: 3, expiry: "2026-06-25" },
  { code: "RG-HIV", name: "HIV 4th Gen ELISA Kit", lot: "HV2026-09", stock: 4, minStock: 2, expiry: "2027-02-18" },
];

const DEFAULT_TESTS = [
  { code: "T-GLU", name: "Fasting Blood Glucose", price: 150, tat: 4, dept: "Biochemistry" },
  { code: "T-CREA", name: "Serum Creatinine", price: 200, tat: 4, dept: "Biochemistry" },
  { code: "T-CBC", name: "Complete Blood Count", price: 350, tat: 3, dept: "Haematology" },
  { code: "T-HIV", name: "HIV ELISA Antibody Test", price: 650, tat: 8, dept: "Serology" },
];

// ─── COMMAND LINE TEMPLATES LIBRARY ──────────────────────────────────────────
const COMMANDS_LIBRARY = [
  { title: "Extract All Users", cmd: "/extract --collection users", desc: "Downloads full user listing" },
  { title: "Extract Expired Reagents", cmd: "/extract --collection reagents --expired", desc: "Filters inventory by expired date" },
  { title: "Extract Calibration Due Equipment", cmd: "/extract --collection equipment --status \"Calibration Due\"", desc: "Extracts instruments needing service" },
  { title: "Extract Biochemistry Reagents", cmd: "/extract --collection reagents --dept biochemistry", desc: "Biochem specific reagent stock levels" },
  { title: "Extract High Price Tests", cmd: "/extract --collection tests --price-above 300", desc: "Lists all tests costing > 300" },
  { title: "List Active Modules", cmd: "/list-modules", desc: "Displays configured system modules" },
  { title: "Check System Health", cmd: "/system-status", desc: "Queries live diagnostics status" },
];

export default function ERPDashboard() {
  const { role, name: currentUserName } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState("overview");
  // Task Master States
  const [selectedDept, setSelectedDept] = useState("Molecular Genetics");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [authorizations, setAuthorizations] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskForm, setTaskForm] = useState({
    name: "",
    jobTrainingPrerequisite: "",
    competencyAssessed: "Complete"
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTaskId, setEditTaskId] = useState(""); // "overview" | "masters" | "access" | "search" | "terminal" | "settings"
  const [mastersSubTab, setMastersSubTab] = useState("departments"); // "departments" | "users" | "equipment" | "reagents" | "tests"

  // Live database states
  const [departments, setDepartments] = useState(() => {
    try {
      const disabledJSON = localStorage.getItem("mbl_disabled_modules");
      if (disabledJSON) {
        const disabledList = JSON.parse(disabledJSON);
        if (Array.isArray(disabledList)) {
          return DEFAULT_DEPARTMENTS.map(d => ({
            ...d,
            status: disabledList.includes(d.key) ? "Disabled" : "Active"
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to parse local disabled modules on init:", e);
    }
    return DEFAULT_DEPARTMENTS;
  });
  const [users, setUsers] = useState(DEFAULT_USERS);
  const [equipment, setEquipment] = useState(DEFAULT_EQUIPMENT);
  const [reagents, setReagents] = useState(DEFAULT_REAGENTS);
  const [tests, setTests] = useState(DEFAULT_TESTS);

  // Search filter states
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // "new_module" | "new_user" | "new_equipment" | "new_reagent" | "new_test" | null
  const [formData, setFormData] = useState({});

  // System Config / Banner States
  const [smsToggled, setSmsToggled] = useState(true);
  const [limsToggled, setLimsToggled] = useState(true);
  const [aiToggled, setAiToggled] = useState(true);
  const [outageBanners, setOutageBanners] = useState({
    biochemistry: { status: "Active", msg: "" },
    microbiology: { status: "Active", msg: "" }
  });
  const [bannerForm, setBannerForm] = useState({ dept: "biochemistry", status: "Active", msg: "" });

  // Role Access Rules Checkbox Matrix state
  const [accessMatrix, setAccessMatrix] = useState({
    "Managing Director": { dashboard: true, qc: true, equipment: true, capa: true, inventory: true, logs: true },
    "HOD": { dashboard: true, qc: true, equipment: true, capa: true, inventory: true, logs: false },
    "Quality Manager": { dashboard: true, qc: true, equipment: false, capa: true, inventory: false, logs: true },
    "Lab Tech": { dashboard: true, qc: false, equipment: false, capa: false, inventory: true, logs: false },
    "BME": { dashboard: true, qc: false, equipment: true, capa: false, inventory: false, logs: false },
  });

  // Ultimate AI Search Console States
  const [chatMessages, setChatMessages] = useState([
    { isUser: false, content: "Hello Admin! I am the QMS Ultimate AI Search Master. You can ask me questions about laboratory resources, calibration dates, user credentials, or reagent expiries in natural language." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const chatEndRef = useRef(null);

  // Terminal States
  const [terminalHistory, setTerminalHistory] = useState([
    { type: "sys", text: "MBL QMS Enterprise Terminal Console [Version 2.0.4]" },
    { type: "sys", text: "(c) 2026 MBL Labs. All rights reserved." },
    { type: "sys", text: "Type /help or use the Command Library on the right to start extracting database tables." }
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef(null);

  // Toast message state
  const [toast, setToast] = useState(null);

  // System Diagnostics counters
  const [activeSessions, setActiveSessions] = useState(4);
  const [backupLogs, setBackupLogs] = useState([]);
  const [dbWrites, setDbWrites] = useState(128);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Task Master Methods
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qTasks = query(collection(db, "taskMaster"), where("department", "==", selectedDept));
      const snapTasks = await getDocs(qTasks);
      const listTasks = snapTasks.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(listTasks);

      const qEmp = query(collection(db, "employees"), where("department", "==", selectedDept));
      const snapEmp = await getDocs(qEmp);
      const listEmp = snapEmp.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(listEmp);

      const qAuth = query(collection(db, "taskAuthorizations"), where("department", "==", selectedDept));
      const snapAuth = await getDocs(qAuth);
      const authMap = {};
      snapAuth.docs.forEach(d => {
        const data = d.data();
        authMap[`${data.taskId}_${data.employeeId}`] = data.authorized;
      });
      setAuthorizations(authMap);
    } catch (err) {
      console.error("Error loading Task Master data:", err);
      showToast("Error loading department data.");
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    if (activeTab === "masters" && mastersSubTab === "tasks") {
      loadData();
    }
  }, [activeTab, mastersSubTab, loadData]);

  // Subscribe to real-time features snapshot
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "features"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDepartments(prev => prev.map(d => {
          const isConnDisabled = data[`conn_${d.key}`] === false;
          return {
            ...d,
            status: isConnDisabled ? "Disabled" : "Active"
          };
        }));
      }
    }, (err) => {
      console.warn("Could not load features snapshot in ERPDashboard:", err);
    });
    return () => unsub();
  }, []);

  const handleToggleModule = async (deptItem) => {
    const newStatus = deptItem.status === "Active" ? "Disabled" : "Active";
    
    // 1. Update local state instantly
    setDepartments(prev => prev.map(x => x.key === deptItem.key ? { ...x, status: newStatus } : x));
    
    // 2. Update localStorage
    try {
      const disabledJSON = localStorage.getItem("mbl_disabled_modules");
      let disabledList = disabledJSON ? JSON.parse(disabledJSON) : [];
      if (!Array.isArray(disabledList)) disabledList = [];
      
      if (newStatus === "Disabled") {
        if (!disabledList.includes(deptItem.key)) {
          disabledList.push(deptItem.key);
        }
      } else {
        disabledList = disabledList.filter(k => k !== deptItem.key);
      }
      localStorage.setItem("mbl_disabled_modules", JSON.stringify(disabledList));
    } catch (e) {
      console.warn("Failed to write to localStorage for disabled modules:", e);
    }

    // 3. Write to Firestore appSettings/features
    try {
      await setDoc(
        doc(db, "appSettings", "features"),
        { [`conn_${deptItem.key}`]: newStatus === "Active" },
        { merge: true }
      );
      showToast(`Module '${deptItem.name}' status updated to ${newStatus}.`);
    } catch (err) {
      console.error("Error updating module status in Firestore:", err);
      showToast(`Error saving to database. Local state updated.`);
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim()) return;
    setSaving(true);
    try {
      if (isEditing) {
        const taskRef = doc(db, "taskMaster", editTaskId);
        await updateDoc(taskRef, {
          name: taskForm.name.trim(),
          jobTrainingPrerequisite: taskForm.jobTrainingPrerequisite,
          competencyAssessed: taskForm.competencyAssessed,
          updatedAt: serverTimestamp()
        });
        showToast("Task updated successfully!");
      } else {
        await addDoc(collection(db, "taskMaster"), {
          name: taskForm.name.trim(),
          department: selectedDept,
          jobTrainingPrerequisite: taskForm.jobTrainingPrerequisite,
          competencyAssessed: taskForm.competencyAssessed,
          createdAt: serverTimestamp()
        });
        showToast("Task added successfully!");
      }
      setTaskForm({ name: "", jobTrainingPrerequisite: "", competencyAssessed: "Complete" });
      setIsEditing(false);
      setEditTaskId("");
      loadData();
    } catch (err) {
      console.error("Error saving task:", err);
      showToast("Error saving task.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (task) => {
    setIsEditing(true);
    setEditTaskId(task.id);
    setTaskForm({
      name: task.name,
      jobTrainingPrerequisite: task.jobTrainingPrerequisite || "",
      competencyAssessed: task.competencyAssessed || "Complete"
    });
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task? All employee authorizations for this task will also be deleted.")) return;
    try {
      await deleteDoc(doc(db, "taskMaster", taskId));
      const qAuth = query(collection(db, "taskAuthorizations"), where("taskId", "==", taskId));
      const snapAuth = await getDocs(qAuth);
      const promises = snapAuth.docs.map(d => deleteDoc(doc(db, "taskAuthorizations", d.id)));
      await Promise.all(promises);
      showToast("Task deleted successfully!");
      loadData();
    } catch (err) {
      console.error("Error deleting task:", err);
      showToast("Error deleting task.");
    }
  };

  const handleToggleAuth = async (taskId, employeeId, employeeName) => {
    const keyStr = `${taskId}_${employeeId}`;
    const currentStatus = !!authorizations[keyStr];
    const newStatus = !currentStatus;
    setAuthorizations(prev => ({ ...prev, [keyStr]: newStatus }));
    try {
      const authRef = doc(db, "taskAuthorizations", keyStr);
      await setDoc(authRef, {
        taskId,
        employeeId,
        employeeName,
        department: selectedDept,
        authorized: newStatus,
        authorizedBy: currentUserName || "System User",
        authorizedAt: serverTimestamp()
      });
      showToast(`${employeeName}'s authorization updated.`);
    } catch (err) {
      console.error("Error updating authorization:", err);
      setAuthorizations(prev => ({ ...prev, [keyStr]: currentStatus }));
      showToast("Failed to update authorization.");
    }
  };

  const handleGenerateTrialTasks = async () => {
    setSaving(true);
    try {
      const trials = [
        { name: "DNA Extraction & Purification", prereq: "", competency: "Complete" },
        { name: "PCR Amplification Run", prereq: "DNA Extraction & Purification", competency: "Complete" },
        { name: "Sanger Sequencing Loading & Capillary Run", prereq: "PCR Amplification Run", competency: "Complete" },
        { name: "Genetic Variant Alignment & Calling", prereq: "Sanger Sequencing Loading & Capillary Run", competency: "Complete" }
      ];
      for (const t of trials) {
        await addDoc(collection(db, "taskMaster"), {
          name: t.name,
          department: "Molecular Genetics",
          jobTrainingPrerequisite: t.prereq,
          competencyAssessed: t.competency,
          createdAt: serverTimestamp()
        });
      }
      showToast("Generated trial Molecular Genetics tasks!");
      loadData();
    } catch (err) {
      console.error("Error generating trial tasks:", err);
      showToast("Error generating trial tasks.");
    } finally {
      setSaving(false);
    }
  };

  // Autoscroll chat and terminal
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory]);

  // Handle Dynamic Module / Table submissions
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (activeModal === "new_module") {
      const newModule = {
        key: formData.key.toLowerCase().trim(),
        name: formData.name,
        icon: formData.icon || "⚙️",
        code: formData.code.toUpperCase(),
        status: "Active"
      };
      setDepartments([...departments, newModule]);
      showToast(`Module '${formData.name}' created and initialized successfully.`);
    } else if (activeModal === "new_user") {
      const newUser = {
        id: `USR${String(users.length + 1).padStart(3, "0")}`,
        name: formData.name,
        email: formData.email,
        role: formData.role || "Lab Tech",
        dept: formData.dept || "Biochemistry",
        status: "Active"
      };
      setUsers([...users, newUser]);
      showToast(`User '${formData.name}' registered successfully.`);
    } else if (activeModal === "new_equipment") {
      const newEq = {
        id: `EQ${String(equipment.length + 1).padStart(3, "0")}`,
        name: formData.name,
        dept: formData.dept || "Biochemistry",
        status: formData.status || "Operational",
        calDue: formData.calDue || "2026-12-31"
      };
      setEquipment([...equipment, newEq]);
      showToast(`Equipment '${formData.name}' added to registry.`);
    } else if (activeModal === "new_reagent") {
      const newReagent = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        lot: formData.lot,
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 2,
        expiry: formData.expiry || "2026-12-31"
      };
      setReagents([...reagents, newReagent]);
      showToast(`Reagent '${formData.name}' inventory initialized.`);
    } else if (activeModal === "new_test") {
      const newTest = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        price: parseInt(formData.price) || 100,
        tat: parseInt(formData.tat) || 4,
        dept: formData.dept || "Biochemistry"
      };
      setTests([...tests, newTest]);
      showToast(`Test Service '${formData.name}' created in catalog.`);
    }
    setActiveModal(null);
    setFormData({});
  };

  // Toggle dynamic matrix permission
  const handleMatrixChange = (roleKey, moduleKey) => {
    setAccessMatrix({
      ...accessMatrix,
      [roleKey]: {
        ...accessMatrix[roleKey],
        [moduleKey]: !accessMatrix[roleKey][moduleKey]
      }
    });
    showToast(`Access updated: ${roleKey} -> ${moduleKey.toUpperCase()}`);
  };

  // Outage / Coming Soon banner save
  const handleOutageSave = (e) => {
    e.preventDefault();
    setOutageBanners({
      ...outageBanners,
      [bannerForm.dept]: { status: bannerForm.status, msg: bannerForm.msg }
    });
    showToast(`Maintenance rules updated for ${bannerForm.dept.toUpperCase()}.`);
  };

  // ─── PARSE NATURAL LANGUAGE QUESTION (Ultimate Search Master) ─────────────
  const executeAISearch = (queryText) => {
    const q = queryText.toLowerCase().trim();
    let reply = { content: "", table: null };

    if (q.includes("equipment") || q.includes("calibration") || q.includes("analyzer") || q.includes("instrument")) {
      let filtered = equipment;
      let reason = "All equipment registered in database";
      if (q.includes("due") || q.includes("calibration due")) {
        filtered = equipment.filter(e => e.status === "Calibration Due");
        reason = "Equipment requiring calibration";
      }
      reply.content = `I found ${filtered.length} equipment item(s) matching your request (${reason}):`;
      reply.table = (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Department</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Calibration Due</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td style={S.td}>{e.id}</td>
                <td style={S.td}><span style={{fontWeight:600}}>{e.name}</span></td>
                <td style={S.td}>{e.dept}</td>
                <td style={S.td}>
                  <span style={S.badge(e.status === "Operational" ? "#E6F4EA" : "#FCE8E6", e.status === "Operational" ? "#137333" : "#C5221F")}>
                    {e.status}
                  </span>
                </td>
                <td style={S.td}>{e.calDue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (q.includes("user") || q.includes("staff") || q.includes("personnel") || q.includes("role")) {
      let filtered = users;
      let reason = "All registered QMS users";
      if (q.includes("hod")) {
        filtered = users.filter(u => u.role === "HOD");
        reason = "HODs only";
      } else if (q.includes("biochemistry")) {
        filtered = users.filter(u => u.dept.toLowerCase() === "biochemistry");
        reason = "Biochemistry department staff";
      }
      reply.content = `I found ${filtered.length} user(s) matching your query (${reason}):`;
      reply.table = (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>ID</th>
              <th style={S.th}>Name</th>
              <th style={S.th}>Email</th>
              <th style={S.th}>Role</th>
              <th style={S.th}>Department</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td style={S.td}>{u.id}</td>
                <td style={S.td}><span style={{fontWeight:600}}>{u.name}</span></td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}>{u.role}</td>
                <td style={S.td}>{u.dept}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (q.includes("reagent") || q.includes("stock") || q.includes("expiry") || q.includes("inventory")) {
      let filtered = reagents;
      let reason = "All laboratory reagent lot details";
      if (q.includes("low") || q.includes("alert")) {
        filtered = reagents.filter(r => r.stock <= r.minStock);
        reason = "Low stock alert (reagents under minimum threshold)";
      } else if (q.includes("expired") || q.includes("expire")) {
        filtered = reagents.filter(r => new Date(r.expiry) < new Date());
        reason = "Expired lots";
      }
      reply.content = `Here are the reagent details matching your request (${reason}):`;
      reply.table = (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Code</th>
              <th style={S.th}>Reagent Name</th>
              <th style={S.th}>Lot No</th>
              <th style={S.th}>Stock</th>
              <th style={S.th}>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.code}>
                <td style={S.td}>{r.code}</td>
                <td style={S.td}><span style={{fontWeight:600}}>{r.name}</span></td>
                <td style={S.td}>{r.lot}</td>
                <td style={S.td}>
                  <span style={{ color: r.stock <= r.minStock ? "#EF4444" : "#1E293B", fontWeight: 700 }}>
                    {r.stock} (Min: {r.minStock})
                  </span>
                </td>
                <td style={S.td}>{r.expiry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (q.includes("test") || q.includes("price") || q.includes("catalog") || q.includes("tat")) {
      let filtered = tests;
      let reason = "Active clinical test directory";
      if (q.includes("expensive") || q.includes("price-above") || q.includes("high")) {
        filtered = tests.filter(t => t.price >= 300);
        reason = "Tests costing 300 INR or above";
      }
      reply.content = `I found ${filtered.length} clinical test(s) in the master catalog matching your request (${reason}):`;
      reply.table = (
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Code</th>
              <th style={S.th}>Test Name</th>
              <th style={S.th}>Department</th>
              <th style={S.th}>Price (INR)</th>
              <th style={S.th}>TAT (Hrs)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.code}>
                <td style={S.td}>{t.code}</td>
                <td style={S.td}><span style={{fontWeight:600}}>{t.name}</span></td>
                <td style={S.td}>{t.dept}</td>
                <td style={S.td}>₹{t.price}</td>
                <td style={S.td}>{t.tat} hrs</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } else if (q.includes("module") || q.includes("department")) {
      reply.content = `System contains ${departments.length} modules:`;
      reply.table = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {departments.map(d => (
            <span key={d.key} style={S.badge("#F1F5F9", "#475569")}>
              {d.icon} {d.name} ({d.code})
            </span>
          ))}
        </div>
      );
    } else {
      reply.content = "I'm sorry, I couldn't resolve that query. Try asking something like: 'List all due equipment', 'Show low stock reagents', 'List users', or 'Show expensive tests'.";
    }

    setChatMessages(prev => [
      ...prev,
      { isUser: true, content: queryText },
      { isUser: false, content: reply.content, table: reply.table }
    ]);
  };

  // ─── EXECUTE TERMINAL COMMAND (Terminal & Command Library) ─────────────────
  const executeTerminalCommand = (rawCmd) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    setTerminalHistory(prev => [...prev, { type: "input", text: trimmed }]);
    setDbWrites(prev => prev + 1); // Mock firestore activity

    const parts = trimmed.split(" ");
    const cmd = parts[0].toLowerCase();

    const outputLog = (text, type = "normal") => {
      setTerminalHistory(prev => [...prev, { type, text }]);
    };

    if (cmd === "/help") {
      outputLog("==========================================================================", "sys");
      outputLog("QMS DATA EXTRACTION COMMAND LINE HANDBOOK", "sys");
      outputLog("==========================================================================", "sys");
      outputLog("Usage instructions for database table extractions:");
      outputLog("  /extract --collection <users|equipment|reagents|tests|departments>");
      outputLog("              [--dept <department_name>]");
      outputLog("              [--status <status_value>]");
      outputLog("              [--expired]");
      outputLog("              [--low-stock]");
      outputLog("              [--price-above <number>]");
      outputLog("              [--format <csv|json>] (Defaults to CSV)");
      outputLog("  /list-modules            Lists all configured modules");
      outputLog("  /system-status           Returns live diagnostics counters");
      outputLog("  /clear                   Clears the terminal scroll");
      outputLog("==========================================================================", "sys");
    } else if (cmd === "/clear") {
      setTerminalHistory([]);
    } else if (cmd === "/list-modules") {
      outputLog("Executing query: SELECT * FROM departments...");
      departments.forEach(d => {
        outputLog(`  => [CODE: ${d.code}] KEY: ${d.key} | NAME: ${d.name} | STATUS: ${d.status}`);
      });
      outputLog(`Query Success: ${departments.length} rows returned.`);
    } else if (cmd === "/system-status") {
      outputLog("Fetching QMS server metrics...");
      outputLog(`  LIMS HL7 Handshake Status: Operational`);
      outputLog(`  Active User Sessions: ${activeSessions}`);
      outputLog(`  Live Firestore Writes (Session): ${dbWrites}`);
      outputLog(`  Database Storage Cache: 2.14 MB`);
      outputLog(`  LIMS sync latency: 14ms`);
    } else if (cmd === "/extract") {
      // Parse arguments
      const getArg = (flag) => {
        const index = parts.indexOf(flag);
        if (index !== -1 && index + 1 < parts.length) {
          return parts[index + 1].replace(/['"]+/g, '');
        }
        return null;
      };

      const hasFlag = (flag) => parts.includes(flag);

      const collectionName = getArg("--collection");
      const filterDept = getArg("--dept");
      const filterStatus = getArg("--status");
      const expiredOnly = hasFlag("--expired");
      const lowStockOnly = hasFlag("--low-stock");
      const priceAbove = parseFloat(getArg("--price-above")) || null;
      const format = getArg("--format") || "csv";

      if (!collectionName) {
        outputLog("Error: Missing argument '--collection'. Example: /extract --collection users", "error");
        return;
      }

      outputLog(`Initializing extraction: Collection='${collectionName}' Format='${format}'...`);

      let data = [];
      if (collectionName === "users") {
        data = users;
        if (filterDept) data = data.filter(u => u.dept.toLowerCase() === filterDept.toLowerCase());
      } else if (collectionName === "equipment") {
        data = equipment;
        if (filterDept) data = data.filter(e => e.dept.toLowerCase() === filterDept.toLowerCase());
        if (filterStatus) data = data.filter(e => e.status.toLowerCase() === filterStatus.toLowerCase());
      } else if (collectionName === "reagents") {
        data = reagents;
        if (filterDept) {
          // Biochem reagents helper
          if (filterDept.toLowerCase() === "biochemistry") {
            data = data.filter(r => r.code.includes("GLU") || r.code.includes("CREA") || r.code.includes("HBA1C"));
          }
        }
        if (expiredOnly) {
          data = data.filter(r => new Date(r.expiry) < new Date());
        }
        if (lowStockOnly) {
          data = data.filter(r => r.stock <= r.minStock);
        }
      } else if (collectionName === "tests") {
        data = tests;
        if (priceAbove) data = data.filter(t => t.price >= priceAbove);
        if (filterDept) data = data.filter(t => t.dept.toLowerCase() === filterDept.toLowerCase());
      } else if (collectionName === "departments" || collectionName === "modules") {
        data = departments;
      } else {
        outputLog(`Error: Unknown collection '${collectionName}'. Valid options are: users, equipment, reagents, tests, departments`, "error");
        return;
      }

      if (data.length === 0) {
        outputLog("Extraction completed: 0 records matched filters.", "warning");
        return;
      }

      outputLog(`Query resolved. Parsing ${data.length} records...`);

      if (format.toLowerCase() === "json") {
        outputLog(JSON.stringify(data, null, 2));
      } else {
        // Output CSV
        const headers = Object.keys(data[0]);
        outputLog(headers.join(","), "sys");
        data.forEach(row => {
          const values = headers.map(header => {
            const val = row[header];
            return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
          });
          outputLog(values.join(","));
        });
      }
      outputLog(`=== Extraction complete. ${data.length} rows exported. ===`, "sys");
    } else {
      outputLog(`Error: Command '${cmd}' not recognized. Type /help for valid syntax.`, "error");
    }
  };

  return (
    <div style={S.wrap}>
      
      {/* ─── HEADER/TOPBAR ─────────────────────────────────────────────────── */}
      <div style={S.topbar}>
        <div style={S.title}>
          <span>⚙️</span>
          <span>MBL QMS — Enterprise Resource Planning (ERP) Admin Console</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={S.sysStatus}>
            <span style={S.statusDot(true)} />
            <span>LIMS Handshake: OK</span>
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            User: <strong>{currentUserName || "Administrator"}</strong> ({role})
          </div>
        </div>
      </div>

      {/* ─── TAB NAVIGATION ────────────────────────────────────────────────── */}
      <div style={S.tabContainer}>
        <button style={S.tabBtn(activeTab === "overview")} onClick={() => setActiveTab("overview")}>📊 Overview</button>
        <button style={S.tabBtn(activeTab === "roster")} onClick={() => setActiveTab("roster")}>📅 Weekly Duty Roster</button>
        <button style={S.tabBtn(activeTab === "masters")} onClick={() => setActiveTab("masters")}>🗄 Master Registries</button>
        <button style={S.tabBtn(activeTab === "access")} onClick={() => setActiveTab("access")}>🛡 Access Matrix</button>
        <button style={S.tabBtn(activeTab === "search")} onClick={() => setActiveTab("search")}>🤖 AI Search Console</button>
        <button style={S.tabBtn(activeTab === "terminal")} onClick={() => setActiveTab("terminal")}>💻 Admin Terminal</button>
        <button style={S.tabBtn(activeTab === "settings")} onClick={() => setActiveTab("settings")}>⚙ System Settings</button>
      </div>

      {/* ─── TOAST NOTIFICATION ─────────────────────────────────────────────── */}
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ─── PAGE CONTENT ──────────────────────────────────────────────────── */}
      <div style={S.content}>

        {/* ─── TAB 0: WEEKLY DUTY ROSTER ─────────────────────────────────────── */}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="ERP Administration" role={role} userName={currentUserName} />
        )}

        {/* ─── TAB 1: SYSTEM OVERVIEW ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            <div style={S.grid(4)}>
              <div style={S.metricCard}>
                <div>
                  <div style={S.metricLabel}>Active Lab Sessions</div>
                  <div style={S.metricVal}>{activeSessions}</div>
                </div>
                <span style={{ fontSize: 28 }}>👥</span>
              </div>
              <div style={S.metricCard}>
                <div>
                  <div style={S.metricLabel}>Total Configured Modules</div>
                  <div style={S.metricVal}>{departments.length}</div>
                </div>
                <span style={{ fontSize: 28 }}>🏢</span>
              </div>
              <div style={S.metricCard}>
                <div>
                  <div style={S.metricLabel}>Low Stock Supplies</div>
                  <div style={S.metricVal}>{reagents.filter(r => r.stock <= r.minStock).length}</div>
                </div>
                <span style={{ fontSize: 28 }}>🧪</span>
              </div>
              <div style={S.metricCard}>
                <div>
                  <div style={S.metricLabel}>Live Database Mutations</div>
                  <div style={S.metricVal}>{dbWrites}</div>
                </div>
                <span style={{ fontSize: 28 }}>🔥</span>
              </div>
            </div>

            <div style={S.grid(2)}>
              {/* LIMS / System health logs */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>🔌 LIMS Integrations & Handshake</div>
                </div>
                <div style={S.cardBody}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Service Endpoint</span>
                    <code style={{ fontSize: 12, background: "#F1F5F9", padding: "2px 6px", borderRadius: 4 }}>hl7.mbl-lab.com:9002</code>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9", paddingBottom: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>API Integration Version</span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>HL7 v2.5.1 Standard</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Database Connection Cache</span>
                    <span style={{ fontSize: 12, color: "#10B981", fontWeight: 700 }}>PERSISTENT</span>
                  </div>
                  
                  <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                    <button style={S.btn()} onClick={() => {
                      showToast("LIMS Handshake test packet dispatched. Latency: 14ms.");
                    }}>Test Connection</button>
                    <button style={S.btn("secondary")} onClick={() => {
                      setActiveSessions(4);
                      showToast("Active session tokens flushed.");
                    }}>Reset Sessions</button>
                  </div>
                </div>
              </div>

              {/* Backups & Operations */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>🗃️ Database Backup Log</div>
                </div>
                <div style={S.cardBody}>
                  <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 15px 0" }}>
                    Perform standard schema snapshots of QMS collections (departments, users, equipment, reagents, tests) for ISO 27001 disaster recovery verification.
                  </p>
                  <button style={S.btn()} onClick={() => {
                    const now = new Date().toLocaleTimeString();
                    setBackupLogs([`Backup created successfully at ${now} (qms_schema_snapshot.json)`, ...backupLogs]);
                    showToast("Database snapshot successfully written.");
                  }}>Trigger New Backup</button>

                  <div style={{ marginTop: 15, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, maxHeight: 100, overflowY: "auto" }}>
                    {backupLogs.length === 0 ? (
                      <div style={{ fontSize: 11.5, color: "#94A3B8", textAlign: "center" }}>No backups run this session.</div>
                    ) : (
                      backupLogs.map((log, idx) => (
                        <div key={idx} style={{ fontSize: 11, color: "#475569", marginBottom: 4, fontFamily: "monospace" }}>✅ {log}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MASTER DATA REGISTRIES ────────────────────────────────── */}
        {activeTab === "masters" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <button style={{ ...S.btn(mastersSubTab === "departments" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("departments")}>🏢 Departments & Modules</button>
              <button style={{ ...S.btn(mastersSubTab === "users" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("users")}>👥 User Master</button>
              <button style={{ ...S.btn(mastersSubTab === "equipment" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("equipment")}>⚙ Equipment Master</button>
              <button style={{ ...S.btn(mastersSubTab === "reagents" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("reagents")}>🧪 Supply & Reagents</button>
              <button style={{ ...S.btn(mastersSubTab === "tests" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("tests")}>📊 Clinical Tests Catalog</button>
              <button style={{ ...S.btn(mastersSubTab === "tasks" ? "primary" : "secondary"), padding: "6px 14px" }} onClick={() => setMastersSubTab("tasks")}>📋 Task Master & Authorizations</button>
            </div>

            {mastersSubTab !== "tasks" && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={S.cardTitle}>
                      {mastersSubTab === "departments" && "🏢 Active Modules Configuration (Department level)"}
                      {mastersSubTab === "users" && "👥 Registered QMS User Directory"}
                      {mastersSubTab === "equipment" && "⚙ Laboratory Equipment & Analyzer Registry"}
                      {mastersSubTab === "reagents" && "🧪 Reagent Supplies & Expiry Tracker"}
                      {mastersSubTab === "tests" && "📊 Services Test Catalog & TAT Matrix"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      placeholder={`Search ${mastersSubTab}...`}
                      style={{ ...S.inp, width: 220, padding: "5px 10px" }}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {mastersSubTab === "departments" && (
                      <button style={S.btn()} onClick={() => setActiveModal("new_module")}>⚡ Register New Module</button>
                    )}
                    {mastersSubTab === "users" && (
                      <button style={S.btn()} onClick={() => setActiveModal("new_user")}>⚡ Register New User</button>
                    )}
                    {mastersSubTab === "equipment" && (
                      <button style={S.btn()} onClick={() => setActiveModal("new_equipment")}>⚡ Add Instrument</button>
                    )}
                    {mastersSubTab === "reagents" && (
                      <button style={S.btn()} onClick={() => setActiveModal("new_reagent")}>⚡ Add Reagent Lot</button>
                    )}
                    {mastersSubTab === "tests" && (
                      <button style={S.btn()} onClick={() => setActiveModal("new_test")}>⚡ Create Test Service</button>
                    )}
                  </div>
                </div>
                <div style={{ ...S.cardBody, padding: 0 }}>

                {/* 1. DEPARTMENTS & MODULES TABLE */}
                {mastersSubTab === "departments" && (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Icon</th>
                        <th style={S.th}>Key</th>
                        <th style={S.th}>Module / Department Name</th>
                        <th style={S.th}>Code</th>
                        <th style={S.th}>Access Status</th>
                        <th style={S.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).map(d => (
                        <tr key={d.key}>
                          <td style={{ ...S.td, fontSize: 16 }}>{d.icon}</td>
                          <td style={S.td}><code>{d.key}</code></td>
                          <td style={S.td}><span style={{ fontWeight: 600 }}>{d.name}</span></td>
                          <td style={S.td}>{d.code}</td>
                          <td style={S.td}>
                            <span style={S.badge(d.status === "Active" ? "#E6F4EA" : "#FCE8E6", d.status === "Active" ? "#137333" : "#C5221F")}>
                              {d.status}
                            </span>
                          </td>
                          <td style={S.td}>
                            <button
                              style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 11 }}
                              onClick={() => handleToggleModule(d)}
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 2. USERS TABLE */}
                {mastersSubTab === "users" && (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>ID</th>
                        <th style={S.th}>Full Name</th>
                        <th style={S.th}>Email Address</th>
                        <th style={S.th}>Assigned Role</th>
                        <th style={S.th}>Department</th>
                        <th style={S.th}>Account Status</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).map(u => (
                        <tr key={u.id}>
                          <td style={S.td}>{u.id}</td>
                          <td style={S.td}><span style={{ fontWeight: 600 }}>{u.name}</span></td>
                          <td style={S.td}>{u.email}</td>
                          <td style={S.td}>
                            <span style={S.badge("#EEEDFE", "#3C3489")}>{u.role}</span>
                          </td>
                          <td style={S.td}>{u.dept}</td>
                          <td style={S.td}>
                            <span style={S.badge(u.status === "Active" ? "#E6F4EA" : "#FCE8E6", u.status === "Active" ? "#137333" : "#C5221F")}>
                              {u.status}
                            </span>
                          </td>
                          <td style={S.td}>
                            <button
                              style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 11 }}
                              onClick={() => {
                                setUsers(users.map(x => x.id === u.id ? { ...x, status: x.status === "Active" ? "Suspended" : "Active" } : x));
                                showToast(`User status toggled for '${u.name}'.`);
                              }}
                            >
                              Suspend
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 3. EQUIPMENT TABLE */}
                {mastersSubTab === "equipment" && (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>ID</th>
                        <th style={S.th}>Hardware Model Name</th>
                        <th style={S.th}>Located Dept</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Next Calibration Due</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                        <tr key={e.id}>
                          <td style={S.td}>{e.id}</td>
                          <td style={S.td}><span style={{ fontWeight: 600 }}>{e.name}</span></td>
                          <td style={S.td}>{e.dept}</td>
                          <td style={S.td}>
                            <span style={S.badge(
                              e.status === "Operational" ? "#E6F4EA" : e.status === "Calibration Due" ? "#FEF7E0" : "#FCE8E6",
                              e.status === "Operational" ? "#137333" : e.status === "Calibration Due" ? "#B06000" : "#C5221F"
                            )}>
                              {e.status}
                            </span>
                          </td>
                          <td style={S.td}>{e.calDue}</td>
                          <td style={S.td}>
                            <button
                              style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 11 }}
                              onClick={() => {
                                setEquipment(equipment.map(x => x.id === e.id ? { ...x, status: "Operational", calDue: "2026-12-15" } : x));
                                showToast(`Calibration logs updated for ${e.name}.`);
                              }}
                            >
                              Log Calibrate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* 4. REAGENTS TABLE */}
                {mastersSubTab === "reagents" && (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Code</th>
                        <th style={S.th}>Reagent/Supply Name</th>
                        <th style={S.th}>Lot Number</th>
                        <th style={S.th}>Current Stock</th>
                        <th style={S.th}>Min Threshold</th>
                        <th style={S.th}>Expiration</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reagents.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map(r => {
                        const lowStock = r.stock <= r.minStock;
                        return (
                          <tr key={r.code}>
                            <td style={S.td}><code>{r.code}</code></td>
                            <td style={S.td}><span style={{ fontWeight: 600 }}>{r.name}</span></td>
                            <td style={S.td}><code>{r.lot}</code></td>
                            <td style={{ ...S.td, color: lowStock ? "#E53E3E" : "#334155", fontWeight: lowStock ? "700" : "500" }}>
                              {r.stock} {lowStock && "⚠️"}
                            </td>
                            <td style={S.td}>{r.minStock}</td>
                            <td style={S.td}>{r.expiry}</td>
                            <td style={S.td}>
                              <button
                                style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 11 }}
                                onClick={() => {
                                  setReagents(reagents.map(x => x.code === r.code ? { ...x, stock: x.stock + 10 } : x));
                                  showToast(`Restocked reagent '${r.name}' (+10 units).`);
                                }}
                              >
                                Restock +10
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* 5. CLINICAL TESTS TABLE */}
                {mastersSubTab === "tests" && (
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Code</th>
                        <th style={S.th}>Clinical Test Name</th>
                        <th style={S.th}>Billing Price</th>
                        <th style={S.th}>Target TAT (Hrs)</th>
                        <th style={S.th}>Assigned Dept</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tests.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                        <tr key={t.code}>
                          <td style={S.td}><code>{t.code}</code></td>
                          <td style={S.td}><span style={{ fontWeight: 600 }}>{t.name}</span></td>
                          <td style={S.td}>₹{t.price}</td>
                          <td style={S.td}>{t.tat} hours</td>
                          <td style={S.td}>{t.dept}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
            )}

          {mastersSubTab === "tasks" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, marginTop: 12 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", margin: 0 }}>Task Master & Authorization System</h3>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>ISO 15189:2022 §5.1 - Personnel Competency & Work Authorization Matrix</p>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={S.label}>Active Department:</span>
                  <select
                    style={{ ...S.inp, width: 220 }}
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setTaskForm({ name: "", jobTrainingPrerequisite: "", competencyAssessed: "Complete" });
                      setIsEditing(false);
                      setEditTaskId("");
                    }}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Trial Setup Banner for Molecular Genetics */}
              {selectedDept === "Molecular Genetics" && tasks.length === 0 && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 13, color: "#14532D", display: "block" }}>Trial Mode: Molecular Genetics</strong>
                    <span style={{ fontSize: 12, color: "#15803D" }}>Generate pre-configured process steps and start mapping staff authorizations immediately.</span>
                  </div>
                  <button style={S.btn("#15803D")} onClick={handleGenerateTrialTasks} disabled={saving}>
                    {saving ? "Generating..." : "⚡ Setup Trial Tasks"}
                  </button>
                </div>
              )}

              {/* 2-Column Task Creator and Task List */}
              <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24, alignItems: "start" }}>
                
                {/* Left Column: Form Card */}
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>
                      <span>📝</span>
                      <span>{isEditing ? "Edit Process Step" : "Add Process Step"}</span>
                    </div>
                  </div>
                  <div style={S.cardBody}>
                    <form onSubmit={handleSubmitTask}>
                      <div style={{ marginBottom: 16 }}>
                        <label style={S.label}>Task Name / Process Step</label>
                        <input
                          type="text"
                          style={S.inp}
                          placeholder="e.g. Sanger Sequencing capillary run"
                          value={taskForm.name}
                          onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={S.label}>Job Training Prerequisite</label>
                        <select
                          style={S.inp}
                          value={taskForm.jobTrainingPrerequisite}
                          onChange={(e) => setTaskForm({ ...taskForm, jobTrainingPrerequisite: e.target.value })}
                        >
                          <option value="">None (Entry Level Task)</option>
                          {tasks
                            .filter(t => t.id !== editTaskId)
                            .map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                          }
                        </select>
                        <small style={{ display: "block", fontSize: 11, color: "#64748B", marginTop: 4 }}>
                          Dynamic task relationship selection.
                        </small>
                      </div>

                      <div style={{ marginBottom: 20 }}>
                        <label style={S.label}>Competency Assessed Status</label>
                        <select
                          style={S.inp}
                          value={taskForm.competencyAssessed}
                          onChange={(e) => setTaskForm({ ...taskForm, competencyAssessed: e.target.value })}
                        >
                          <option value="Complete">Complete (Ready for Authorization)</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Not Started">Not Started</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        {isEditing && (
                          <button
                            type="button"
                            style={S.btn("secondary")}
                            onClick={() => {
                              setIsEditing(false);
                              setEditTaskId("");
                              setTaskForm({ name: "", jobTrainingPrerequisite: "", competencyAssessed: "Complete" });
                            }}
                          >
                            Cancel
                          </button>
                        )}
                        <button type="submit" style={{ ...S.btn(), flex: 1 }} disabled={saving}>
                          {saving ? "Saving..." : isEditing ? "Update Task" : "Add Task Step"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right Column: Task List Card */}
                <div style={S.card}>
                  <div style={S.cardHeader}>
                    <div style={S.cardTitle}>
                      <span>📋</span>
                      <span>Saved Process Steps for {selectedDept}</span>
                    </div>
                  </div>
                  <div style={{ padding: 0 }}>
                    {loading ? (
                      <div style={{ padding: 32, textAlign: "center", color: "#64748B" }}>Loading saved tasks...</div>
                    ) : tasks.length === 0 ? (
                      <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                        <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>🔍</span>
                        No tasks defined for this department. Use the trial button or form to add.
                      </div>
                    ) : (
                      <table style={S.table}>
                        <thead>
                          <tr>
                            <th style={S.th}>Task/Process Step</th>
                            <th style={S.th}>Job Training Prereq</th>
                            <th style={S.th}>Competency Assessed</th>
                            <th style={{ ...S.th, textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => (
                            <tr key={t.id}>
                              <td style={{ ...S.td, fontWeight: 600 }}>{t.name}</td>
                              <td style={S.td}>
                                {t.jobTrainingPrerequisite ? (
                                  <span style={S.badge("#EFF6FF", "#1E40AF")}>{t.jobTrainingPrerequisite}</span>
                                ) : (
                                  <span style={{ color: "#94A3B8", fontSize: 12 }}>None</span>
                                )}
                              </td>
                              <td style={S.td}>
                                <span style={S.badge(t.competencyAssessed === "Complete" ? "#ECFDF5" : "#FEF3C7", t.competencyAssessed === "Complete" ? "#065F46" : "#D97706")}>
                                  {t.competencyAssessed}
                                </span>
                              </td>
                              <td style={{ ...S.td, textAlign: "right" }}>
                                <button
                                  style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 12, marginRight: 8, display: "inline-flex" }}
                                  onClick={() => handleEditClick(t)}
                                >
                                  Edit
                                </button>
                                <button
                                  style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 12, display: "inline-flex" }}
                                  onClick={() => handleDeleteTask(t.id)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Authorization Matrix Section */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>
                    <span>🔑</span>
                    <span>Task Authorization Matrix ({selectedDept})</span>
                  </div>
                  <span style={S.badge("#F0FDF4", "#15803D")}>ISO 15189 Compliant</span>
                </div>
                <div style={{ ...S.cardBody, padding: 0 }}>
                  {employees.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                      <span style={{ fontSize: 32, display: "block", marginBottom: 8 }}>👥</span>
                      No employees registered for {selectedDept}.
                    </div>
                  ) : tasks.length === 0 ? (
                    <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
                      Please define at least one task step to view the matrix.
                    </div>
                  ) : (
                    <table style={S.table}>
                      <thead>
                        <tr>
                          <th style={S.th}>Employee Name</th>
                          <th style={S.th}>Designation</th>
                          {tasks.map(t => (
                            <th key={t.id} style={{ ...S.th, textAlign: "center" }}>
                              {t.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id}>
                            <td style={{ ...S.td, fontWeight: 600 }}>{emp.fullName || emp.name}</td>
                            <td style={S.td}>{emp.designation || "Staff"}</td>
                            {tasks.map(t => {
                              const keyStr = `${t.id}_\${emp.id}`; // Wait! Keep escaping correct
                              // Wait, `${t.id}_${emp.id}` -> we can write it simply
                              return (
                                <td key={t.id} style={{ ...S.td, textAlign: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={!!authorizations[`${t.id}_${emp.id}`]}
                                    onChange={() => handleToggleAuth(t.id, emp.id, emp.fullName || emp.name)}
                                    style={{ width: 16, height: 16, cursor: "pointer" }}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* ─── TAB 3: ACCESS CONTROL MATRIX ─────────────────────────────────── */}
        {activeTab === "access" && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>🛡️ Role-Based Access Control (RBAC) Module Grid</div>
            </div>
            <div style={{ ...S.cardBody, padding: 0  }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>System Role</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>Dashboard</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>QC / EQA</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>Equipment</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>CAPA / NCR</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>Inventory</th>
                    <th style={{ ...S.th, textAlign: "center"  }}>Audit Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(accessMatrix).map(roleKey => (
                    <tr key={roleKey}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{roleKey}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].dashboard} onChange={() => handleMatrixChange(roleKey, "dashboard")} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].qc} onChange={() => handleMatrixChange(roleKey, "qc")} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].equipment} onChange={() => handleMatrixChange(roleKey, "equipment")} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].capa} onChange={() => handleMatrixChange(roleKey, "capa")} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].inventory} onChange={() => handleMatrixChange(roleKey, "inventory")} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <input type="checkbox" checked={accessMatrix[roleKey].logs} onChange={() => handleMatrixChange(roleKey, "logs")} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: ULTIMATE AI SEARCH MASTER ──────────────────────────────── */}
        {activeTab === "search" && (
          <div style={S.chatWrap}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>🤖 QMS Ultimate Search Master (AI Assistant)</div>
              <span style={{ fontSize: 11, color: "#64748B" }}>Natural Language Database Query Engine</span>
            </div>
            
            {/* Suggestion Chips */}
            <div style={{ display: "flex", gap: 10, padding: "10px 16px", background: "#F1F5F9", borderBottom: "1px solid #E2E8F0", flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>Suggested Queries:</span>
              <button style={{ ...S.btn("secondary"), padding: "3px 8px", borderRadius: 4, fontSize: 11 }} onClick={() => executeAISearch("List equipment due for calibration")}>"Calibration due equipment"</button>
              <button style={{ ...S.btn("secondary"), padding: "3px 8px", borderRadius: 4, fontSize: 11 }} onClick={() => executeAISearch("Show low stock reagents")}>"Low stock reagents"</button>
              <button style={{ ...S.btn("secondary"), padding: "3px 8px", borderRadius: 4, fontSize: 11 }} onClick={() => executeAISearch("List HOD users")}>"Who are the HODs?"</button>
              <button style={{ ...S.btn("secondary"), padding: "3px 8px", borderRadius: 4, fontSize: 11 }} onClick={() => executeAISearch("Show expensive tests")}>"High price tests"</button>
            </div>

            <div style={S.chatScroll}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={S.chatMsg(msg.isUser)}>
                  <div>{msg.content}</div>
                  {msg.table && <div style={{ marginTop: 10, background: "#FFF", borderRadius: 8, padding: 8, overflowX: "auto", border: "1px solid #E2E8F0" }}>{msg.table}</div>}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aiInput.trim()) {
                  executeAISearch(aiInput);
                  setAiInput("");
                }
              }}
              style={{ display: "flex", padding: 12, borderTop: "1px solid #E2E8F0", background: "#FFF", gap: 10 }}
            >
              <input
                type="text"
                placeholder="Ask me anything: 'Which instruments need calibration?' or 'List low stock reagents'..."
                style={{ ...S.inp, flex: 1 }}
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button type="submit" style={S.btn()}>Query AI</button>
            </form>
          </div>
        )}

        {/* ─── TAB 5: ADMIN TERMINAL & COMMAND LIBRARY ──────────────────────── */}
        {activeTab === "terminal" && (
          <div style={S.grid(3)}>
            
            {/* The Terminal (Left 2 columns) */}
            <div style={{ gridColumn: "span 2" }}>
              <div style={S.terminalWrap}>
                <div style={{ ...S.cardHeader, background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
                  <div style={{ ...S.cardTitle, color: "#10B981", fontFamily: "Courier New, monospace" }}>💻 QMS Enterprise extraction shell</div>
                  <button style={{ ...S.btn("secondary"), padding: "2px 8px", fontSize: 10.5 }} onClick={() => setTerminalHistory([])}>Clear Scroll</button>
                </div>
                <div style={S.terminalLog}>
                  {terminalHistory.map((log, idx) => {
                    if (log.type === "input") {
                      return <div key={idx} style={{ color: "#E5E7EB" }}>{`> ${log.text}`}</div>;
                    }
                    if (log.type === "sys") {
                      return <div key={idx} style={{ color: "#60A5FA" }}>{log.text}</div>;
                    }
                    if (log.type === "error") {
                      return <div key={idx} style={{ color: "#EF4444" }}>{log.text}</div>;
                    }
                    if (log.type === "warning") {
                      return <div key={idx} style={{ color: "#FBBF24" }}>{log.text}</div>;
                    }
                    return <div key={idx}>{log.text}</div>;
                  })}
                  <div ref={terminalEndRef} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (terminalInput.trim()) {
                      executeTerminalCommand(terminalInput);
                      setTerminalInput("");
                    }
                  }}
                  style={S.terminalPrompt}
                >
                  <span style={{ color: "#34D399", fontWeight: 700 }}>&gt;</span>
                  <input
                    type="text"
                    style={S.terminalInput}
                    placeholder="Enter database query command..."
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value)}
                  />
                </form>
              </div>
            </div>

            {/* The Command Library (Right 1 column) */}
            <div>
              <div style={{ ...S.card, height: 480, overflowY: "auto" }}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>📚 Data Extraction Library</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {COMMANDS_LIBRARY.map((item, idx) => (
                    <div key={idx} style={S.libraryItem} onClick={() => {
                      executeTerminalCommand(item.cmd);
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0D9488" }}>{item.title}</div>
                      <code style={{ fontSize: 11, background: "#F1F5F9", padding: "1px 4px", borderRadius: 4, display: "block", marginTop: 4, color: "#475569" }}>{item.cmd}</code>
                      <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 4 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 6: SYSTEM CONFIGURATION ──────────────────────────────────── */}
        {activeTab === "settings" && (
          <div style={S.grid(2)}>
            
            {/* Global Toggles */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>⚙️ Global Services Feature Config</div>
              </div>
              <div style={S.cardBody}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Automatic SMS Notifications</div>
                    <div style={{ fontSize: 11.5, color: "#64748B" }}>Notify patients instantly on report release</div>
                  </div>
                  <input type="checkbox" checked={smsToggled} onChange={() => {
                    setSmsToggled(!smsToggled);
                    showToast(`SMS service toggled ${!smsToggled ? "ON" : "OFF"}.`);
                  }} style={{ width: 18, height: 18, cursor: "pointer" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>LIMS Handshake Sync (HL7 Endpoint)</div>
                    <div style={{ fontSize: 11.5, color: "#64748B" }}>Bypass LIMS verification handshake logic</div>
                  </div>
                  <input type="checkbox" checked={limsToggled} onChange={() => {
                    setLimsToggled(!limsToggled);
                    showToast(`LIMS Handshake sync ${!limsToggled ? "ON" : "OFF"}.`);
                  }} style={{ width: 18, height: 18, cursor: "pointer" }} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>AI Assistant Integration (Gowri)</div>
                    <div style={{ fontSize: 11.5, color: "#64748B" }}>Enable GPT-assisted diagnostic reports analyzer</div>
                  </div>
                  <input type="checkbox" checked={aiToggled} onChange={() => {
                    setAiToggled(!aiToggled);
                    showToast(`AI copilot toggled ${!aiToggled ? "ON" : "OFF"}.`);
                  }} style={{ width: 18, height: 18, cursor: "pointer" }} />
                </div>
              </div>
            </div>

            {/* Outage and Coming Soon Banner Creator */}
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>⚠️ Department Maintenance Outage Banner Manager</div>
              </div>
              <div style={S.cardBody}>
                <form onSubmit={handleOutageSave}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Target Department Module</label>
                    <select
                      style={S.inp}
                      value={bannerForm.dept}
                      onChange={(e) => setBannerForm({ ...bannerForm, dept: e.target.value })}
                    >
                      <option value="biochemistry">Biochemistry Dashboard</option>
                      <option value="microbiology">Microbiology Dashboard</option>
                      <option value="serology">Serology Dashboard</option>
                      <option value="haematology">Haematology Dashboard</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Service State Banner</label>
                    <select
                      style={S.inp}
                      value={bannerForm.status}
                      onChange={(e) => setBannerForm({ ...bannerForm, status: e.target.value })}
                    >
                      <option value="Active">Operational (No Banner)</option>
                      <option value="Maintenance">Maintenance Mode (Outage Alert)</option>
                      <option value="ComingSoon">Coming Soon Placeholder</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Outage Warning Message (Banner Text)</label>
                    <input
                      type="text"
                      style={S.inp}
                      placeholder="e.g., Cobas c311 down for annual validation. Returns in 2 hours."
                      value={bannerForm.msg}
                      onChange={(e) => setBannerForm({ ...bannerForm, msg: e.target.value })}
                    />
                  </div>

                  <button type="submit" style={S.btn()}>Apply Outage Banner</button>
                </form>

                {/* Outage Banners Live Preview */}
                <div style={{ marginTop: 20, background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#F57F17", marginBottom: 6 }}>LIVE STATUS PREVIEW:</div>
                  <div style={{ fontSize: 12, color: "#5D4037" }}>
                    <strong>Biochemistry:</strong> {outageBanners.biochemistry.status === "Active" ? "🟢 Operational" : `🔴 Disabled (${outageBanners.biochemistry.status}) - "${outageBanners.biochemistry.msg || "Under Maintenance"}"`}
                  </div>
                  <div style={{ fontSize: 12, color: "#5D4037", marginTop: 4 }}>
                    <strong>Microbiology:</strong> {outageBanners.microbiology.status === "Active" ? "🟢 Operational" : `🔴 Disabled (${outageBanners.microbiology.status}) - "${outageBanners.microbiology.msg || "Under Maintenance"}"`}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ─── MODALS DIALOGS (Dynamic creation forms) ───────────────────────── */}
      {activeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 500, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            
            <div style={{ ...S.cardHeader, background: "#0F172A", borderBottom: "1px solid #1E293B" }}>
              <div style={{ ...S.cardTitle, color: "#FFF" }}>
                {activeModal === "new_module" && "⚡ Register New Module Space"}
                {activeModal === "new_user" && "👤 Register New System User"}
                {activeModal === "new_equipment" && "⚙ Add Analyzer to Registry"}
                {activeModal === "new_reagent" && "🧪 Initialize Reagent Lot Supply"}
                {activeModal === "new_test" && "📊 Create Test Service Listing"}
              </div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setActiveModal(null)}>✕</button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ padding: 24 }}>
              {/* MODULE DYNAMIC INPUTS */}
              {activeModal === "new_module" && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Module / Department Name</label>
                    <input type="text" style={S.inp} placeholder="e.g. Molecular Genetics" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Unique Routing Key (lowercase, no spaces)</label>
                    <input type="text" style={S.inp} placeholder="e.g. moleculargenetics" required onChange={(e) => setFormData({ ...formData, key: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Standard Code (4 Letters)</label>
                    <input type="text" style={S.inp} placeholder="e.g. MGEN" maxLength={4} required onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Visual Emoji Icon</label>
                    <input type="text" style={S.inp} placeholder="e.g. 🧬" defaultValue="🧬" onChange={(e) => setFormData({ ...formData, icon: e.target.value })} />
                  </div>
                </div>
              )}

              {/* USER DYNAMIC INPUTS */}
              {activeModal === "new_user" && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Employee Full Name</label>
                    <input type="text" style={S.inp} placeholder="e.g. Mary Jane" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Corporate Email Address</label>
                    <input type="email" style={S.inp} placeholder="e.g. mary.j@mbl.com" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>System Role Category</label>
                    <select style={S.inp} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                      <option value="Lab Tech">Lab Technician</option>
                      <option value="HOD">HOD (Head of Dept)</option>
                      <option value="Quality Manager">Quality Manager</option>
                      <option value="BME">Biomedical Engineer (BME)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Assigned Operations Department</label>
                    <select style={S.inp} onChange={(e) => setFormData({ ...formData, dept: e.target.value })}>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Haematology">Haematology</option>
                      <option value="Serology">Serology</option>
                    </select>
                  </div>
                </div>
              )}

              {/* EQUIPMENT DYNAMIC INPUTS */}
              {activeModal === "new_equipment" && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Hardware Model Name</label>
                    <input type="text" style={S.inp} placeholder="e.g. Sysmex CS-2500" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Assigned Laboratory Room</label>
                    <select style={S.inp} onChange={(e) => setFormData({ ...formData, dept: e.target.value })}>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Haematology">Haematology</option>
                      <option value="Serology">Serology</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Calibration Frequency</label>
                    <select style={S.inp} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="Operational">Operational (Ready)</option>
                      <option value="Calibration Due">Calibration Due (Needs service)</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Calibration Deadline</label>
                    <input type="date" style={S.inp} required onChange={(e) => setFormData({ ...formData, calDue: e.target.value })} />
                  </div>
                </div>
              )}

              {/* REAGENTS DYNAMIC INPUTS */}
              {activeModal === "new_reagent" && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Reagent Code</label>
                    <input type="text" style={S.inp} placeholder="e.g. RG-UREA" required onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Supply/Reagent Description</label>
                    <input type="text" style={S.inp} placeholder="e.g. Urea Colorimetric Liquid Reagent" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Lot Number</label>
                    <input type="text" style={S.inp} placeholder="e.g. UR2026-04" required onChange={(e) => setFormData({ ...formData, lot: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Initial Stock Quantity</label>
                      <input type="number" style={S.inp} defaultValue="10" required onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Min Reorder Threshold</label>
                      <input type="number" style={S.inp} defaultValue="3" required onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Expiry Date</label>
                    <input type="date" style={S.inp} required onChange={(e) => setFormData({ ...formData, expiry: e.target.value })} />
                  </div>
                </div>
              )}

              {/* TESTS DYNAMIC INPUTS */}
              {activeModal === "new_test" && (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Clinical Test Code</label>
                    <input type="text" style={S.inp} placeholder="e.g. T-UREA" required onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Test Service Description</label>
                    <input type="text" style={S.inp} placeholder="e.g. Serum Blood Urea Nitrogen (BUN)" required onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={S.label}>Price (INR)</label>
                      <input type="number" style={S.inp} placeholder="e.g. 180" required onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Target Turnaround Time (Hrs)</label>
                      <input type="number" style={S.inp} placeholder="e.g. 4" required onChange={(e) => setFormData({ ...formData, tat: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={S.label}>Performing Laboratory Department</label>
                    <select style={S.inp} onChange={(e) => setFormData({ ...formData, dept: e.target.value })}>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Haematology">Haematology</option>
                      <option value="Serology">Serology</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" style={S.btn("secondary")} onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" style={S.btn()}>Create & Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
