// ManagementReview.jsx
// MBL QMS — Management Review Meeting (MRM)
// ISO 15189:2022 §8.9 — Management review
// Pulls KPI summary, NCR/CAPA/Audit/Risk/Complaint counts automatically
// Agenda builder, minutes, action items, MD/Director sign-off

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

const STANDARD_AGENDA = [
  "Review of previous MRM action items",
  "Status of NCRs and CAPAs",
  "Internal and external audit results",
  "Risk register review",
  "Customer feedback and complaints",
  "Quality indicators (KPI) review",
  "Changes affecting the quality management system",
  "Recommendations for improvement",
  "Adequacy of resources",
];

const STATUS_CFG = {
  Scheduled: { color:"#888780", bg:"#F1EFE8" },
  "In progress": { color:"#854F0B", bg:"#FAEEDA" },
  "Pending sign-off": { color:"#185FA5", bg:"#E6F1FB" },
  Closed: { color:"#0F6E56", bg:"#E1F5EE" },
};

function today() { return new Date().toISOString().split("T")[0]; }
function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }
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
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth: wide?760:520, maxHeight:"92vh", overflow:"auto", boxShadow:"0 12px 60px rgba(0,0,0,0.22)" }}>
        <div style={{ padding:"14px 20px", borderBottom:"0.5px solid #E0DDD6", position:"sticky", top:0, background:"#fff", zIndex:1, display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div><div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>{title}</div>{sub && <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>{sub}</div>}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#888780" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

export default function ManagementReview({ role, userName }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const isMD = ["Managing Director","Deputy Director"].includes(role);
  const isQuality = ["Quality Manager","Managing Director","Deputy Director"].includes(role);

  const [form, setForm] = useState({
    title:"", reviewDate: today(), chairperson: userName||"", attendees:"",
  });

  const [actionForm, setActionForm] = useState({ description:"", assignedTo:"", dueDate:"" });
  const [signOffForm, setSignOffForm] = useState({ comment:"" });
  const [agendaNotes, setAgendaNotes] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"managementReviews"), orderBy("createdAt","desc")));
      setReviews(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pull live summary data from related collections
  const pullSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const month = monthKey();
      const [ncrSnap, capaSnap, auditSnap, riskSnap, complaintSnap, kpiSnap] = await Promise.all([
        getDocs(collection(db,"nonConformities")),
        getDocs(collection(db,"capas")),
        getDocs(collection(db,"audits")),
        getDocs(collection(db,"risks")),
        getDocs(query(collection(db,"complaints"), where("month","==",month))),
        getDocs(query(collection(db,"kpiData"))),
      ]);

      const ncrs = ncrSnap.docs.map(d=>d.data());
      const capas = capaSnap.docs.map(d=>d.data());
      const audits = auditSnap.docs.map(d=>d.data());
      const risks = riskSnap.docs.map(d=>d.data());
      const complaints = complaintSnap.docs.map(d=>d.data());

      setSummary({
        ncr: {
          total: ncrs.length,
          open: ncrs.filter(n=>n.status!=="Closed").length,
          closed: ncrs.filter(n=>n.status==="Closed").length,
        },
        capa: {
          total: capas.length,
          open: capas.filter(c=>!["Closed"].includes(c.status)).length,
          overdue: capas.filter(c => c.targetDate && new Date(c.targetDate) < new Date() && c.status!=="Closed").length,
        },
        audit: {
          total: audits.length,
          findingsOpen: audits.reduce((sum,a)=>sum+(a.findings||[]).filter(f=>f.status==="Open").length,0),
          closed: audits.filter(a=>a.status==="Closed").length,
        },
        risk: {
          total: risks.length,
          critical: risks.filter(r=>r.score>=15).length,
          high: risks.filter(r=>r.score>=8 && r.score<15).length,
        },
        complaints: {
          thisMonth: complaints.length,
          resolved: complaints.filter(c=>["Resolved","Closed"].includes(c.status)).length,
        },
        kpiMonthsRecorded: kpiSnap.size,
        month,
      });
    } catch(e){ console.error(e); }
    setSummaryLoading(false);
  }, []);

  useEffect(() => { pullSummary(); }, [pullSummary]);

  const handleSchedule = async () => {
    if (!form.title || !form.reviewDate || !form.chairperson) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = reviews.length + 1;
      const mrmNumber = `MRM-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"managementReviews"), {
        ...form, mrmNumber, status:"Scheduled",
        agenda: STANDARD_AGENDA.map(item => ({ item, notes:"" })),
        attendeesList: form.attendees.split(",").map(a=>a.trim()).filter(Boolean),
        actionItems:[],
        summarySnapshot: summary,
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ title:"", reviewDate: today(), chairperson: userName||"", attendees:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const openMRM = (m) => {
    setSelected(m);
    const notes = {};
    (m.agenda||[]).forEach((a,i)=>{ notes[i]=a.notes||""; });
    setAgendaNotes(notes);
    setModal("review");
  };

  const saveAgendaNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const agenda = (selected.agenda||[]).map((a,i)=>({ ...a, notes: agendaNotes[i]||"" }));
      await updateDoc(doc(db,"managementReviews",selected.id), {
        agenda, status:"Pending sign-off",
      });
      setSelected(p=>({...p, agenda, status:"Pending sign-off"}));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const addActionItem = async () => {
    if (!selected || !actionForm.description) return;
    setSaving(true);
    try {
      const items = [...(selected.actionItems||[]), { ...actionForm, status:"Open", createdAt: new Date().toISOString() }];
      await updateDoc(doc(db,"managementReviews",selected.id), { actionItems: items });
      setSelected(p=>({...p, actionItems: items}));
      setActionForm({ description:"", assignedTo:"", dueDate:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const toggleActionItem = async (idx) => {
    const items = [...(selected.actionItems||[])];
    items[idx] = { ...items[idx], status: items[idx].status==="Open" ? "Closed" : "Open" };
    await updateDoc(doc(db,"managementReviews",selected.id), { actionItems: items });
    setSelected(p=>({...p, actionItems: items}));
    load();
  };

  const signOff = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"managementReviews",selected.id), {
        status:"Closed", signedOffBy: userName, signedOffAt: serverTimestamp(), signOffComment: signOffForm.comment,
      });
      setModal(null);
      setSignOffForm({comment:""});
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const scheduledCount = reviews.filter(r=>r.status==="Scheduled").length;
  const progressCount = reviews.filter(r=>r.status==="In progress").length;
  const pendingCount = reviews.filter(r=>r.status==="Pending sign-off").length;
  const closedCount = reviews.filter(r=>r.status==="Closed").length;

  const S = {
    wrap:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#F7F6F2", minHeight:"100vh" },
    topbar:{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"10px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 },
    card:{ background:"#fff", border:"0.5px solid #E0DDD6", borderRadius:12, overflow:"hidden", marginBottom:14 },
    btn:(bg,color)=>({ padding:"7px 14px", background:bg||"#0F6E56", color:color||"#E1F5EE", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer" }),
    statCard:(color,bg)=>({ background:bg, borderRadius:8, padding:"10px 12px", border:`0.5px solid ${color}33` }),
  };

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"#534AB7", display:"flex", alignItems:"center", justifyContent:"center", color:"#EEEDFE", fontSize:16 }}>🗂</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Management review</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.9 · MRM</div>
          </div>
        </div>
        {isQuality && <button style={S.btn("#534AB7")} onClick={()=>setModal("new")}>+ Schedule MRM</button>}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Scheduled", val:scheduledCount, color:"#888780", bg:"#F1EFE8" },
            { label:"In progress", val:progressCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Pending sign-off", val:pendingCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Closed", val:closedCount, color:"#0F6E56", bg:"#E1F5EE" },
          ].map((c,i) => (
            <div key={i} style={S.statCard(c.color,c.bg)}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Live QMS summary */}
        <div style={S.card}>
          <div style={{ padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>Live QMS summary — auto-pulled from system</span>
            <button onClick={pullSummary} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#888780" }}>↻ Refresh</button>
          </div>
          {summaryLoading && <div style={{ padding:20, textAlign:"center", color:"#888780", fontSize:13 }}>Loading summary…</div>}
          {summary && !summaryLoading && (
            <div style={{ padding:14, display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
              <div style={S.statCard("#A32D2D","#FCEBEB")}>
                <div style={{ fontSize:10, color:"#A32D2D", fontWeight:500 }}>NCRs</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#A32D2D" }}>{summary.ncr.open} open</div>
                <div style={{ fontSize:10, color:"#888780" }}>{summary.ncr.closed} closed · {summary.ncr.total} total</div>
              </div>
              <div style={S.statCard("#185FA5","#E6F1FB")}>
                <div style={{ fontSize:10, color:"#185FA5", fontWeight:500 }}>CAPAs</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#185FA5" }}>{summary.capa.open} open</div>
                <div style={{ fontSize:10, color: summary.capa.overdue>0?"#A32D2D":"#888780" }}>{summary.capa.overdue} overdue</div>
              </div>
              <div style={S.statCard("#534AB7","#EEEDFE")}>
                <div style={{ fontSize:10, color:"#534AB7", fontWeight:500 }}>Audits</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#534AB7" }}>{summary.audit.findingsOpen} findings open</div>
                <div style={{ fontSize:10, color:"#888780" }}>{summary.audit.closed}/{summary.audit.total} closed</div>
              </div>
              <div style={S.statCard("#854F0B","#FAEEDA")}>
                <div style={{ fontSize:10, color:"#854F0B", fontWeight:500 }}>Risks</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#854F0B" }}>{summary.risk.critical} critical</div>
                <div style={{ fontSize:10, color:"#888780" }}>{summary.risk.high} high · {summary.risk.total} total</div>
              </div>
              <div style={S.statCard("#0F6E56","#E1F5EE")}>
                <div style={{ fontSize:10, color:"#0F6E56", fontWeight:500 }}>Complaints ({summary.month})</div>
                <div style={{ fontSize:18, fontWeight:600, color:"#0F6E56" }}>{summary.complaints.thisMonth}</div>
                <div style={{ fontSize:10, color:"#888780" }}>{summary.complaints.resolved} resolved</div>
              </div>
            </div>
          )}
        </div>

        {/* Reviews list */}
        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && reviews.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No management reviews scheduled.</div>}
          {reviews.map(r => {
            const sc = STATUS_CFG[r.status]||STATUS_CFG.Scheduled;
            const openActions = (r.actionItems||[]).filter(a=>a.status==="Open").length;
            return (
              <div key={r.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{r.mrmNumber}</span>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{r.title}</div>
                      <Badge label={r.status} color={sc.color} bg={sc.bg} />
                      {openActions>0 && <Badge label={`${openActions} open action${openActions>1?"s":""}`} color="#854F0B" bg="#FAEEDA" />}
                    </div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:4 }}>
                      {r.reviewDate} · Chair: {r.chairperson} · {(r.attendeesList||[]).length} attendees
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {r.status==="Pending sign-off" && isMD && (
                      <button style={S.btn("#3C3489")} onClick={()=>{ setSelected(r); setSignOffForm({comment:""}); setModal("signoff"); }}>Sign off</button>
                    )}
                    <button style={S.btn("#534AB7")} onClick={()=>openMRM(r)}>
                      {r.status==="Closed" ? "View" : "Open MRM"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New MRM modal */}
      {modal==="new" && (
        <Modal title="Schedule management review" sub="ISO 15189:2022 §8.9" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="MRM title" required><input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Q3 2025 Management Review" /></Field>
            <Field label="Review date" required><input style={inp} type="date" value={form.reviewDate} onChange={e=>setForm(p=>({...p,reviewDate:e.target.value}))} /></Field>
            <Field label="Chairperson" required><input style={inp} value={form.chairperson} onChange={e=>setForm(p=>({...p,chairperson:e.target.value}))} /></Field>
          </div>
          <Field label="Attendees (comma separated)"><input style={inp} value={form.attendees} onChange={e=>setForm(p=>({...p,attendees:e.target.value}))} placeholder="e.g. Managing Director, Quality Manager, HOD Microbiology" /></Field>
          <div style={{ background:"#EEEDFE", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#3C3489" }}>
            ℹ A standard 9-point ISO 15189 MRM agenda will be created automatically, along with a live snapshot of NCR, CAPA, audit, risk, and complaint data.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#534AB7")} onClick={handleSchedule} disabled={saving}>{saving?"Saving…":"Schedule MRM"}</button>
          </div>
        </Modal>
      )}

      {/* Review modal — agenda + minutes + action items */}
      {modal==="review" && selected && (
        <Modal title={selected.mrmNumber} sub={`${selected.title} · ${selected.reviewDate}`} onClose={()=>setModal(null)} wide>

          {/* Snapshot at time of meeting */}
          {selected.summarySnapshot && (
            <div style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:11 }}>
              <div style={{ color:"#888780", marginBottom:6, fontWeight:500 }}>QMS snapshot at scheduling</div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                <span>NCR open: <strong>{selected.summarySnapshot.ncr?.open}</strong></span>
                <span>CAPA open: <strong>{selected.summarySnapshot.capa?.open}</strong></span>
                <span>Audit findings open: <strong>{selected.summarySnapshot.audit?.findingsOpen}</strong></span>
                <span>Critical risks: <strong>{selected.summarySnapshot.risk?.critical}</strong></span>
                <span>Complaints ({selected.summarySnapshot.month}): <strong>{selected.summarySnapshot.complaints?.thisMonth}</strong></span>
              </div>
            </div>
          )}

          {/* Agenda with notes */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Agenda &amp; minutes</div>
          {(selected.agenda||[]).map((item,i) => (
            <div key={i} style={{ marginBottom:10 }}>
              <div style={{ fontSize:12, color:"#2C2C2A", marginBottom:4 }}>
                <span style={{ color:"#888780", marginRight:6 }}>{i+1}.</span>{item.item}
              </div>
              {selected.status==="Closed" ? (
                <div style={{ fontSize:11, color:"#5F5E5A", padding:"6px 10px", background:"#F7F6F2", borderRadius:6 }}>
                  {item.notes || "No notes recorded."}
                </div>
              ) : (
                <textarea style={{...inp,resize:"vertical"}} rows={2}
                  placeholder="Discussion notes…"
                  value={agendaNotes[i]||""}
                  onChange={e=>setAgendaNotes(p=>({...p,[i]:e.target.value}))} />
              )}
            </div>
          ))}

          {selected.status!=="Closed" && (
            <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
              <button style={S.btn("#534AB7")} onClick={saveAgendaNotes} disabled={saving}>{saving?"Saving…":"Save minutes"}</button>
            </div>
          )}

          {/* Action items */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8, marginTop:16 }}>
            Action items ({(selected.actionItems||[]).length})
          </div>
          {(selected.actionItems||[]).map((a,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", background:"#F7F6F2", borderRadius:7, marginBottom:6 }}>
              <input type="checkbox" checked={a.status==="Closed"} onChange={()=>toggleActionItem(i)} style={{ accentColor:"#0F6E56" }} disabled={selected.status==="Closed"} />
              <div style={{ flex:1, fontSize:12, color: a.status==="Closed" ? "#888780":"#2C2C2A", textDecoration: a.status==="Closed"?"line-through":"none" }}>
                {a.description}
              </div>
              <span style={{ fontSize:11, color:"#888780" }}>{a.assignedTo}</span>
              <span style={{ fontSize:11, color:"#888780" }}>{a.dueDate}</span>
              <Badge label={a.status} color={a.status==="Closed"?"#085041":"#791F1F"} bg={a.status==="Closed"?"#E1F5EE":"#FCEBEB"} />
            </div>
          ))}

          {selected.status!=="Closed" && (
            <div style={{ display:"flex", gap:6, marginTop:10 }}>
              <input style={{...inp,flex:1}} placeholder="Action item description" value={actionForm.description} onChange={e=>setActionForm(p=>({...p,description:e.target.value}))} />
              <input style={{...inp,width:140}} placeholder="Assigned to" value={actionForm.assignedTo} onChange={e=>setActionForm(p=>({...p,assignedTo:e.target.value}))} />
              <input style={{...inp,width:130}} type="date" value={actionForm.dueDate} onChange={e=>setActionForm(p=>({...p,dueDate:e.target.value}))} />
              <button style={S.btn("#534AB7")} onClick={addActionItem} disabled={saving}>+ Add</button>
            </div>
          )}

          {/* Sign-off status */}
          {selected.status==="Closed" && (
            <div style={{ marginTop:16, background:"#E1F5EE", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#085041" }}>
              ✓ Signed off by {selected.signedOffBy} on {fmtDate(selected.signedOffAt)}
              {selected.signOffComment && <div style={{ marginTop:4 }}>{selected.signOffComment}</div>}
            </div>
          )}
        </Modal>
      )}

      {/* Sign-off modal */}
      {modal==="signoff" && selected && (
        <Modal title={`Sign off — ${selected.mrmNumber}`} sub={selected.title} onClose={()=>setModal(null)}>
          <div style={{ background:"#EEEDFE", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#3C3489" }}>
            ✓ Signing off confirms the management review minutes and action items are complete and approved.
          </div>
          <Field label="Sign-off comment"><textarea style={{...inp,resize:"vertical"}} rows={3} value={signOffForm.comment} onChange={e=>setSignOffForm(p=>({...p,comment:e.target.value}))} placeholder="Optional remarks…" /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#3C3489")} onClick={signOff} disabled={saving}>{saving?"Saving…":"Sign off & close MRM"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
