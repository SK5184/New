// BreakdownWorkflow.jsx
// MBL QMS — Equipment Breakdown End-to-End Workflow
// Stage 1: User raises breakdown
// Stage 2: BME acknowledges + assigns engineer + ETA
// Stage 3: BME repairs, logs work done, parts replaced, closes
// Stage 4: Dept user verifies equipment working
// Stage 5: Asst Director reviews → Director acknowledges (or disables)
// PDF report button available to BME after Stage 3
// KPI 7.6.10 auto-updated from actionRequests collection

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const EQUIPMENT_LIST = [
  { id:"EQ001", name:"Sysmex XN-1000",    dept:"Haematology" },
  { id:"EQ002", name:"Cobas e411",         dept:"Serology" },
  { id:"EQ003", name:"Cobas c311",         dept:"Biochemistry" },
  { id:"EQ004", name:"BD BACTEC FX40",     dept:"Microbiology" },
  { id:"EQ005", name:"Vitek 2 Compact",    dept:"Microbiology" },
  { id:"EQ006", name:"Biosafety Cabinet",  dept:"Microbiology" },
  { id:"EQ007", name:"Autoclave",          dept:"Microbiology" },
  { id:"EQ008", name:"ELISA Reader",       dept:"Serology" },
  { id:"EQ009", name:"PCR Machine",        dept:"Molecular Biology" },
  { id:"EQ010", name:"Refrigerator",       dept:"All" },
  { id:"EQ011", name:"Deep Freezer",       dept:"All" },
  { id:"EQ012", name:"Centrifuge",         dept:"All" },
  { id:"EQ013", name:"Microscope",         dept:"All" },
  { id:"EQ014", name:"Water Bath",         dept:"All" },
  { id:"EQ015", name:"Incubator",          dept:"Microbiology" },
  { id:"EQ016", name:"Flow Cytometer",     dept:"Flow Cytometry" },
  { id:"EQ017", name:"Cell Counter",       dept:"Flow Cytometry" },
];

const SEVERITY = ["Low","Medium","High","Critical"];

const STAGE_CONFIG = {
  Open:         { label:"Open",         color:"#A32D2D", bg:"#FCEBEB", step:1 },
  "In progress":{ label:"In progress",  color:"#854F0B", bg:"#FAEEDA", step:2 },
  Repaired:     { label:"Repaired",     color:"#185FA5", bg:"#E6F1FB", step:3 },
  Verified:     { label:"Verified",     color:"#0F6E56", bg:"#E1F5EE", step:4 },
  Acknowledged: { label:"Acknowledged", color:"#3C3489", bg:"#EEEDFE", step:5 },
  Disabled:     { label:"Disabled",     color:"#888780", bg:"#F1EFE8", step:5 },
  Closed:       { label:"Closed",       color:"#0F6E56", bg:"#E1F5EE", step:5 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeDiff(a, b) {
  if (!a || !b) return null;
  const h = ((b - a) / (1000 * 60 * 60)).toFixed(1);
  return `${h}h`;
}

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN", {
    day:"2-digit", month:"short", year:"numeric",
    hour:"2-digit", minute:"2-digit",
  });
}

function today() { return new Date().toISOString().split("T")[0]; }

// ─── UI helpers ───────────────────────────────────────────────────────────────

