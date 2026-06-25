// ChangeControl.jsx
// MBL QMS — Change Control
// ISO 15189:2022 §8.5 — Improvement / Management of change

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  "Quality","Human Resource","Biomedical Engineering","Purchase","Maintenance","Housekeeping",
  "Information Technology","Kitchen","Security","Collection","Front Office","Back Office",
  "Sample Collection Centre","Call Centre","Accounts","Administration","Design","Marketing",
  "ERP Administration",
];

const CHANGE_TYPES = ["New equipment","Method change","SOP change","Software/IT change","Facility change","Personnel change","Vendor change","Other"];
const STATUS_CFG = {
  Requested: { color:"#888780", bg:"#F1EFE8" },
  "Impact assessment": { color:"#854F0B", bg:"#FAEEDA" },
  "Pending approval": { color:"#185FA5", bg:"#E6F1FB" },
  "Validation in progress": { color:"#534AB7", bg:"#EEEDFE" },
  Approved: { color:"#0F6E56", bg:"#E1F5EE" },
  Rejected: { color:"#A32D2D", bg:"#FCEBEB" },
};

function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"numeric" });
}

const inp = { padding:"7px 10px", border:"0.5px solid #D3D1C7", borderRadius:7, fontSize:12, background:"#fff", color:"#2C2C2A", width:"100%", boxSizing:"border-box", outline:"none" };

function Field({ label, required, children }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
      <label style={{ fontSize:11, fontWeight:500, color:"#5F5E5A" }}>{label}{required && <span style={{ color:"#E24B4A" }}> *</span>}</label>
      {children}
    </div>
  );
}

function Badge({ label, color, bg }) {
  return <span style={{ display:"inline-block", fontSize:10, fontWeight:500, padding:"2px 9px", borderRadius:20, background:bg, color }}>{label}</span>;
}

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth: wide?680:520, maxHeight:"92vh", overflow:"auto", boxShadow:"0 12px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6", position:"sticky", top:0, background:"#fff", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div><div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>{sub && <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{sub}</div>}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#888780" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

const PIPELINE_STEPS = ["Requested","Impact assessment","Pending approval","Validation in progress","Approved"];

function Pipeline({ status }) {
  if (status==="Rejected") return <Badge label="Rejected" color="#A32D2D" bg="#FCEBEB" />;
  const idx = PIPELINE_STEPS.indexOf(status);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:2, marginTop:6 }}>
      {PIPELINE_STEPS.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex: i<PIPELINE_STEPS.length-1?1:"none" }}>
          <div style={{
            width:18, height:18, borderRadius:"50%", flexShrink:0,
            background: i<idx ? "#0F6E56" : i===idx ? "#185FA5" : "#E0DDD6",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontSize:9, fontWeight:600,
          }}>{i<idx?"✓":i+1}</div>
          {i<PIPELINE_STEPS.length-1 && <div style={{ flex:1, height:2, margin:"0 2px", background: i<idx?"#0F6E56":"#E0DDD6" }}/>}
        </div>
      ))}
    </div>
  );
}

