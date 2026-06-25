// MaintenanceDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Maintenance Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #E2E8F0", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#1E293B" : "#64748B",
    background: active ? "#F1F5F9" : "transparent",
    borderLeft: active ? "4px solid #475569" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94A3B8" },
  card: { background: "#fff", border: "0.5px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#475569", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E2E8F0", color: "#64748B", fontWeight: 500, textAlign: "left", background: "#F8FAFC" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#475569", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "sop_title_page", label: "SOP - Title Page", icon: "📖", cat: "General & Personnel" },
  { key: "sop_auth", label: "SOP - Release Auth", icon: "🔑", cat: "General & Personnel" },
  { key: "sop_amendment", label: "SOP - Amendments", icon: "📝", cat: "General & Personnel" },
  { key: "sop_acknowledgement", label: "SOP - Acknowledgement", icon: "🤝", cat: "General & Personnel" },
  { key: "sop_duties", label: "Personnel Duties & Responsibilities", icon: "🧑‍💼", cat: "General & Personnel" },

  { key: "log_ac_central1", label: "Central AC Unit 1", icon: "❄️", cat: "AC & Climate Logs" },
  { key: "log_ac_central2", label: "Central AC Unit 2", icon: "❄️", cat: "AC & Climate Logs" },
  { key: "log_ac_room1", label: "Central AC - Room 1", icon: "❄️", cat: "AC & Climate Logs" },
  { key: "log_ac_room2", label: "Central AC - Room 2", icon: "❄️", cat: "AC & Climate Logs" },
  { key: "log_ac_10ton", label: "Central AC 10 Ton", icon: "❄️", cat: "AC & Climate Logs" },

  { key: "sop_ups", label: "SOP - UPS Operations", icon: "⚡", cat: "Electrical & Power Logs" },
  { key: "log_ups_room", label: "UPS Room Checklist", icon: "🔋", cat: "Electrical & Power Logs" },
  { key: "log_ups_reading", label: "UPS Daily Reading", icon: "📊", cat: "Electrical & Power Logs" },
  { key: "log_ups_maintenance", label: "UPS Maintenance", icon: "⚙️", cat: "Electrical & Power Logs" },
  { key: "sop_genset", label: "SOP - Genset Operations", icon: "🔌", cat: "Electrical & Power Logs" },
  { key: "log_genset1", label: "Genset 1 Volvo 250KVA", icon: "🚜", cat: "Electrical & Power Logs" },
  { key: "log_genset2", label: "Genset 2 Volvo 250KVA", icon: "🚜", cat: "Electrical & Power Logs" },
  { key: "log_genset2_copper1", label: "Genset 2 (Copper 125KVA)", icon: "🔌", cat: "Electrical & Power Logs" },
  { key: "log_genset2_copper2", label: "Genset 2 (Copper 125KVA) - B", icon: "🔌", cat: "Electrical & Power Logs" },
  { key: "log_power_monitoring", label: "Power Supply Monitor", icon: "📈", cat: "Electrical & Power Logs" },
  { key: "log_lpg", label: "LPG Log", icon: "🔥", cat: "Electrical & Power Logs" },

  { key: "log_ro", label: "Reverse Osmosis (RO)", icon: "💧", cat: "Utility & Safety Logs" },
  { key: "log_misc_ro", label: "Utility - RO & Solar Heater", icon: "☀️", cat: "Utility & Safety Logs" },
  { key: "log_vertical_garden", label: "Vertical Garden", icon: "🌱", cat: "Utility & Safety Logs" },
  { key: "log_high_dust", label: "High Dust Cleaning", icon: "🧹", cat: "Utility & Safety Logs" },
  { key: "log_lift", label: "Lift Log", icon: "🛗", cat: "Utility & Safety Logs" },
  { key: "log_uv_gf", label: "UV Exposure - GF", icon: "🔆", cat: "Utility & Safety Logs" },
  { key: "log_uv_ff", label: "UV Exposure - FF", icon: "🔆", cat: "Utility & Safety Logs" },
  { key: "log_reception_plant", label: "Reception Plant", icon: "🪴", cat: "Utility & Safety Logs" },
  { key: "log_tank_overhead", label: "Overhead Tank Cleaning", icon: "🪣", cat: "Utility & Safety Logs" },
  { key: "log_tank_underground", label: "Underground Tank Cleaning", icon: "🪣", cat: "Utility & Safety Logs" },
  { key: "log_tank_ro", label: "RO Tank Cleaning", icon: "🪣", cat: "Utility & Safety Logs" },
  { key: "log_tank_deionized", label: "Deionized Tank Cleaning", icon: "🪣", cat: "Utility & Safety Logs" },
  { key: "log_fire_extinguisher", label: "Fire Extinguisher", icon: "🧯", cat: "Utility & Safety Logs" },
  { key: "log_action_request", label: "Action Request Form (AR)", icon: "⚠️", cat: "Utility & Safety Logs" }
];

