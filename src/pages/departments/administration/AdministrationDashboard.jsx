// AdministrationDashboard.jsx
// ISO 15189:2022 & ISO 27001:2022 Compliant Administration Module

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";
import WeeklyDutyRoster from "../../../components/Common/WeeklyDutyRoster";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#FFF5F5", minHeight: "100vh", display: "flex" },
  sidebar: { width: 270, background: "#fff", borderRight: "0.5px solid #FECDD3", display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, overflowY: "auto" },
  content: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", cursor: "pointer", fontSize: 12,
    color: active ? "#9F1239" : "#5F5E66",
    background: active ? "#FFF1F2" : "transparent",
    borderLeft: active ? "4px solid #BE123C" : "4px solid transparent",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease"
  }),
  sectionHeader: { padding: "12px 16px 4px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#FDA4AF" },
  card: { background: "#fff", border: "0.5px solid #FECDD3", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(190, 18, 60, 0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #FECDD3", background: "#FFF1F2", display: "flex", alignItems: "center", justifycontent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#9F1239" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #FDA4AF", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#9F1239", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#BE123C", color: color || "#FFF",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.2s ease"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #FECDD3", color: "#9F1239", fontWeight: 500, textAlign: "left", background: "#FFF1F2" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #FFF5F5", color: "#2C2C2A" },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#9F1239", display: "block", marginBottom: 4 }
};

const TABS = [
  { key: "duty_roster", label: "Weekly Duty Roster", icon: "📅", cat: "General & Personnel" },
  
  { key: "executive_summary", label: "Executive Dashboard", icon: "📊", cat: "Director Cockpit" },
  { key: "scientific_ops", label: "Scientific Operations", icon: "🔬", cat: "Director Cockpit" },
  { key: "access_control_view", label: "System Access Auditor", icon: "🔐", cat: "Director Cockpit" },

  { key: "risk_management", label: "Risk Register Matrix", icon: "⚡", cat: "ISO Compliance" },
  { key: "improvement_opportunities", label: "Improvement (OFI) Log", icon: "💡", cat: "ISO Compliance" },
  { key: "director_reviews", label: "Director MRM Reviews", icon: "✒️", cat: "ISO Compliance" }
];

export default function AdministrationDashboard({ role, userName }) {
  const [activeTab, setActiveTab] = useState("duty_roster");
  const [featureFlags, setFeatureFlags] = useState({});
  const [employees, setEmployees] = useState([]);
  const [logs, setLogs] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Date State for Roster
  

  // Risk Register Form State
  const [riskForm, setRiskForm] = useState({
    riskSource: "LIMS API Interface Downtime",
    impactArea: "Patient Report Delivery Delays",
    likelihood: "2",
    severity: "4",
    mitigationControl: "Standby local offline report buffers on LIS client endpoints.",
    owner: "IT HOD"
  });

  // OFI Form State
  const [ofiForm, setOfiForm] = useState({
    title: "Barcode scanners in Phlebotomy rooms",
    description: "Replace legacy single-line laser scanners with area-imagers to speed up home collection batch intake.",
    targetedDept: "Phlebotomy",
    proposedAction: "Procure 4 area-imaging scanners. Update workstation driver templates.",
    status: "Proposed"
  });

  // MRM Review Form State
  const [reviewForm, setReviewForm] = useState({
    meetingDate: new Date().toISOString().split("T")[0],
    agenda: "Annual NABL Internal Audit Review & CAPA Close-out",
    discussionNotes: "Reviewed 12 closed CAPAs. Verified zero open transcription faults. Recommended additional dry-runs on offsite database recovery.",
    signedStatus: "Approved & Released"
  });

  // Operational metrics mock states
  const [kpiMetrics, setKpiMetrics] = useState({
    rejectionRate: "1.42%",
    failedIqcRate: "0.8%",
    failedEqasRate: "2.1%",
    totalOpenCapas: "3",
    totalBreakdowns: "1"
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
      
        const snap = await getDocs(query(collection(db, "interactiveLogs"), where("department", "==", "Administration"), where("featureKey", "==", `admin_${activeTab}`), orderBy("createdAt", "desc")));
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

  const handleRiskSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const l = parseInt(riskForm.likelihood) || 1;
    const s = parseInt(riskForm.severity) || 1;
    const score = l * s;
    let riskLevel = "Low";
    if (score >= 15) riskLevel = "High";
    else if (score >= 6) riskLevel = "Medium";

    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Administration",
        featureKey: "admin_risk_management",
        createdAt: serverTimestamp(),
        createdBy: userName || "MD Office",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Director",
          val: `Risk: ${riskForm.riskSource} | Score: ${score} (${riskLevel})`,
          status: riskLevel === "High" ? "Fail" : riskLevel === "Medium" ? "Outlier" : "Pass",
          remarks: `Impact: ${riskForm.impactArea} | Mitigation: ${riskForm.mitigationControl} | Owner: ${riskForm.owner}`
        }
      });
      alert("Risk registration logged successfully.");
      setRiskForm({
        riskSource: "",
        impactArea: "",
        likelihood: "2",
        severity: "4",
        mitigationControl: "",
        owner: "HOD"
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleOfiSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Administration",
        featureKey: "admin_improvement_opportunities",
        createdAt: serverTimestamp(),
        createdBy: userName || "MD Office",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Director",
          val: `OFI: ${ofiForm.title} | Target: ${ofiForm.targetedDept}`,
          status: "Pass",
          remarks: `Desc: ${ofiForm.description} | Action: ${ofiForm.proposedAction} | Status: ${ofiForm.status}`
        }
      });
      alert("OFI registered successfully.");
      setOfiForm({
        title: "",
        description: "",
        targetedDept: "Phlebotomy",
        proposedAction: "",
        status: "Proposed"
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Administration",
        featureKey: "admin_director_reviews",
        createdAt: serverTimestamp(),
        createdBy: userName || "MD Office",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Director",
          val: `MRM Sign-Off agenda: ${reviewForm.agenda}`,
          status: "Pass",
          remarks: `Meeting: ${reviewForm.meetingDate} | Notes: ${reviewForm.discussionNotes} | Status: ${reviewForm.signedStatus}`
        }
      });
      alert("Director review minutes sign-off logged.");
      setReviewForm({
        meetingDate: new Date().toISOString().split("T")[0],
        agenda: "",
        discussionNotes: "",
        signedStatus: "Approved & Released"
      });
      loadTabRecords();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleGenericSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "interactiveLogs"), {
        department: "Administration",
        featureKey: `admin_${activeTab}`,
        createdAt: serverTimestamp(),
        createdBy: userName || "MD Office",
        data: {
          date: new Date().toISOString().split("T")[0],
          inspector: userName || "Director",
          val: genericForm.val,
          status: genericForm.status,
          remarks: genericForm.remarks
        }
      });
      alert("Administration log registered.");
      setGenericForm({ inspector: userName || "", val: "", status: "Pass", remarks: "" });
      loadTabRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const visibleItems = TABS.filter(item => featureFlags[`admin_${item.key}`] !== false);
  const categories = ["General & Personnel", "Director Cockpit", "ISO Compliance"];

  return (
    <div style={S.wrap}>
      {/* Side Navigation */}
      <div style={S.sidebar}>
        <div style={{ padding: "14px 16px", borderBottom: "0.5px solid #FECDD3" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#9F1239" }}>Admin Executive Cockpit</div>
          <div style={{ fontSize: 9.5, color: "#BE123C", marginTop: 2, fontWeight: 500 }}>ISO 15189 director dashboard</div>
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
          <div style={{ padding: 40, textAlign: "center", color: "#9F1239", fontSize: 13 }}>Loading administration configs...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: "#9F1239", margin: 0 }}>
                  {TABS.find(t => t.key === activeTab)?.label || "Administration dashboard"}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#5F5E66" }}>
                  Managing Director Executive Control Console | Director: {userName || "Executive Director"}
                </p>
              </div>
              <div style={{ padding: "6px 12px", background: "#FFF1F2", borderRadius: 8, border: "0.5px solid #FECDD3", display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#BE123C" }}></span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#9F1239" }}>Director Signature Secured</span>
              </div>
            </div>

            {/* Weekly Duty Roster */}
            {activeTab === "duty_roster" && (
          <WeeklyDutyRoster department="Administration" role={role} userName={userName} />
        )}

            {/* Executive Dashboard Summary KPIs */}
            {activeTab === "executive_summary" && (
              <div>
                <div style={S.grid(5)}>
                  <div style={{ background: "#fff", border: "0.5px solid #FECDD3", padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#5F5E66" }}>Sample Rejection Rate</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#BE123C", marginTop: 4 }}>{kpiMetrics.rejectionRate}</div>
                    <div style={{ fontSize: 9.5, color: "#0D9488", marginTop: 4, fontWeight: 500 }}>Target Limit &lt; 2.0%</div>
                  </div>
                  <div style={{ background: "#fff", border: "0.5px solid #FECDD3", padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#5F5E66" }}>Failed IQC Rate</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#BE123C", marginTop: 4 }}>{kpiMetrics.failedIqcRate}</div>
                    <div style={{ fontSize: 9.5, color: "#0D9488", marginTop: 4, fontWeight: 500 }}>Target Limit &lt; 1.5%</div>
                  </div>
                  <div style={{ background: "#fff", border: "0.5px solid #FECDD3", padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#5F5E66" }}>Failed EQAS Rate</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#BE123C", marginTop: 4 }}>{kpiMetrics.failedEqasRate}</div>
                    <div style={{ fontSize: 9.5, color: "#D97706", marginTop: 4, fontWeight: 500 }}>Target Limit &lt; 3.0%</div>
                  </div>
                  <div style={{ background: "#fff", border: "0.5px solid #FECDD3", padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#5F5E66" }}>Total Open CAPAs</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#E11D48", marginTop: 4 }}>{kpiMetrics.totalOpenCapas}</div>
                    <div style={{ fontSize: 9.5, color: "#E11D48", marginTop: 4, fontWeight: 500 }}>Action Items Pending</div>
                  </div>
                  <div style={{ background: "#fff", border: "0.5px solid #FECDD3", padding: 14, borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#5F5E66" }}>Active Breakdowns</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#DC2626", marginTop: 4 }}>{kpiMetrics.totalBreakdowns}</div>
                    <div style={{ fontSize: 9.5, color: "#DC2626", marginTop: 4, fontWeight: 500 }}>Biomedical Eng Pending</div>
                  </div>
                </div>

                <div style={{ ...S.card, marginTop: 20 }}>
                  <div style={S.cardHeader}><div style={S.cardTitle}>Strategic Operational Review Objectives</div></div>
                  <div style={S.cardBody}>
                    <p style={{ margin: "0 0 12px", fontSize: 12, lineHeight: "1.5em", color: "#2C2C2A" }}>
                      Strategic laboratory objectives mapped to ISO 15189:2022 clauses. Click feature tabs to log risk register matrices or continuous improvement OFIs.
                    </p>
                    <div style={S.grid(3)}>
                      <div style={{ background: "#FFF5F5", padding: 12, borderRadius: 8, border: "0.5px solid #FECDD3" }}>
                        <strong style={{ fontSize: 12, color: "#9F1239" }}>Pre-analytical Control</strong>
                        <div style={{ fontSize: 11.5, color: "#5F5E66", marginTop: 4 }}>Track sample transit outlier register from BackOffice. Ensure transport temperature remains within 2.0–8.0°C.</div>
                      </div>
                      <div style={{ background: "#FFF5F5", padding: 12, borderRadius: 8, border: "0.5px solid #FECDD3" }}>
                        <strong style={{ fontSize: 12, color: "#9F1239" }}>Analytical Reliability</strong>
                        <div style={{ fontSize: 11.5, color: "#5F5E66", marginTop: 4 }}>Verify lot-to-lot coefficient of variations in Biochemistry and Haematology. Track z-scores on internal quality runs.</div>
                      </div>
                      <div style={{ background: "#FFF5F5", padding: 12, borderRadius: 8, border: "0.5px solid #FECDD3" }}>
                        <strong style={{ fontSize: 12, color: "#9F1239" }}>Post-analytical Security</strong>
                        <div style={{ fontSize: 11.5, color: "#5F5E66", marginTop: 4 }}>Automate critical alert callbacks. Prevent transcription slips by syncing analyzer output flags through LIMS handshake.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Register Form */}
            {activeTab === "risk_management" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Dynamic Organizational Risk Register (ISO 15189 §8.5 / ISO 27001 A.5)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleRiskSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Risk Description / Source</span>
                        <input type="text" required placeholder="e.g. Failure of main UPS back-up" value={riskForm.riskSource} onChange={(e) => setRiskForm({...riskForm, riskSource: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Likelihood Score (1-5)</span>
                        <select value={riskForm.likelihood} onChange={(e) => setRiskForm({...riskForm, likelihood: e.target.value})} style={S.inp}>
                          <option value="1">1 (Rare)</option>
                          <option value="2">2 (Unlikely)</option>
                          <option value="3">3 (Possible)</option>
                          <option value="4">4 (Likely)</option>
                          <option value="5">5 (Almost Certain)</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Severity / Impact Score (1-5)</span>
                        <select value={riskForm.severity} onChange={(e) => setRiskForm({...riskForm, severity: e.target.value})} style={S.inp}>
                          <option value="1">1 (Insignificant)</option>
                          <option value="2">2 (Minor)</option>
                          <option value="3">3 (Moderate)</option>
                          <option value="4">4 (Major)</option>
                          <option value="5">5 (Catastrophic)</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ ...S.grid(3), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Potential Impact Area</span>
                        <input type="text" required placeholder="e.g. Disruption of analyzer cycles" value={riskForm.impactArea} onChange={(e) => setRiskForm({...riskForm, impactArea: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Mitigation Control Protocols</span>
                        <input type="text" required placeholder="e.g. Semi-annual battery impedance checks" value={riskForm.mitigationControl} onChange={(e) => setRiskForm({...riskForm, mitigationControl: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Risk Owner</span>
                        <input type="text" required placeholder="e.g. Maintenance HOD" value={riskForm.owner} onChange={(e) => setRiskForm({...riskForm, owner: e.target.value})} style={S.inp} />
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
                      <span style={{ fontSize: 11, color: "#9F1239", fontWeight: 500 }}>
                        Current Calculated Risk Matrix Score: <strong>{(parseInt(riskForm.likelihood) || 1) * (parseInt(riskForm.severity) || 1)}</strong>
                      </span>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Register Risk Matrix Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Opportunities for Improvement Log */}
            {activeTab === "improvement_opportunities" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Continuous Improvement Register (OFI Log)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleOfiSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>OFI Title / Topic</span>
                        <input type="text" required placeholder="e.g. Automated LIMS callback validation" value={ofiForm.title} onChange={(e) => setOfiForm({...ofiForm, title: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Target Department</span>
                        <select value={ofiForm.targetedDept} onChange={(e) => setOfiForm({...ofiForm, targetedDept: e.target.value})} style={S.inp}>
                          <option value="Phlebotomy">Phlebotomy</option>
                          <option value="Reception">Reception</option>
                          <option value="Biochemistry">Biochemistry</option>
                          <option value="Haematology">Haematology</option>
                          <option value="Information Technology">Information Technology</option>
                          <option value="Quality">Quality</option>
                        </select>
                      </div>
                      <div>
                        <span style={S.label}>Initial Proposal Status</span>
                        <select value={ofiForm.status} onChange={(e) => setOfiForm({...ofiForm, status: e.target.value})} style={S.inp}>
                          <option value="Proposed">Proposed</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Action Assigned">Action Assigned</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ ...S.grid(2), marginTop: 12 }}>
                      <div>
                        <span style={S.label}>Description of Deficiency/Enhancement</span>
                        <textarea required placeholder="Explain why this improvement is needed..." value={ofiForm.description} onChange={(e) => setOfiForm({...ofiForm, description: e.target.value})} style={{ ...S.inp, height: 70, resize: "none" }} />
                      </div>
                      <div>
                        <span style={S.label}>Proposed Action Plan</span>
                        <textarea required placeholder="What are the steps to implement this?" value={ofiForm.proposedAction} onChange={(e) => setOfiForm({...ofiForm, proposedAction: e.target.value})} style={{ ...S.inp, height: 70, resize: "none" }} />
                      </div>
                    </div>

                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Record OFI Opportunity
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Director reviews */}
            {activeTab === "director_reviews" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Director Review Minutes & Sign-Offs (ISO 15189 §8.6 Management Review)</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleReviewSubmit}>
                    <div style={S.grid(3)}>
                      <div>
                        <span style={S.label}>Management Review Meeting Date</span>
                        <input type="date" required value={reviewForm.meetingDate} onChange={(e) => setReviewForm({...reviewForm, meetingDate: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Review Agenda / Core Topic</span>
                        <input type="text" required placeholder="e.g. Q2 Quality Metrics and EQA Results" value={reviewForm.agenda} onChange={(e) => setReviewForm({...reviewForm, agenda: e.target.value})} style={S.inp} />
                      </div>
                      <div>
                        <span style={S.label}>Director Signature Release Status</span>
                        <select value={reviewForm.signedStatus} onChange={(e) => setReviewForm({...reviewForm, signedStatus: e.target.value})} style={S.inp}>
                          <option value="Approved & Released">Approved & Digitally Released</option>
                          <option value="Draft - Pending Changes">Draft - Pending HOD corrections</option>
                          <option value="Rejected">Rejected / Requesting Re-Audit</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <span style={S.label}>Meeting Discussion Summary & Recommendations</span>
                      <textarea required placeholder="Detail the executive decisions..." value={reviewForm.discussionNotes} onChange={(e) => setReviewForm({...reviewForm, discussionNotes: e.target.value})} style={{ ...S.inp, height: 90, resize: "vertical" }} />
                    </div>

                    <div style={{ textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>
                        Log Executive Sign-Off
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Generic checklist form */}
            {activeTab !== "duty_roster" && activeTab !== "executive_summary" && activeTab !== "risk_management" && activeTab !== "improvement_opportunities" && activeTab !== "director_reviews" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Record Administrative Verification Logs</div></div>
                <div style={S.cardBody}>
                  <form onSubmit={handleGenericSubmit} style={S.grid(3)}>
                    <div>
                      <span style={S.label}>Verification Topic / Details</span>
                      <input type="text" required placeholder="e.g. Access control log review completed" value={genericForm.val} onChange={(e) => setGenericForm({ ...genericForm, val: e.target.value })} style={S.inp} />
                    </div>
                    <div>
                      <span style={S.label}>Status Compliance</span>
                      <select value={genericForm.status} onChange={(e) => setGenericForm({ ...genericForm, status: e.target.value })} style={S.inp}>
                        <option value="Pass">Pass / Compliant</option>
                        <option value="Fail">Fail / Action Required</option>
                      </select>
                    </div>
                    <div>
                      <span style={S.label}>Remarks / Decisions</span>
                      <input type="text" value={genericForm.remarks} onChange={(e) => setGenericForm({ ...genericForm, remarks: e.target.value })} style={S.inp} />
                    </div>
                    <div style={{ gridColumn: "span 3", textAlign: "right", marginTop: 12 }}>
                      <button type="submit" disabled={saving} style={S.btn()}>Log Verification Entry</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Quality Log History */}
            {activeTab !== "duty_roster" && (
              <div style={S.card}>
                <div style={S.cardHeader}><div style={S.cardTitle}>Director Review logs history</div></div>
                <div style={S.cardBody}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        <th style={S.th}>Date</th>
                        <th style={S.th}>Signee/Operator</th>
                        <th style={S.th}>Notes/Observations</th>
                        <th style={S.th}>Compliance Status</th>
                        <th style={S.th}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ ...S.td, textAlign: "center", color: "#9F1239" }}>No logs recorded for this section.</td>
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