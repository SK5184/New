// CorrectedReports.jsx
// MBL QMS — Report Errors / Corrected Reports
// ISO 15189:2022 §7.8 — Reporting / KPI 7.5.8 (corrected reports rate)

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../../firebase";

const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
];

const ERROR_TYPES = ["Transcription error","Wrong patient/sample mix-up","Calculation error","Unit error","Reference range error","Missing parameter","Instrument error","Other"];
const DETECTED_BY = ["Self-review","Physician query","Patient query","Internal audit","QC review","Supervisor review"];
const SEVERITY = ["Minor","Major","Critical"];

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

const STATUS_CFG = {
  Reported: { color:"#A32D2D", bg:"#FCEBEB" },
  "Corrected report issued": { color:"#185FA5", bg:"#E6F1FB" },
  "CAPA linked": { color:"#534AB7", bg:"#EEEDFE" },
  Closed: { color:"#0F6E56", bg:"#E1F5EE" },
};

export default function CorrectedReports({ role, userName, dept }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterDept, setFilterDept] = useState("All");

  const isQuality = ["Quality Manager","Quality Executive","Managing Director","Deputy Director","HOD"].includes(role);

  const [form, setForm] = useState({
    patientId:"", testName:"", department: dept||"",
    errorType: ERROR_TYPES[0], severity:"Minor", detectedBy: DETECTED_BY[0],
    originalValue:"", correctedValue:"", description:"",
    reportedBy: userName||"", date: today(),
  });

  const [correctionForm, setCorrectionForm] = useState({ correctedReportNumber:"", notifiedPhysician:false, notifiedAt:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"reportRecalls"), orderBy("createdAt","desc")));
      setRecords(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.testName || !form.description || !form.reportedBy) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = records.length + 1;
      const reportId = `ERR-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"reportRecalls"), {
        ...form, reportId, status:"Reported", month: monthKey(),
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm(p => ({ ...p, patientId:"", testName:"", originalValue:"", correctedValue:"", description:"" }));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const issueCorrectedReport = async () => {
    if (!selected || !correctionForm.correctedReportNumber) { alert("Please enter the corrected report number."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db,"reportRecalls",selected.id), {
        status:"Corrected report issued",
        correctedReportNumber: correctionForm.correctedReportNumber,
        notifiedPhysician: correctionForm.notifiedPhysician,
        notifiedAt: correctionForm.notifiedPhysician ? serverTimestamp() : null,
        issuedBy: userName, issuedAt: serverTimestamp(),
      });
      setModal(null);
      setCorrectionForm({ correctedReportNumber:"", notifiedPhysician:false, notifiedAt:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const closeRecord = async (r) => {
    if (!window.confirm(`Close error record ${r.reportId}?`)) return;
    await updateDoc(doc(db,"reportRecalls",r.id), { status:"Closed", closedBy: userName, closedAt: serverTimestamp() });
    load();
  };

  const filtered = records.filter(r => filterDept==="All" || r.department===filterDept);

  // KPI 7.5.8 — corrected reports as % of total (this month)
  const currentMonth = monthKey();
  const monthRecords = records.filter(r=>r.month===currentMonth);
  const reportedCount = records.filter(r=>r.status==="Reported").length;
  const issuedCount = records.filter(r=>["Corrected report issued","CAPA linked","Closed"].includes(r.status)).length;
  const criticalCount = records.filter(r=>r.severity==="Critical").length;

  const errorByType = {};
  records.forEach(r => { errorByType[r.errorType] = (errorByType[r.errorType]||0)+1; });

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#A32D2D", display:"flex", alignItems:"center", justifyContent:"center", color:"#FCEBEB", fontSize:16 }}>📝</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Report errors / corrected reports</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §7.8 · KPI 7.5.8</div>
          </div>
        </div>
        <button style={S.btn("#A32D2D")} onClick={()=>setModal("new")}>+ Report error</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"This month (KPI 7.5.8)", val:monthRecords.length, color:"#534AB7", bg:"#EEEDFE" },
            { label:"Pending correction", val:reportedCount, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Corrected & issued", val:issuedCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Critical errors", val:criticalCount, color:"#791F1F", bg:"#FCEBEB" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {/* Error type breakdown */}
        {Object.keys(errorByType).length>0 && (
          <div style={S.card}>
            <div style={{ padding:"11px 16px", borderBottom:"0.5px solid #E0DDD6", fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              Errors by type — all time
            </div>
            {Object.entries(errorByType).sort((a,b)=>b[1]-a[1]).map(([type,count]) => (
              <div key={type} style={{ padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:200, fontSize:12, color:"#2C2C2A" }}>{type}</div>
                <div style={{ flex:1, height:8, background:"#F1EFE8", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${(count/records.length*100)}%`, height:"100%", background:"#185FA5" }} />
                </div>
                <div style={{ fontSize:11, color:"#185FA5", fontWeight:500, width:30, textAlign:"right" }}>{count}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:220 }} value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
            <option value="All">All departments</option>
            {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} records</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No report errors logged.</div>}
          {filtered.map(r => {
            const sc = STATUS_CFG[r.status]||STATUS_CFG.Reported;
            return (
              <div key={r.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{r.reportId}</span>
                      <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>{r.testName}</div>
                      <Badge label={r.errorType} color="#534AB7" bg="#EEEDFE" />
                      <Badge label={r.severity} color={r.severity==="Critical"?"#791F1F":r.severity==="Major"?"#854F0B":"#185FA5"} bg={r.severity==="Critical"?"#FCEBEB":r.severity==="Major"?"#FAEEDA":"#E6F1FB"} />
                      <Badge label={r.status} color={sc.color} bg={sc.bg} />
                    </div>
                    <div style={{ fontSize:12, color:"#2C2C2A", marginTop:5 }}>{r.description}</div>
                    {(r.originalValue || r.correctedValue) && (
                      <div style={{ fontSize:11, color:"#5F5E5A", marginTop:3 }}>
                        Original: <span style={{ textDecoration:"line-through", color:"#A32D2D" }}>{r.originalValue}</span>
                        {" → "}Corrected: <span style={{ color:"#0F6E56", fontWeight:500 }}>{r.correctedValue}</span>
                      </div>
                    )}
                    <div style={{ fontSize:11, color:"#B4B2A9", marginTop:3 }}>
                      {r.department} · Detected by: {r.detectedBy} · {fmtDate(r.createdAt)} · by {r.reportedBy}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {r.status==="Reported" && isQuality && (
                      <button style={S.btn("#185FA5")} onClick={()=>{ setSelected(r); setModal("issue"); }}>Issue correction</button>
                    )}
                    {r.status==="Corrected report issued" && isQuality && (
                      <button style={S.btn("#0F6E56")} onClick={()=>closeRecord(r)}>Close</button>
                    )}
                    <button style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>{ setSelected(r); setModal("view"); }}>View</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New error modal */}
      {modal==="new" && (
        <Modal title="Report a result error" sub="ISO 15189:2022 §7.8" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Patient ID / sample ID"><input style={inp} value={form.patientId} onChange={e=>setForm(p=>({...p,patientId:e.target.value}))} /></Field>
            <Field label="Test name" required><input style={inp} value={form.testName} onChange={e=>setForm(p=>({...p,testName:e.target.value}))} placeholder="e.g. Complete Blood Count" /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Error type" required><select style={inp} value={form.errorType} onChange={e=>setForm(p=>({...p,errorType:e.target.value}))}>{ERROR_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Severity"><select style={inp} value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))}>{SEVERITY.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Detected by"><select style={inp} value={form.detectedBy} onChange={e=>setForm(p=>({...p,detectedBy:e.target.value}))}>{DETECTED_BY.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Original (incorrect) value"><input style={inp} value={form.originalValue} onChange={e=>setForm(p=>({...p,originalValue:e.target.value}))} /></Field>
            <Field label="Corrected value"><input style={inp} value={form.correctedValue} onChange={e=>setForm(p=>({...p,correctedValue:e.target.value}))} /></Field>
            <Field label="Date"><input style={inp} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Reported by" required><input style={inp} value={form.reportedBy} onChange={e=>setForm(p=>({...p,reportedBy:e.target.value}))} /></Field>
          </div>
          <Field label="Description" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the error and how it was discovered…" /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#A32D2D")} onClick={handleSubmit} disabled={saving}>{saving?"Saving…":"Submit"}</button>
          </div>
        </Modal>
      )}

      {/* Issue correction modal */}
      {modal==="issue" && selected && (
        <Modal title={`Issue corrected report — ${selected.reportId}`} sub={selected.testName} onClose={()=>setModal(null)}>
          <div style={{ background:"#F7F6F2", borderRadius:8, padding:"10px 12px", marginBottom:14, fontSize:12 }}>
            <div style={{ color:"#888780" }}>Original → Corrected</div>
            <div style={{ marginTop:4 }}>
              <span style={{ textDecoration:"line-through", color:"#A32D2D" }}>{selected.originalValue||"—"}</span>
              {" → "}<span style={{ color:"#0F6E56", fontWeight:500 }}>{selected.correctedValue||"—"}</span>
            </div>
          </div>
          <Field label="Corrected report number" required><input style={inp} value={correctionForm.correctedReportNumber} onChange={e=>setCorrectionForm(p=>({...p,correctedReportNumber:e.target.value}))} placeholder="New report reference number" /></Field>
          <label style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#E6F1FB", borderRadius:8, marginBottom:14, cursor:"pointer" }}>
            <input type="checkbox" checked={correctionForm.notifiedPhysician} onChange={e=>setCorrectionForm(p=>({...p,notifiedPhysician:e.target.checked}))} style={{ accentColor:"#185FA5" }} />
            <span style={{ fontSize:12, color:"#185FA5" }}>Referring physician has been notified of this correction</span>
          </label>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#185FA5")} onClick={issueCorrectedReport} disabled={saving}>{saving?"Saving…":"Issue corrected report"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.reportId} sub={selected.testName} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              { label:"Status", val:<Badge label={selected.status} color={STATUS_CFG[selected.status]?.color} bg={STATUS_CFG[selected.status]?.bg} /> },
              { label:"Patient/sample ID", val:selected.patientId||"—" },
              { label:"Department", val:selected.department },
              { label:"Error type", val:selected.errorType },
              { label:"Severity", val:selected.severity },
              { label:"Detected by", val:selected.detectedBy },
              { label:"Original value", val:selected.originalValue||"—" },
              { label:"Corrected value", val:selected.correctedValue||"—" },
              { label:"Description", val:selected.description },
              { label:"Reported by", val:`${selected.reportedBy} · ${fmtDate(selected.createdAt)}` },
              { label:"Corrected report no.", val:selected.correctedReportNumber||"—" },
              { label:"Physician notified", val:selected.notifiedPhysician?"Yes":"No" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: f.label==="Description"?"1/-1":"auto" }}>
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
