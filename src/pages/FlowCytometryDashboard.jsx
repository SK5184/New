d// FlowCytometryDashboard.jsx
// MBL QMS — Flow Cytometry department dashboard
// Role-aware: HOD · Supervisor · Staff
// Priority widget: Equipment breakdown report + live status tracker
// Other widgets: IQC entry, Sample log, Documents, Tasks, NCR

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ─── Flow cytometry equipment ─────────────────────────────────────────────────

const FC_EQUIPMENT = [
  { id:"EQ016", name:"Flow Cytometer (BD FACSCanto II)" },
  { id:"EQ017", name:"Cell Counter (Sysmex XN-550)" },
  { id:"EQ012", name:"Centrifuge" },
  { id:"EQ010", name:"Refrigerator" },
  { id:"EQ011", name:"Deep Freezer" },
];

const SEVERITY = ["Low","Medium","High","Critical"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit",
  });
}

function today() { return new Date().toISOString().split("T")[0]; }

function initials(name) {
  return (name||"FC").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const inp = {
  padding:"7px 10px", border:"0.5px solid #D3D1C7", borderRadius:7,
  fontSize:12, background:"#fff", color:"#2C2C2A",
  width:"100%", boxSizing:"border-box", outline:"none",
};

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display:"inline-block", fontSize:10, fontWeight:500,
      padding:"2px 8px", borderRadius:20, background:bg, color,
    }}>{label}</span>
  );
}

