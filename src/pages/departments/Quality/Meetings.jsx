// Meetings.jsx
// MBL QMS — Meetings / Minutes of Meeting (MOM)
// ISO 15189:2022 §8.9 — feeds Management Review

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

const MEETING_TYPES = ["Department meeting","Quality meeting","Management review","Audit closure","Training session","Other"];
const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  "Quality","Human Resource","Biomedical Engineering","Purchase","Maintenance","Housekeeping",
  "Information Technology","Kitchen","Security","Collection","Front Office","Back Office",
  "Sample Collection Centre","Call Centre","Accounts","Administration","Design","Marketing",
  "ERP Administration","All departments",
];

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
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth: wide?720:520, maxHeight:"92vh", overflow:"auto", boxShadow:"0 12px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6", position:"sticky", top:0, background:"#fff", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div><div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>{sub && <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{sub}</div>}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#888780" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

export default function Meetings({ role, userName, dept }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("All");

  const [form, setForm] = useState({
    title:"", meetingType: MEETING_TYPES[0], department: dept||"All departments",
    date: today(), time:"", organizer: userName||"", attendees:"",
    agenda:"",
  });

  const [momForm, setMomForm] = useState({ discussionPoints:"" });
  const [actionForm, setActionForm] = useState({ description:"", assignedTo:"", dueDate:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"meetings"), orderBy("createdAt","desc")));
      setMeetings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSchedule = async () => {
    if (!form.title || !form.date) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,"meetings"), {
        ...form, status:"Scheduled",
        attendeesList: form.attendees.split(",").map(a=>a.trim()).filter(Boolean),
        actionItems:[], discussionPoints:"",
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ title:"", meetingType: MEETING_TYPES[0], department: dept||"All departments", date: today(), time:"", organizer: userName||"", attendees:"", agenda:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const openMOM = (m) => {
    setSelected(m);
    setMomForm({ discussionPoints: m.discussionPoints || "" });
    setModal("mom");
  };

  const saveMOM = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"meetings",selected.id), {
        discussionPoints: momForm.discussionPoints, status:"Completed",
        momRecordedBy: userName, momRecordedAt: serverTimestamp(),
      });
      setSelected(p=>({...p, discussionPoints: momForm.discussionPoints, status:"Completed"}));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const addActionItem = async () => {
    if (!selected || !actionForm.description) return;
    setSaving(true);
    try {
      const items = [...(selected.actionItems||[]), { ...actionForm, status:"Open", createdAt: new Date().toISOString() }];
      await updateDoc(doc(db,"meetings",selected.id), { actionItems: items });
      setSelected(p=>({...p, actionItems: items}));
      setActionForm({ description:"", assignedTo:"", dueDate:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const toggleActionItem = async (idx) => {
    const items = [...(selected.actionItems||[])];
    items[idx] = { ...items[idx], status: items[idx].status==="Open" ? "Closed" : "Open" };
    await updateDoc(doc(db,"meetings",selected.id), { actionItems: items });
    setSelected(p=>({...p, actionItems: items}));
    load();
  };

  const filtered = meetings.filter(m => filterType==="All" || m.meetingType===filterType);

  const upcomingCount = meetings.filter(m => daysUntil(m.date) >= 0 && m.status==="Scheduled").length;
  const completedCount = meetings.filter(m => m.status==="Completed").length;
  let openActions = 0, closedActions = 0;
  meetings.forEach(m => (m.actionItems||[]).forEach(a => a.status==="Open" ? openActions++ : closedActions++));

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#854F0B", display:"flex", alignItems:"center", justifyContent:"center", color:"#FAEEDA", fontSize:16 }}>📅</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Meetings &amp; MOM</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.9 · Minutes of meeting & action items</div>
          </div>
        </div>
        <button style={S.btn("#854F0B")} onClick={()=>setModal("new")}>+ Schedule meeting</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Upcoming", val:upcomingCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Completed", val:completedCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Open action items", val:openActions, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Closed action items", val:closedActions, color:"#888780", bg:"#F1EFE8" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:220 }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="All">All meeting types</option>
            {MEETING_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} meetings</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No meetings scheduled.</div>}
          {filtered.map(m => {
            const openItems = (m.actionItems||[]).filter(a=>a.status==="Open").length;
            const isPast = daysUntil(m.date) < 0;
            return (
              <div key={m.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{m.title}</div>
                      <Badge label={m.meetingType} color="#534AB7" bg="#EEEDFE" />
                      <Badge label={m.status==="Completed"?"Completed":isPast?"Overdue":"Scheduled"}
                        color={m.status==="Completed"?"#0F6E56":isPast?"#A32D2D":"#185FA5"}
                        bg={m.status==="Completed"?"#E1F5EE":isPast?"#FCEBEB":"#E6F1FB"} />
                      {openItems>0 && <Badge label={`${openItems} open action${openItems>1?"s":""}`} color="#854F0B" bg="#FAEEDA" />}
                    </div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:4 }}>
                      {m.department} · {m.date} {m.time && `at ${m.time}`} · Organizer: {m.organizer}
                    </div>
                    {m.agenda && <div style={{ fontSize:12, color:"#5F5E5A", marginTop:4 }}>{m.agenda}</div>}
                  </div>
                  <button style={S.btn(m.status==="Completed"?"#534AB7":"#854F0B")} onClick={()=>openMOM(m)}>
                    {m.status==="Completed" ? "View MOM" : "Record MOM"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New meeting modal */}
      {modal==="new" && (
        <Modal title="Schedule meeting" sub="ISO 15189:2022 §8.9" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Meeting title" required><input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Q3 Quality Review" /></Field>
            <Field label="Meeting type"><select style={inp} value={form.meetingType} onChange={e=>setForm(p=>({...p,meetingType:e.target.value}))}>{MEETING_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Department"><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Organizer" required><input style={inp} value={form.organizer} onChange={e=>setForm(p=>({...p,organizer:e.target.value}))} /></Field>
            <Field label="Date" required><input style={inp} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Time"><input style={inp} type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} /></Field>
          </div>
          <Field label="Attendees (comma separated)"><input style={inp} value={form.attendees} onChange={e=>setForm(p=>({...p,attendees:e.target.value}))} placeholder="e.g. Dr. Sharma, Quality Manager, HOD Microbiology" /></Field>
          <Field label="Agenda"><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.agenda} onChange={e=>setForm(p=>({...p,agenda:e.target.value}))} placeholder="Topics to be discussed…" /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#854F0B")} onClick={handleSchedule} disabled={saving}>{saving?"Saving…":"Schedule meeting"}</button>
          </div>
        </Modal>
      )}

      {/* MOM modal */}
      {modal==="mom" && selected && (
        <Modal title={`Minutes of meeting — ${selected.title}`} sub={`${selected.date} · ${selected.department}`} onClose={()=>setModal(null)} wide>
          <div style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12 }}>
            <div style={{ color:"#888780", marginBottom:4 }}>Agenda</div>
            <div style={{ color:"#2C2C2A", marginBottom:8 }}>{selected.agenda||"—"}</div>
            <div style={{ color:"#888780", marginBottom:4 }}>Attendees</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {(selected.attendeesList||[]).map((a,i)=>(
                <span key={i} style={{ fontSize:10, padding:"2px 8px", borderRadius:10, background:"#E1F5EE", color:"#085041" }}>{a}</span>
              ))}
            </div>
          </div>

          <Field label="Discussion points / minutes">
            <textarea style={{...inp,resize:"vertical"}} rows={5} value={momForm.discussionPoints}
              onChange={e=>setMomForm(p=>({...p,discussionPoints:e.target.value}))}
              placeholder="Record what was discussed in this meeting…" />
          </Field>

          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Action items ({(selected.actionItems||[]).length})</div>
          {(selected.actionItems||[]).map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"#F7F6F2", borderRadius:7, marginBottom:6 }}>
              <input type="checkbox" checked={a.status==="Closed"} onChange={()=>toggleActionItem(i)} style={{ accentColor:"#0F6E56" }} />
              <div style={{ flex:1, fontSize:12, color: a.status==="Closed" ? "#888780":"#2C2C2A", textDecoration: a.status==="Closed"?"line-through":"none" }}>
                {a.description}
              </div>
              <span style={{ fontSize:11, color:"#888780" }}>{a.assignedTo}</span>
              <span style={{ fontSize:11, color:"#888780" }}>{a.dueDate}</span>
              <Badge label={a.status} color={a.status==="Closed"?"#085041":"#791F1F"} bg={a.status==="Closed"?"#E1F5EE":"#FCEBEB"} />
            </div>
          ))}

          <div style={{ display:"flex", gap:6, marginTop:10, marginBottom:16 }}>
            <input style={{...inp,flex:1}} placeholder="Action item description" value={actionForm.description} onChange={e=>setActionForm(p=>({...p,description:e.target.value}))} />
            <input style={{...inp,width:140}} placeholder="Assigned to" value={actionForm.assignedTo} onChange={e=>setActionForm(p=>({...p,assignedTo:e.target.value}))} />
            <input style={{...inp,width:130}} type="date" value={actionForm.dueDate} onChange={e=>setActionForm(p=>({...p,dueDate:e.target.value}))} />
            <button style={S.btn("#854F0B")} onClick={addActionItem} disabled={saving}>+ Add</button>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Close</button>
            <button style={S.btn("#534AB7")} onClick={saveMOM} disabled={saving}>{saving?"Saving…":"Save MOM"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