export default function ChangeControl({ role, userName, dept }) {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const isQuality = ["Quality Manager","Managing Director","Deputy Director"].includes(role);
  const isApprover = ["Quality Manager","Managing Director","Deputy Director","HOD"].includes(role);

  const [form, setForm] = useState({
    title:"", department: dept||"", changeType: CHANGE_TYPES[0],
    description:"", reason:"", requestedBy: userName||"", requestDate: today(),
  });

  const [impactForm, setImpactForm] = useState({ impact:"", riskAssessment:"", validationRequired:true, validationPlan:"" });
  const [approveForm, setApproveForm] = useState({ comment:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"changeControls"), orderBy("createdAt","desc")));
      setChanges(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.reason) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = changes.length + 1;
      const changeId = `CC-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"changeControls"), {
        ...form, changeId, status:"Requested",
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ title:"", department: dept||"", changeType: CHANGE_TYPES[0], description:"", reason:"", requestedBy: userName||"", requestDate: today() });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const submitImpact = async () => {
    if (!selected || !impactForm.impact) { alert("Please complete the impact assessment."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db,"changeControls",selected.id), {
        ...impactForm, status:"Pending approval",
        impactAssessedBy: userName, impactAssessedAt: serverTimestamp(),
      });
      setModal(null);
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const approveChange = async (approve) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"changeControls",selected.id), {
        status: approve ? (selected.validationRequired ? "Validation in progress" : "Approved") : "Rejected",
        approvalComment: approveForm.comment, approvedBy: userName, approvedAt: serverTimestamp(),
      });
      setModal(null);
      setApproveForm({ comment:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const completeValidation = async (c) => {
    if (!window.confirm("Mark validation as complete and approve this change?")) return;
    await updateDoc(doc(db,"changeControls",c.id), { status:"Approved", validationCompletedAt: serverTimestamp(), validationCompletedBy: userName });
    load();
  };

  const filtered = changes.filter(c => filterStatus==="All" || c.status===filterStatus);

  const requestedCount = changes.filter(c=>c.status==="Requested").length;
  const inProgressCount = changes.filter(c=>["Impact assessment","Pending approval","Validation in progress"].includes(c.status)).length;
  const approvedCount = changes.filter(c=>c.status==="Approved").length;
  const rejectedCount = changes.filter(c=>c.status==="Rejected").length;

  const S = {
    wrap:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar:{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 },
    card:{ background:"#fff", border:"0.5px solid #E0DDD6", borderRadius:12, overflow:"hidden", marginBottom:14 },
    btn:(bg,color)=>({ padding:"7px 14px", background:bg||"#0F6E56", color:color||"#E1F5EE", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer" }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", color:"#E6F1FB", fontSize:16 }}>🔄</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Change control</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.5 · Management of change</div>
          </div>
        </div>
        <button style={S.btn("#185FA5")} onClick={()=>setModal("new")}>+ Request change</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Requested", val:requestedCount, color:"#888780", bg:"#F1EFE8" },
            { label:"In progress", val:inProgressCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Approved", val:approvedCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Rejected", val:rejectedCount, color:"#A32D2D", bg:"#FCEBEB" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:200 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="All">All status</option>
            {Object.keys(STATUS_CFG).map(s=><option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} changes</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No change requests found.</div>}
          {filtered.map(c => {
            const sc = STATUS_CFG[c.status]||STATUS_CFG.Requested;
            return (
              <div key={c.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{c.changeId}</span>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{c.title}</div>
                      <Badge label={c.changeType} color="#534AB7" bg="#EEEDFE" />
                      <Badge label={c.status} color={sc.color} bg={sc.bg} />
                    </div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:4 }}>
                      {c.department} · Requested by {c.requestedBy} · {fmtDate(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {c.status==="Requested" && isQuality && (
                      <button style={S.btn("#854F0B")} onClick={()=>{ setSelected(c); setImpactForm({ impact:"", riskAssessment:"", validationRequired:true, validationPlan:"" }); setModal("impact"); }}>Assess impact</button>
                    )}
                    {c.status==="Pending approval" && isApprover && (
                      <button style={S.btn("#185FA5")} onClick={()=>{ setSelected(c); setApproveForm({comment:""}); setModal("approve"); }}>Review</button>
                    )}
                    {c.status==="Validation in progress" && isQuality && (
                      <button style={S.btn("#534AB7")} onClick={()=>completeValidation(c)}>Complete validation</button>
                    )}
                    <button style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>{ setSelected(c); setModal("view"); }}>View</button>
                  </div>
                </div>
                <Pipeline status={c.status} />
              </div>
            );
          })}
        </div>
      </div>

      {/* New change request modal */}
      {modal==="new" && (
        <Modal title="Request change" sub="ISO 15189:2022 §8.5" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Change title" required><input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Change type"><select style={inp} value={form.changeType} onChange={e=>setForm(p=>({...p,changeType:e.target.value}))}>{CHANGE_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Requested by" required><input style={inp} value={form.requestedBy} onChange={e=>setForm(p=>({...p,requestedBy:e.target.value}))} /></Field>
          </div>
          <Field label="Description of change" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What is being changed?" /></Field>
          <Field label="Reason for change" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.reason} onChange={e=>setForm(p=>({...p,reason:e.target.value}))} placeholder="Why is this change needed?" /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#185FA5")} onClick={handleCreate} disabled={saving}>{saving?"Saving…":"Submit request"}</button>
          </div>
        </Modal>
      )}

      {/* Impact assessment modal */}
      {modal==="impact" && selected && (
        <Modal title={`Impact assessment — ${selected.changeId}`} sub={selected.title} onClose={()=>setModal(null)} wide>
          <Field label="Impact assessment" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={impactForm.impact} onChange={e=>setImpactForm(p=>({...p,impact:e.target.value}))} placeholder="What systems, processes, or documents will be affected?" /></Field>
          <Field label="Risk assessment"><textarea style={{...inp,resize:"vertical"}} rows={3} value={impactForm.riskAssessment} onChange={e=>setImpactForm(p=>({...p,riskAssessment:e.target.value}))} placeholder="What risks does this change introduce?" /></Field>
          <Field label="Validation required?">
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setImpactForm(p=>({...p,validationRequired:true}))} style={{
                flex:1, padding:"8px", borderRadius:7, fontSize:12, cursor:"pointer",
                border: impactForm.validationRequired ? "1.5px solid #534AB7":"0.5px solid #D3D1C7",
                background: impactForm.validationRequired ? "#EEEDFE":"#fff",
                color: impactForm.validationRequired ? "#3C3489":"#5F5E5A",
              }}>Yes — validation needed</button>
              <button onClick={()=>setImpactForm(p=>({...p,validationRequired:false}))} style={{
                flex:1, padding:"8px", borderRadius:7, fontSize:12, cursor:"pointer",
                border: !impactForm.validationRequired ? "1.5px solid #0F6E56":"0.5px solid #D3D1C7",
                background: !impactForm.validationRequired ? "#E1F5EE":"#fff",
                color: !impactForm.validationRequired ? "#085041":"#5F5E5A",
              }}>No — direct approval</button>
            </div>
          </Field>
          {impactForm.validationRequired && (
            <Field label="Validation plan"><textarea style={{...inp,resize:"vertical"}} rows={2} value={impactForm.validationPlan} onChange={e=>setImpactForm(p=>({...p,validationPlan:e.target.value}))} placeholder="How will this change be validated before going live?" /></Field>
          )}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#854F0B")} onClick={submitImpact} disabled={saving}>{saving?"Saving…":"Submit for approval"}</button>
          </div>
        </Modal>
      )}

      {/* Approve modal */}
      {modal==="approve" && selected && (
        <Modal title={`Review — ${selected.changeId}`} sub={selected.title} onClose={()=>setModal(null)} wide>
          <div style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12 }}>
            <div style={{ color:"#888780", marginBottom:4 }}>Impact assessment</div>
            <div style={{ color:"#2C2C2A", marginBottom:8 }}>{selected.impact}</div>
            {selected.riskAssessment && <>
              <div style={{ color:"#888780", marginBottom:4 }}>Risk assessment</div>
              <div style={{ color:"#2C2C2A" }}>{selected.riskAssessment}</div>
            </>}
          </div>
          <Field label="Approval comment"><textarea style={{...inp,resize:"vertical"}} rows={3} value={approveForm.comment} onChange={e=>setApproveForm(p=>({...p,comment:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#FFF5F5","#A32D2D"),border:"0.5px solid #E24B4A"}} onClick={()=>approveChange(false)} disabled={saving}>Reject</button>
            <button style={S.btn("#0F6E56")} onClick={()=>approveChange(true)} disabled={saving}>{saving?"Saving…":"Approve"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.changeId} sub={selected.title} onClose={()=>setModal(null)} wide>
          <Pipeline status={selected.status} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16 }}>
            {[
              { label:"Department", val:selected.department },
              { label:"Change type", val:selected.changeType },
              { label:"Requested by", val:`${selected.requestedBy} · ${fmtDate(selected.createdAt)}` },
              { label:"Status", val:<Badge label={selected.status} color={STATUS_CFG[selected.status]?.color} bg={STATUS_CFG[selected.status]?.bg} /> },
              { label:"Description", val:selected.description },
              { label:"Reason", val:selected.reason },
              { label:"Impact assessment", val:selected.impact||"—" },
              { label:"Risk assessment", val:selected.riskAssessment||"—" },
              { label:"Validation plan", val:selected.validationPlan||"—" },
              { label:"Approval comment", val:selected.approvalComment||"—" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: ["Description","Reason","Impact assessment","Risk assessment","Validation plan"].includes(f.label)?"1/-1":"auto" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
