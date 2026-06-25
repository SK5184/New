// Audit.jsx
// MBL QMS — Internal Audit
// ISO 15189:2022 §8.8 — Internal audits
// Audit schedule, department-wise checklist, findings, CAPA link, closure

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
];

const CHECKLIST_TEMPLATE = [
  { clause:"§5.5", item:"Approved supplier list maintained and current" },
  { clause:"§6.2", item:"Staff training records up to date" },
  { clause:"§6.4", item:"Equipment calibration current, no overdue items" },
  { clause:"§7.2", item:"Sample collection procedures followed correctly" },
  { clause:"§7.3", item:"IQC performed and within acceptable limits" },
  { clause:"§7.5", item:"Quality indicators recorded for the period" },
  { clause:"§8.3", item:"Controlled documents current, no obsolete copies in use" },
  { clause:"§8.4", item:"NCRs and CAPAs tracked and closed within timeline" },
  { clause:"§8.7", item:"Customer feedback and complaints reviewed" },
];

const FINDING_TYPES = ["Observation","Minor NC","Major NC","OFI"];
const STATUS_CFG = {
  Scheduled: { color:"#888780", bg:"#F1EFE8" },
  "In progress": { color:"#854F0B", bg:"#FAEEDA" },
  "Findings open": { color:"#A32D2D", bg:"#FCEBEB" },
  Closed: { color:"#0F6E56", bg:"#E1F5EE" },
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

export default function Audit({ role, userName }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [findingForm, setFindingForm] = useState({ clause:"", type:"Observation", description:"" });

  const isQuality = ["Quality Manager","Quality Executive","Managing Director","Deputy Director"].includes(role);

  const [form, setForm] = useState({
    title:"", department:"", auditDate: today(), auditor: userName||"",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"audits"), orderBy("createdAt","desc")));
      setAudits(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSchedule = async () => {
    if (!form.title || !form.department || !form.auditDate) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = audits.length + 1;
      const auditNumber = `AUD-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"audits"), {
        ...form, auditNumber, status:"Scheduled",
        checklist: CHECKLIST_TEMPLATE.map(c => ({ ...c, result:"", remarks:"" })),
        findings:[],
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ title:"", department:"", auditDate: today(), auditor: userName||"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const openChecklist = (a) => {
    setSelected(a);
    setChecklist(a.checklist || CHECKLIST_TEMPLATE.map(c => ({ ...c, result:"", remarks:"" })));
    setModal("checklist");
  };

  const updateChecklistItem = (idx, field, value) => {
    setChecklist(prev => prev.map((c,i) => i===idx ? { ...c, [field]: value } : c));
  };

  const saveChecklist = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"audits",selected.id), {
        checklist, status:"In progress",
      });
      setModal(null);
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const addFinding = async () => {
    if (!selected || !findingForm.description) { alert("Please describe the finding."); return; }
    setSaving(true);
    try {
      const findings = [...(selected.findings||[]), {
        ...findingForm, raisedAt: new Date().toISOString(), raisedBy: userName, status:"Open",
      }];
      await updateDoc(doc(db,"audits",selected.id), {
        findings, status: findings.some(f=>f.status==="Open") ? "Findings open" : selected.status,
      });
      setFindingForm({ clause:"", type:"Observation", description:"" });
      setSelected(p => ({ ...p, findings }));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const closeFinding = async (idx) => {
    const findings = [...(selected.findings||[])];
    findings[idx] = { ...findings[idx], status:"Closed", closedAt: new Date().toISOString(), closedBy: userName };
    const allClosed = findings.every(f=>f.status==="Closed");
    await updateDoc(doc(db,"audits",selected.id), {
      findings, status: allClosed ? "Closed" : "Findings open",
    });
    setSelected(p => ({ ...p, findings }));
    load();
  };

  const closeAudit = async (a) => {
    if (!window.confirm(`Close audit ${a.auditNumber}?`)) return;
    await updateDoc(doc(db,"audits",a.id), { status:"Closed", closedAt: serverTimestamp(), closedBy: userName });
    load();
  };

  const scheduledCount = audits.filter(a=>a.status==="Scheduled").length;
  const progressCount  = audits.filter(a=>a.status==="In progress").length;
  const findingsCount  = audits.filter(a=>a.status==="Findings open").length;
  const closedCount    = audits.filter(a=>a.status==="Closed").length;

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#534AB7", display:"flex", alignItems:"center", justifyContent:"center", color:"#EEEDFE", fontSize:16 }}>📋</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Internal audit</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.8 · Schedule · checklist · findings</div>
          </div>
        </div>
        {isQuality && <button style={S.btn("#534AB7")} onClick={()=>setModal("schedule")}>+ Schedule audit</button>}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Scheduled", val:scheduledCount, color:"#888780", bg:"#F1EFE8" },
            { label:"In progress", val:progressCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Findings open", val:findingsCount, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Closed", val:closedCount, color:"#0F6E56", bg:"#E1F5EE" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && audits.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No audits scheduled yet.</div>}
          {audits.map(a => {
            const sc = STATUS_CFG[a.status]||STATUS_CFG.Scheduled;
            const openFindings = (a.findings||[]).filter(f=>f.status==="Open").length;
            return (
              <div key={a.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{a.auditNumber}</span>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{a.title}</div>
                      <Badge label={a.status} color={sc.color} bg={sc.bg} />
                      {openFindings>0 && <Badge label={`${openFindings} open finding${openFindings>1?"s":""}`} color="#791F1F" bg="#FCEBEB" />}
                    </div>
                    <div style={{ fontSize:11, color:"#888780", marginTop:4 }}>
                      {a.department} · Auditor: {a.auditor} · Date: {a.auditDate}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button style={S.btn("#534AB7")} onClick={()=>openChecklist(a)}>Checklist</button>
                    {a.status==="Findings open" && a.findings?.every(f=>f.status==="Closed") && (
                      <button style={S.btn("#0F6E56")} onClick={()=>closeAudit(a)}>Close audit</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule modal */}
      {modal==="schedule" && (
        <Modal title="Schedule internal audit" sub="ISO 15189:2022 §8.8" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Audit title" required><input style={inp} value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="e.g. Q3 2025 Internal Audit" /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Audit date" required><input style={inp} type="date" value={form.auditDate} onChange={e=>setForm(p=>({...p,auditDate:e.target.value}))} /></Field>
            <Field label="Auditor" required><input style={inp} value={form.auditor} onChange={e=>setForm(p=>({...p,auditor:e.target.value}))} /></Field>
          </div>
          <div style={{ background:"#E6F1FB", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#185FA5" }}>
            ℹ A standard 9-point checklist covering ISO 15189 clauses will be created automatically.
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#534AB7")} onClick={handleSchedule} disabled={saving}>{saving?"Saving…":"Schedule audit"}</button>
          </div>
        </Modal>
      )}

      {/* Checklist modal */}
      {modal==="checklist" && selected && (
        <Modal title={`Audit checklist — ${selected.auditNumber}`} sub={`${selected.title} · ${selected.department}`} onClose={()=>setModal(null)} wide>
          <div style={{ marginBottom:16 }}>
            {checklist.map((c,i) => (
              <div key={i} style={{ padding:"10px 0", borderBottom: i<checklist.length-1 ? "0.5px solid #F1EFE8" : "none" }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:10, color:"#888780", fontFamily:"monospace", flexShrink:0, marginTop:2 }}>{c.clause}</span>
                  <div style={{ fontSize:12, color:"#2C2C2A", flex:1 }}>{c.item}</div>
                </div>
                <div style={{ display:"flex", gap:8, paddingLeft:38 }}>
                  {["Conform","Non-conform","N/A"].map(opt => (
                    <button key={opt} onClick={()=>updateChecklistItem(i,"result",opt)} style={{
                      padding:"4px 10px", borderRadius:6, fontSize:11, cursor:"pointer",
                      border: c.result===opt ? "1.5px solid #0F6E56" : "0.5px solid #D3D1C7",
                      background: c.result===opt ? (opt==="Non-conform"?"#FCEBEB":"#E1F5EE") : "#fff",
                      color: c.result===opt ? (opt==="Non-conform"?"#791F1F":"#085041") : "#5F5E5A",
                    }}>{opt}</button>
                  ))}
                  <input style={{ ...inp, flex:1 }} placeholder="Remarks…" value={c.remarks} onChange={e=>updateChecklistItem(i,"remarks",e.target.value)} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Findings ({(selected.findings||[]).length})</div>
          {(selected.findings||[]).map((f,i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"8px 10px", background:"#F7F6F2", borderRadius:7, marginBottom:6 }}>
              <Badge label={f.type} color={f.type==="Major NC"?"#791F1F":f.type==="Minor NC"?"#854F0B":"#185FA5"} bg={f.type==="Major NC"?"#FCEBEB":f.type==="Minor NC"?"#FAEEDA":"#E6F1FB"} />
              <div style={{ flex:1, fontSize:12, color:"#2C2C2A" }}>{f.description}{f.clause && <span style={{ color:"#888780", fontSize:10 }}> ({f.clause})</span>}</div>
              {f.status==="Open" ? (
                <button onClick={()=>closeFinding(i)} style={{ padding:"3px 8px", background:"#E1F5EE", border:"0.5px solid #5DCAA5", borderRadius:6, fontSize:10, cursor:"pointer", color:"#085041" }}>Close</button>
              ) : (
                <Badge label="Closed" color="#085041" bg="#E1F5EE" />
              )}
            </div>
          ))}

          {isQuality && (
            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <select style={{ ...inp, width:100 }} value={findingForm.type} onChange={e=>setFindingForm(p=>({...p,type:e.target.value}))}>
                {FINDING_TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
              <input style={{ ...inp, width:80 }} placeholder="Clause" value={findingForm.clause} onChange={e=>setFindingForm(p=>({...p,clause:e.target.value}))} />
              <input style={{ ...inp, flex:1 }} placeholder="Describe finding…" value={findingForm.description} onChange={e=>setFindingForm(p=>({...p,description:e.target.value}))} />
              <button style={S.btn("#A32D2D")} onClick={addFinding} disabled={saving}>+ Add</button>
            </div>
          )}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:16 }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Close</button>
            <button style={S.btn("#534AB7")} onClick={saveChecklist} disabled={saving}>{saving?"Saving…":"Save checklist"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
