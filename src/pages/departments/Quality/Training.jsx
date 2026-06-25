// Training.jsx
// MBL QMS — Training & Competency
// ISO 15189:2022 §6.2 — Personnel
// Training records per staff/equipment, competency assessment, expiry alerts

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

const TRAINING_TYPES = ["Induction","SOP training","Equipment training","Safety training","Refresher","External course"];
const COMPETENCY_STATUS = ["Competent","Needs improvement","Not yet assessed"];

function today() { return new Date().toISOString().split("T")[0]; }
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000*60*60*24));
}
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

const COMP_CFG = {
  Competent: { color:"#0F6E56", bg:"#E1F5EE" },
  "Needs improvement": { color:"#854F0B", bg:"#FAEEDA" },
  "Not yet assessed": { color:"#888780", bg:"#F1EFE8" },
};

export default function Training({ role, userName, dept }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterDept, setFilterDept] = useState(dept || "All");
  const [view, setView] = useState("records"); // records | matrix

  const isHR = ["HRM","HRE","Quality Manager","Managing Director"].includes(role) || dept==="Human Resource";

  const [form, setForm] = useState({
    staffName:"", department: dept||"", role:"", trainingType:"SOP training",
    topic:"", trainer:"", trainingDate: today(), expiryDate:"",
    competencyStatus:"Not yet assessed", assessmentNote:"",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"trainings"), orderBy("createdAt","desc")));
      setRecords(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.staffName || !form.topic) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,"trainings"), {
        ...form, createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ staffName:"", department: dept||"", role:"", trainingType:"SOP training", topic:"", trainer:"", trainingDate: today(), expiryDate:"", competencyStatus:"Not yet assessed", assessmentNote:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const updateCompetency = async (status, note) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"trainings",selected.id), {
        competencyStatus: status, assessmentNote: note,
        assessedBy: userName, assessedAt: serverTimestamp(),
      });
      setModal(null);
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = records.filter(r => filterDept==="All" || r.department===filterDept);

  const expiringSoon = filtered.filter(r => {
    const d = daysUntil(r.expiryDate);
    return d !== null && d >= 0 && d <= 30;
  });
  const expired = filtered.filter(r => {
    const d = daysUntil(r.expiryDate);
    return d !== null && d < 0;
  });
  const competentCount = filtered.filter(r=>r.competencyStatus==="Competent").length;
  const needsImprovementCount = filtered.filter(r=>r.competencyStatus==="Needs improvement").length;

  // Build competency matrix — staff x training type
  const staffNames = [...new Set(filtered.map(r=>r.staffName))];
  const matrix = staffNames.map(name => {
    const staffRecords = filtered.filter(r=>r.staffName===name);
    return {
      name,
      department: staffRecords[0]?.department,
      trainings: TRAINING_TYPES.map(type => {
        const rec = staffRecords.find(r=>r.trainingType===type);
        return { type, status: rec?.competencyStatus || null, expiry: rec?.expiryDate };
      }),
    };
  });

  const S = {
    wrap:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar:{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 },
    card:{ background:"#fff", border:"0.5px solid #E0DDD6", borderRadius:12, overflow:"hidden", marginBottom:14 },
    btn:(bg,color)=>({ padding:"7px 14px", background:bg||"#0F6E56", color:color||"#E1F5EE", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer" }),
    tab:(a)=>({ padding:"9px 16px", fontSize:13, fontWeight:a?500:400, color:a?"#0F6E56":"#888780", cursor:"pointer", background:"none", border:"none", borderBottom:a?"2px solid #0F6E56":"2px solid transparent" }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#534AB7", display:"flex", alignItems:"center", justifyContent:"center", color:"#EEEDFE", fontSize:16 }}>🎓</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Training &amp; competency</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §6.2 · Personnel records</div>
          </div>
        </div>
        <button style={S.btn("#534AB7")} onClick={()=>setModal("new")}>+ Add training record</button>
      </div>

      <div style={{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"0 20px", display:"flex" }}>
        <button style={S.tab(view==="records")} onClick={()=>setView("records")}>Records</button>
        <button style={S.tab(view==="matrix")} onClick={()=>setView("matrix")}>Competency matrix</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Total records", val:filtered.length, color:"#2C2C2A", bg:"#F7F6F2" },
            { label:"Competent", val:competentCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Needs improvement", val:needsImprovementCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Expired / expiring", val:expired.length+expiringSoon.length, color:"#A32D2D", bg:"#FCEBEB" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:220 }} value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
            <option value="All">All departments</option>
            {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} records</span>
        </div>

        {/* Expiry alerts */}
        {(expired.length>0 || expiringSoon.length>0) && (
          <div style={{ background:"#FCEBEB", border:"0.5px solid #E24B4A", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#791F1F" }}>
            ⚠ {expired.length} training(s) expired · {expiringSoon.length} expiring within 30 days
          </div>
        )}

        {view === "records" && (
          <div style={S.card}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 100px 110px 100px", padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:8 }}>
              {["Staff / topic","Department","Type","Date","Expiry","Status"].map((h,i)=>(
                <div key={i} style={{ fontSize:10, fontWeight:500, color:"#888780" }}>{h}</div>
              ))}
            </div>
            {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
            {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No training records found.</div>}
            {filtered.map(r => {
              const cc = COMP_CFG[r.competencyStatus]||COMP_CFG["Not yet assessed"];
              const d = daysUntil(r.expiryDate);
              const expiryWarn = d !== null && d < 30;
              return (
                <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 120px 100px 110px 100px", padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{r.staffName}</div>
                    <div style={{ fontSize:11, color:"#888780" }}>{r.topic}</div>
                  </div>
                  <div style={{ fontSize:11, color:"#5F5E5A" }}>{r.department}</div>
                  <div style={{ fontSize:11, color:"#5F5E5A" }}>{r.trainingType}</div>
                  <div style={{ fontSize:11, color:"#888780" }}>{r.trainingDate}</div>
                  <div style={{ fontSize:11, color: expiryWarn?"#A32D2D":"#888780" }}>{r.expiryDate || "—"}</div>
                  <div onClick={()=>{ setSelected(r); setModal("assess"); }} style={{ cursor: isHR ? "pointer":"default" }}>
                    <Badge label={r.competencyStatus} color={cc.color} bg={cc.bg} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === "matrix" && (
          <div style={S.card}>
            <div style={{ display:"grid", gridTemplateColumns:`1fr ${TRAINING_TYPES.map(()=>"110px").join(" ")}`, padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:4 }}>
              <div style={{ fontSize:10, fontWeight:500, color:"#888780" }}>Staff</div>
              {TRAINING_TYPES.map(t => <div key={t} style={{ fontSize:9, fontWeight:500, color:"#888780", textAlign:"center" }}>{t}</div>)}
            </div>
            {matrix.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No data for matrix view.</div>}
            {matrix.map((m,i) => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:`1fr ${TRAINING_TYPES.map(()=>"110px").join(" ")}`, padding:"8px 16px", borderBottom:"0.5px solid #F1EFE8", gap:4, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{m.name}</div>
                  <div style={{ fontSize:10, color:"#888780" }}>{m.department}</div>
                </div>
                {m.trainings.map((t,j) => (
                  <div key={j} style={{ textAlign:"center" }}>
                    {t.status ? (
                      <span style={{ fontSize:14 }}>{t.status==="Competent"?"✅":t.status==="Needs improvement"?"⚠️":"⬜"}</span>
                    ) : <span style={{ fontSize:11, color:"#D3D1C7" }}>—</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New training modal */}
      {modal==="new" && (
        <Modal title="Add training record" sub="ISO 15189:2022 §6.2" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Staff name" required><input style={inp} value={form.staffName} onChange={e=>setForm(p=>({...p,staffName:e.target.value}))} /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Role/designation"><input style={inp} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} /></Field>
            <Field label="Training type" required><select style={inp} value={form.trainingType} onChange={e=>setForm(p=>({...p,trainingType:e.target.value}))}>{TRAINING_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Trainer"><input style={inp} value={form.trainer} onChange={e=>setForm(p=>({...p,trainer:e.target.value}))} /></Field>
            <Field label="Training date"><input style={inp} type="date" value={form.trainingDate} onChange={e=>setForm(p=>({...p,trainingDate:e.target.value}))} /></Field>
            <Field label="Expiry / next due date"><input style={inp} type="date" value={form.expiryDate} onChange={e=>setForm(p=>({...p,expiryDate:e.target.value}))} /></Field>
            <Field label="Competency status"><select style={inp} value={form.competencyStatus} onChange={e=>setForm(p=>({...p,competencyStatus:e.target.value}))}>{COMPETENCY_STATUS.map(s=><option key={s}>{s}</option>)}</select></Field>
          </div>
          <Field label="Training topic / title" required><input style={inp} value={form.topic} onChange={e=>setForm(p=>({...p,topic:e.target.value}))} placeholder="e.g. SOP-MIC-04 Sample Collection" /></Field>
          <Field label="Assessment notes"><textarea style={{...inp,resize:"vertical"}} rows={2} value={form.assessmentNote} onChange={e=>setForm(p=>({...p,assessmentNote:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#534AB7")} onClick={handleSubmit} disabled={saving}>{saving?"Saving…":"Add record"}</button>
          </div>
        </Modal>
      )}

      {/* Assess modal */}
      {modal==="assess" && selected && isHR && (
        <Modal title={`Assess competency — ${selected.staffName}`} sub={selected.topic} onClose={()=>setModal(null)}>
          <Field label="Competency status">
            <div style={{ display:"flex", gap:8 }}>
              {COMPETENCY_STATUS.map(s => {
                const cc = COMP_CFG[s];
                const active = selected.competencyStatus===s;
                return (
                  <button key={s} onClick={()=>setSelected(p=>({...p,competencyStatus:s}))} style={{
                    flex:1, padding:"8px", borderRadius:7, fontSize:11, cursor:"pointer",
                    border: active ? `1.5px solid ${cc.color}` : "0.5px solid #D3D1C7",
                    background: active ? cc.bg : "#fff", color: active ? cc.color : "#5F5E5A",
                  }}>{s}</button>
                );
              })}
            </div>
          </Field>
          <Field label="Assessment note"><textarea style={{...inp,resize:"vertical"}} rows={3} defaultValue={selected.assessmentNote} onChange={e=>setSelected(p=>({...p,assessmentNote:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#534AB7")} onClick={()=>updateCompetency(selected.competencyStatus, selected.assessmentNote)} disabled={saving}>{saving?"Saving…":"Save assessment"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