function Modal({ title, sub, onClose, children }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"#fff", borderRadius:14,
        width:"100%", maxWidth:500,
        maxHeight:"90vh", overflow:"auto",
        boxShadow:"0 12px 60px rgba(0,0,0,0.22)",
      }}>
        <div style={{
          padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6",
          position:"sticky", top:0, background:"#fff", zIndex:1,
          display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>
            {sub && <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{
            background:"none", border:"none", cursor:"pointer",
            fontSize:18, color:"#888780",
          }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:500, color:"#5F5E5A" }}>
        {label}{required && <span style={{ color:"#E24B4A" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Stage pipeline (compact) ─────────────────────────────────────────────────

function MiniPipeline({ status }) {
  const steps = ["Open","In progress","Repaired","Verified","Closed"];
  const idx = steps.indexOf(status);
  const current = idx === -1
    ? (status === "Acknowledged" ? 4 : status === "Disabled" ? 4 : 0)
    : idx;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:6 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex: i < 4 ? 1 : "none" }}>
          <div style={{
            width:18, height:18, borderRadius:"50%", flexShrink:0,
            background: i < current ? "#0F6E56" : i === current ? "#185FA5" : "#E0DDD6",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize:9, fontWeight:600,
          }}>
            {i < current ? "✓" : i+1}
          </div>
          {i < 4 && (
            <div style={{
              flex:1, height:2, margin:"0 2px",
              background: i < current ? "#0F6E56" : "#E0DDD6",
            }}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Breakdown widget ─────────────────────────────────────────────────────────

function BreakdownWidget({ role, userName, dept }) {
  const [breakdowns, setBreakdowns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    equipmentId:"", equipmentName:"",
    severity:"Medium", description:"",
    reportedBy: userName||"",
    breakdownDate: today(), breakdownTime:"",
  });
  const [verifyRec, setVerifyRec] = useState(null);
  const [verifyNote, setVerifyNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, "actionRequests"),
          where("addressedDepartment","==","Biomedical"),
          orderBy("createdAt","desc"), limit(10))
      );
      // Filter to Flow Cytometry equipment only
      const fcEqIds = FC_EQUIPMENT.map(e => e.id);
      const recs = snap.docs
        .map(d => ({ id:d.id, ...d.data() }))
        .filter(r => fcEqIds.includes(r.equipmentId) || r.department === "Flow Cytometry");
      setBreakdowns(recs);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRaise = async () => {
    if (!form.equipmentId || !form.description || !form.reportedBy) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "actionRequests"), {
        ...form,
        department: "Flow Cytometry",
        addressedDepartment: "Biomedical",
        status: "Open",
        createdAt: serverTimestamp(),
        addedBy: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({
        equipmentId:"", equipmentName:"",
        severity:"Medium", description:"",
        reportedBy: userName||"",
        breakdownDate: today(), breakdownTime:"",
      });
      load();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const handleVerify = async () => {
    if (!verifyRec) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "actionRequests", verifyRec.id), {
        status: "Verified",
        verifiedBy: userName || auth.currentUser?.email||"",
        verificationNote: verifyNote,
        verifiedAt: serverTimestamp(),
      });
      setModal(null);
      setVerifyNote("");
      setVerifyRec(null);
      load();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const openCount = breakdowns.filter(b => b.status === "Open").length;
  const pendingVerify = breakdowns.filter(b => b.status === "Repaired");

  const STAGE_CFG = {
    Open:         { color:"#A32D2D", bg:"#FCEBEB" },
    "In progress":{ color:"#854F0B", bg:"#FAEEDA" },
    Repaired:     { color:"#185FA5", bg:"#E6F1FB" },
    Verified:     { color:"#0F6E56", bg:"#E1F5EE" },
    Acknowledged: { color:"#3C3489", bg:"#EEEDFE" },
    Disabled:     { color:"#888780", bg:"#F1EFE8" },
  };

  return (
    <div style={{
      background:"#fff", border:"0.5px solid #E0DDD6",
      borderRadius:12, overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{
        padding:"12px 16px",
        borderBottom:"0.5px solid #E0DDD6",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        background: openCount > 0 ? "#FFF8F8" : "#fff",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>⚠</span>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              Equipment breakdown
            </div>
            <div style={{ fontSize:11, color:"#888780" }}>
              Flow Cytometry dept · KPI 7.6.10
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {openCount > 0 && (
            <span style={{
              fontSize:11, padding:"3px 10px", borderRadius:20,
              background:"#FCEBEB", color:"#A32D2D",
              border:"0.5px solid #E24B4A", fontWeight:500,
            }}>
              {openCount} open
            </span>
          )}
          {pendingVerify.length > 0 && (
            <span style={{
              fontSize:11, padding:"3px 10px", borderRadius:20,
              background:"#E6F1FB", color:"#185FA5",
              border:"0.5px solid #85B7EB", fontWeight:500,
            }}>
              {pendingVerify.length} pending verify
            </span>
          )}
          <button
            onClick={() => setModal("raise")}
            style={{
              padding:"6px 12px", background:"#A32D2D", color:"#fff",
              border:"none", borderRadius:7, fontSize:12, fontWeight:500,
              cursor:"pointer",
            }}>
            + Report
          </button>
        </div>
      </div>

      {/* Alert banner if pending verification */}
      {pendingVerify.length > 0 && (
        <div style={{
          background:"#E6F1FB", borderBottom:"0.5px solid #85B7EB",
          padding:"8px 16px", display:"flex", alignItems:"center", gap:8,
        }}>
          <span style={{ fontSize:13 }}>🔵</span>
          <div style={{ flex:1, fontSize:12, color:"#185FA5" }}>
            <strong>{pendingVerify.length} equipment</strong> repaired by BME — please verify working condition
          </div>
        </div>
      )}

      {/* Records */}
      <div style={{ maxHeight:340, overflowY:"auto" }}>
        {loading && (
          <div style={{ padding:20, textAlign:"center", color:"#888780", fontSize:13 }}>
            Loading…
          </div>
        )}
        {!loading && breakdowns.length === 0 && (
          <div style={{ padding:24, textAlign:"center", color:"#888780", fontSize:13 }}>
            No breakdown records for Flow Cytometry equipment.
            Click <strong>+ Report</strong> to raise one.
          </div>
        )}
        {breakdowns.map(rec => {
          const sc = STAGE_CFG[rec.status] || STAGE_CFG.Open;
          const canVerify = rec.status === "Repaired";
          return (
            <div key={rec.id} style={{
              padding:"12px 16px",
              borderBottom:"0.5px solid #F1EFE8",
              background: rec.status==="Open" ? "#FFFAFA" : "#fff",
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>
                      {rec.equipmentName || rec.equipment || "Equipment"}
                    </div>
                    <Badge
                      label={rec.severity||"Medium"}
                      color={rec.severity==="Critical"?"#791F1F":rec.severity==="High"?"#854F0B":"#185FA5"}
                      bg={rec.severity==="Critical"?"#FCEBEB":rec.severity==="High"?"#FAEEDA":"#E6F1FB"}
                    />
                    <Badge label={rec.status||"Open"} color={sc.color} bg={sc.bg} />
                  </div>
                  <div style={{ fontSize:11, color:"#888780", marginTop:3, lineHeight:1.4 }}>
                    {rec.description?.slice(0,80)}{rec.description?.length > 80 ? "…" : ""}
                  </div>
                  <div style={{ fontSize:10, color:"#B4B2A9", marginTop:2 }}>
                    {fmtDate(rec.createdAt)} - {rec.reportedBy}
                    {rec.downtimeHours && " - " + rec.downtimeHours + "h downtime"}
                  </div>
                  <MiniPipeline status={rec.status} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, flexShrink:0 }}>
                  {canVerify && (
                    <button onClick={() => {
                      setVerifyRec(rec);
                      setVerifyNote("");
                      setModal("verify");
                    }} style={{
                      padding:"5px 10px", background:"#0F6E56", color:"#fff",
                      border:"none", borderRadius:6, fontSize:11, cursor:"pointer",
                      fontWeight:500,
                    }}>
                      Verify ✓
                    </button>
                  )}
                  {rec.status === "Open" && (
                    <span style={{ fontSize:10, color:"#A32D2D", textAlign:"center" }}>
                      Awaiting BME
                    </span>
                  )}
                  {rec.status === "In progress" && (
                    <span style={{ fontSize:10, color:"#854F0B", textAlign:"center" }}>
                      BME working
                    </span>
                  )}
                  {["Verified","Acknowledged"].includes(rec.status) && (
                    <span style={{ fontSize:10, color:"#0F6E56", textAlign:"center" }}>
                      Complete ✓
                    </span>
                  )}
                </div>
              </div>
              {/* BME note */}
              {rec.workDone && (
                <div style={{
                  marginTop:8, padding:"6px 10px",
                  background:"#F7F6F2", borderRadius:6,
                  fontSize:11, color:"#5F5E5A",
                }}>
                  <span style={{ fontWeight:500 }}>BME repair: </span>
                  {rec.workDone}
                  {rec.partsReplaced && " · Parts: " + rec.partsReplaced}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding:"8px 16px", background:"#FAFAF8",
        borderTop:"0.5px solid #E0DDD6",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ fontSize:11, color:"#888780" }}>
          KPI 7.6.10 — equipment downtime auto-calculated
        </div>
        <button onClick={load} style={{
          background:"none", border:"none", cursor:"pointer",
          fontSize:11, color:"#888780",
        }}>↻ Refresh</button>
      </div>

      {/* Raise modal */}
      {modal === "raise" && (
        <Modal
          title="Report equipment breakdown"
          sub="Flow Cytometry · Notifies Biomedical Engineering"
          onClose={() => setModal(null)}>
          <div style={{
            background:"#FCEBEB", border:"0.5px solid #E24B4A",
            borderRadius:8, padding:"9px 12px", marginBottom:14,
            fontSize:12, color:"#791F1F",
          }}>
            ⚠ This will immediately notify BME and contribute to KPI 7.6.10.
          </div>
          <Field label="Equipment" required>
            <select style={inp} value={form.equipmentId}
              onChange={e => {
                const eq = FC_EQUIPMENT.find(x => x.id === e.target.value);
                setForm(p => ({...p, equipmentId:e.target.value, equipmentName:eq?.name||""}));
              }}>
              <option value="">Select equipment</option>
              {FC_EQUIPMENT.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Severity" required>
            <select style={inp} value={form.severity}
              onChange={e => setForm(p => ({...p, severity:e.target.value}))}>
              {SEVERITY.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Description of breakdown" required>
            <textarea style={{ ...inp, resize:"vertical" }} rows={3}
              placeholder="Describe the fault, error code, or symptoms observed…"
              value={form.description}
              onChange={e => setForm(p => ({...p, description:e.target.value}))} />
          </Field>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <Field label="Date">
              <input style={inp} type="date" value={form.breakdownDate}
                onChange={e => setForm(p => ({...p, breakdownDate:e.target.value}))} />
            </Field>
            <Field label="Time">
              <input style={inp} type="time" value={form.breakdownTime}
                onChange={e => setForm(p => ({...p, breakdownTime:e.target.value}))} />
            </Field>
          </div>
          <Field label="Reported by" required>
            <input style={inp} type="text" placeholder="Your full name"
              value={form.reportedBy}
              onChange={e => setForm(p => ({...p, reportedBy:e.target.value}))} />
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{
              padding:"7px 14px", background:"#F7F6F2", color:"#2C2C2A",
              border:"0.5px solid #D3D1C7", borderRadius:8, fontSize:12, cursor:"pointer",
            }} onClick={() => setModal(null)}>Cancel</button>
            <button style={{
              padding:"7px 14px", background:"#A32D2D", color:"#fff",
              border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
            }} onClick={handleRaise} disabled={saving}>
              {saving ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </Modal>
      )}

      {/* Verify modal */}
      {modal === "verify" && verifyRec && (
        <Modal
          title="Verify equipment is working"
          sub={
  <>
    {verifyRec.equipmentName} · Repaired by {verifyRec.closedBy || "BME"}
  </>
}
          onClose={() => setModal(null)}>
          <div style={{
            background:"#E1F5EE", borderRadius:8, padding:"9px 12px",
            marginBottom:14, fontSize:12, color:"#085041",
          }}>
            ✓ BME has completed the repair. Please confirm the equipment is functioning
            correctly before signing off.
          </div>
          <div style={{
            background:"#F7F6F2", borderRadius:8, padding:"10px 12px",
            marginBottom:14, fontSize:12,
          }}>
            <div style={{ color:"#888780", marginBottom:4 }}>Repair details</div>
            <div style={{ color:"#2C2C2A" }}>{verifyRec.workDone||"—"}</div>
            {verifyRec.partsReplaced && (
              <div style={{ color:"#5F5E5A", marginTop:4 }}>
                Parts replaced: {verifyRec.partsReplaced}
              </div>
            )}
            {verifyRec.downtimeHours && (
              <div style={{ color:"#5F5E5A", marginTop:4 }}>
                Downtime: {verifyRec.downtimeHours}h
              </div>
            )}
          </div>
          <Field label="Verification note">
            <textarea style={{ ...inp, resize:"vertical" }} rows={3}
              placeholder="e.g. Equipment tested — all parameters within range, IQC passed…"
              value={verifyNote}
              onChange={e => setVerifyNote(e.target.value)} />
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{
              padding:"7px 14px", background:"#F7F6F2", color:"#2C2C2A",
              border:"0.5px solid #D3D1C7", borderRadius:8, fontSize:12, cursor:"pointer",
            }} onClick={() => setModal(null)}>Cancel</button>
            <button style={{
              padding:"7px 14px", background:"#0F6E56", color:"#fff",
              border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
            }} onClick={handleVerify} disabled={saving}>
              {saving ? "Saving…" : "Confirm working ✓"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export default function FlowCytometryDashboard({ role, userName }) {
  const tabs = [
    { key:"home",      label:"Dashboard" },
    { key:"breakdown", label:"Breakdown" },
    { key:"iqc",       label:"IQC / EQA" },
    { key:"samples",   label:"Samples" },
    { key:"documents", label:"Documents" },
    { key:"ncr",       label:"NCR" },
  ];
  const [activeTab, setActiveTab] = useState("home");

  const quickStats = [
    { label:"Samples today",   val:"34",  sub:"3 pending result",  color:"#2C2C2A" },
    { label:"IQC status",      val:"All pass",sub:"3/3 controls",   color:"#0F6E56" },
    { label:"Open breakdowns", val:"1",   sub:"Awaiting BME",      color:"#A32D2D" },
    { label:"Pending verify",  val:"0",   sub:"All verified",      color:"#0F6E56" },
  ];

  const tasks = [
    { dot:"#EF9F27", text:"Enter afternoon IQC — Level 2 & 3",   due:"3:00 PM",   badge:"Pending",  bc:"#FAEEDA", tc:"#633806" },
    { dot:"#A32D2D", text:"Verify BD FACSCanto repair — BME done", due:"ASAP",      badge:"Action",   bc:"#FCEBEB", tc:"#791F1F" },
    { dot:"#185FA5", text:"Acknowledge SOP-FCM-04 revision",       due:"Today",     badge:"Open",     bc:"#E6F1FB", tc:"#185FA5" },
    { dot:"#1D9E75", text:"Monthly sample log submitted",          due:"Done",      badge:"Done",     bc:"#E1F5EE", tc:"#085041" },
  ];

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" }}>

      {/* Top bar */}
      <div style={{
        background:"#fff", borderBottom:"0.5px solid #E0DDD6",
        padding:"10px 20px", display:"flex", alignItems:"center",
        justifyContent:"space-between", flexWrap:"wrap", gap:10,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8, background:"#185FA5",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#E6F1FB", fontSize:16,
          }}>🔬</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>
              Flow Cytometry
            </div>
            <div style={{ fontSize:11, color:"#888780" }}>
              Technical dept · ISO 15189:2022
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:28, height:28, borderRadius:"50%", background:"#E6F1FB",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:600, color:"#185FA5",
          }}>{initials(userName)}</div>
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>
              {userName || "User"}
            </div>
            <div style={{ fontSize:10, color:"#888780" }}>{role || "Staff"}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background:"#fff", borderBottom:"0.5px solid #E0DDD6",
        padding:"0 20px", display:"flex", gap:0,
      }}>
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding:"9px 14px", fontSize:12,
              fontWeight: activeTab===t.key ? 500 : 400,
              color: activeTab===t.key ? "#0F6E56" : "#888780",
              cursor:"pointer", background:"none", border:"none",
              borderBottom: activeTab===t.key ? "2px solid #0F6E56" : "2px solid transparent",
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>

        {/* ── HOME TAB ─────────────────────────────── */}
        {activeTab === "home" && (
          <>
            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
              {quickStats.map((s,i) => (
                <div key={i} style={{
                  background:"#fff", border:"0.5px solid #E0DDD6",
                  borderRadius:10, padding:"12px 14px",
                }}>
                  <div style={{ fontSize:11, color:"#888780", marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:600, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:14 }}>
              <div>
                {/* Breakdown widget — PRIORITY */}
                <BreakdownWidget role={role} userName={userName} dept="Flow Cytometry" />

                {/* Tasks */}
                <div style={{
                  background:"#fff", border:"0.5px solid #E0DDD6",
                  borderRadius:12, overflow:"hidden", marginTop:14,
                }}>
                  <div style={{
                    padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
                    fontSize:13, fontWeight:500, color:"#2C2C2A",
                  }}>Tasks & actions</div>
                  {tasks.map((t,i) => (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:10,
                      padding:"9px 16px",
                      borderBottom: i < tasks.length-1 ? "0.5px solid #F1EFE8" : "none",
                    }}>
                      <div style={{ width:7, height:7, borderRadius:"50%", background:t.dot, flexShrink:0 }}/>
                      <div style={{ flex:1, fontSize:12, color:"#2C2C2A" }}>{t.text}</div>
                      <div style={{ fontSize:11, color:"#888780" }}>{t.due}</div>
                      <span style={{
                        fontSize:10, padding:"2px 8px", borderRadius:10,
                        background:t.bc, color:t.tc, fontWeight:500,
                      }}>{t.badge}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div>
                {/* Quick actions */}
                <div style={{
                  background:"#fff", border:"0.5px solid #E0DDD6",
                  borderRadius:12, overflow:"hidden", marginBottom:14,
                }}>
                  <div style={{
                    padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
                    fontSize:13, fontWeight:500, color:"#2C2C2A",
                  }}>Quick actions</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
                    {[
                      { icon:"⚠",  label:"Report breakdown", color:"#A32D2D",
                        action: () => setActiveTab("breakdown") },
                      { icon:"📈", label:"Enter IQC",         color:"#185FA5",
                        action: () => setActiveTab("iqc") },
                      { icon:"🧪", label:"Log sample",        color:"#0F6E56",
                        action: () => setActiveTab("samples") },
                      { icon:"📄", label:"View SOPs",         color:"#534AB7",
                        action: () => setActiveTab("documents") },
                    ].map((q,i) => (
                      <button key={i} onClick={q.action} style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"12px 14px",
                        background:"none",
                        cursor:"pointer", textAlign:"left",
                        borderRight: i%2===0 ? "0.5px solid #F1EFE8" : "none",
                        borderBottom: i<2 ? "0.5px solid #F1EFE8" : "none",
                        border: "none",
                      }}>
                        <span style={{ fontSize:18 }}>{q.icon}</span>
                        <span style={{ fontSize:12, color:"#2C2C2A", fontWeight:500 }}>
                          {q.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ISO clause card */}
                <div style={{
                  background:"#0A0F0D", borderRadius:12,
                  padding:"14px 16px", border:"0.5px solid #1D3D2F",
                }}>
                  <div style={{ fontSize:11, color:"#5DCAA5", marginBottom:8, fontWeight:500 }}>
                    Flow cytometry — ISO clauses
                  </div>
                  {[
                    { c:"§6.4.1", l:"Equipment selection & use" },
                    { c:"§6.4.3", l:"Calibration & verification" },
                    { c:"§6.4.5", l:"Metrological traceability" },
                    { c:"§6.4.7", l:"Breakdown reporting" },
                    { c:"§7.5.6", l:"IQC performance — KPI" },
                  ].map((x,i) => (
                    <div key={i} style={{
                      display:"flex", justifyContent:"space-between",
                      padding:"5px 0",
                      borderBottom: i<4 ? "0.5px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <span style={{ fontSize:11, color:"#4A5550", fontFamily:"monospace" }}>{x.c}</span>
                      <span style={{ fontSize:11, color:"#8B9E96" }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── BREAKDOWN TAB — full widget ──────────── */}
        {activeTab === "breakdown" && (
          <BreakdownWidget role={role} userName={userName} dept="Flow Cytometry" />
        )}

        {/* ── OTHER TABS — coming soon ─────────────── */}
        {["iqc","samples","documents","ncr"].includes(activeTab) && (
          <div style={{
            background:"#fff", border:"0.5px solid #E0DDD6",
            borderRadius:12, padding:"36px", textAlign:"center", marginTop:4,
          }}>
            <div style={{ fontSize:36, marginBottom:12 }}>
              {activeTab==="iqc"?"📈":activeTab==="samples"?"🧪":activeTab==="documents"?"📄":"⚠"}
            </div>
            <div style={{ fontSize:16, fontWeight:600, color:"#2C2C2A", marginBottom:8 }}>
              {activeTab==="iqc"?"IQC / EQA":activeTab==="samples"?"Sample management":activeTab==="documents"?"Document control":"NCR / CAPA"}
            </div>
            <div style={{ fontSize:13, color:"#888780", marginBottom:16, lineHeight:1.6 }}>
              This module is being built. It will be available in the next update.
            </div>
            <span style={{
              fontSize:11, padding:"4px 14px", borderRadius:20,
              background:"#E1F5EE", color:"#0F6E56",
              border:"0.5px solid #5DCAA5",
            }}>Coming soon</span>
          </div>
        )}

      </div>
    </div>
  );
}
