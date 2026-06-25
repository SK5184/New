// RiskManagement.jsx
// MBL QMS — Risk Management
// ISO 15189:2022 §8.6 — Risk management / ISO 27001 A.8 risk assessment
// Risk register, likelihood x impact matrix, mitigation plan, review

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

const CATEGORIES = ["Operational","Clinical","Information security","Financial","Reputational","Regulatory","Equipment","Personnel"];
const LEVELS = [1,2,3,4,5];
const LEVEL_LABELS = { 1:"Very low", 2:"Low", 3:"Medium", 4:"High", 5:"Very high" };

function riskScore(likelihood, impact) { return likelihood * impact; }
function riskLevel(score) {
  if (score >= 15) return { label:"Critical", color:"#791F1F", bg:"#FCEBEB" };
  if (score >= 8)  return { label:"High",     color:"#854F0B", bg:"#FAEEDA" };
  if (score >= 4)  return { label:"Medium",   color:"#185FA5", bg:"#E6F1FB" };
  return            { label:"Low",      color:"#0F6E56", bg:"#E1F5EE" };
}

const STATUS_CFG = {
  Identified: { color:"#888780", bg:"#F1EFE8" },
  "Mitigation in progress": { color:"#854F0B", bg:"#FAEEDA" },
  Mitigated: { color:"#0F6E56", bg:"#E1F5EE" },
  Accepted: { color:"#185FA5", bg:"#E6F1FB" },
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

export default function RiskManagement({ role, userName, dept }) {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [view, setView] = useState("register"); // register | matrix

  const isQuality = ["Quality Manager","Quality Executive","Managing Director","Deputy Director","ERP Admin","Admin"].includes(role);

  const [form, setForm] = useState({
    title:"", department: dept||"", category:"Operational",
    description:"", likelihood:3, impact:3,
    mitigationPlan:"", owner: userName||"", reviewDate:"",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"risks"), orderBy("createdAt","desc")));
      setRisks(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.mitigationPlan) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = risks.length + 1;
      const riskId = `RISK-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"risks"), {
        ...form, riskId, score: riskScore(form.likelihood, form.impact),
        status:"Identified",
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ title:"", department: dept||"", category:"Operational", description:"", likelihood:3, impact:3, mitigationPlan:"", owner: userName||"", reviewDate:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"risks",selected.id), {
        status, lastReviewedAt: serverTimestamp(), lastReviewedBy: userName,
      });
      setModal(null);
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = risks.filter(r => {
    const mc = filterCategory==="All" || r.category===filterCategory;
    const ml = filterLevel==="All" || riskLevel(r.score).label===filterLevel;
    return mc && ml;
  }).sort((a,b) => b.score - a.score);

  const criticalCount = risks.filter(r=>riskLevel(r.score).label==="Critical").length;
  const highCount     = risks.filter(r=>riskLevel(r.score).label==="High").length;
  const mediumCount   = risks.filter(r=>riskLevel(r.score).label==="Medium").length;
  const lowCount      = risks.filter(r=>riskLevel(r.score).label==="Low").length;

  // Build 5x5 matrix
  const matrix = [];
  for (let impact=5; impact>=1; impact--) {
    const row = [];
    for (let likelihood=1; likelihood<=5; likelihood++) {
      const score = riskScore(likelihood, impact);
      const risksHere = risks.filter(r => r.likelihood===likelihood && r.impact===impact);
      row.push({ likelihood, impact, score, count: risksHere.length, risks: risksHere });
    }
    matrix.push(row);
  }

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#854F0B", display:"flex", alignItems:"center", justifyContent:"center", color:"#FAEEDA", fontSize:16 }}>⚡</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Risk management</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.6 · ISO 27001 A.8 · Risk register</div>
          </div>
        </div>
        <button style={S.btn("#854F0B")} onClick={()=>setModal("new")}>+ Identify risk</button>
      </div>

      <div style={{ background:"#fff", borderBottom:"0.5px solid #E0DDD6", padding:"0 20px", display:"flex" }}>
        <button style={S.tab(view==="register")} onClick={()=>setView("register")}>Risk register</button>
        <button style={S.tab(view==="matrix")} onClick={()=>setView("matrix")}>Risk matrix</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Critical", val:criticalCount, color:"#791F1F", bg:"#FCEBEB" },
            { label:"High", val:highCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Medium", val:mediumCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Low", val:lowCount, color:"#0F6E56", bg:"#E1F5EE" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label} risks</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {view === "register" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <select style={{ ...inp, width:200 }} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
                <option value="All">All categories</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select style={{ ...inp, width:160 }} value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
                <option value="All">All levels</option>
                <option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
              <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} risks</span>
            </div>

            <div style={S.card}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 90px 90px 100px 100px", padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:8 }}>
                {["Risk","Category","Score","Level","Status",""].map((h,i)=>(
                  <div key={i} style={{ fontSize:10, fontWeight:500, color:"#888780" }}>{h}</div>
                ))}
              </div>
              {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
              {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No risks recorded.</div>}
              {filtered.map(r => {
                const lvl = riskLevel(r.score);
                const sc = STATUS_CFG[r.status]||STATUS_CFG.Identified;
                return (
                  <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1fr 110px 90px 90px 100px 100px", padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{r.title}</div>
                      <div style={{ fontSize:11, color:"#888780", fontFamily:"monospace" }}>{r.riskId} · {r.department}</div>
                    </div>
                    <div style={{ fontSize:11, color:"#5F5E5A" }}>{r.category}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:lvl.color }}>{r.likelihood} × {r.impact} = {r.score}</div>
                    <div><Badge label={lvl.label} color={lvl.color} bg={lvl.bg} /></div>
                    <div><Badge label={r.status} color={sc.color} bg={sc.bg} /></div>
                    <div>
                      <button style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>{ setSelected(r); setModal("view"); }}>View</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === "matrix" && (
          <div style={S.card}>
            <div style={{ padding:"14px 16px", borderBottom:"0.5px solid #E0DDD6", fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              5 × 5 Risk matrix — Likelihood × Impact
            </div>
            <div style={{ padding:16, overflowX:"auto" }}>
              <div style={{ display:"grid", gridTemplateColumns:"80px repeat(5,1fr)", gap:4, minWidth:520 }}>
                <div></div>
                {LEVELS.map(l => (
                  <div key={l} style={{ textAlign:"center", fontSize:10, color:"#888780", paddingBottom:4 }}>
                    {l} · {LEVEL_LABELS[l]}
                  </div>
                ))}
                {matrix.map((row, ri) => (
                  <>
                    <div key={`label-${ri}`} style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", fontSize:10, color:"#888780", paddingRight:8 }}>
                      {row[0].impact} · {LEVEL_LABELS[row[0].impact]}
                    </div>
                    {row.map(cell => {
                      const lvl = riskLevel(cell.score);
                      return (
                        <div key={`${cell.likelihood}-${cell.impact}`}
                          onClick={() => cell.count>0 && setModal({ type:"cell", risks:cell.risks })}
                          style={{
                            background:lvl.bg, border:`0.5px solid ${lvl.color}33`,
                            borderRadius:6, padding:"10px 6px", textAlign:"center",
                            cursor: cell.count>0 ? "pointer" : "default", minHeight:50,
                          }}>
                          <div style={{ fontSize:14, fontWeight:600, color:lvl.color }}>{cell.score}</div>
                          {cell.count>0 && <div style={{ fontSize:10, color:lvl.color, marginTop:2 }}>{cell.count} risk{cell.count>1?"s":""}</div>}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"center", marginTop:8, fontSize:10, color:"#888780" }}>
                ← Likelihood increases →
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New risk modal */}
      {modal==="new" && (
        <Modal title="Identify new risk" sub="ISO 15189:2022 §8.6 · ISO 27001 A.8" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Risk title" required><input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Category"><select style={inp} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Risk owner" required><input style={inp} value={form.owner} onChange={e=>setForm(p=>({...p,owner:e.target.value}))} /></Field>
            <Field label="Likelihood (1–5)" required>
              <select style={inp} value={form.likelihood} onChange={e=>setForm(p=>({...p,likelihood:Number(e.target.value)}))}>
                {LEVELS.map(l=><option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>
            <Field label="Impact (1–5)" required>
              <select style={inp} value={form.impact} onChange={e=>setForm(p=>({...p,impact:Number(e.target.value)}))}>
                {LEVELS.map(l=><option key={l} value={l}>{l} — {LEVEL_LABELS[l]}</option>)}
              </select>
            </Field>
          </div>
          <div style={{
            background: riskLevel(riskScore(form.likelihood,form.impact)).bg,
            borderRadius:8, padding:"10px 14px", marginBottom:14,
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <span style={{ fontSize:12, color: riskLevel(riskScore(form.likelihood,form.impact)).color, fontWeight:500 }}>
              Risk score: {form.likelihood} × {form.impact} = {riskScore(form.likelihood,form.impact)}
            </span>
            <Badge label={riskLevel(riskScore(form.likelihood,form.impact)).label} color={riskLevel(riskScore(form.likelihood,form.impact)).color} bg="rgba(255,255,255,0.6)" />
          </div>
          <Field label="Risk description" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the risk and its potential consequences…" /></Field>
          <Field label="Mitigation plan" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.mitigationPlan} onChange={e=>setForm(p=>({...p,mitigationPlan:e.target.value}))} placeholder="How will this risk be mitigated or controlled?" /></Field>
          <Field label="Next review date"><input style={inp} type="date" value={form.reviewDate} onChange={e=>setForm(p=>({...p,reviewDate:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#854F0B")} onClick={handleCreate} disabled={saving}>{saving?"Saving…":"Add to register"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.riskId} sub={selected.title} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            {[
              { label:"Department", val:selected.department },
              { label:"Category", val:selected.category },
              { label:"Score", val:`${selected.likelihood} × ${selected.impact} = ${selected.score}` },
              { label:"Level", val:<Badge label={riskLevel(selected.score).label} color={riskLevel(selected.score).color} bg={riskLevel(selected.score).bg} /> },
              { label:"Status", val:<Badge label={selected.status} color={STATUS_CFG[selected.status]?.color} bg={STATUS_CFG[selected.status]?.bg} /> },
              { label:"Owner", val:selected.owner },
              { label:"Description", val:selected.description },
              { label:"Mitigation plan", val:selected.mitigationPlan },
              { label:"Identified", val:fmtDate(selected.createdAt) },
              { label:"Next review", val:selected.reviewDate||"—" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: ["Description","Mitigation plan"].includes(f.label)?"1/-1":"auto" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>
          {isQuality && (
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
              {Object.keys(STATUS_CFG).filter(s=>s!==selected.status).map(s => (
                <button key={s} style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>updateStatus(s)}>
                  Mark "{s}"
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Matrix cell modal */}
      {modal?.type==="cell" && (
        <Modal title={`${modal.risks.length} risk(s) in this cell`} onClose={()=>setModal(null)}>
          {modal.risks.map(r => (
            <div key={r.id} style={{ padding:"8px 10px", background:"#F7F6F2", borderRadius:7, marginBottom:6 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{r.title}</div>
              <div style={{ fontSize:11, color:"#888780" }}>{r.riskId} · {r.department}</div>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}
