// Recruitment.jsx
// MBL QMS — Recruitment & Onboarding
// ISO 15189:2022 §6.2 — Personnel
// Manpower requisition → JD → Candidate evaluation → Interview → Offer → Joining checklist → Orientation

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  "Quality","Human Resource","Biomedical Engineering","Purchase","Maintenance","Housekeeping",
  "Information Technology","Kitchen","Security","Collection","Front Office","Back Office",
  "Sample Collection Centre","Call Centre","Accounts","Administration","Design","Marketing",
  "ERP Administration",
];

const URGENCY = ["Routine","Urgent","Critical"];
const REASON  = ["New position","Replacement","Expansion","Temporary","Contract"];
const INTERVIEW_TYPES = ["Phone screening","Technical interview","HR interview","Panel interview","Final interview"];
const INTERVIEW_OUTCOMES = ["Selected","Rejected","Hold","Further rounds"];

const JOINING_CHECKLIST = [
  "Offer letter signed and returned",
  "Identity documents submitted (Aadhaar, PAN)",
  "Educational certificates verified",
  "Experience certificates collected",
  "Medical fitness certificate",
  "Bank account details",
  "PF nomination form",
  "Employee ID card issued",
  "Email account created",
  "System access granted",
  "Workstation/locker assigned",
  "Safety induction completed",
  "Orientation programme completed",
  "Departmental induction completed",
  "Reporting structure informed",
];

const EVAL_CRITERIA = [
  "Technical knowledge",
  "Communication skills",
  "Problem-solving ability",
  "Team-fit / cultural fit",
  "Leadership potential",
  "Domain experience",
];

const STATUS_STAGES = {
  requisition: {
    Open: { color:"#888780", bg:"#F1EFE8" },
    Approved: { color:"#0F6E56", bg:"#E1F5EE" },
    Rejected: { color:"#A32D2D", bg:"#FCEBEB" },
    Fulfilled: { color:"#534AB7", bg:"#EEEDFE" },
    Cancelled: { color:"#888780", bg:"#F1EFE8" },
  },
  candidate: {
    "Applied": { color:"#888780", bg:"#F1EFE8" },
    "Screening": { color:"#185FA5", bg:"#E6F1FB" },
    "Interview scheduled": { color:"#854F0B", bg:"#FAEEDA" },
    "Offer extended": { color:"#534AB7", bg:"#EEEDFE" },
    "Joined": { color:"#0F6E56", bg:"#E1F5EE" },
    "Rejected": { color:"#A32D2D", bg:"#FCEBEB" },
    "Withdrawn": { color:"#888780", bg:"#F1EFE8" },
  },
};

const PIPELINE_STEPS = ["Applied","Screening","Interview scheduled","Offer extended","Joined"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"numeric" });
}
function daysSince(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((new Date() - d)/(1000*60*60*24));
}

const inp = {
  padding:"7px 10px", border:"0.5px solid #D3D1C7", borderRadius:7,
  fontSize:12, background:"#fff", color:"#2C2C2A",
  width:"100%", boxSizing:"border-box", outline:"none",
};

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

function Badge({ label, color, bg }) {
  return (
    <span style={{ display:"inline-block", fontSize:10, fontWeight:500, padding:"2px 9px", borderRadius:20, background:bg, color }}>
      {label}
    </span>
  );
}

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth: wide?740:540, maxHeight:"92vh", overflow:"auto", boxShadow:"0 12px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6", position:"sticky", top:0, background:"#fff", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>
            {sub && <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{sub}</div>}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#888780" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function StarRating({ value, onChange, readOnly }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={()=>!readOnly && onChange && onChange(n)} style={{
          fontSize:18, cursor: readOnly ? "default":"pointer",
          color: n<=value ? "#EF9F27":"#D3D1C7",
        }}>★</span>
      ))}
    </div>
  );
}

