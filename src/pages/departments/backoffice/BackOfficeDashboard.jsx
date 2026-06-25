// BackOfficeDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant BackOffice Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F5F3FF", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #DDD6FE", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#312E81" : "#5F5E6A",
    background: active ? "#EEF2FF" : "transparent",
    borderLeft: active ? "4px solid #4F46E5" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#A78BFA" },
  card: { background: "#fff", border: "0.5px solid #DDD6FE", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(79, 70, 229, 0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #DDD6FE", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#312E81" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #C4B5FD", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#312E81", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#4F46E5", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.2s ease"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #DDD6FE", color: "#312E81", fontWeight: 500, textAlign: "left", background: "#F5F3FF" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #EEF2FF", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#312E81", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Authorization Matrix", icon: "🔑", cat: "General & Personnel" },

  { key: "sample_receiving", label: "Sample Receipt Desk", icon: "📥", cat: "Specimen Logistics" },
  { key: "sorting_distribution", label: "Sorting & Distribution", icon: "📂", cat: "Specimen Logistics" },
  { key: "transit_time_outliers", label: "Transit Time Outliers", icon: "⏱️", cat: "Specimen Logistics" },
  { key: "temp_transport", label: "Cold Box Temperature", icon: "❄️", cat: "Specimen Logistics" },

  { key: "non_conformance", label: "Non-Conformance log", icon: "⚠️", cat: "Quality & Incidents" },
  { key: "communication_issues", label: "Logistics Communications", icon: "🗣️", cat: "Quality & Incidents" },
  { key: "verbal_request", label: "Verbal Request Log", icon: "📞", cat: "Quality & Incidents" },

  { key: "inventory", label: "Logistics Inventory", icon: "📦", cat: "Support Operations" },
  { key: "housekeeping", label: "Housekeeping Record", icon: "🧹", cat: "Support Operations" }
];

export default function BackOfficeDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Date State for Roster
  

  // Transit Time Calculator Form
  const [transitForm, setTransitForm] = useState({
    batchId: "",
    courierName: "",
    sourceCenter: "Downtown Collection Clinic",
    dispatchTime: "",
    arrivalTime: "",
    coldBoxId: "BOX-A03"
  });
  const [calculatedMinutes, setCalculatedMinutes] = useState(null);

  // Cold Box Temperature Monitor Form
  const [tempForm, setTempForm] = useState({
    coldBoxId: "BOX-A03",
    boxTemperature: "",
    loggerChecked: "Yes",
    icePackStatus: "Intact",
    remarks: ""
  });

  // Generic forms
  const [genericForm, setGenericForm] = useState({
    inspector: userName || "", val: "", status: "Pass", remarks: ""
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
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Back Office"), where("featureKey", "==", `bo_${activeTab}`), orderBy("createdAt", "desc")));
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

  // Track transit minutes updates
  useEffect(() => {
    if (transitForm.dispatchTime && transitForm.arrivalTime) {
      const d = new Date(`2026-06-17T${transitForm.dispatchTime}`);
      const a = new Date(`2026-06-17T${transitForm.arrivalTime}`);
      let diff = (a - d) / 1000 / 60; // diff in minutes
      if (diff < 0) diff += 24 * 60; // handle midnight rollover
      setCalculatedMinutes(Math.round(diff));
    } else {
      setCalculatedMinutes(null);
    }
  }, [transitForm.dispatchTime, transitForm.arrivalTime]);

  ;

  const handleTransitSubmit = async (e) => {
    e.preventDefault();
    if (calculatedMinutes === null) return;
    setSaving(true);

    const isOutlier = calculatedMinutes > 120;
    const statusVal = isOutlier ? "Outlier" : "Pass";

    if (isOutlier) {
      const confirmCapa = window.confirm(`Transit time of ${calculatedMinutes} minutes exceeds the 120-minute threshold. Log a CAPA for home/clinic transport delay?`);
      if (confirmCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: `Specimen Transport Outlier (Batch: ${transitForm.batchId})`,
            details: `Courier: ${transitForm.courierName} | Route: ${transitForm.sourceCenter} -> Main Lab | Transit Duration: ${calculatedMinutes} minutes (Threshold: 120 mins).`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Logistics Staff"
          });
          alert("Logistics CAPA created.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Back Office",
        featureKey: "bo_transit_time_outliers",
        createdAt: serverTimestamp(),
        createdBy: userName || "Logistics Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Logistics Staff",
          val: `Batch: ${transitForm.batchId} | Transit time: ${calculatedMinutes} mins | Dispatch: ${transitForm.dispatchTime} | Arrival: ${transitForm.arrivalTime}`,
          status: statusVal,
          remarks: `Courier: ${transitForm.courierName} | Source: ${transitForm.sourceCenter} | Box: ${transitForm.coldBoxId}`
        }
      });
      alert("Transit log sheet entry recorded.");
      setTransitForm({
        batchId: "",
        courierName: "",
        sourceCenter: "Downtown Collection Clinic",
        dispatchTime: "",
        arrivalTime: "",
        coldBoxId: "BOX-A03"
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleTempSubmit = async (e) => {
    e.preventDefault();
    const temp = parseFloat(tempForm.boxTemperature) || 0.0;
    const isOut = temp < 2.0 || temp > 8.0;
    const statusVal = isOut ? "Fail" : "Pass";

    setSaving(true);

    if (isOut) {
      const confirmCapa = window.confirm(`Cold chain temperature of ${temp}°C is outside the target range (2.0°C - 8.0°C). Log a CAPA?`);
      if (confirmCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: `Cold Chain Integrity Failure (Box: ${tempForm.coldBoxId})`,
            details: `Box temperature reading: ${temp}°C (normal bounds: 2-8°C). Ice pack status: ${tempForm.icePackStatus}. Specimen integrity risk.`,
            status: "Open",
            createdAt: serverTimestamp(),
            createdBy: userName || "Logistics Staff"
          });
          alert("Cold chain integrity CAPA registered.");
        } catch (err) {
          console.error(err);
        }
      }
    }

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Back Office",
        featureKey: "bo_temp_transport",
        createdAt: serverTimestamp(),
        createdBy: userName || "Logistics Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Logistics Staff",
          val: `Box ${tempForm.coldBoxId} Temp: ${tempForm.boxTemperature}°C | Logger: ${tempForm.loggerChecked}`,
          status: statusVal,
          remarks: `Ice packs: ${tempForm.icePackStatus}. ${tempForm.remarks}`
        }
      });
      alert("Cold Box Temperature Log recorded.");
      setTempForm({
        coldBoxId: "BOX-A03",
        boxTemperature: "",
        loggerChecked: "Yes",
        icePackStatus: "Intact",
        remarks: ""
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Back Office",
        featureKey: `bo_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "Logistics Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: genericForm.inspector,
          val: genericForm.val,
          status: genericForm.status,
          remarks: genericForm.remarks
        }
      });
      alert("Log Entry saved.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const triggerCAPAFromGeneric = async (title, val) => {
    const confirm = window.confirm(`Log a CAPA request with Quality for failed check (${val})?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: `BackOffice ${title} Logistics Fault`,
        details: `Observation recorded: ${val}`,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Logistics Staff"
      });
      alert("CAPA Corrective Action logged.");
    } catch (err) {
      console.error(err);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`bo_${item.key}`] !== false);
  const categories = ["General & Personnel", "Specimen Logistics", "Quality & Incidents", "Support Operations"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #DDD6FE" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#312E81" }}>Logistics Desk</div>
          <div style={{ fontSize: 9.5, color: "#4F46E5", marginTop: 2, fontWeight: 500 }}>ISO 15189 Specimen Entry</div>
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
                  onClick={() => { setActiveTab(item.key); setLogs([]); setCalculatedMinutes(null); }}
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
          <div style={{ padding: 40, textAlign: "center", color: "#312E81", fontSize: 13 }}>Loading department configurations...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#312E81", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Logistics Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#5F5E6A" }}>
                  Active Section: Specimen Sorting Room & Logistics | Operator: {userName || "Logistics Officer"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#EEF2FF", borderRadius: 8, border: "0.5px solid #DDD6FE", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4F46E5" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#312E81" }}>ISO 15189 Track active</span>
              </div>
            </div>

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Back Office" role={role} userName={userName} />
        )}

            {/* Authorization Matrix */}
            {activeTab === "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Responsibility & Authorization Matrix</div></div>
                <div style={S.cardBody}>
                  <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#5F5E6A" }}>
                    Staff responsibility mappings for sample receiving and barcode allocation under ISO 15189.
                  </p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Role / Category</th>
                        <th style={S.th}>Authorized Duties</th>
                        <th style={S.th}>Access Level</th>
                        <th style={S.th}>Training Required</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={S.td}><strong>Logistics Supervisor</strong></td>
                        <td style={S.td}>Roster management, transit times audits, temperature logger configuration</td>
                        <td style={S.td}>Edit & Approve logs</td>
                        <td style={S.td}>Cold-chain logistics, specimen integrity criteria</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>BackOffice Clerk</strong></td>
                        <td style={S.td}>Unboxing samples, barcode matching, transport temp checks, sorting</td>
                        <td style={S.td}>Write logs</td>
                        <td style={S.td}>Bio-safety hazard handling, sorting procedure</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transit Time Outlier Calculator */}
            {activeTab === "transit_time_outliers" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Sample Transit Time Calculator & Register</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleTransitSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Batch ID Number</span>
                        <input type="text" placeholder="e.g. BATCH-8841" required value={transitForm.batchId} onChange={(e) => setTransitForm({...transitForm, batchId: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Courier / Driver Name</span>
                        <input type="text" placeholder="e.g. Vikram Sen" required value={transitForm.courierName} onChange={(e) => setTransitForm({...transitForm, courierName: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Cold Box ID</span>
                        <select value={transitForm.coldBoxId} onChange={(e) => setTransitForm({...transitForm, coldBoxId: e.target.value})} style={S.inp}>
                          <option value="BOX-A01">BOX-A01 (Medium)</option>
                          <option value="BOX-A02">BOX-A02 (Medium)</option>
                          <option value="BOX-A03">BOX-A03 (Large)</option>
                          <option value="BOX-C99">BOX-C99 (Critical-Ice)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ ...S.grid(3), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Dispatch Time (From Clinic)</span>
                        <input type="time" required value={transitForm.dispatchTime} onChange={(e) => setTransitForm({...transitForm, dispatchTime: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Arrival Time (At Main Lab)</span>
                        <input type="time" required value={transitForm.arrivalTime} onChange={(e) => setTransitForm({...transitForm, arrivalTime: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Source Collection Center</span>
                        <input type="text" required value={transitForm.sourceCenter} onChange={(e) => setTransitForm({...transitForm, sourceCenter: e.target.value})} style={S.inp} />
                      </div>
                    </div>

                    {calculatedMinutes !== null && (
                      <div style={{
                        padding: "12px 16px",
                        background: calculatedMinutes > 120 ? "#FEE2E2" : "#EEF2FF",
                        border: calculatedMinutes > 120 ? "0.5px solid #FCA5A5" : "0.5px solid #C4B5FD",
                        borderRadius: 8, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: calculatedMinutes > 120 ? "#991B1B" : "#312E81" }}>
                            Transit Duration: {calculatedMinutes} Minutes
                          </div>
                          <div style={{ fontSize: 11.5, color: calculatedMinutes > 120 ? "#B91C1C" : "#4338CA", marginTop: 4 }}>
                            {calculatedMinutes > 120
                              ? "⚠️ Warning: Target maximum is 120 minutes. This batch is flagged as a transit outlier."
                              : "✓ Compliant: Transport completed within the 120-minute threshold."}
                          </div>
                        </div>
                        <button type="submit" disabled={saving} style={S.btn(calculatedMinutes > 120 ? "#DC2626" : "#4F46E5")}>
                          Log Transit Record
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Cold Box Temperature Monitor */}
            {activeTab === "temp_transport" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Cold Box Transport Temperature Audit Form</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleTempSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Cold Box ID</span>
                        <select value={tempForm.coldBoxId} onChange={(e) => setTempForm({...tempForm, coldBoxId: e.target.value})} style={S.inp}>
                          <option value="BOX-A01">BOX-A01 (Medium)</option>
                          <option value="BOX-A02">BOX-A02 (Medium)</option>
                          <option value="BOX-A03">BOX-A03 (Large)</option>
                          <option value="BOX-C99">BOX-C99 (Critical-Ice)</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Unboxing Temp Reading (°C)</span>
                        <input type="number" step="0.1" required placeholder="e.g. 4.5" value={tempForm.boxTemperature} onChange={(e) => setTempForm({...tempForm, boxTemperature: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Data Logger Present & Active?</span>
                        <select value={tempForm.loggerChecked} onChange={(e) => setTempForm({...tempForm, loggerChecked: e.target.value})} style={S.inp}>
                          <option value="Yes">Yes (Checked & Synced)</option>
                          <option value="No">No (Logger Missing/Inactive)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ ...S.grid(2), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Gel Ice Pack Condition</span>
                        <select value={tempForm.icePackStatus} onChange={(e) => setTempForm({...tempForm, icePackStatus: e.target.value})} style={S.inp}>
                          <option value="Intact">Intact / Partially Frozen (Good)</option>
                          <option value="Melted">Melted / Liquid (Failure)</option>
                          <option value="None">No Ice Packs Present</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>General Observations</span>
                        <input type="text" placeholder="Remarks" value={tempForm.remarks} onChange={(e) => setTempForm({...tempForm, remarks: e.target.value})} style={S.inp} />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                      <span style={{ fontSize: 11, color: "#4F46E5", fontWeight: 500 }}>
                        Target cold chain: <strong>2.0°C – 8.0°C</strong> (ISO 15189 Clause 7.2.5)
                      </span>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record Temperature Audit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generic checklist form */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && activeTab !== "transit_time_outliers" && activeTab !== "temp_transport" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>New Checklist / Observation entry</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericLogSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Officer / Operator</span>
                      <input type="text" required value={genericForm.inspector} onChange={(e) => setGenericForm({ ...genericForm, inspector: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Observation Details / Value</span>
                      <input type="text" placeholder="e.g. Sorted, Barcoded, Normal status" required value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Status Compliance</span>
                      <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                        <option value="Pass">Pass / Compliant</option>
                        <option value="Fail">Fail / Action Needed</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Remarks</span>
                      <input type="text" placeholder="Remarks" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {genericForm.status === "Fail" && (
                          <button type="button" onClick={() => triggerCAPAFromGeneric(TABS.find(t => t.key === activeTab)?.label, genericForm.val)} style={S.btn("#DC2626", "#FEE2E2")}>
                            🚨 Create CAPA Request
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
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Quality Log Sheets History</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Operator/Inspector</th>
                        <th style={S.th}>Observations</th>
                        <th style={S.th}>Status/Value</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#312E81" }}>No logs recorded for this section.</td>
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
                                background: log.data?.status === "Pass" ? "#D1FAE5" : log.data?.status === "Outlier" ? "#FEF3C7" : "#FEE2E2",
                                color: log.data?.status === "Pass" ? "#065F46" : log.data?.status === "Outlier" ? "#D97706" : "#981B1B"
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