// Feedback.jsx
// MBL QMS — Customer Feedback
// ISO 15189:2022 §8.7 — Feedback / KPI 7.5.9 (Customer satisfaction)

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

const FEEDBACK_TYPES = ["Positive","Suggestion","Negative"];
const SOURCES = ["Patient","Physician","Referring lab","Walk-in survey","Phone survey","Online review","Other"];
const ASPECTS = ["Staff behaviour","Turnaround time","Report accuracy","Facility/cleanliness","Sample collection experience","Billing/pricing","Communication","Other"];

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

function StarRating({ value, onChange, readOnly, size }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={()=>!readOnly && onChange(n)} style={{
          fontSize: size||16, cursor: readOnly?"default":"pointer",
          color: n<=value ? "#EF9F27" : "#E0DDD6",
        }}>★</span>
      ))}
    </div>
  );
}

const TYPE_CFG = {
  Positive: { color:"#0F6E56", bg:"#E1F5EE" },
  Suggestion: { color:"#185FA5", bg:"#E6F1FB" },
  Negative: { color:"#A32D2D", bg:"#FCEBEB" },
};

export default function Feedback({ role, userName, dept }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [filterType, setFilterType] = useState("All");

  const [form, setForm] = useState({
    feedbackType:"Positive", source: SOURCES[0], aspect: ASPECTS[0],
    rating:5, comments:"", patientName:"", receivedBy: userName||"",
    department: dept||"", date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"feedback"), orderBy("createdAt","desc")));
      setFeedbacks(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.receivedBy) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,"feedback"), {
        ...form, month: monthKey(),
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm(p => ({ ...p, comments:"", patientName:"", rating:5 }));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = feedbacks.filter(f => filterType==="All" || f.feedbackType===filterType);

  const positiveCount = feedbacks.filter(f=>f.feedbackType==="Positive").length;
  const suggestionCount = feedbacks.filter(f=>f.feedbackType==="Suggestion").length;
  const negativeCount = feedbacks.filter(f=>f.feedbackType==="Negative").length;
  const avgRating = feedbacks.length>0 ? (feedbacks.reduce((s,f)=>s+(f.rating||0),0)/feedbacks.length) : 0;

  // KPI 7.5.9 — satisfaction rate = positive / total
  const satisfactionRate = feedbacks.length>0 ? (positiveCount/feedbacks.length*100) : 0;

  // Aspect breakdown for negative feedback
  const negativeByAspect = {};
  feedbacks.filter(f=>f.feedbackType==="Negative").forEach(f => {
    negativeByAspect[f.aspect] = (negativeByAspect[f.aspect]||0)+1;
  });

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#0F6E56", display:"flex", alignItems:"center", justifyContent:"center", color:"#E1F5EE", fontSize:16 }}>👥</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Customer feedback</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.7 · KPI 7.5.9 — Customer satisfaction</div>
          </div>
        </div>
        <button style={S.btn("#0F6E56")} onClick={()=>setModal("new")}>+ Record feedback</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Total feedback", val:feedbacks.length, color:"#2C2C2A", bg:"#F7F6F2" },
            { label:"Positive", val:positiveCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Suggestions", val:suggestionCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Negative", val:negativeCount, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Satisfaction (KPI 7.5.9)", val:`${satisfactionRate.toFixed(1)}%`, color: satisfactionRate>=90?"#0F6E56":"#854F0B", bg: satisfactionRate>=90?"#E1F5EE":"#FAEEDA" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Average rating */}
        <div style={{ ...S.card, padding:"14px 16px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:28, fontWeight:600, color:"#2C2C2A" }}>{avgRating.toFixed(1)}</div>
          <div>
            <StarRating value={Math.round(avgRating)} readOnly size={20} />
            <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>Average rating from {feedbacks.length} responses</div>
          </div>
        </div>

        {/* Negative aspects breakdown */}
        {Object.keys(negativeByAspect).length > 0 && (
          <div style={S.card}>
            <div style={{ padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6", fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              Negative feedback by aspect
            </div>
            {Object.entries(negativeByAspect).sort((a,b)=>b[1]-a[1]).map(([aspect,count]) => (
              <div key={aspect} style={{ padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:180, fontSize:12, color:"#2C2C2A" }}>{aspect}</div>
                <div style={{ flex:1, height:8, background:"#F1EFE8", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${(count/negativeCount*100)}%`, height:"100%", background:"#E24B4A" }} />
                </div>
                <div style={{ fontSize:11, color:"#A32D2D", fontWeight:500, width:30, textAlign:"right" }}>{count}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:180 }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="All">All types</option>
            {FEEDBACK_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} entries</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No feedback recorded yet.</div>}
          {filtered.map(f => {
            const tc = TYPE_CFG[f.feedbackType]||TYPE_CFG.Positive;
            return (
              <div key={f.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <Badge label={f.feedbackType} color={tc.color} bg={tc.bg} />
                      <Badge label={f.aspect} color="#534AB7" bg="#EEEDFE" />
                      <StarRating value={f.rating} readOnly size={13} />
                    </div>
                    {f.comments && <div style={{ fontSize:12, color:"#2C2C2A", marginTop:5 }}>{f.comments}</div>}
                    <div style={{ fontSize:11, color:"#B4B2A9", marginTop:3 }}>
                      {f.patientName && `${f.patientName} · `}Source: {f.source} · {f.department} · {fmtDate(f.createdAt)} · by {f.receivedBy}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New feedback modal */}
      {modal==="new" && (
        <Modal title="Record customer feedback" sub="ISO 15189:2022 §8.7" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Feedback type" required>
              <div style={{ display:"flex", gap:6 }}>
                {FEEDBACK_TYPES.map(t => {
                  const tc = TYPE_CFG[t];
                  const active = form.feedbackType===t;
                  return (
                    <button key={t} onClick={()=>setForm(p=>({...p,feedbackType:t}))} style={{
                      flex:1, padding:"8px", borderRadius:7, fontSize:11, cursor:"pointer",
                      border: active ? `1.5px solid ${tc.color}`:"0.5px solid #D3D1C7",
                      background: active ? tc.bg:"#fff", color: active ? tc.color:"#5F5E5A",
                    }}>{t}</button>
                  );
                })}
              </div>
            </Field>
            <Field label="Source"><select style={inp} value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Aspect"><select style={inp} value={form.aspect} onChange={e=>setForm(p=>({...p,aspect:e.target.value}))}>{ASPECTS.map(a=><option key={a}>{a}</option>)}</select></Field>
            <Field label="Rating">
              <StarRating value={form.rating} onChange={(v)=>setForm(p=>({...p,rating:v}))} size={22} />
            </Field>
            <Field label="Patient / respondent name"><input style={inp} value={form.patientName} onChange={e=>setForm(p=>({...p,patientName:e.target.value}))} /></Field>
            <Field label="Department"><input style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} /></Field>
            <Field label="Date"><input style={inp} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Received by" required><input style={inp} value={form.receivedBy} onChange={e=>setForm(p=>({...p,receivedBy:e.target.value}))} /></Field>
          </div>
          <Field label="Comments"><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.comments} onChange={e=>setForm(p=>({...p,comments:e.target.value}))} placeholder="What did the customer say?" /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={handleSubmit} disabled={saving}>{saving?"Saving…":"Save feedback"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