function CandidatePipeline({ status }) {
  if (status==="Rejected"||status==="Withdrawn") return <Badge label={status} color={STATUS_STAGES.candidate[status]?.color} bg={STATUS_STAGES.candidate[status]?.bg} />;
  const idx = PIPELINE_STEPS.indexOf(status);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:6 }}>
      {PIPELINE_STEPS.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex: i<PIPELINE_STEPS.length-1?1:"none" }}>
          <div title={s} style={{
            width:20, height:20, borderRadius:"50%", flexShrink:0,
            background: i<idx?"#0F6E56":i===idx?"#185FA5":"#E0DDD6",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize:9, fontWeight:600,
          }}>{i<idx?"✓":i+1}</div>
          {i<PIPELINE_STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 2px", background: i<idx?"#0F6E56":"#E0DDD6" }}/>}
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Recruitment({ role, userName, dept }) {
  const [tab, setTab] = useState("requisitions");
  const [requisitions, setRequisitions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const isHR = ["HRM","HRE","Managing Director","Admin","Assistant Admin","Quality Manager"].includes(role)
    || dept==="Human Resource" || dept==="ERP Administration";
  const isHOD = role==="HOD" || isHR;

  // ── Forms ──────────────────────────────────────────────────────────────────

  const [reqForm, setReqForm] = useState({
    position:"", department: dept||"", noOfPositions:1,
    urgency:"Routine", reason:"New position",
    qualificationRequired:"", experienceRequired:"",
    skills:"", jobDescription:"",
    requestedBy: userName||"", requestDate: today(),
  });

  const [candForm, setCandForm] = useState({
    name:"", email:"", phone:"",
    positionApplied:"", requisitionId:"",
    source:"Job portal", experience:"", qualification:"",
    appliedDate: today(), resumeLink:"",
  });

  const [evalForm, setEvalForm] = useState({
    scores: Object.fromEntries(EVAL_CRITERIA.map(c=>[c,0])),
    overallRating:0, strengths:"", weaknesses:"", recommendation:"Hold",
  });

  const [interviewForm, setInterviewForm] = useState({
    type: INTERVIEW_TYPES[0], date:"", time:"",
    interviewer:"", venue:"", notes:"",
    outcome: INTERVIEW_OUTCOMES[0], feedback:"",
  });

  const [joiningForm, setJoiningForm] = useState({
    joiningDate:"", checklist: Object.fromEntries(JOINING_CHECKLIST.map(i=>[i,false])),
    remarks:"",
  });

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [rSnap, cSnap] = await Promise.all([
        getDocs(query(collection(db,"manpowerRequisitions"), orderBy("createdAt","desc"))),
        getDocs(query(collection(db,"candidates"), orderBy("createdAt","desc"))),
      ]);
      setRequisitions(rSnap.docs.map(d=>({id:d.id,...d.data()})));
      setCandidates(cSnap.docs.map(d=>({id:d.id,...d.data()})));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // ── Requisition CRUD ───────────────────────────────────────────────────────

  const submitRequisition = async () => {
    if (!reqForm.position || !reqForm.department) { alert("Position and department are required."); return; }
    setSaving(true);
    try {
      const seq = requisitions.length + 1;
      const reqId = `MRF-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"manpowerRequisitions"), {
        ...reqForm, reqId, status:"Open",
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setReqForm({ position:"", department: dept||"", noOfPositions:1, urgency:"Routine", reason:"New position", qualificationRequired:"", experienceRequired:"", skills:"", jobDescription:"", requestedBy: userName||"", requestDate: today() });
      loadAll();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const approveRequisition = async (r, approved) => {
    await updateDoc(doc(db,"manpowerRequisitions",r.id), {
      status: approved ? "Approved" : "Rejected",
      approvedBy: userName, approvedAt: serverTimestamp(),
    });
    loadAll();
  };

  // ── Candidate CRUD ─────────────────────────────────────────────────────────

  const addCandidate = async () => {
    if (!candForm.name || !candForm.positionApplied) { alert("Name and position are required."); return; }
    setSaving(true);
    try {
      const seq = candidates.length + 1;
      const candId = `CAN-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"candidates"), {
        ...candForm, candId, status:"Applied",
        interviews:[], evaluations:[],
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setCandForm({ name:"", email:"", phone:"", positionApplied:"", requisitionId:"", source:"Job portal", experience:"", qualification:"", appliedDate: today(), resumeLink:"" });
      loadAll();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const moveToScreening = async (c) => {
    await updateDoc(doc(db,"candidates",c.id), { status:"Screening" });
    loadAll();
  };

  const rejectCandidate = async (c) => {
    if (!window.confirm(`Reject ${c.name}?`)) return;
    await updateDoc(doc(db,"candidates",c.id), { status:"Rejected", rejectedAt: serverTimestamp(), rejectedBy: userName });
    loadAll();
  };

  // ── Evaluation ─────────────────────────────────────────────────────────────

  const saveEvaluation = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const evaluations = [...(selected.evaluations||[]), { ...evalForm, evaluatedBy: userName, evaluatedAt: new Date().toISOString() }];
      await updateDoc(doc(db,"candidates",selected.id), { evaluations });
      setSelected(p=>({...p,evaluations}));
      setEvalForm({ scores: Object.fromEntries(EVAL_CRITERIA.map(c=>[c,0])), overallRating:0, strengths:"", weaknesses:"", recommendation:"Hold" });
      setModal("candidate-view");
      loadAll();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // ── Interview ──────────────────────────────────────────────────────────────

  const scheduleInterview = async () => {
    if (!selected || !interviewForm.date || !interviewForm.interviewer) { alert("Date and interviewer are required."); return; }
    setSaving(true);
    try {
      const interviews = [...(selected.interviews||[]), { ...interviewForm, scheduledBy: userName, scheduledAt: new Date().toISOString() }];
      await updateDoc(doc(db,"candidates",selected.id), {
        interviews, status:"Interview scheduled",
      });
      setSelected(p=>({...p,interviews,status:"Interview scheduled"}));
      setInterviewForm({ type: INTERVIEW_TYPES[0], date:"", time:"", interviewer:"", venue:"", notes:"", outcome: INTERVIEW_OUTCOMES[0], feedback:"" });
      setModal("candidate-view");
      loadAll();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // ── Offer & Joining ────────────────────────────────────────────────────────

  const extendOffer = async () => {
    if (!selected) return;
    await updateDoc(doc(db,"candidates",selected.id), {
      status:"Offer extended", offerExtendedAt: serverTimestamp(), offerExtendedBy: userName,
    });
    setSelected(p=>({...p,status:"Offer extended"}));
    loadAll();
  };

  const saveJoining = async () => {
    if (!selected || !joiningForm.joiningDate) { alert("Joining date is required."); return; }
    setSaving(true);
    try {
      const checkedCount = Object.values(joiningForm.checklist).filter(Boolean).length;
      await updateDoc(doc(db,"candidates",selected.id), {
        status: checkedCount === JOINING_CHECKLIST.length ? "Joined" : "Offer extended",
        joiningDate: joiningForm.joiningDate,
        joiningChecklist: joiningForm.checklist,
        joiningRemarks: joiningForm.remarks,
        joiningUpdatedBy: userName, joiningUpdatedAt: serverTimestamp(),
      });
      setModal(null);
      loadAll();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const openReqs = requisitions.filter(r=>r.status==="Open").length;
  const approvedReqs = requisitions.filter(r=>r.status==="Approved").length;
  const activeCands = candidates.filter(c=>!["Joined","Rejected","Withdrawn"].includes(c.status)).length;
  const joinedCands = candidates.filter(c=>c.status==="Joined").length;

  const S = {
    wrap:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar:{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 },
    card:{ background:"#fff", border:"0.5px solid #E0DDD6", borderRadius:12, overflow:"hidden", marginBottom:14 },
    btn:(bg,color)=>({ padding:"7px 14px", background:bg||"#0F6E56", color:color||"#E1F5EE", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer" }),
    tab:(a)=>({ padding:"9px 16px", fontSize:13, fontWeight:a?500:400, color:a?"#185FA5":"#888780", cursor:"pointer", background:"none", border:"none", borderBottom:a?"2px solid #185FA5":"2px solid transparent" }),
  };

  return (
    <div style={S.wrap}>

      {/* Top bar */}
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", color:"#E6F1FB", fontSize:16 }}>👥</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Recruitment &amp; onboarding</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §6.2 · Manpower requisition to joining</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {tab==="requisitions" && isHOD && (
            <button style={S.btn("#185FA5")} onClick={()=>setModal("new-req")}>+ New requisition</button>
          )}
          {tab==="candidates" && isHR && (
            <button style={S.btn("#0F6E56")} onClick={()=>setModal("new-cand")}>+ Add candidate</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"0 20px", display:"flex" }}>
        {[
          { key:"requisitions", label:"Manpower requisitions" },
          { key:"candidates",   label:"Candidates & pipeline" },
          { key:"onboarding",   label:"Onboarding tracker" },
        ].map(t => (
          <button key={t.key} style={S.tab(tab===t.key)} onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Open requisitions",  val:openReqs,     color:"#185FA5", bg:"#E6F1FB" },
            { label:"Approved positions", val:approvedReqs, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Active candidates",  val:activeCands,  color:"#854F0B", bg:"#FAEEDA" },
            { label:"Joined this cycle",  val:joinedCands,  color:"#534AB7", bg:"#EEEDFE" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* ── REQUISITIONS TAB ─────────────────── */}
        {tab==="requisitions" && (
          <div style={S.card}>
            <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 120px 90px 80px 110px 100px", padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:8 }}>
              {["Ref","Position / Dept","Urgency","Positions","Reason","Status",""].map((h,i)=>(
                <div key={i} style={{ fontSize:10, fontWeight:500, color:"#888780" }}>{h}</div>
              ))}
            </div>
            {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
            {!loading && requisitions.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No requisitions raised yet.</div>}
            {requisitions.map(r => {
              const sc = STATUS_STAGES.requisition[r.status]||STATUS_STAGES.requisition.Open;
              return (
                <div key={r.id} style={{ display:"grid", gridTemplateColumns:"80px 1fr 120px 90px 80px 110px 100px", padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center" }}>
                  <div style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{r.reqId}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{r.position}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{r.department}</div>
                  </div>
                  <div>
                    <Badge label={r.urgency} color={r.urgency==="Critical"?"#791F1F":r.urgency==="Urgent"?"#854F0B":"#185FA5"} bg={r.urgency==="Critical"?"#FCEBEB":r.urgency==="Urgent"?"#FAEEDA":"#E6F1FB"} />
                  </div>
                  <div style={{ fontSize:12, color:"#2C2C2A" }}>{r.noOfPositions}</div>
                  <div style={{ fontSize:11, color:"#888780" }}>{r.reason}</div>
                  <div><Badge label={r.status} color={sc.color} bg={sc.bg} /></div>
                  <div style={{ display:"flex", gap:4 }}>
                    {r.status==="Open" && isHR && (
                      <>
                        <button style={{ padding:"3px 8px", background:"#E1F5EE", border:"0.5px solid #5DCAA5", borderRadius:6, fontSize:10, cursor:"pointer", color:"#085041" }} onClick={()=>approveRequisition(r,true)}>Approve</button>
                        <button style={{ padding:"3px 8px", background:"#FCEBEB", border:"0.5px solid #E24B4A", borderRadius:6, fontSize:10, cursor:"pointer", color:"#A32D2D" }} onClick={()=>approveRequisition(r,false)}>Reject</button>
                      </>
                    )}
                    <button style={{ padding:"3px 8px", background:"#F7F6F2", border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:10, cursor:"pointer" }} onClick={()=>{ setSelected(r); setModal("req-view"); }}>View</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CANDIDATES TAB ───────────────────── */}
        {tab==="candidates" && (
          <div style={S.card}>
            {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
            {!loading && candidates.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No candidates added yet.</div>}
            {candidates.map(c => {
              const sc = STATUS_STAGES.candidate[c.status]||STATUS_STAGES.candidate.Applied;
              const days = daysSince(c.createdAt);
              const lastInterview = c.interviews?.[c.interviews.length-1];
              return (
                <div key={c.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{c.candId}</span>
                        <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{c.name}</div>
                        <Badge label={c.status} color={sc.color} bg={sc.bg} />
                        {days!==null && days>30 && <Badge label={`${days}d in pipeline`} color="#854F0B" bg="#FAEEDA" />}
                      </div>
                      <div style={{ fontSize:11, color:"#888780" }}>
                        {c.positionApplied} · {c.source} · Applied {fmtDate(c.createdAt)}
                        {c.experience && ` · ${c.experience} exp`}
                      </div>
                      {lastInterview && (
                        <div style={{ fontSize:11, color:"#5F5E5A", marginTop:3 }}>
                          Last: {lastInterview.type} on {lastInterview.date} · Outcome: {lastInterview.outcome}
                        </div>
                      )}
                      <CandidatePipeline status={c.status} />
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                      {c.status==="Applied" && isHR && (
                        <button style={S.btn("#185FA5")} onClick={()=>moveToScreening(c)}>Screen</button>
                      )}
                      <button style={S.btn("#534AB7")} onClick={()=>{ setSelected(c); setModal("candidate-view"); }}>Open</button>
                      {!["Joined","Rejected","Withdrawn"].includes(c.status) && isHR && (
                        <button style={{...S.btn("#FFF5F5","#A32D2D"),border:"0.5px solid #E24B4A"}} onClick={()=>rejectCandidate(c)}>Reject</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ONBOARDING TAB ───────────────────── */}
        {tab==="onboarding" && (
          <div style={S.card}>
            <div style={{ padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6", fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              Offer extended — pending joining checklist
            </div>
            {candidates.filter(c=>["Offer extended","Joined"].includes(c.status)).length===0 && (
              <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No candidates in offer / joining stage.</div>
            )}
            {candidates.filter(c=>["Offer extended","Joined"].includes(c.status)).map(c => {
              const checkedCount = c.joiningChecklist ? Object.values(c.joiningChecklist).filter(Boolean).length : 0;
              const pct = Math.round(checkedCount/JOINING_CHECKLIST.length*100);
              return (
                <div key={c.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A", marginBottom:2 }}>{c.name}</div>
                      <div style={{ fontSize:11, color:"#888780", marginBottom:6 }}>{c.positionApplied} · Joining: {c.joiningDate||"Not set"}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ flex:1, height:6, background:"#F1EFE8", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ width:`${pct}%`, height:"100%", background: pct===100?"#1D9E75":"#185FA5" }}/>
                        </div>
                        <span style={{ fontSize:11, color: pct===100?"#0F6E56":"#185FA5", fontWeight:500 }}>{checkedCount}/{JOINING_CHECKLIST.length}</span>
                      </div>
                    </div>
                    <button style={S.btn(c.status==="Joined"?"#534AB7":"#185FA5")} onClick={()=>{ setSelected(c); setJoiningForm({ joiningDate:c.joiningDate||"", checklist: c.joiningChecklist || Object.fromEntries(JOINING_CHECKLIST.map(i=>[i,false])), remarks:c.joiningRemarks||"" }); setModal("joining"); }}>
                      {c.status==="Joined" ? "View checklist" : "Update checklist"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* New Requisition */}
      {modal==="new-req" && (
        <Modal title="Manpower requisition" sub="ISO 15189:2022 §6.2 — Personnel" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Position / designation" required><input style={inp} value={reqForm.position} onChange={e=>setReqForm(p=>({...p,position:e.target.value}))} /></Field>
            <Field label="Department" required><select style={inp} value={reqForm.department} onChange={e=>setReqForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="No. of positions" required><input style={inp} type="number" min="1" value={reqForm.noOfPositions} onChange={e=>setReqForm(p=>({...p,noOfPositions:e.target.value}))} /></Field>
            <Field label="Urgency"><select style={inp} value={reqForm.urgency} onChange={e=>setReqForm(p=>({...p,urgency:e.target.value}))}>{URGENCY.map(u=><option key={u}>{u}</option>)}</select></Field>
            <Field label="Reason for requirement"><select style={inp} value={reqForm.reason} onChange={e=>setReqForm(p=>({...p,reason:e.target.value}))}>{REASON.map(r=><option key={r}>{r}</option>)}</select></Field>
            <Field label="Requested by" required><input style={inp} value={reqForm.requestedBy} onChange={e=>setReqForm(p=>({...p,requestedBy:e.target.value}))} /></Field>
            <Field label="Qualification required"><input style={inp} value={reqForm.qualificationRequired} onChange={e=>setReqForm(p=>({...p,qualificationRequired:e.target.value}))} placeholder="e.g. B.Sc. MLT or equivalent" /></Field>
            <Field label="Experience required"><input style={inp} value={reqForm.experienceRequired} onChange={e=>setReqForm(p=>({...p,experienceRequired:e.target.value}))} placeholder="e.g. 2+ years in clinical microbiology" /></Field>
          </div>
          <Field label="Key skills"><input style={inp} value={reqForm.skills} onChange={e=>setReqForm(p=>({...p,skills:e.target.value}))} placeholder="e.g. PCR, culture techniques, QC" /></Field>
          <Field label="Job description / responsibilities"><textarea style={{...inp,resize:"vertical"}} rows={4} value={reqForm.jobDescription} onChange={e=>setReqForm(p=>({...p,jobDescription:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#185FA5")} onClick={submitRequisition} disabled={saving}>{saving?"Saving…":"Submit requisition"}</button>
          </div>
        </Modal>
      )}

      {/* View Requisition */}
      {modal==="req-view" && selected && (
        <Modal title={selected.reqId} sub={`${selected.position} · ${selected.department}`} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { label:"Status", val:<Badge label={selected.status} color={STATUS_STAGES.requisition[selected.status]?.color} bg={STATUS_STAGES.requisition[selected.status]?.bg} /> },
              { label:"Urgency", val:selected.urgency },
              { label:"Positions", val:selected.noOfPositions },
              { label:"Reason", val:selected.reason },
              { label:"Requested by", val:`${selected.requestedBy} · ${fmtDate(selected.createdAt)}` },
              { label:"Approved by", val:selected.approvedBy||"—" },
              { label:"Qualification", val:selected.qualificationRequired||"—" },
              { label:"Experience", val:selected.experienceRequired||"—" },
              { label:"Skills", val:selected.skills||"—" },
              { label:"JD", val:selected.jobDescription||"—" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: ["JD","Skills"].includes(f.label)?"1/-1":"auto" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>
          {selected.status==="Open" && isHR && (
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button style={{...S.btn("#FFF5F5","#A32D2D"),border:"0.5px solid #E24B4A"}} onClick={()=>{ approveRequisition(selected,false); setModal(null); }}>Reject</button>
              <button style={S.btn("#0F6E56")} onClick={()=>{ approveRequisition(selected,true); setModal(null); }}>Approve</button>
            </div>
          )}
        </Modal>
      )}

      {/* New Candidate */}
      {modal==="new-cand" && (
        <Modal title="Add candidate" sub="Recruitment pipeline" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full name" required><input style={inp} value={candForm.name} onChange={e=>setCandForm(p=>({...p,name:e.target.value}))} /></Field>
            <Field label="Email"><input style={inp} type="email" value={candForm.email} onChange={e=>setCandForm(p=>({...p,email:e.target.value}))} /></Field>
            <Field label="Phone"><input style={inp} value={candForm.phone} onChange={e=>setCandForm(p=>({...p,phone:e.target.value}))} /></Field>
            <Field label="Position applied for" required><input style={inp} value={candForm.positionApplied} onChange={e=>setCandForm(p=>({...p,positionApplied:e.target.value}))} /></Field>
            <Field label="Link to requisition (optional)"><select style={inp} value={candForm.requisitionId} onChange={e=>setCandForm(p=>({...p,requisitionId:e.target.value}))}><option value="">None</option>{requisitions.filter(r=>r.status==="Approved").map(r=><option key={r.id} value={r.id}>{r.reqId} — {r.position}</option>)}</select></Field>
            <Field label="Source"><select style={inp} value={candForm.source} onChange={e=>setCandForm(p=>({...p,source:e.target.value}))}>{["Job portal","LinkedIn","Referral","Walk-in","Agency","Campus recruitment","Other"].map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Qualification"><input style={inp} value={candForm.qualification} onChange={e=>setCandForm(p=>({...p,qualification:e.target.value}))} placeholder="e.g. M.Sc. Microbiology" /></Field>
            <Field label="Total experience"><input style={inp} value={candForm.experience} onChange={e=>setCandForm(p=>({...p,experience:e.target.value}))} placeholder="e.g. 4 years" /></Field>
            <Field label="Applied date"><input style={inp} type="date" value={candForm.appliedDate} onChange={e=>setCandForm(p=>({...p,appliedDate:e.target.value}))} /></Field>
            <Field label="Resume link (Google Drive / SharePoint)"><input style={inp} value={candForm.resumeLink} onChange={e=>setCandForm(p=>({...p,resumeLink:e.target.value}))} placeholder="https://…" /></Field>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={addCandidate} disabled={saving}>{saving?"Saving…":"Add candidate"}</button>
          </div>
        </Modal>
      )}

      {/* Candidate view — full profile with evaluation + interview tabs */}
      {modal==="candidate-view" && selected && (
        <Modal title={selected.name} sub={`${selected.candId} · ${selected.positionApplied}`} onClose={()=>setModal(null)} wide>
          <CandidatePipeline status={selected.status} />

          {/* Profile */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:14, marginBottom:16 }}>
            {[
              { label:"Status", val:<Badge label={selected.status} color={STATUS_STAGES.candidate[selected.status]?.color} bg={STATUS_STAGES.candidate[selected.status]?.bg} /> },
              { label:"Source", val:selected.source },
              { label:"Phone", val:selected.phone||"—" },
              { label:"Email", val:selected.email||"—" },
              { label:"Qualification", val:selected.qualification||"—" },
              { label:"Experience", val:selected.experience||"—" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>

          {/* Evaluations */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>
            Evaluations ({(selected.evaluations||[]).length})
          </div>
          {(selected.evaluations||[]).map((ev,i)=>(
            <div key={i} style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:11, color:"#888780" }}>
                <span>{ev.evaluatedBy} · {new Date(ev.evaluatedAt).toLocaleDateString("en-IN")}</span>
                <span style={{ fontWeight:500, color: ev.recommendation==="Selected"?"#0F6E56":ev.recommendation==="Rejected"?"#A32D2D":"#185FA5" }}>{ev.recommendation}</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:8 }}>
                {EVAL_CRITERIA.map(c=>(
                  <div key={c} style={{ fontSize:10 }}>
                    <div style={{ color:"#888780", marginBottom:2 }}>{c}</div>
                    <StarRating value={ev.scores[c]||0} readOnly />
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10, fontSize:11 }}>
                <div style={{ flex:1 }}><span style={{ color:"#888780" }}>Strengths: </span>{ev.strengths||"—"}</div>
                <div style={{ flex:1 }}><span style={{ color:"#888780" }}>Weaknesses: </span>{ev.weaknesses||"—"}</div>
              </div>
            </div>
          ))}

          {/* Interviews */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", margin:"14px 0 8px" }}>
            Interviews ({(selected.interviews||[]).length})
          </div>
          {(selected.interviews||[]).map((iv,i)=>(
            <div key={i} style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:6, fontSize:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontWeight:500 }}>{iv.type}</span>
                <Badge label={iv.outcome} color={iv.outcome==="Selected"?"#085041":iv.outcome==="Rejected"?"#791F1F":"#185FA5"} bg={iv.outcome==="Selected"?"#E1F5EE":iv.outcome==="Rejected"?"#FCEBEB":"#E6F1FB"} />
              </div>
              <div style={{ color:"#888780" }}>{iv.date} {iv.time && `at ${iv.time}`} · {iv.interviewer} · {iv.venue||"—"}</div>
              {iv.feedback && <div style={{ marginTop:4, color:"#5F5E5A" }}>{iv.feedback}</div>}
            </div>
          ))}

          {/* Action buttons */}
          {isHR && !["Joined","Rejected","Withdrawn"].includes(selected.status) && (
            <div style={{ display:"flex", gap:8, marginTop:16, flexWrap:"wrap" }}>
              <button style={S.btn("#185FA5")} onClick={()=>setModal("schedule-interview")}>+ Schedule interview</button>
              <button style={S.btn("#534AB7")} onClick={()=>setModal("evaluate")}>+ Add evaluation</button>
              {selected.status==="Interview scheduled" && (
                <button style={S.btn("#0F6E56")} onClick={extendOffer}>Extend offer</button>
              )}
              {selected.status==="Offer extended" && (
                <button style={S.btn("#854F0B")} onClick={()=>setModal("joining")}>Joining checklist</button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Schedule interview */}
      {modal==="schedule-interview" && selected && (
        <Modal title={`Schedule interview — ${selected.name}`} sub={selected.positionApplied} onClose={()=>setModal("candidate-view")}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Interview type"><select style={inp} value={interviewForm.type} onChange={e=>setInterviewForm(p=>({...p,type:e.target.value}))}>{INTERVIEW_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Date" required><input style={inp} type="date" value={interviewForm.date} onChange={e=>setInterviewForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Time"><input style={inp} type="time" value={interviewForm.time} onChange={e=>setInterviewForm(p=>({...p,time:e.target.value}))} /></Field>
            <Field label="Interviewer" required><input style={inp} value={interviewForm.interviewer} onChange={e=>setInterviewForm(p=>({...p,interviewer:e.target.value}))} /></Field>
            <Field label="Venue / mode"><input style={inp} value={interviewForm.venue} onChange={e=>setInterviewForm(p=>({...p,venue:e.target.value}))} placeholder="e.g. HR Office / Video call" /></Field>
            <Field label="Outcome"><select style={inp} value={interviewForm.outcome} onChange={e=>setInterviewForm(p=>({...p,outcome:e.target.value}))}>{INTERVIEW_OUTCOMES.map(o=><option key={o}>{o}</option>)}</select></Field>
          </div>
          <Field label="Notes / agenda"><textarea style={{...inp,resize:"vertical"}} rows={2} value={interviewForm.notes} onChange={e=>setInterviewForm(p=>({...p,notes:e.target.value}))} /></Field>
          <Field label="Feedback (fill after interview)"><textarea style={{...inp,resize:"vertical"}} rows={2} value={interviewForm.feedback} onChange={e=>setInterviewForm(p=>({...p,feedback:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal("candidate-view")}>Back</button>
            <button style={S.btn("#185FA5")} onClick={scheduleInterview} disabled={saving}>{saving?"Saving…":"Save interview"}</button>
          </div>
        </Modal>
      )}

      {/* Evaluate candidate */}
      {modal==="evaluate" && selected && (
        <Modal title={`Evaluate — ${selected.name}`} sub={selected.positionApplied} onClose={()=>setModal("candidate-view")} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {EVAL_CRITERIA.map(c => (
              <div key={c}>
                <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:4 }}>{c}</div>
                <StarRating value={evalForm.scores[c]||0} onChange={v=>setEvalForm(p=>({...p,scores:{...p.scores,[c]:v}}))} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:6 }}>Overall rating</div>
            <StarRating value={evalForm.overallRating} onChange={v=>setEvalForm(p=>({...p,overallRating:v}))} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Strengths"><textarea style={{...inp,resize:"vertical"}} rows={2} value={evalForm.strengths} onChange={e=>setEvalForm(p=>({...p,strengths:e.target.value}))} /></Field>
            <Field label="Areas for improvement"><textarea style={{...inp,resize:"vertical"}} rows={2} value={evalForm.weaknesses} onChange={e=>setEvalForm(p=>({...p,weaknesses:e.target.value}))} /></Field>
          </div>
          <Field label="Recommendation">
            <div style={{ display:"flex", gap:8 }}>
              {["Selected","Rejected","Hold","Further rounds"].map(r => (
                <button key={r} onClick={()=>setEvalForm(p=>({...p,recommendation:r}))} style={{
                  flex:1, padding:"8px", borderRadius:7, fontSize:11, cursor:"pointer",
                  border: evalForm.recommendation===r ? `1.5px solid ${r==="Selected"?"#0F6E56":r==="Rejected"?"#A32D2D":"#185FA5"}`:"0.5px solid #D3D1C7",
                  background: evalForm.recommendation===r ? (r==="Selected"?"#E1F5EE":r==="Rejected"?"#FCEBEB":"#E6F1FB"):"#fff",
                  color: evalForm.recommendation===r ? (r==="Selected"?"#085041":r==="Rejected"?"#791F1F":"#0C447C"):"#5F5E5A",
                }}>{r}</button>
              ))}
            </div>
          </Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:8 }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal("candidate-view")}>Back</button>
            <button style={S.btn("#534AB7")} onClick={saveEvaluation} disabled={saving}>{saving?"Saving…":"Save evaluation"}</button>
          </div>
        </Modal>
      )}

      {/* Joining checklist */}
      {modal==="joining" && selected && (
        <Modal title={`Joining checklist — ${selected.name}`} sub={selected.positionApplied} onClose={()=>setModal(null)} wide>
          <Field label="Joining date" required>
            <input style={inp} type="date" value={joiningForm.joiningDate} onChange={e=>setJoiningForm(p=>({...p,joiningDate:e.target.value}))} />
          </Field>

          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>
            Checklist ({Object.values(joiningForm.checklist).filter(Boolean).length}/{JOINING_CHECKLIST.length})
          </div>
          <div style={{ maxHeight:320, overflowY:"auto", border:"0.5px solid #E0DDD6", borderRadius:8, marginBottom:12 }}>
            {JOINING_CHECKLIST.map((item,i) => (
              <label key={i} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 12px",
                borderBottom: i<JOINING_CHECKLIST.length-1?"0.5px solid #F1EFE8":"none",
                background: joiningForm.checklist[item] ? "#F0FBF7":"#fff",
                cursor:"pointer",
              }}>
                <input type="checkbox" checked={!!joiningForm.checklist[item]}
                  onChange={e=>setJoiningForm(p=>({...p,checklist:{...p.checklist,[item]:e.target.checked}}))}
                  style={{ accentColor:"#0F6E56" }} />
                <span style={{ fontSize:12, color: joiningForm.checklist[item]?"#085041":"#2C2C2A" }}>{item}</span>
                {joiningForm.checklist[item] && <span style={{ marginLeft:"auto", fontSize:12 }}>✓</span>}
              </label>
            ))}
          </div>

          <Field label="Remarks"><textarea style={{...inp,resize:"vertical"}} rows={2} value={joiningForm.remarks} onChange={e=>setJoiningForm(p=>({...p,remarks:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={saveJoining} disabled={saving}>{saving?"Saving…":"Save checklist"}</button>
          </div>
        </Modal>
      )}

    </div>
  );
}
