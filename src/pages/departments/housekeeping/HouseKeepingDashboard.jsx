// HouseKeepingDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant HouseKeeping Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F4FDFB", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #CCFBF1", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#115E59" : "#5F5E5A",
    background: active ? "#E6FDF9" : "transparent",
    borderLeft: active ? "4px solid #0D9488" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#99F6E4" },
  card: { background: "#fff", border: "0.5px solid #CCFBF1", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(13, 148, 136, 0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CCFBF1", background: "#F0FDFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#115E59" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #99F6E4", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#115E59", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#0D9488", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #CCFBF1", color: "#115E59", fontWeight: 500, textAlign: "left", background: "#F0FDFA" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #E6FDF9", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#115E59", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Authorisation Matrix", icon: "🔑", cat: "General & Personnel" },
  
  { key: "restroom_tissue_soap", label: "Rest Room - Tissue & Soap", icon: "🧼", cat: "Restroom Checklists" },
  { key: "restroom_towel", label: "Rest Room - Towel Change", icon: "🧻", cat: "Restroom Checklists" },
  { key: "restroom_vip1", label: "Rest Room - VIP 1", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_gents", label: "Rest Room - Gents (2)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_ladies", label: "Rest Room - Ladies (3)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_male_staff", label: "Rest Room - Male Staff (4)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_female_staff", label: "Rest Room - Female Staff (5)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_doctor", label: "Rest Room - Doctor 3F (6)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_md", label: "Rest Room - MD Cabin (7)", icon: "🚽", cat: "Restroom Checklists" },
  { key: "restroom_common", label: "Rest Room - Common (8)", icon: "🚽", cat: "Restroom Checklists" },

  { key: "sodium_hypo_refill", label: "Hypochlorite Refilling", icon: "🧪", cat: "Chemicals & Cleaning Logs" },
  { key: "sodium_hypo_reconstitute", label: "Hypochlorite Reconstitution", icon: "⚖️", cat: "Chemicals & Cleaning Logs" },
  { key: "daily_cleaning", label: "Daily Mopping & Waste", icon: "🧹", cat: "Chemicals & Cleaning Logs" },
  { key: "kitchen_cleaning", label: "Kitchen Cleaning", icon: "🍳", cat: "Chemicals & Cleaning Logs" },
  { key: "patient_food", label: "Patient Food Area", icon: "🍎", cat: "Chemicals & Cleaning Logs" },
  { key: "shoe_cleaner", label: "Shoe Cleaner Log", icon: "👞", cat: "Chemicals & Cleaning Logs" },

  { key: "water_container1", label: "Drinking Water - C1", icon: "💧", cat: "Utilities & Dispatch" },
  { key: "water_container2", label: "Drinking Water - C2", icon: "💧", cat: "Utilities & Dispatch" },
  { key: "water_container3", label: "Drinking Water - C3", icon: "💧", cat: "Utilities & Dispatch" },
  { key: "water_container4", label: "Drinking Water - C4", icon: "💧", cat: "Utilities & Dispatch" },
  { key: "coffee_machine", label: "Coffee Machine Log", icon: "☕", cat: "Utilities & Dispatch" },
  { key: "air_curtain", label: "Air Curtain check", icon: "🌬️", cat: "Utilities & Dispatch" },
  { key: "play_zone", label: "Play Zone check", icon: "🧸", cat: "Utilities & Dispatch" },
  { key: "stock_misc", label: "Miscellaneous Stock", icon: "📦", cat: "Utilities & Dispatch" },
  { key: "waste_dispatch", label: "Waste Dispatch Record", icon: "🚚", cat: "Utilities & Dispatch" }
];

export default function HouseKeepingDashboard({ role, userName }) {
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

  // Dilution Calculator (Sodium Hypochlorite Reconstitution)
  const [dilutionForm, setDilutionForm] = useState({
    startingConc: "5", // e.g. 5% commercial bleach
    targetConc: "1",   // e.g. 1% target dilution
    totalVolume: "1000" // e.g. 1000 ml
  });
  const [dilutionResult, setDilutionResult] = useState(null);

  // Waste Dispatch Register
  const [wasteForm, setWasteForm] = useState({
    yellowWeight: "",
    redWeight: "",
    blueWeight: "",
    whiteWeight: "",
    barcodeScanned: "Yes",
    receivingFacility: "Common Bio-Medical Waste Treatment Facility (CBWTF)",
    transporter: ""
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
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "HouseKeeping"), where("featureKey", "==", `hk_${activeTab}`), orderBy("createdAt", "desc")));
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

  // Recalculate dilution
  useEffect(() => {
    const s = parseFloat(dilutionForm.startingConc) || 0;
    const t = parseFloat(dilutionForm.targetConc) || 0;
    const vol = parseFloat(dilutionForm.totalVolume) || 0;
    if (s > 0 && t > 0 && vol > 0 && s > t) {
      const bleachRequired = (t * vol) / s;
      const waterRequired = vol - bleachRequired;
      setDilutionResult({
        bleach: bleachRequired.toFixed(1),
        water: waterRequired.toFixed(1)
      });
    } else {
      setDilutionResult(null);
    }
  }, [dilutionForm]);

  ;

  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "HouseKeeping",
        featureKey: `hk_${activeTab}`,
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

  const handleDilutionSubmit = async (e) => {
    e.preventDefault();
    if (!dilutionResult) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "HouseKeeping",
        featureKey: "hk_sodium_hypo_reconstitute",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `Prepared ${dilutionForm.targetConc}% Sodium Hypochlorite | Bleach: ${dilutionResult.bleach}ml | Water: ${dilutionResult.water}ml | Total: ${dilutionForm.totalVolume}ml`,
          status: "Pass",
          remarks: `Calculated dilution from ${dilutionForm.startingConc}% stock`
        }
      });
      alert("Bleach dilution record saved successfully.");
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleWasteSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const hasBarcode = wasteForm.barcodeScanned === "Yes";
    const statusVal = hasBarcode ? "Pass" : "Fail";

    if (!hasBarcode) {
      const confirmCapa = window.confirm("Waste dispatch without valid barcode scan violates ISO 27001 custody tracking rules. Log a CAPA request?");
      if (confirmCapa) {
        try {
          await addDoc(collection(db, "capa"), {
            source: "Housekeeping Waste Chain Security Fault",
            details: "BMW (Bio-medical waste) bag dispatched to CBWTF without barcode scan verification.",
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
        department: "HouseKeeping",
        featureKey: "hk_waste_dispatch",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `BMW Dispatch: Yellow [${wasteForm.yellowWeight || 0}kg], Red [${wasteForm.redWeight || 0}kg], Blue [${wasteForm.blueWeight || 0}kg], White [${wasteForm.whiteWeight || 0}kg] | Transporter: ${wasteForm.transporter}`,
          status: statusVal,
          remarks: `Facility: ${wasteForm.receivingFacility} | Barcode tracking: ${wasteForm.barcodeScanned}`
        }
      });
      alert("BMW Dispatch record logged.");
      setWasteForm({
        yellowWeight: "",
        redWeight: "",
        blueWeight: "",
        whiteWeight: "",
        barcodeScanned: "Yes",
        receivingFacility: "Common Bio-Medical Waste Treatment Facility (CBWTF)",
        transporter: ""
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const triggerCAPARequest = async (title, val) => {
    const confirm = window.confirm(`Failed cleanliness/stock check (${val}). Log a CAPA with Quality?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: `Housekeeping ${title} Failure`,
        details: `Log entry check failed. Observation: ${val}`,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff"
      });
      alert("CAPA Corrective Action logged.");
    } catch (err) {
      console.error(err);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`hk_${item.key}`] !== false);
  const categories = ["General & Personnel", "Restroom Checklists", "Chemicals & Cleaning Logs", "Utilities & Dispatch"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #CCFBF1" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#115E59" }}>Housekeeping Console</div>
          <div style={{ fontSize: 9.5, color: "#0D9488", marginTop: 2, fontWeight: 500 }}>ISO 15189 & 27001 Monitoring</div>
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
          <div style={{ padding: 40, textAlign: "center", color: "#115E59", fontSize: 13 }}>Loading department configurations...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#115E59", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Department Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#5F5E5A" }}>
                  Active Section: Sanitization & Waste Management | Operator: {userName || "Housekeeping Staff"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#F0FDFA", borderRadius: 8, border: "0.5px solid #CCFBF1", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0D9488" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#115E59" }}>System Secure (ISO 27001)</span>
              </div>
            </div>

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Housekeeping" role={role} userName={userName} />
        )}

            {/* Authorisation Matrix */}
            {activeTab === "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Responsibility & Authorisation Matrix</div></div>
                <div style={S.cardBody}>
                  <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#5F5E5A" }}>
                    Staff authorization and responsibilities register under ISO 15189:2022.
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
                        <td style={S.td}><strong>Housekeeping Supervisor</strong></td>
                        <td style={S.td}>Checklists oversight, chemical concentration validation, stock records</td>
                        <td style={S.td}>Edit & Approve logs</td>
                        <td style={S.td}>Dilution safety, bio-hazard waste management</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>Cleaning Officer</strong></td>
                        <td style={S.td}>Restroom checks, mopping, dusting, waste removal</td>
                        <td style={S.td}>Write logs</td>
                        <td style={S.td}>PPE usage, spill management</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sodium Hypochlorite Reconstitution dilution calculator */}
            {activeTab === "sodium_hypo_reconstitute" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Sodium Hypochlorite Dilution Calculator</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleDilutionSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Starting Stock Concentration (%)</span>
                        <input type="number" step="0.1" required value={dilutionForm.startingConc} onChange={(e) => setDilutionForm({...dilutionForm, startingConc: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Target Dilution Concentration (%)</span>
                        <select value={dilutionForm.targetConc} onChange={(e) => setDilutionForm({...dilutionForm, targetConc: e.target.value})} style={S.inp}>
                          <option value="0.5">0.5% (General Cleaning)</option>
                          <option value="1.0">1.0% (General spill kits)</option>
                          <option value="2.0">2.0% (Critical spill kit refills)</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Total Diluted Volume Needed (ml)</span>
                        <input type="number" required value={dilutionForm.totalVolume} onChange={(e) => setDilutionForm({...dilutionForm, totalVolume: e.target.value})} style={S.inp} />
                      </div>
                    </div>

                    {dilutionResult && (
                      <div style={{ padding: "12px 16px", background: "#F0FDFA", border: "0.5px solid #5DCAA5", borderRadius: 8, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#115E59" }}>Dilution Instructions:</div>
                          <div style={{ fontSize: 11.5, color: "#0F6E56", marginTop: 4 }}>
                            Mix <strong>{dilutionResult.bleach} ml</strong> of starting sodium hypochlorite bleach with <strong>{dilutionResult.water} ml</strong> of clean water to obtain <strong>{dilutionForm.totalVolume} ml</strong> of {dilutionForm.targetConc}% solution.
                          </div>
                        </div>
                        <button type="submit" disabled={saving} style={S.btn()}>
                          Record Preparation Log
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Waste Dispatch Register */}
            {activeTab === "waste_dispatch" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Bio-Medical Waste Dispatch Register</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleWasteSubmit}>
                    <div style={S.grid(4)}>
                      <div>
                        <span style={S.label}>Yellow Bag Weight (kg)</span>
                        <input type="number" step="0.01" placeholder="e.g. 4.2" required value={wasteForm.yellowWeight} onChange={(e) => setWasteForm({...wasteForm, yellowWeight: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Red Bag Weight (kg)</span>
                        <input type="number" step="0.01" placeholder="e.g. 3.5" required value={wasteForm.redWeight} onChange={(e) => setWasteForm({...wasteForm, redWeight: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Blue Bag/Container Weight (kg)</span>
                        <input type="number" step="0.01" placeholder="e.g. 1.8" required value={wasteForm.blueWeight} onChange={(e) => setWasteForm({...wasteForm, blueWeight: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>White Container Weight (kg)</span>
                        <input type="number" step="0.01" placeholder="e.g. 0.9" required value={wasteForm.whiteWeight} onChange={(e) => setWasteForm({...wasteForm, whiteWeight: e.target.value})} style={S.inp} />
                      </div>
                    </div>
                    <div style={{ ...S.grid(3), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Barcodes Scanned and Verified?</span>
                        <select value={wasteForm.barcodeScanned} onChange={(e) => setWasteForm({...wasteForm, barcodeScanned: e.target.value})} style={S.inp}>
                          <option value="Yes">Yes (Scanned & Verified)</option>
                          <option value="No">No (Failed / Mismatch)</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Receiving Disposal Facility</span>
                        <input type="text" readOnly value={wasteForm.receivingFacility} style={{ ...S.inp, background: "#F3F4F6", color: "#6B7280" }} />
                      </div>
                      <div>
                        <span style={S.label}>Transporter / Driver Name</span>
                        <input type="text" required placeholder="e.g. Ram Singh" value={wasteForm.transporter} onChange={(e) => setWasteForm({...wasteForm, transporter: e.target.value})} style={S.inp} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Log Dispatch Details
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generic interactive log form for checklists */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && activeTab !== "sodium_hypo_reconstitute" && activeTab !== "waste_dispatch" && (
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>New Checklist / Observation entry</div>
                </div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericLogSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Staff / Inspector Name</span>
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
                      <span style={S.label}>Remarks / CAPA Trigger</span>
                      <input type="text" placeholder="Remarks" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {genericForm.status === "Fail" && (
                          <button type="button" onClick={() => triggerCAPARequest(TABS.find(t => t.key === activeTab)?.label, genericForm.val)} style={S.btn("#DC2626", "#FEE2E2")}>
                            🚨 Create CAPA Log
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
                        <th style={S.th}>Inspector/Operator</th>
                        <th style={S.th}>Observations</th>
                        <th style={S.th}>Status/Value</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#115E59" }}>No logs recorded for this section.</td>
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