export default function MaintenanceDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  

  // Forms
  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
  });

  // Action Request Form (AR 018)
  const [arForm, setArForm] = useState({
    equipment: "",
    details: "",
    priority: "Normal",
    addressedDepartment: "Biomedical"
  });

  // Special Widgets states
  const [upsReading, setUpsReading] = useState({
    inputVoltage: "220",
    outputVoltage: "230",
    loadPercent: "50",
    batteryLevel: "100"
  });

  const [fireExtinguisher, setFireExtinguisher] = useState({
    feId: "FE-MBL-01",
    pressureDial: "Normal (Green Zone)",
    sealIntact: "Yes",
    nozzleClear: "Yes"
  });

  const [gensetCheck, setGensetCheck] = useState({
    fuelLevel: "80%",
    coolantLevel: "Normal",
    startedSuccessfully: "Yes",
    runTimeMin: "30"
  });

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "features"));
      if (settingsSnap.exists()) setFeatureFlags(settingsSnap.data());
      
      const empSnap = await getDocs(collection(db, "employees"));
      setEmployees(empSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabRecords = useCallback(async () => {
    try {
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Maintenance"), where("featureKey", "==", `maint_${activeTab}`), orderBy("createdAt", "desc")));
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

  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Maintenance",
        featureKey: `maint_${activeTab}`,
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

  const handleUPSSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const inV = parseFloat(upsReading.inputVoltage) || 0;
    const batt = parseFloat(upsReading.batteryLevel) || 0;
    const statusVal = (inV < 180 || inV > 260 || batt < 30) ? "Fail" : "Pass";

    if (statusVal === "Fail") {
      const logCapa = window.confirm(`UPS readings are abnormal (Input: ${upsReading.inputVoltage}V, Batt: ${upsReading.batteryLevel}%). Log a CAPA with Quality?`);
      if (logCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: "Maintenance UPS Fault",
            details: `UPS Input voltage read ${upsReading.inputVoltage}V, Battery level ${upsReading.batteryLevel}%.`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Staff"
          });
          alert("CAPA logged.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Maintenance",
        featureKey: "maint_log_ups_reading",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `Input: ${upsReading.inputVoltage}V | Output: ${upsReading.outputVoltage}V | Load: ${upsReading.loadPercent}% | Battery: ${upsReading.batteryLevel}%`,
          status: statusVal,
          remarks: statusVal === "Fail" ? "Abnormal conditions flagged" : "Normal operating limits"
        }
      });
      alert("UPS readings saved.");
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGensetSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const success = gensetCheck.startedSuccessfully === "Yes";
    const statusVal = success ? "Pass" : "Fail";

    if (!success) {
      const triggerAction = window.confirm("Genset start failed. Raise a breakdown/action request with Biomedical Engineering?");
      if (triggerAction) {
        try {
          await addDoc(collection(db, "actionRequests"), {
            addressedDepartment: "Biomedical",
            status: "Open",
            equipment: activeTab === "log_genset1" ? "Genset 1 Volvo Penta" : "Genset 2 Volvo Penta",
            details: "Genset failed to initiate test run. Engine start failure flagged.",
            createdAt: serverTimestamp(),
            createdBy: userName || "Staff"
          });
          alert("Breakdown action request logged with Biomedical Engineering.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Maintenance",
        featureKey: `maint_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `Fuel Level: ${gensetCheck.fuelLevel} | Coolant: ${gensetCheck.coolantLevel} | Started: ${gensetCheck.startedSuccessfully} | Run: ${gensetCheck.runTimeMin} mins`,
          status: statusVal,
          remarks: success ? "Weekly maintenance test run OK" : "CRITICAL: Engine start failure"
        }
      });
      alert("Genset check log saved.");
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleFireSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const passPressure = fireExtinguisher.pressureDial === "Normal (Green Zone)";
    const passSeal = fireExtinguisher.sealIntact === "Yes";
    const passNozzle = fireExtinguisher.nozzleClear === "Yes";
    const statusVal = (passPressure && passSeal && passNozzle) ? "Pass" : "Fail";

    if (statusVal === "Fail") {
      const confirmCapa = window.confirm(`Fire Extinguisher ${fireExtinguisher.feId} failed check. Log a CAPA with Quality department?`);
      if (confirmCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: `Fire Safety Failure - ${fireExtinguisher.feId}`,
            details: `Extinguisher check failed. Dial: ${fireExtinguisher.pressureDial}, Seal: ${fireExtinguisher.sealIntact}, Nozzle: ${fireExtinguisher.nozzleClear}`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Staff"
          });
          alert("CAPA Corrective Action logged.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Maintenance",
        featureKey: "maint_log_fire_extinguisher",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `${fireExtinguisher.feId} -> Dial: ${fireExtinguisher.pressureDial} | Seal: ${fireExtinguisher.sealIntact} | Nozzle: ${fireExtinguisher.nozzleClear}`,
          status: statusVal,
          remarks: statusVal === "Fail" ? "Failed checklist requirements" : "All safety elements OK"
        }
      });
      alert("Fire Extinguisher check recorded.");
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleActionRequestSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "actionRequests"), {
        addressedDepartment: arForm.addressedDepartment,
        status: "Open",
        equipment: arForm.equipment,
        details: `Reported from Maintenance: ${arForm.details} (Priority: ${arForm.priority})`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Maintenance HOD"
      });
      alert(`Action request form logged with ${arForm.addressedDepartment} department.`);
      
      // Also log locally in maintenance logs
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Maintenance",
        featureKey: "maint_log_action_request",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `AR raised to ${arForm.addressedDepartment} for ${arForm.equipment}`,
          status: "Pass",
          remarks: arForm.details
        }
      });

      setArForm({
        equipment: "",
        details: "",
        priority: "Normal",
        addressedDepartment: "Biomedical"
      });
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
        details: `Reported from Maintenance: ${details}`,
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
        source: `Maintenance ${title} Failure`,
        details: `Log run or check yielded fail value: ${val}.`,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("CAPA Corrective Action Request successfully logged.");
    } catch (e) {
      console.error(e);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`maint_${item.key}`] !== false);
  const categories = ["General & Personnel", "AC & Climate Logs", "Electrical & Power Logs", "Utility & Safety Logs"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E2E8F0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>Maintenance Console</div>
          <div style={{ fontSize: 9.5, color: "#475569", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
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
          <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading department configurations...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Department Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748B" }}>
                  Active Section: Engineering & Plant Maintenance | Operator: {userName || "Authorized Staff"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#F1F5F9", borderRadius: 8, border: "0.5px solid #E2E8F0", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#475569" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#1E293B" }}>System Online (ISO 27001 Secured)</span>
              </div>
            </div>

            {/* SOP PDF Viewers */}
            {activeTab.startsWith("sop_") && activeTab !== "sop_ups" && activeTab !== "sop_genset" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Controlled Document Reader</div></div>
                <div style={{ ...S.cardBody, background: "#F8FAFC", padding: 24 }}>
                  <div style={{ background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 8, padding: 30, maxWidth: 800, margin: "0 auto", minHeight: 400 }}>
                    <div style={{ borderBottom: "2px solid #1E293B", paddingBottom: 12, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>MICROBIOLOGICAL LABORATORY</div>
                        <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Maintenance & Facility Management SOPs</div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 10, color: "#64748B" }}>
                        <div>Document No: MBL/CBE/MAINT/SOP-MAN001</div>
                        <div>Version: 1.0 | Date: 01.03.2024</div>
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", borderBottom: "0.5px solid #CBD5E1", paddingBottom: 8 }}>
                      {TABS.find(t => t.key === activeTab)?.label}
                    </h3>

                    {activeTab === "sop_title_page" && (
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>STANDARD OPERATING PROCEDURE MANUAL</h2>
                          <p style={{ marginTop: 10 }}>Department of Infrastructure, Utility & Maintenance</p>
                          <p style={{ fontSize: 11, color: "#64748B" }}>Authorized for laboratory operations under ISO 15189:2022 guidelines.</p>
                        </div>
                      </div>
                    )}

                    {activeTab === "sop_auth" && (
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                        <p><strong>Release Authorization Statement:</strong></p>
                        <p>This manual defines the standard operations, logs, and quality check systems for the upkeep of physical plant utilities at the Microbiological Laboratory.</p>
                        <table style={{ ...S.table, marginTop: 20 }}>
                          <tbody>
                            <tr>
                              <td style={S.td}><strong>Prepared By:</strong> Dr. Chitra, Medical Administrator</td>
                              <td style={S.td}><strong>Reviewed By:</strong> Quality Manager</td>
                            </tr>
                            <tr>
                              <td style={S.td}><strong>Approved By:</strong> Technical Director</td>
                              <td style={S.td}><strong>Issued By:</strong> Managing Director</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === "sop_amendment" && (
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                        <p><strong>Amendment Record Sheet:</strong></p>
                        <table style={S.table}>
                          <thead>
                            <tr>
                              <th style={S.th}>Rev No</th>
                              <th style={S.th}>Date</th>
                              <th style={S.th}>Section Affected</th>
                              <th style={S.th}>Amendment Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={S.td}>00</td>
                              <td style={S.td}>01.03.2024</td>
                              <td style={S.td}>All</td>
                              <td style={S.td}>Initial release under ISO 15189:2022 compliance</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeTab === "sop_acknowledgement" && (
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                        <p><strong>Staff Acknowledgement Register:</strong></p>
                        <p>The following personnel have read, understood, and committed to execute standard maintenance protocols in accordance with this manual:</p>
                        <ol style={{ paddingLeft: 20 }}>
                          <li>Technical Staff - Facilities Management</li>
                          <li>Biomedical Officers</li>
                          <li>Contract Service Engineers (AC Centralized, Lift, RO Boiler)</li>
                        </ol>
                      </div>
                    )}

                    {activeTab === "sop_duties" && (
                      <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                        <p><strong>Duties and Responsibilities:</strong></p>
                        <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                          <li><strong>Maintenance Engineer:</strong> Daily inspection of central feeder lines, phase balances, and plant water lines.</li>
                          <li><strong>Electrical Officer:</strong> Daily UPS voltage logging, battery backup tests, and diesel generator startup cycles.</li>
                          <li><strong>Facility Staff:</strong> High dust mops, fire extinguisher pressure reviews, and garden landscaping maintenance.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Maintenance" role={role} userName={userName} />
        )}

            {/* Action Request Form (AR 018) */}
            {activeTab === "log_action_request" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Action Request Form (MBL/CBE/MAINT/AR 018)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleActionRequestSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Equipment/Facility Item Affected</span>
                        <input type="text" placeholder="e.g. Centrifuge or Central AC Unit 1" required value={arForm.equipment} onChange={(e) => setArForm({...arForm, equipment: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Addressed Department</span>
                        <select value={arForm.addressedDepartment} onChange={(e) => setArForm({...arForm, addressedDepartment: e.target.value})} style={S.inp}>
                          <option value="Biomedical">Biomedical Engineering</option>
                          <option value="IT">Information Technology (IT)</option>
                          <option value="Quality">Quality Assurance</option>
                          <option value="Purchase">Purchasing Dept</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Priority Level</span>
                        <select value={arForm.priority} onChange={(e) => setArForm({...arForm, priority: e.target.value})} style={S.inp}>
                          <option value="Low">Low / General Maintenance</option>
                          <option value="Normal">Normal</option>
                          <option value="Critical">Critical (Halts Laboratory Tests)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <span style={S.label}>Fault Details / Action Requested</span>
                      <textarea placeholder="Please describe the malfunction, voltage anomaly, or plumbing fault..." required value={arForm.details} onChange={(e) => setArForm({...arForm, details: e.target.value})} style={{ ...S.inp, height: 80, resize: "vertical", fontFamily: "inherit" }} />
                    </div>
                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Submit Action Request Form
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Special UPS Reading widget */}
            {activeTab === "log_ups_reading" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>UPS Operations & Battery Reading Log</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleUPSSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Input Voltage (Phase A-N)</span>
                      <input type="number" required value={upsReading.inputVoltage} onChange={(e) => setUpsReading({...upsReading, inputVoltage: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Output Voltage (Target 230V)</span>
                      <input type="number" required value={upsReading.outputVoltage} onChange={(e) => setUpsReading({...upsReading, outputVoltage: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Battery Capacity Level (%)</span>
                      <input type="number" required value={upsReading.batteryLevel} onChange={(e) => setUpsReading({...upsReading, batteryLevel: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Load Level (%)</span>
                      <input type="number" required value={upsReading.loadPercent} onChange={(e) => setUpsReading({...upsReading, loadPercent: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Save UPS Readings
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Special Genset Log sheets */}
            {(activeTab === "log_genset1" || activeTab === "log_genset2") && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Genset Weekly Run Test Log ({activeTab === "log_genset1" ? "Volvo 250KVA - Unit 1" : "Volvo 250KVA - Unit 2"})</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGensetSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Diesel Fuel Tank level</span>
                      <input type="text" required value={gensetCheck.fuelLevel} onChange={(e) => setGensetCheck({...gensetCheck, fuelLevel: e.target.value})} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Coolant / Oil Level</span>
                      <select value={gensetCheck.coolantLevel} onChange={(e) => setGensetCheck({...gensetCheck, coolantLevel: e.target.value})} style={S.inp}>
                        <option value="Normal">Normal / Full</option>
                        <option value="Low">Low (Requires top up)</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Started Successfully?</span>
                      <select value={gensetCheck.startedSuccessfully} onChange={(e) => setGensetCheck({...gensetCheck, startedSuccessfully: e.target.value})} style={S.inp}>
                        <option value="Yes">Yes (Passed)</option>
                        <option value="No">No (Failed / Misfire)</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Test Run Duration (Minutes)</span>
                      <input type="number" required value={gensetCheck.runTimeMin} onChange={(e) => setGensetCheck({...gensetCheck, runTimeMin: e.target.value})} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record Genset Run Log
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Special Fire Extinguisher Log sheets */}
            {activeTab === "log_fire_extinguisher" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Fire Safety Equipment Inspection (MBL/CBE/MAINT/FE 027)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleFireSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Extinguisher Identification No</span>
                      <select value={fireExtinguisher.feId} onChange={(e) => setFireExtinguisher({...fireExtinguisher, feId: e.target.value})} style={S.inp}>
                        <option value="FE-MBL-01">FE-MBL-01 (Reception)</option>
                        <option value="FE-MBL-02">FE-MBL-02 (Biochemistry)</option>
                        <option value="FE-MBL-03">FE-MBL-03 (Microbiology)</option>
                        <option value="FE-MBL-04">FE-MBL-04 (Server Room)</option>
                        <option value="FE-MBL-05">FE-MBL-05 (UPS Room)</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Pressure Indicator Dial</span>
                      <select value={fireExtinguisher.pressureDial} onChange={(e) => setFireExtinguisher({...fireExtinguisher, pressureDial: e.target.value})} style={S.inp}>
                        <option value="Normal (Green Zone)">Normal (Green Zone)</option>
                        <option value="Low Pressure (Red Zone)">Low Pressure (Red Zone)</option>
                        <option value="High Pressure (Yellow Zone)">Over-charged (Yellow Zone)</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Safety Lock & Seal Intact?</span>
                      <select value={fireExtinguisher.sealIntact} onChange={(e) => setFireExtinguisher({...fireExtinguisher, sealIntact: e.target.value})} style={S.inp}>
                        <option value="Yes">Yes</option>
                        <option value="No">No (Damaged/Broken)</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Discharge Hose & Nozzle Clear?</span>
                      <select value={fireExtinguisher.nozzleClear} onChange={(e) => setFireExtinguisher({...fireExtinguisher, nozzleClear: e.target.value})} style={S.inp}>
                        <option value="Yes">Yes</option>
                        <option value="No">No (Blocked/Damaged)</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "span 4", textAlign: "right" }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record Extinguisher Inspection
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generic interactive log form for checklists */}
            {activeTab !== "duty_roster" && activeTab !== "log_action_request" && activeTab !== "log_ups_reading" && activeTab !== "log_genset1" && activeTab !== "log_genset2" && activeTab !== "log_fire_extinguisher" && !activeTab.startsWith("sop_") && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>Facility Log Sheet Input</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericLogSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Inspector / Operator</span>
                      <input type="text" required value={genericForm.inspector} onChange={(e) => setGenericForm({ ...genericForm, inspector: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Observation Value / Details</span>
                      <input type="text" placeholder="e.g. Clean, Mopped, Normal pressure" required value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Status / Compliance</span>
                      <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                        <option value="Pass">Pass / Normal</option>
                        <option value="Fail">Fail / Action Needed</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Remarks / CAPA Details</span>
                      <input type="text" placeholder="Remarks" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {activeTab.startsWith("log_ac_") && (
                          <button type="button" onClick={() => triggerBreakdownReport("Centralized AC Unit")} style={S.btn("#EF4444", "#FEF2F2")}>
                            ⚠️ Report AC Unit Breakdown
                          </button>
                        )}
                        {activeTab === "log_lift" && (
                          <button type="button" onClick={() => triggerBreakdownReport("Lift / Elevator")} style={S.btn("#EF4444", "#FEF2F2")}>
                            ⚠️ Report Lift Malfunction
                          </button>
                        )}
                        {!activeTab.startsWith("log_ac_") && activeTab !== "log_lift" && genericForm.status === "Fail" && (
                          <button type="button" onClick={() => triggerCAPARequest(TABS.find(t => t.key === activeTab)?.label, genericForm.val)} style={S.btn("#EF4444", "#FEF2F2")}>
                            🚨 Log CAPA Ticket
                          </button>
                        )}
                      </div>
                      <button type="submit" disabled={saving} style={S.btn()}>Record Log Sheet Entry</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Display historic logs */}
            {activeTab !== "duty_roster" && !activeTab.startsWith("sop_") && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Quality Log Sheets History</div></div>
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
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No logs recorded for this section.</td>
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
                                background: log.data?.status === "Pass" ? "#D1FAE5" : "#FEE2E2",
                                color: log.data?.status === "Pass" ? "#065F46" : "#981B1B"
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