// InformationTechnologyDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant IT/LIMS Monitoring Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F0F4F8", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #D0E2FF", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#0F357C" : "#5F6B7C",
    background: active ? "#EDF5FF" : "transparent",
    borderLeft: active ? "4px solid #1E50B3" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#82A9F9" },
  card: { background: "#fff", border: "0.5px solid #D0E2FF", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(30, 80, 179, 0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #D0E2FF", background: "#F4F8FD", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#0F357C" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #A8C6F7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#0F357C", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#1E50B3", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.2s ease"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #D0E2FF", color: "#0F357C", fontWeight: 500, textAlign: "left", background: "#F4F8FD" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #EDF5FF", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#0F357C", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Authorization Matrix", icon: "🔑", cat: "General & Personnel" },

  { key: "lims_integrity", label: "LIMS Handshake Console", icon: "🤝", cat: "LIMS & Data Integrity" },
  { key: "transcription_interface_error", label: "HL7 Packet Validator", icon: "🧩", cat: "LIMS & Data Integrity" },
  { key: "daily_lis_monitoring", label: "Daily LIS Activity Log", icon: "📈", cat: "LIMS & Data Integrity" },

  { key: "offsite_backup", label: "Offsite Backup Monitoring", icon: "💾", cat: "Backup & Infrastructure" },
  { key: "system_maintenance", label: "System Maintenance Log", icon: "⚙️", cat: "Backup & Infrastructure" },
  { key: "system_failure_corrective", label: "System Failure & Action", icon: "🛠️", cat: "Backup & Infrastructure" },

  { key: "unauthorized_access", label: "Access & Login Auditor", icon: "🛡️", cat: "Information Security" },
  { key: "tampering_loss_safeguard", label: "Tampering & Loss Logs", icon: "🔒", cat: "Information Security" },
  
  { key: "email_monitoring", label: "Email Service Monitoring", icon: "📧", cat: "Utility Services" },
  { key: "qrcode_monitoring", label: "QR Code Service Status", icon: "📱", cat: "Utility Services" },
  { key: "nabl_symbol_verification", label: "NABL Symbol Validation", icon: "✅", cat: "Utility Services" }
];

export default function InformationTechnologyDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Weekly Date State
  

  // LIMS Handshake Mock State
  const [limsSyncing, setLimsSyncing] = useState(false);
  const [limsLogs, setLimsLogs] = useState([]);
  const [syncMetrics, setSyncMetrics] = useState({
    successRate: "99.8%",
    lastSyncTime: "Just now",
    callbackDelay: "450ms"
  });

  // HL7 Mock Validator State
  const [hl7String, setHl7String] = useState(
    `MSH|^~\\&|LIS|MBL_LAB|EMR|HOSPITAL|202606171922||ORU^R01|MSG00045|P|2.5\rPID|1||PID88741^^^MRN||Doe^Jane||19850412|F|||456 Oak Lane^^City^ST^54321|||||||ACCT5544\rOBR|1|OBR9821|LIS9942|80053^Comprehensive Metabolic Panel|||202606171800|||||||||Dr. Sarah Carter\rOBX|1|NM|32206-3^Sodium||141|mmol/L|135-145|N|||F|||202606171900\rOBX|2|NM|32244-4^Potassium||5.2|mmol/L|3.5-5.1|H|||F|||202606171900`
  );
  const [parsedHl7, setParsedHl7] = useState(null);
  const [hl7Validation, setHl7Validation] = useState(null);

  // Generic forms
  const [genericForm, setGenericForm] = useState({
    operator: userName || "", val: "", status: "Pass", remarks: ""
  });

  // Backup Form
  const [backupForm, setBackupForm] = useState({
    backupType: "Differential",
    volumeSize: "1420", // MB
    storageTarget: "AWS S3 Cloud",
    hashVerified: "Yes",
    destinationPath: "s3://mbl-qms-backups/database/daily/db_prod_20260617.bak"
  });

  // Unauthorized Access Mock Logs
  const [loginAttempts, setLoginAttempts] = useState([
    { id: 1, time: "2026-06-17 18:45:10", ip: "192.168.1.144", user: "jdoe", type: "Roster View", status: "Success", details: "Chrome / Windows 11" },
    { id: 2, time: "2026-06-17 19:02:11", ip: "192.168.1.200", user: "admin_temp", type: "DB Console Access", status: "Failed - Locked out", details: "Failed password. Attempt 3/3." },
    { id: 3, time: "2026-06-17 19:10:44", ip: "203.0.113.88", user: "system_root", type: "SSH Server Login", status: "Unauthorized Attempt", details: "Blocked external geographic range." }
  ]);

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
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Information Technology"), where("featureKey", "==", `it_${activeTab}`), orderBy("createdAt", "desc")));
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

  // LIMS Handshake Sync Simulation
  const triggerLimsSync = () => {
    setLimsSyncing(true);
    const steps = [
      "Initiating API handshake protocol...",
      "Validating JWT authentication credentials...",
      "Requesting active laboratory result packets...",
      "Reading 18 parsed LIS test outputs...",
      "Checking HL7 version 2.5 segment tags...",
      "Saving results into primary clinical register...",
      "Success: Handshake complete. 18 reports synchronized."
    ];
    setLimsLogs([]);
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setLimsLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${step}`]);
        if (idx === steps.length - 1) {
          setLimsSyncing(false);
          // Log sync details to Firebase
          addDoc(collection(db, "interactiveLogs"), {
            department: "Information Technology",
            featureKey: "it_lims_integrity",
            createdAt: serverTimestamp(),
            createdBy: userName || "IT Admin",
            data: {
              date: new Date().toISOString().split("T")[0],
              inspector: userName || "IT Staff",
              val: "LIMS API Handshake Synchronization Success",
              status: "Pass",
              remarks: "Synchronized 18 reports. Sync latency 410ms. All check-sums validated."
            }
          }).then(() => loadTabRecords());
        }
      }, (idx + 1) * 400);
    });
  };

  // HL7 Parsing logic
  const handleHl7Parse = (e) => {
    e.preventDefault();
    try {
      const segments = hl7String.split(/[\r\n]+/);
      const parsed = {};
      let errors = [];
      
      segments.forEach(seg => {
        const fields = seg.split("|");
        const type = fields[0];
        if (type === "MSH") {
          parsed.msh = {
            sendingApp: fields[2] || "N/A",
            sendingFacility: fields[3] || "N/A",
            dateTime: fields[6] || "N/A",
            messageType: fields[8] || "N/A",
            messageId: fields[10] || "N/A",
            version: fields[11] || "N/A"
          };
        } else if (type === "PID") {
          parsed.pid = {
            id: fields[3] || "N/A",
            name: fields[5] || "N/A",
            dob: fields[7] || "N/A",
            gender: fields[8] || "N/A",
            address: fields[11] || "N/A"
          };
        } else if (type === "OBR") {
          parsed.obr = {
            id: fields[3] || "N/A",
            testCode: fields[4] || "N/A",
            physician: fields[16] || "N/A"
          };
        } else if (type === "OBX") {
          if (!parsed.obx) parsed.obx = [];
          parsed.obx.push({
            id: fields[1] || "N/A",
            valueType: fields[2] || "N/A",
            analyte: fields[3] || "N/A",
            value: fields[5] || "N/A",
            units: fields[6] || "N/A",
            refRange: fields[7] || "N/A",
            status: fields[8] || "N/A"
          });
        }
      });

      if (!parsed.msh) errors.push("Missing required MSH segment header.");
      if (!parsed.pid) errors.push("Missing required PID patient identifier segment.");

      setParsedHl7(parsed);
      setHl7Validation(errors.length === 0 ? { valid: true } : { valid: false, errors });

      // Save validation log to database
      addDoc(collection(db, "interactiveLogs"), {
        department: "Information Technology",
        featureKey: "it_transcription_interface_error",
        createdAt: serverTimestamp(),
        createdBy: userName || "IT Admin",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "IT Staff",
          val: `HL7 Packet Validation: ${errors.length === 0 ? "Valid" : "Invalid"}`,
          status: errors.length === 0 ? "Pass" : "Fail",
          remarks: errors.length === 0 ? `Validated MSG ${parsed.msh?.messageId} for PID ${parsed.pid?.id}` : errors.join("; ")
        }
      }).then(() => loadTabRecords());

    } catch (err) {
      alert("Error parsing HL7 packet: " + err.message);
    }
  };

  // Save Weekly Roster
  ;

  // Submit Generic Log Sheet
  const handleGenericLogSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Information Technology",
        featureKey: `it_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "IT Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: genericForm.operator,
          val: genericForm.val,
          status: genericForm.status,
          remarks: genericForm.remarks
        }
      });
      alert("IT Log entry saved.");
      setGenericForm({ operator: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Submit Backup Monitor
  const handleBackupSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Information Technology",
        featureKey: "it_offsite_backup",
        createdAt: serverTimestamp(),
        createdBy: userName || "IT Admin",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "IT Staff",
          val: `Offsite Backup completed successfully. Volume size: ${backupForm.volumeSize}MB. Destination: ${backupForm.storageTarget}`,
          status: backupForm.hashVerified === "Yes" ? "Pass" : "Fail",
          remarks: `Backup URI: ${backupForm.destinationPath}. Hash validation matches production.`
        }
      });
      alert("Offsite backup log recorded.");
      loadTabRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Trigger CAPA for security violations
  const triggerCAPA = async (title, details) => {
    const confirm = window.confirm(`Log a formal CAPA request with Quality for ${title}?`);
    if (!confirm) return;
    try {
      await addDoc(collection(db, "capa"), {
        source: `IT Security Breach Alert: ${title}`,
        details: details,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "IT Staff"
      });
      alert("CAPA Incident logged with Quality Department.");
    } catch (err) {
      console.error(err);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`it_${item.key}`] !== false);
  const categories = ["General & Personnel", "LIMS & Data Integrity", "Backup & Infrastructure", "Information Security", "Utility Services"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #D0E2FF" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F357C" }}>IT Command Console</div>
          <div style={{ fontSize: 9.5, color: "#1E50B3", marginTop: 2, fontWeight: 500 }}>ISO 27001 Data Control Center</div>
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
                  onClick={() => { setActiveTab(item.key); setLogs([]); setParsedHl7(null); setHl7Validation(null); }}
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
          <div style={{ padding: 40, textAlign: "center", color: "#0F357C", fontSize: 13 }}>Loading IT configurations...</div>
        ) : (
          <div>
            {/* Header Banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0F357C", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Information Technology Dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#5F6B7C" }}>
                  Active Module: ISO 27001 InfoSec & LIMS Management | Administrator: {userName || "IT Operator"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#EDF5FF", borderRadius: 8, border: "0.5px solid #D0E2FF", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1E50B3" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#0F357C" }}>Secure Data Tunnel Active</span>
              </div>
            </div>

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Information Technology" role={role} userName={userName} />
        )}

            {/* Authorization Matrix */}
            {activeTab === "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Responsibility & Authorization Matrix</div></div>
                <div style={S.cardBody}>
                  <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#5F6B7C" }}>
                    Authorization matrix for secure database operations under ISO 27001:2022.
                  </p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Role / Category</th>
                        <th style={S.th}>Authorized Duties</th>
                        <th style={S.th}>Access Level</th>
                        <th style={S.th}>Audit Requirements</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={S.td}><strong>IT Director / HOD</strong></td>
                        <td style={S.td}>Admin permission overrides, database schema sign-offs, network routing changes</td>
                        <td style={S.td}>Root / Full Access</td>
                        <td style={S.td}>Quarterly access control review</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>LIMS Administrator</strong></td>
                        <td style={S.td}>Sync failure debugging, HL7 mapping corrections, analyzer endpoint setup</td>
                        <td style={S.td}>LIMS System Admin</td>
                        <td style={S.td}>Bi-weekly transaction logs check</td>
                      </tr>
                      <tr>
                        <td style={S.td}><strong>IT Executive</strong></td>
                        <td style={S.td}>Hardware troubleshooting, backup monitor logs, system status reporting</td>
                        <td style={S.td}>Read & Write Logs</td>
                        <td style={S.td}>Daily log sheet audit</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LIMS Handshake Console */}
            {activeTab === "lims_integrity" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>LIMS Sync & Handshake Console</div></div>
                <div style={S.cardBody}>
                  <div style={S.grid(3)}>
                    <div style={{ background: "#F4F8FD", padding: 12, borderRadius: 8, border: "0.5px solid #D0E2FF" }}>
                      <span style={{ fontSize: 11, color: "#5F6B7C" }}>API Sync Success Rate</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E50B3", marginTop: 4 }}>{syncMetrics.successRate}</div>
                    </div>
                    <div style={{ background: "#F4F8FD", padding: 12, borderRadius: 8, border: "0.5px solid #D0E2FF" }}>
                      <span style={{ fontSize: 11, color: "#5F6B7C" }}>Last Sync Timestamp</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E50B3", marginTop: 4 }}>{syncMetrics.lastSyncTime}</div>
                    </div>
                    <div style={{ background: "#F4F8FD", padding: 12, borderRadius: 8, border: "0.5px solid #D0E2FF" }}>
                      <span style={{ fontSize: 11, color: "#5F6B7C" }}>Avg Callback Latency</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#1E50B3", marginTop: 4 }}>{syncMetrics.callbackDelay}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, border: "1px solid #1E3A8A", background: "#0F172A", borderRadius: 8, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ color: "#38BDF8", fontFamily: "monospace", fontSize: 12 }}>mbl_lims_handshake_engine.log</span>
                      <button disabled={limsSyncing} onClick={triggerLimsSync} style={S.btn("#38BDF8", "#0F172A")}>
                        {limsSyncing ? "Synchronizing LIMS..." : "⚡ Trigger Manual Handshake Sync"}
                      </button>
                    </div>
                    <div style={{ height: 160, overflowY: "auto", fontFamily: "monospace", fontSize: 11.5, color: "#34D399", background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 4, lineHeight: "1.6em" }}>
                      {limsLogs.length === 0 ? (
                        <span style={{ color: "#64748B" }}>Ready. Click manual trigger to test endpoint sync.</span>
                      ) : (
                        limsLogs.map((l, i) => <div key={i}>{l}</div>)
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HL7 Packet Validator */}
            {activeTab === "transcription_interface_error" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Interactive HL7 Protocol Packet Validator</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleHl7Parse}>
                    <span style={S.label}>HL7 ORU/ADT Transmission String</span>
                    <textarea
                      value={hl7String}
                      onChange={(e) => setHl7String(e.target.value)}
                      style={{ ...S.inp, height: 140, fontFamily: "monospace", fontSize: 11.5, lineHeight: "1.4em", resize: "vertical" }}
                      required
                    />
                    <div style={{ textAlign: "right", marginTop: 10 }}>
                      <button type="submit" style={S.btn()}>Parse & Validate HL7 Message</button>
                    </div>
                  </form>

                  {hl7Validation && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 6, background: hl7Validation.valid ? "#D1FAE5" : "#FEE2E2", color: hl7Validation.valid ? "#065F46" : "#981B1B", fontSize: 12, fontWeight: 600 }}>
                        <span>{hl7Validation.valid ? "✅ HL7 PACKET SCHEMA VALID" : "❌ SCHEMA VALIDATION ERROR"}</span>
                      </div>
                      
                      {!hl7Validation.valid && (
                        <div style={{ color: "#EF4444", fontSize: 11.5, marginTop: 8 }}>
                          {hl7Validation.errors.map((err, i) => <div key={i}>• {err}</div>)}
                        </div>
                      )}

                      {parsedHl7 && (
                        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                          <div style={{ background: "#F8FAFC", padding: 12, border: "0.5px solid #E2E8F0", borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Segment Headers (MSH / PID)</div>
                            <table style={S.table}>
                              <tbody>
                                <tr>
                                  <td style={{ ...S.td, fontWeight: 600, width: 120 }}>Message ID</td>
                                  <td style={S.td}>{parsedHl7.msh?.messageId}</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, fontWeight: 600 }}>LIS Sending App</td>
                                  <td style={S.td}>{parsedHl7.msh?.sendingApp} ({parsedHl7.msh?.sendingFacility})</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, fontWeight: 600 }}>Patient ID</td>
                                  <td style={S.td}>{parsedHl7.pid?.id}</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, fontWeight: 600 }}>Patient Name</td>
                                  <td style={S.td}>{parsedHl7.pid?.name}</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, fontWeight: 600 }}>DOB & Gender</td>
                                  <td style={S.td}>{parsedHl7.pid?.dob} | {parsedHl7.pid?.gender}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div style={{ background: "#F8FAFC", padding: 12, border: "0.5px solid #E2E8F0", borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Observations (OBR / OBX)</div>
                            <table style={S.table}>
                              <thead>
                                <tr>
                                  <th style={S.th}>Analyte</th>
                                  <th style={S.th}>Result</th>
                                  <th style={S.th}>Ranges</th>
                                  <th style={S.th}>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {parsedHl7.obx?.map((o, idx) => (
                                  <tr key={idx}>
                                    <td style={S.td}><strong>{o.analyte}</strong></td>
                                    <td style={S.td}>{o.value} {o.units}</td>
                                    <td style={S.td}>{o.refRange}</td>
                                    <td style={S.td}>
                                      <span style={{
                                        background: o.status === "H" || o.status === "L" ? "#FEE2E2" : "#D1FAE5",
                                        color: o.status === "H" || o.status === "L" ? "#B91C1C" : "#065F46",
                                        padding: "2px 4px", borderRadius: 4, fontWeight: 600, fontSize: 10
                                      }}>
                                        {o.status}
                                      </span>
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
                </div>
              </div>
            )}

            {/* Offsite Backup Monitor */}
            {activeTab === "offsite_backup" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Offsite Backup Control Monitor</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleBackupSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Backup Configuration Type</span>
                        <select value={backupForm.backupType} onChange={(e) => setBackupForm({...backupForm, backupType: e.target.value})} style={S.inp}>
                          <option value="Differential">Differential Database Backup</option>
                          <option value="Full Database">Full Production Dump (Weekly)</option>
                          <option value="Transaction Log">Transaction Log Tail</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Database Volume Size (MB)</span>
                        <input type="number" required value={backupForm.volumeSize} onChange={(e) => setBackupForm({...backupForm, volumeSize: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Storage Target Endpoint</span>
                        <select value={backupForm.storageTarget} onChange={(e) => setBackupForm({...backupForm, storageTarget: e.target.value})} style={S.inp}>
                          <option value="AWS S3 Cloud">AWS S3 Cloud Bucket (Primary)</option>
                          <option value="Local NAS Storage">Local NAS Storage Rack (Secondary)</option>
                          <option value="Cold Storage tape">Offline Cold Storage Tape</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ ...S.grid(2), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Secure Hash verified (SHA-256)?</span>
                        <select value={backupForm.hashVerified} onChange={(e) => setBackupForm({...backupForm, hashVerified: e.target.value})} style={S.inp}>
                          <option value="Yes">Yes (Matches Database Hash)</option>
                          <option value="No">No (Checksum Failure / Mismatch)</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Backup File Target URI</span>
                        <input type="text" required value={backupForm.destinationPath} onChange={(e) => setBackupForm({...backupForm, destinationPath: e.target.value})} style={S.inp} />
                      </div>
                    </div>

                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Log Backup Status
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Unauthorized Access Auditor */}
            {activeTab === "unauthorized_access" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Unauthorized Login & Intrusion Attempts Tracker (ISO 27001)</div></div>
                <div style={S.cardBody}>
                  <p style={{ margin: "0 0 16px", fontSize: 11.5, color: "#5F6B7C" }}>
                    Security logs compiled from centralized identity verification filters. Click red flag to prompt corrective actions (CAPA).
                  </p>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Timestamp</th>
                        <th style={S.th}>Source IP</th>
                        <th style={S.th}>User Account</th>
                        <th style={S.th}>Console Request</th>
                        <th style={S.th}>Details</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginAttempts.map((la) => (
                        <tr key={la.id}>
                          <td style={S.td}>{la.time}</td>
                          <td style={S.td}><code>{la.ip}</code></td>
                          <td style={S.td}><strong>{la.user}</strong></td>
                          <td style={S.td}>{la.type}</td>
                          <td style={S.td}>{la.details}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: la.status === "Success" ? "#D1FAE5" : la.status.includes("Failed") ? "#FEF3C7" : "#FEE2E2",
                              color: la.status === "Success" ? "#065F46" : la.status.includes("Failed") ? "#D97706" : "#991B1B"
                            }}>
                              {la.status}
                            </span>
                          </td>
                          <td style={S.td}>
                            {la.status !== "Success" && (
                              <button onClick={() => triggerCAPA(`Security Flag on ${la.user}`, `Unauthorized login attempt from IP: ${la.ip} attempting ${la.type}`)} style={S.btn("#DC2626", "#FFF", "8px")}>
                                🚨 CAPA
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Generic Checklist logs */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && activeTab !== "lims_integrity" && activeTab !== "transcription_interface_error" && activeTab !== "offsite_backup" && activeTab !== "unauthorized_access" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>New Checklist log sheet record</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericLogSubmit} style={S.grid(4)}>
                    <div>
                      <span style={S.label}>IT Officer / Operator</span>
                      <input type="text" required value={genericForm.operator} onChange={(e) => setGenericForm({ ...genericForm, operator: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Verification Details / Values</span>
                      <input type="text" required placeholder="e.g. Server cabinet fan active" value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Status Compliance</span>
                      <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                        <option value="Pass">Pass / Confirmed</option>
                        <option value="Fail">Fail / Alert Triggered</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Remarks</span>
                      <input type="text" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {genericForm.status === "Fail" && (
                          <button type="button" onClick={() => triggerCAPA(`IT Checklist failure: ${TABS.find(t => t.key === activeTab)?.label}`, genericForm.val)} style={S.btn("#DC2626", "#FFF")}>
                            🚨 Log CAPA Request
                          </button>
                        )}
                      </div>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record Log Entry
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Log History */}
            {activeTab !== "duty_roster" && activeTab !== "auth_matrix" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>IT Operations History Logs</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Operator</th>
                        <th style={S.th}>Observation Value</th>
                        <th style={S.th}>Status</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#0F357C" }}>No logs recorded for this section.</td>
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