import QualityIndicatorsLog from "./QualityIndicatorsLog";
// MolecularGeneticsDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Molecular Genetics Module
// Dynamic Weekly Duty Roster with Role-Based Approvals and Timing Controls

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../components/Common/WeeklyDutyRoster";
import TemperatureDashboard from "../../modules/TemperatureMonitoring/TemperatureDashboard";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh", display: "flex" },
  sidebar: { width: 260, background: "#fff", borderRight: "0.5px solid #E0DDD6", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#065F46" : "#5F5E5A",
    background: active ? "#ECFDF5" : "transparent",
    borderLeft: active ? "4px solid #10B981" : "4px solid transparent",
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
    padding: "6px 12px", background: bg || "#10B981", color: color || "#ECFDF5",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.15s ease",
    display: "inline-flex", alignItems: "center", gap: 6
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
  { key: "molgen_quality_indicators", label: "Quality Indicators Log", icon: "📈", cat: "Examination Protocols" },
  { key: "roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  { key: "auth_matrix", label: "Responsibility Matrix", icon: "🔑", cat: "General & Personnel" },
  { key: "sample_log", label: "Sample Processing Log", icon: "🧪", cat: "Pre-Examination & Process" },
  { key: "iqc_log", label: "IQC Run Logs", icon: "📈", cat: "Internal Quality Control" },
  { key: "audit_trail", label: "Department Audit Log", icon: "📋", cat: "Quality & Audits" },
  { key: "mg_temp_monitoring", label: "Temperature & Humidity Monitoring", icon: "🌡️", cat: "Equipment & Logs" }
];

export default function MolecularGeneticsDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("roster");
  const [employees, setEmployees] = useState([]);
  
   // Draft, Submitted, Approved, Published
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [sampleLogs, setSampleLogs] = useState([]);
  const [iqcLogs, setIqcLogs] = useState([]);

  // Mock employee alert visibility
  const [showMockAlert, setShowMockAlert] = useState(false);

  

  // Resolve roles
  const isHOD = role === "HOD" || role === "Admin" || role === "Managing Director" || role === "Deputy Director" || role === "IT Manager";

  ;

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Molecular Genetics employees
      const empSnap = await getDocs(query(collection(db, "employees"), where("department", "==", "Molecular Genetics")));
      const list = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);
      setShowMockAlert(list.length === 0);
    } catch (e) {
      console.warn("Error fetching employees:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTabRecords = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "auth_matrix") {
        const snap = await getDocs(query(collection(db, "responsibilityMatrix"), where("department", "==", "Molecular Genetics")));
        setMatrixData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === "sample_log") {
        const snap = await getDocs(query(collection(db, "sampleLogs"), where("department", "==", "Molecular Genetics"), orderBy("createdAt", "desc")));
        setSampleLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === "iqc_log") {
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Molecular Genetics"), where("featureKey", "==", "mg_iqc"), orderBy("createdAt", "desc")));
        setIqcLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === "audit_trail") {
        const logsRef = query(
          collection(db, "dutyRosterLogs"),
          where("department", "==", "Molecular Genetics"),
          orderBy("createdAt", "desc")
        );
        const logsSnap = await getDocs(logsRef);
        setAuditLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.warn("Error loading tab records:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadTabRecords();
  }, [loadTabRecords]);

  // Handle Generate Mock Employees for testing
  const handleGenerateMockEmployees = async () => {
    setSaving(true);
    try {
      const mockList = [
        { fullName: "Dr. Sarah Adams", empId: "EMP-MG-001", department: "Molecular Genetics", designation: "Supervisor / Genetics Consultant", status: "Active" },
        { fullName: "Nisha Patel", empId: "EMP-MG-002", department: "Molecular Genetics", designation: "Senior Lab Technician", status: "Active" },
        { fullName: "Rajesh Kumar", empId: "EMP-MG-003", department: "Molecular Genetics", designation: "Junior Lab Technician", status: "Active" },
        { fullName: "Vikram Singh", empId: "EMP-MG-004", department: "Molecular Genetics", designation: "Lab Assistant", status: "Active" }
      ];
      for (const emp of mockList) {
        await addDoc(collection(db, "employees"), {
          ...emp,
          qualifications: [{ type: "Degree", title: "M.Sc. Human Genetics", institution: "AIIMS", year: "2018" }],
          licenses: [{ name: "Genetic Specialist License", number: "GSL-229", issuedDate: "2020-01-10", expiryDate: "2030-01-10" }],
          createdAt: serverTimestamp()
        });
      }
      alert("Successfully created 4 mock employees for Molecular Genetics in Firestore!");
      loadInitial();
    } catch (e) {
      console.error(e);
      alert("Error adding mock employees: " + e.message);
    } finally {
      setSaving(false);
    }
  };
  // Placeholder actions for mock records in other tabs
  const handleAddResponsibility = async (e) => {
    e.preventDefault();
    const staffName = e.target.staff.value;
    const scope = e.target.scope.value;
    if (!staffName || !scope) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "responsibilityMatrix"), {
        department: "Molecular Genetics",
        staffName,
        scope,
        verifiedBy: userName || "Supervisor",
        status: "Authorized",
        createdAt: serverTimestamp()
      });
      alert("Authorized responsibility registered.");
      e.target.reset();
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogSample = async (e) => {
    e.preventDefault();
    const sampleId = e.target.sampleId.value;
    const testName = e.target.testName.value;
    const concentration = e.target.concentration.value;
    const purity = e.target.purity.value;
    if (!sampleId || !testName) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "sampleLogs"), {
        department: "Molecular Genetics",
        sampleId,
        testName,
        data: { concentration, purity, loggedBy: userName || "Staff" },
        createdAt: serverTimestamp()
      });
      alert("Sample run logged successfully.");
      e.target.reset();
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogIqc = async (e) => {
    e.preventDefault();
    const runName = e.target.runName.value;
    const val = e.target.val.value;
    const status = e.target.status.value;
    if (!runName || !val) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Molecular Genetics",
        featureKey: "mg_iqc",
        createdAt: serverTimestamp(),
        createdBy: userName || "Staff",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Staff",
          val: `${val} ng/uL`,
          status,
          remarks: `Extraction check run: ${runName}`
        }
      });
      alert("IQC log saved.");
      e.target.reset();
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categories = ["General & Personnel", "Pre-Examination & Process", "Internal Quality Control", "Quality & Audits", "Equipment & Logs"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #E0DDD6" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>Molecular Genetics</div>
          <div style={{ fontSize: 9.5, color: "#10B981", marginTop: 2, fontWeight: 500 }}>ISO 15189:2022 Monitoring</div>
        </div>
        {categories.map(cat => {
          const items = TABS.filter(i => i.cat === cat);
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
        {/* Mock Employee alert */}
        {showMockAlert && (
          <div style={{
            background: "#FFF5F5", border: "0.5px solid #E24B4A", borderRadius: 10,
            padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <strong style={{ fontSize: 13, color: "#A32D2D", display: "block" }}>No Staff Records Found</strong>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>There are no active employee records assigned to Molecular Genetics in the HR database.</span>
            </div>
            <button style={S.btn("#A32D2D", "#FFF")} onClick={handleGenerateMockEmployees} disabled={saving}>
              {saving ? "Generating..." : "➕ Generate Mock Staff"}
            </button>
          </div>
        )}

        {/* 1. WEEKLY DUTY ROSTER TAB */}
        {activeTab === "roster" && (
          <WeeklyDutyRoster department="Molecular Genetics" role={role} userName={userName} />
        )}

        {/* 2. RESPONSIBILITY MATRIX */}
        {activeTab === "auth_matrix" && (
          <div>
            {isHOD && (
              <div style={S.card}>
                <div style={S.cardHeader}><span style={S.cardTitle}>Authorize Personnel Scope of Work</span></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleAddResponsibility}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Staff Member</span>
                        <select style={S.inp} name="staff" required>
                          <option value="">Select staff</option>
                          {employees.map(e => <option key={e.id} value={e.fullName}>{e.fullName}</option>)}
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Clinical Scope of Testing</span>
                        <input style={S.inp} name="scope" placeholder="e.g. Sanger Sequencing Analysis" required />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button style={{ ...S.btn(), width: "100%" }} type="submit" disabled={saving}>Authorize Scope</button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Authorized Responsibility Matrix (ISO §5.1)</span></div>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Staff Member</th>
                      <th style={S.th}>Scope of Work / Testing Scopes</th>
                      <th style={S.th}>Authorized By</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.length === 0 ? (
                      <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No authorized scope records configured yet.</td></tr>
                    ) : (
                      matrixData.map(m => (
                        <tr key={m.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{m.staffName}</td>
                          <td style={S.td}>{m.scope}</td>
                          <td style={S.td}>{m.verifiedBy}</td>
                          <td style={S.td}>
                            <span style={{ padding: "2px 6px", borderRadius: 10, background: "#E1F5EE", color: "#065F46", fontSize: 10, fontWeight: 700 }}>{m.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. SAMPLE LOGS */}
        {activeTab === "sample_log" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Log Diagnostic Sample Run</span></div>
              <div style={S.cardBody}>
                <form onSubmit={handleLogSample}>
                  <div style={S.grid(4)}>
                    <div>
                      <span style={S.label}>Sample Lab ID</span>
                      <input style={S.inp} name="sampleId" placeholder="e.g. MBL-MG-2026-004" required />
                    </div>
                    <div>
                      <span style={S.label}>Assay / Test</span>
                      <input style={S.inp} name="testName" placeholder="e.g. BRCA1 Variant Screening" required />
                    </div>
                    <div>
                      <span style={S.label}>DNA Concentration (ng/uL)</span>
                      <input style={S.inp} name="concentration" type="number" step="0.01" placeholder="e.g. 45.2" />
                    </div>
                    <div>
                      <span style={S.label}>DNA Purity (A260/280)</span>
                      <input style={S.inp} name="purity" type="number" step="0.01" placeholder="e.g. 1.85" />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={S.btn()} type="submit" disabled={saving}>Log Sample Run</button>
                  </div>
                </form>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Registered Genetics Diagnostic Runs</span></div>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Sample ID</th>
                      <th style={S.th}>Assay</th>
                      <th style={S.th}>DNA Conc.</th>
                      <th style={S.th}>DNA Purity</th>
                      <th style={S.th}>Operator</th>
                      <th style={S.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleLogs.length === 0 ? (
                      <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No diagnostic sample runs logged yet.</td></tr>
                    ) : (
                      sampleLogs.map(s => (
                        <tr key={s.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{s.sampleId}</td>
                          <td style={S.td}>{s.testName}</td>
                          <td style={S.td}>{s.data?.concentration} ng/uL</td>
                          <td style={S.td}>{s.data?.purity}</td>
                          <td style={S.td}>{s.data?.loggedBy}</td>
                          <td style={S.td}>{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleDateString("en-IN") : "Just now"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. IQC LOGS */}
        {activeTab === "iqc_log" && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Record Extraction/Amplification Quality Check</span></div>
              <div style={S.cardBody}>
                <form onSubmit={handleLogIqc}>
                  <div style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Run / Kit Lot Number</span>
                      <input style={S.inp} name="runName" placeholder="e.g. QIA-GEN-LOT44" required />
                    </div>
                    <div>
                      <span style={S.label}>Positive Control Yield</span>
                      <input style={S.inp} name="val" type="number" placeholder="e.g. 50" required />
                    </div>
                    <div>
                      <span style={S.label}>Run Result Status</span>
                      <select style={S.inp} name="status" required>
                        <option value="Pass">Pass (Valid Run)</option>
                        <option value="Fail">Fail (Invalid Run)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button style={S.btn()} type="submit" disabled={saving}>Log IQC Run</button>
                  </div>
                </form>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardHeader}><span style={S.cardTitle}>Historical IQC Run Controls</span></div>
              <div style={S.cardBody}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Inspector</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Measured Value</th>
                      <th style={S.th}>Run Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iqcLogs.length === 0 ? (
                      <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No IQC runs recorded yet.</td></tr>
                    ) : (
                      iqcLogs.map(l => (
                        <tr key={l.id}>
                          <td style={S.td}>{l.data?.date}</td>
                          <td style={S.td}>{l.data?.inspector}</td>
                          <td style={S.td}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                              background: l.data?.status === "Pass" ? "#E1F5EE" : "#FFF5F5",
                              color: l.data?.status === "Pass" ? "#065F46" : "#A32D2D"
                            }}>{l.data?.status}</span>
                          </td>
                          <td style={S.td}>{l.data?.val}</td>
                          <td style={S.td}>{l.data?.remarks}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. AUDIT TRAIL / LOGS */}
        {activeTab === "audit_trail" && (
          <div style={S.card}>
            <div style={S.cardHeader}><span style={S.cardTitle}>Complete Department Audit Trail logs</span></div>
            <div style={S.cardBody}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Date & Time</th>
                    <th style={S.th}>Action</th>
                    <th style={S.th}>Roster Week</th>
                    <th style={S.th}>Performed By</th>
                    <th style={S.th}>Scope/Role</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No logs recorded.</td></tr>
                  ) : (
                    auditLogs.map(l => (
                      <tr key={l.id}>
                        <td style={S.td}>{l.createdAt?.toDate ? l.createdAt.toDate().toLocaleString("en-IN") : "Just now"}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{l.action}</td>
                        <td style={S.td}>{l.weekStartDate ? getWeekRangeString(l.weekStartDate) : "General"}</td>
                        <td style={S.td}>{l.performedBy}</td>
                        <td style={S.td}>
                          <span style={{ padding: "1px 6px", background: "#F1F5F9", border: "0.5px solid #CBD5E1", borderRadius: 4, fontSize: 10.5 }}>{l.role}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === "mg_temp_monitoring" && (
          <TemperatureDashboard department="Molecular Genetics" />
        )}

      {activeTab === "molgen_quality_indicators" && (
          <QualityIndicatorsLog department="Molecular Genetics" />
        )}
        </div>
    </div>
  );
}