const inp = {
  padding:"7px 10px", border:"0.5px solid #D3D1C7", borderRadius:7,
  fontSize:12, background:"#fff", color:"#2C2C2A",
  width:"100%", boxSizing:"border-box", outline:"none",
};

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display:"inline-block", fontSize:10, fontWeight:500,
      padding:"2px 9px", borderRadius:20, background:bg, color,
    }}>{label}</span>
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

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:1000, padding:16,
    }}>
      <div style={{
        background:"#fff", borderRadius:14,
        width:"100%", maxWidth: wide ? 680 : 520,
        maxHeight:"92vh", overflow:"auto",
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
            fontSize:18, color:"#888780", lineHeight:1, flexShrink:0,
          }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────

function StagePipeline({ status }) {
  const stages = [
    { key:"Open",         label:"Raised" },
    { key:"In progress",  label:"BME" },
    { key:"Repaired",     label:"Repaired" },
    { key:"Verified",     label:"Verified" },
    { key:"Acknowledged", label:"Closed" },
  ];
  const currentStep = STAGE_CONFIG[status]?.step || 1;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, margin:"8px 0" }}>
      {stages.map((s, i) => {
        const done = currentStep > i + 1;
        const active = currentStep === i + 1;
        return (
          <div key={s.key} style={{ display:"flex", alignItems:"center", flex: i < stages.length - 1 ? 1 : "none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{
                width:24, height:24, borderRadius:"50%",
                background: done ? "#0F6E56" : active ? "#185FA5" : "#E0DDD6",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:"#fff", fontSize:10, fontWeight:600,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize:9, color: done||active ? "#2C2C2A" : "#B4B2A9", whiteSpace:"nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < stages.length - 1 && (
              <div style={{
                flex:1, height:2,
                background: done ? "#0F6E56" : "#E0DDD6",
                margin:"0 4px", marginBottom:14,
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

function generatePDF(rec) {
  // Build printable HTML and open in new window
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Breakdown Report — ${rec.equipmentName}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 30px; color: #2C2C2A; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .sub { font-size: 11px; color: #888780; margin-bottom: 20px; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 13px; font-weight: bold; border-bottom: 1px solid #E0DDD6;
      padding-bottom: 4px; margin-bottom: 10px; color: #0F6E56; }
    .row { display: flex; gap: 10px; margin-bottom: 6px; }
    .label { font-weight: bold; min-width: 180px; color: #5F5E5A; }
    .val { flex: 1; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px;
      font-size: 11px; font-weight: bold; }
    .sign-box { border: 1px solid #D3D1C7; border-radius: 6px; padding: 10px 14px;
      margin-top: 6px; min-height: 40px; }
    .sign-label { font-size: 10px; color: #888780; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 0.5px solid #E0DDD6; padding: 6px 10px; font-size: 11px; }
    th { background: #F7F6F2; font-weight: bold; text-align: left; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>Equipment Breakdown Report</h1>
  <div class="sub">MBL QMS · ISO 15189:2022 §6.4 · Generated ${new Date().toLocaleString("en-IN")}</div>

  <div class="section">
    <div class="section-title">Equipment details</div>
    <div class="row"><div class="label">Equipment:</div><div class="val">${rec.equipmentName || "—"} (${rec.equipmentId || "—"})</div></div>
    <div class="row"><div class="label">Department:</div><div class="val">${rec.department || "—"}</div></div>
    <div class="row"><div class="label">Severity:</div><div class="val">${rec.severity || "—"}</div></div>
    <div class="row"><div class="label">Report reference:</div><div class="val">BKD-${rec.id?.slice(-6).toUpperCase() || "XXXXXX"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Stage 1 — Breakdown reported</div>
    <div class="row"><div class="label">Reported by:</div><div class="val">${rec.reportedBy || "—"}</div></div>
    <div class="row"><div class="label">Date & time:</div><div class="val">${fmtDate(rec.createdAt)}</div></div>
    <div class="row"><div class="label">Description:</div><div class="val">${rec.description || "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Stage 2 — BME acknowledgement</div>
    <div class="row"><div class="label">Acknowledged by:</div><div class="val">${rec.assignedTo || "—"}</div></div>
    <div class="row"><div class="label">Acknowledged at:</div><div class="val">${fmtDate(rec.acknowledgedAt)}</div></div>
    <div class="row"><div class="label">Estimated completion:</div><div class="val">${rec.estimatedCompletion || "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Stage 3 — Repair details</div>
    <div class="row"><div class="label">Repaired by:</div><div class="val">${rec.closedBy || "—"}</div></div>
    <div class="row"><div class="label">Repair completed at:</div><div class="val">${fmtDate(rec.closedAt)}</div></div>
    <div class="row"><div class="label">Work done:</div><div class="val">${rec.workDone || "—"}</div></div>
    <div class="row"><div class="label">Parts replaced:</div><div class="val">${rec.partsReplaced || "None"}</div></div>
    <div class="row"><div class="label">Root cause:</div><div class="val">${rec.rootCause || "—"}</div></div>
    <div class="row"><div class="label">Downtime:</div><div class="val">${rec.downtimeHours ? rec.downtimeHours + " hours" : "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Stage 4 — User verification</div>
    <div class="row"><div class="label">Verified by:</div><div class="val">${rec.verifiedBy || "—"}</div></div>
    <div class="row"><div class="label">Verified at:</div><div class="val">${fmtDate(rec.verifiedAt)}</div></div>
    <div class="row"><div class="label">Verification note:</div><div class="val">${rec.verificationNote || "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Stage 5 — Management acknowledgement</div>
    <div class="row"><div class="label">Asst Director:</div><div class="val">${rec.dyDirectorAck || "—"} ${rec.dyDirectorAckAt ? "· " + fmtDate(rec.dyDirectorAckAt) : ""}</div></div>
    <div class="row"><div class="label">Director:</div><div class="val">${rec.directorAck || "—"} ${rec.directorAckAt ? "· " + fmtDate(rec.directorAckAt) : ""}</div></div>
    <div class="row"><div class="label">Final status:</div><div class="val">${rec.status || "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">KPI impact — 7.6.10 Equipment downtime</div>
    <div class="row"><div class="label">Downtime hours:</div><div class="val">${rec.downtimeHours || "—"}</div></div>
    <div class="row"><div class="label">Month:</div><div class="val">${rec.createdAt ? new Date(rec.createdAt.toDate ? rec.createdAt.toDate() : rec.createdAt).toLocaleDateString("en-IN",{month:"long",year:"numeric"}) : "—"}</div></div>
  </div>

  <br/><br/>
  <table>
    <tr>
      <th>Reported by (Dept user)</th>
      <th>BME Engineer</th>
      <th>Verified by (Dept user)</th>
      <th>Asst Director</th>
      <th>Director</th>
    </tr>
    <tr>
      <td style="height:40px;">&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  </table>

  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;

  const w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BreakdownWorkflow({ dept, role, userName }) {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  // Determine user permissions based on role
  const isBME      = role === "BME";
  const isDirector = role === "Managing Director" || role === "Director";
  const isDyDir    = role === "Deputy Director" || role === "Asst Director";

  // Form states
  const [raiseForm, setRaiseForm] = useState({
    equipmentId:"", equipmentName:"", department: dept || "",
    severity:"Medium", description:"", reportedBy: userName || "",
    breakdownDate: today(), breakdownTime:"",
  });

  const [bmeForm, setBmeForm] = useState({
    assignedTo:"", estimatedCompletion:"",
    workDone:"", partsReplaced:"", rootCause:"",
  });

  const [verifyForm, setVerifyForm] = useState({
    verificationNote:"", verifiedBy: userName || "",
  });

  const [dirForm, setDirForm] = useState({
    comment:"", disable:false,
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "actionRequests"),
        where("addressedDepartment","==","Biomedical"),
        orderBy("createdAt","desc")
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  // Stage 1 — Raise breakdown
  const handleRaise = async () => {
    if (!raiseForm.equipmentId || !raiseForm.description || !raiseForm.reportedBy) {
      alert("Please fill all required fields."); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "actionRequests"), {
        ...raiseForm,
        addressedDepartment: "Biomedical",
        status: "Open",
        createdAt: serverTimestamp(),
        addedBy: auth.currentUser?.email || "",
      });
      setModal(null);
      setRaiseForm({
        equipmentId:"", equipmentName:"", department: dept||"",
        severity:"Medium", description:"", reportedBy: userName||"",
        breakdownDate: today(), breakdownTime:"",
      });
      loadRecords();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Stage 2 + 3 — BME acknowledges and repairs
  const handleBMEUpdate = async (stage) => {
    if (!selected) return;
    if (stage === 2 && !bmeForm.assignedTo) { alert("Enter engineer name."); return; }
    if (stage === 3 && !bmeForm.workDone) { alert("Enter work done."); return; }
    setSaving(true);
    try {
      const created = selected.createdAt?.toDate?.() || new Date();
      const now = new Date();
      const downtimeHours = stage === 3
        ? parseFloat(((now - created) / (1000 * 60 * 60)).toFixed(1))
        : null;

      await updateDoc(doc(db, "actionRequests", selected.id), {
        ...(stage === 2 ? {
          status: "In progress",
          assignedTo: bmeForm.assignedTo,
          acknowledgedAt: serverTimestamp(),
          estimatedCompletion: bmeForm.estimatedCompletion,
        } : {
          status: "Repaired",
          workDone: bmeForm.workDone,
          partsReplaced: bmeForm.partsReplaced,
          rootCause: bmeForm.rootCause,
          closedAt: serverTimestamp(),
          closedBy: auth.currentUser?.email || bmeForm.assignedTo,
          downtimeHours,
        }),
        updatedAt: serverTimestamp(),
      });
      setModal(null);
      setBmeForm({ assignedTo:"", estimatedCompletion:"", workDone:"", partsReplaced:"", rootCause:"" });
      loadRecords();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Stage 4 — Dept user verifies
  const handleVerify = async () => {
    if (!verifyForm.verifiedBy) { alert("Enter your name."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, "actionRequests", selected.id), {
        status: "Verified",
        verifiedBy: verifyForm.verifiedBy,
        verificationNote: verifyForm.verificationNote,
        verifiedAt: serverTimestamp(),
      });
      setModal(null);
      setVerifyForm({ verificationNote:"", verifiedBy: userName||"" });
      loadRecords();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // Stage 5 — Director acknowledges or disables
  const handleDirectorAction = async () => {
    setSaving(true);
    const isAsst = isDyDir;
    try {
      await updateDoc(doc(db, "actionRequests", selected.id), {
        ...(dirForm.disable ? {
          status: "Disabled",
          disabledBy: auth.currentUser?.email || "",
          disabledAt: serverTimestamp(),
          disabledReason: dirForm.comment,
        } : isAsst ? {
          dyDirectorAck: auth.currentUser?.email || "",
          dyDirectorAckAt: serverTimestamp(),
          dyDirectorComment: dirForm.comment,
        } : {
          status: "Acknowledged",
          directorAck: auth.currentUser?.email || "",
          directorAckAt: serverTimestamp(),
          directorComment: dirForm.comment,
        }),
        updatedAt: serverTimestamp(),
      });
      setModal(null);
      setDirForm({ comment:"", disable:false });
      loadRecords();
    } catch(e) { console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = records.filter(r =>
    filterStatus === "All" || r.status === filterStatus
  );

  const openCount = records.filter(r => r.status === "Open").length;
  const inProgressCount = records.filter(r => r.status === "In progress").length;
  const pendingVerifyCount = records.filter(r => r.status === "Repaired").length;
  const closedCount = records.filter(r => ["Acknowledged","Disabled","Verified"].includes(r.status)).length;

  const S = {
    wrap: { fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar: {
      background:"#fff", borderBottom:"0.5px solid #E0DDD6",
      padding:"10px 20px", display:"flex", alignItems:"center",
      justifyContent:"space-between", flexWrap:"wrap", gap:10,
    },
    card: {
      background:"#fff", border:"0.5px solid #E0DDD6",
      borderRadius:12, overflow:"hidden", marginBottom:14,
    },
    btn: (bg, color) => ({
      padding:"7px 14px", background: bg||"#0F6E56",
      color: color||"#E1F5EE", border:"none",
      borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer",
    }),
  };

  return (
    <div style={S.wrap}>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:8, background:"#A32D2D",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#FCEBEB", fontSize:16,
          }}>⚠</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>
              Equipment breakdown
            </div>
            <div style={{ fontSize:11, color:"#888780" }}>
              End-to-end workflow · ISO 15189:2022 §6.4.7 · KPI 7.6.10
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <select style={{ ...inp, width:140 }} value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All status</option>
            {Object.keys(STAGE_CONFIG).map(s => <option key={s}>{s}</option>)}
          </select>
          <button style={S.btn("#A32D2D")} onClick={() => setModal("raise")}>
            ⚠ Report breakdown
          </button>
        </div>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>

        {/* Summary */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Open",            val:openCount,          color:"#A32D2D", bg:"#FCEBEB" },
            { label:"In progress",     val:inProgressCount,    color:"#854F0B", bg:"#FAEEDA" },
            { label:"Pending verify",  val:pendingVerifyCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Closed / Ack",    val:closedCount,        color:"#0F6E56", bg:"#E1F5EE" },
          ].map((c,i) => (
            <div key={i} style={{
              background:c.bg, borderRadius:8, padding:"12px 14px",
              border:`0.5px solid ${c.color}33`,
            }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Records list */}
        <div style={S.card}>
          <div style={{
            padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6",
            fontSize:13, fontWeight:500, color:"#2C2C2A",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <span>Breakdown records</span>
            <span style={{ fontSize:11, color:"#888780" }}>{filtered.length} records</span>
          </div>

          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}

          {!loading && filtered.length === 0 && (
            <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>
              No breakdown records found. Click "Report breakdown" to raise one.
            </div>
          )}

          {filtered.map(rec => {
            const sc = STAGE_CONFIG[rec.status] || STAGE_CONFIG.Open;
            const created = rec.createdAt?.toDate?.();
            const closed  = rec.closedAt?.toDate?.();
            const hours   = rec.downtimeHours || (created && closed ? timeDiff(created, closed) : null);
            return (
              <div key={rec.id} style={{
                padding:"14px 16px", borderBottom:"0.5px solid #F1EFE8",
              }}>
                {/* Header row */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
                        {rec.equipmentName || rec.equipment || "Equipment"}
                      </div>
                      <span style={{
                        fontSize:10, color:"#888780", fontFamily:"monospace",
                        background:"#F7F6F2", padding:"1px 6px", borderRadius:4,
                      }}>
                        {rec.equipmentId || "—"}
                      </span>
                      <Badge label={rec.severity||"Medium"}
                        color={rec.severity==="Critical"?"#791F1F":rec.severity==="High"?"#854F0B":"#185FA5"}
                        bg={rec.severity==="Critical"?"#FCEBEB":rec.severity==="High"?"#FAEEDA":"#E6F1FB"}
                      />
                      <Badge label={sc.label} color={sc.color} bg={sc.bg} />
                    </div>
                    <div style={{ fontSize:12, color:"#888780", marginTop:4 }}>
                      {rec.description}
                    </div>
                    <div style={{ fontSize:11, color:"#B4B2A9", marginTop:3 }}>
                      Reported by {rec.reportedBy} · {fmtDate(rec.createdAt)}
                      {hours && ` · Downtime: ${typeof hours === "number" ? hours+"h" : hours}`}
                    </div>
                  </div>

                  {/* Action buttons based on role and status */}
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", flexShrink:0 }}>

                    {/* BME — acknowledge open */}
                    {isBME && rec.status === "Open" && (
                      <button style={S.btn("#854F0B")} onClick={() => {
                        setSelected(rec);
                        setBmeForm({ assignedTo:"", estimatedCompletion:"", workDone:"", partsReplaced:"", rootCause:"" });
                        setModal("bme-ack");
                      }}>Accept</button>
                    )}

                    {/* BME — close in-progress */}
                    {isBME && rec.status === "In progress" && (
                      <button style={S.btn("#0F6E56")} onClick={() => {
                        setSelected(rec);
                        setBmeForm({ ...bmeForm, assignedTo: rec.assignedTo||"", workDone:"", partsReplaced:"", rootCause:"" });
                        setModal("bme-close");
                      }}>Log repair & close</button>
                    )}

                    {/* Dept user — verify after repair */}
                    {!isBME && !isDirector && !isDyDir && rec.status === "Repaired" &&
                      (rec.department === dept || dept === "All") && (
                      <button style={S.btn("#185FA5")} onClick={() => {
                        setSelected(rec);
                        setVerifyForm({ verificationNote:"", verifiedBy: userName||"" });
                        setModal("verify");
                      }}>Verify working</button>
                    )}

                    {/* Asst Director / Director — review verified */}
                    {(isDyDir || isDirector) && rec.status === "Verified" && (
                      <button style={S.btn("#3C3489")} onClick={() => {
                        setSelected(rec);
                        setDirForm({ comment:"", disable:false });
                        setModal("director");
                      }}>{isDyDir ? "Acknowledge" : "Final sign-off"}</button>
                    )}

                    {/* PDF — available after repair stage */}
                    {["Repaired","Verified","Acknowledged","Closed"].includes(rec.status) && (
                      <button style={{
                        ...S.btn("#F7F6F2","#2C2C2A"),
                        border:"0.5px solid #D3D1C7",
                      }} onClick={() => generatePDF(rec)}>
                        📄 PDF
                      </button>
                    )}

                    {/* View detail */}
                    <button style={{
                      ...S.btn("#F7F6F2","#5F5E5A"),
                      border:"0.5px solid #D3D1C7",
                    }} onClick={() => { setSelected(rec); setModal("view"); }}>
                      View
                    </button>
                  </div>
                </div>

                {/* Stage pipeline */}
                <StagePipeline status={rec.status} />

              </div>
            );
          })}
        </div>
      </div>

      {/* ── RAISE MODAL ─────────────────────────────── */}
      {modal === "raise" && (
        <Modal title="Report equipment breakdown"
          sub="ISO 15189:2022 §6.4.7 · Notifies Biomedical Engineering"
          onClose={() => setModal(null)}>
          <div style={{ background:"#FCEBEB", border:"0.5px solid #E24B4A", borderRadius:8,
            padding:"10px 14px", marginBottom:14, fontSize:12, color:"#791F1F" }}>
            ⚠ This will immediately notify the Biomedical Engineering department and
            contribute to KPI 7.6.10 (Equipment downtime).
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Equipment" required>
              <select style={inp} value={raiseForm.equipmentId}
                onChange={e => {
                  const eq = EQUIPMENT_LIST.find(x => x.id === e.target.value);
                  setRaiseForm(p => ({ ...p, equipmentId:e.target.value, equipmentName:eq?.name||"", department:eq?.dept||dept||"" }));
                }}>
                <option value="">Select equipment</option>
                {EQUIPMENT_LIST.map(eq => <option key={eq.id} value={eq.id}>{eq.id} — {eq.name}</option>)}
              </select>
            </Field>
            <Field label="Severity" required>
              <select style={inp} value={raiseForm.severity}
                onChange={e => setRaiseForm(p => ({...p, severity:e.target.value}))}>
                {SEVERITY.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Breakdown date">
              <input style={inp} type="date" value={raiseForm.breakdownDate}
                onChange={e => setRaiseForm(p => ({...p, breakdownDate:e.target.value}))} />
            </Field>
            <Field label="Breakdown time">
              <input style={inp} type="time" value={raiseForm.breakdownTime}
                onChange={e => setRaiseForm(p => ({...p, breakdownTime:e.target.value}))} />
            </Field>
          </div>
          <Field label="Description of breakdown" required>
            <textarea style={{ ...inp, resize:"vertical" }} rows={3}
              placeholder="Describe the fault, error code, or symptoms observed…"
              value={raiseForm.description}
              onChange={e => setRaiseForm(p => ({...p, description:e.target.value}))} />
          </Field>
          <Field label="Reported by" required>
            <input style={inp} type="text" placeholder="Your full name"
              value={raiseForm.reportedBy}
              onChange={e => setRaiseForm(p => ({...p, reportedBy:e.target.value}))} />
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn("#A32D2D")} onClick={handleRaise} disabled={saving}>
              {saving ? "Submitting…" : "Submit breakdown report"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── BME ACKNOWLEDGE MODAL ───────────────────── */}
      {modal === "bme-ack" && (
        <Modal title="Accept breakdown request"
          sub={`${selected?.equipmentName} · Reported by ${selected?.reportedBy}`}
          onClose={() => setModal(null)}>
          <Field label="Assigned engineer" required>
            <input style={inp} type="text" placeholder="Engineer name"
              value={bmeForm.assignedTo}
              onChange={e => setBmeForm(p => ({...p, assignedTo:e.target.value}))} />
          </Field>
          <Field label="Estimated completion date">
            <input style={inp} type="date" value={bmeForm.estimatedCompletion}
              onChange={e => setBmeForm(p => ({...p, estimatedCompletion:e.target.value}))} />
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn("#854F0B")} onClick={() => handleBMEUpdate(2)} disabled={saving}>
              {saving ? "Saving…" : "Accept & assign"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── BME CLOSE MODAL ─────────────────────────── */}
      {modal === "bme-close" && (
        <Modal title="Log repair & close breakdown"
          sub={`${selected?.equipmentName} · Opened ${fmtDate(selected?.createdAt)}`}
          onClose={() => setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ gridColumn:"1/-1" }}>
              <Field label="Work done" required>
                <textarea style={{ ...inp, resize:"vertical" }} rows={3}
                  placeholder="Describe exactly what was done to repair the equipment…"
                  value={bmeForm.workDone}
                  onChange={e => setBmeForm(p => ({...p, workDone:e.target.value}))} />
              </Field>
            </div>
            <Field label="Parts replaced">
              <input style={inp} type="text" placeholder="e.g. Pump seal, Electrode, None"
                value={bmeForm.partsReplaced}
                onChange={e => setBmeForm(p => ({...p, partsReplaced:e.target.value}))} />
            </Field>
            <Field label="Root cause">
              <input style={inp} type="text" placeholder="e.g. Wear and tear, Power surge"
                value={bmeForm.rootCause}
                onChange={e => setBmeForm(p => ({...p, rootCause:e.target.value}))} />
            </Field>
          </div>
          <div style={{
            background:"#E6F1FB", borderRadius:8, padding:"10px 14px",
            fontSize:12, color:"#185FA5", marginBottom:12,
          }}>
            ℹ Closing this request will calculate downtime hours and notify the
            department user to verify the equipment is working.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={() => handleBMEUpdate(3)} disabled={saving}>
              {saving ? "Saving…" : "Close & log repair"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── VERIFY MODAL ────────────────────────────── */}
      {modal === "verify" && (
        <Modal title="Verify equipment is working"
          sub={`${selected?.equipmentName} · Repaired by ${selected?.closedBy}`}
          onClose={() => setModal(null)}>
          <div style={{
            background:"#E1F5EE", borderRadius:8, padding:"10px 14px",
            fontSize:12, color:"#085041", marginBottom:14,
          }}>
            ✓ BME has marked this equipment as repaired. Please confirm the equipment
            is working correctly before signing off.
          </div>
          <Field label="Your name" required>
            <input style={inp} type="text" value={verifyForm.verifiedBy}
              onChange={e => setVerifyForm(p => ({...p, verifiedBy:e.target.value}))} />
          </Field>
          <Field label="Verification note">
            <textarea style={{ ...inp, resize:"vertical" }} rows={3}
              placeholder="e.g. Equipment tested — all parameters within range…"
              value={verifyForm.verificationNote}
              onChange={e => setVerifyForm(p => ({...p, verificationNote:e.target.value}))} />
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={handleVerify} disabled={saving}>
              {saving ? "Saving…" : "Confirm working ✓"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── DIRECTOR MODAL ──────────────────────────── */}
      {modal === "director" && (
        <Modal title={isDyDir ? "Asst Director acknowledgement" : "Director final sign-off"}
          sub={`${selected?.equipmentName} · Verified by ${selected?.verifiedBy}`}
          onClose={() => setModal(null)}>
          <Field label="Comment (optional)">
            <textarea style={{ ...inp, resize:"vertical" }} rows={3}
              placeholder="Add any remarks or observations…"
              value={dirForm.comment}
              onChange={e => setDirForm(p => ({...p, comment:e.target.value}))} />
          </Field>
          <label style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"10px 14px", background:"#FFF8F0",
            borderRadius:8, marginBottom:14, cursor:"pointer",
            border:"0.5px solid #FAC775",
          }}>
            <input type="checkbox" checked={dirForm.disable}
              onChange={e => setDirForm(p => ({...p, disable:e.target.checked}))}
              style={{ accentColor:"#EF9F27" }}
            />
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>
                Disable acknowledgement (low priority)
              </div>
              <div style={{ fontSize:11, color:"#888780" }}>
                Use this if the breakdown does not require formal management sign-off
              </div>
            </div>
          </label>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Cancel</button>
            <button style={S.btn(dirForm.disable ? "#888780" : "#3C3489")}
              onClick={handleDirectorAction} disabled={saving}>
              {saving ? "Saving…" : dirForm.disable ? "Disable sign-off" : "Acknowledge & close"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── VIEW MODAL ──────────────────────────────── */}
      {modal === "view" && selected && (
        <Modal title={`Breakdown details — ${selected.equipmentName}`}
          sub={`Ref: BKD-${selected.id?.slice(-6).toUpperCase()}`}
          onClose={() => setModal(null)} wide>
          <StagePipeline status={selected.status} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
            {[
              { label:"Equipment",     val: `${selected.equipmentName} (${selected.equipmentId})` },
              { label:"Department",    val: selected.department },
              { label:"Severity",      val: selected.severity },
              { label:"Status",        val: selected.status },
              { label:"Reported by",   val: selected.reportedBy },
              { label:"Reported at",   val: fmtDate(selected.createdAt) },
              { label:"Description",   val: selected.description },
              { label:"Assigned to",   val: selected.assignedTo || "—" },
              { label:"Work done",     val: selected.workDone || "—" },
              { label:"Parts replaced",val: selected.partsReplaced || "—" },
              { label:"Root cause",    val: selected.rootCause || "—" },
              { label:"Downtime",      val: selected.downtimeHours ? `${selected.downtimeHours}h` : "—" },
              { label:"Verified by",   val: selected.verifiedBy || "—" },
              { label:"Verified at",   val: fmtDate(selected.verifiedAt) },
              { label:"Asst Director", val: selected.dyDirectorAck || "—" },
              { label:"Director",      val: selected.directorAck || "—" },
            ].map((f,i) => (
              <div key={i} style={{
                background:"#F7F6F2", borderRadius:7, padding:"8px 10px",
                gridColumn: f.label==="Description"||f.label==="Work done" ? "1/-1" : "auto",
              }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
            {["Repaired","Verified","Acknowledged","Closed"].includes(selected.status) && (
              <button style={S.btn("#185FA5")} onClick={() => generatePDF(selected)}>
                📄 Print / PDF report
              </button>
            )}
            <button style={{ ...S.btn("#F7F6F2","#2C2C2A"), border:"0.5px solid #D3D1C7" }}
              onClick={() => setModal(null)}>Close</button>
          </div>
        </Modal>
      )}

    </div>
  );
}
