// Biosafety.jsx
// MBL QMS — Biosafety Log
// ISO 15189:2022 §6.6 — Biosafety, PPE compliance, waste management, spills

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  "Quality","Biomedical Engineering","Housekeeping","Collection","Sample Collection Centre",
];

const ENTRY_TYPES = ["Incident","PPE compliance check","Waste disposal","Spill","Biosafety cabinet check"];
const INCIDENT_TYPES = ["Needle-stick injury","Sample spill","Splash exposure","Sharps injury","Chemical exposure","Other"];
const SEVERITY = ["Minor","Moderate","Severe"];
const WASTE_CATEGORIES = ["Yellow (biohazard)","Red (plastics)","White (sharps)","Blue (glassware)","Black (general)"];

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

const TYPE_CFG = {
  Incident: { color:"#A32D2D", bg:"#FCEBEB", icon:"🚨" },
  "PPE compliance check": { color:"#0F6E56", bg:"#E1F5EE", icon:"🥽" },
  "Waste disposal": { color:"#185FA5", bg:"#E6F1FB", icon:"🗑" },
  Spill: { color:"#854F0B", bg:"#FAEEDA", icon:"💧" },
  "Biosafety cabinet check": { color:"#534AB7", bg:"#EEEDFE", icon:"🧫" },
};

const STATUS_CFG = {
  Open: { color:"#A32D2D", bg:"#FCEBEB" },
  "Action taken": { color:"#854F0B", bg:"#FAEEDA" },
  Closed: { color:"#0F6E56", bg:"#E1F5EE" },
};

export default function Biosafety({ role, userName, dept }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterType, setFilterType] = useState("All");

  const canClose = ["Quality Manager","HK Incharge","Managing Director","BME"].includes(role);

  const [form, setForm] = useState({
    entryType:"PPE compliance check", department: dept||"",
    incidentType:"", severity:"Minor", description:"",
    wasteCategory: WASTE_CATEGORIES[0], wasteQuantity:"",
    cabinetStatus:"Pass", ppeCompliant:true, ppeNotes:"",
    actionTaken:"", reportedBy: userName||"", date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"biosafetyLog"), orderBy("createdAt","desc")));
      setEntries(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.reportedBy || !form.department) { alert("Please fill all required fields."); return; }
    if (form.entryType==="Incident" && !form.description) { alert("Please describe the incident."); return; }
    setSaving(true);
    try {
      const seq = entries.length + 1;
      const entryId = `BIO-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      await addDoc(collection(db,"biosafetyLog"), {
        ...form, entryId,
        status: form.entryType==="Incident" || form.entryType==="Spill" ? "Open" : "Closed",
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm(p => ({ ...p, description:"", actionTaken:"", wasteQuantity:"", ppeNotes:"" }));
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateDoc(doc(db,"biosafetyLog",selected.id), {
        status, statusUpdatedBy: userName, statusUpdatedAt: serverTimestamp(),
      });
      setModal(null);
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = entries.filter(e => filterType==="All" || e.entryType===filterType);

  const incidentCount = entries.filter(e=>e.entryType==="Incident").length;
  const spillCount = entries.filter(e=>e.entryType==="Spill").length;
  const openCount = entries.filter(e=>e.status==="Open").length;
  const ppeNonCompliant = entries.filter(e=>e.entryType==="PPE compliance check" && !e.ppeCompliant).length;
  const cabinetFails = entries.filter(e=>e.entryType==="Biosafety cabinet check" && e.cabinetStatus==="Fail").length;

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#A32D2D", display:"flex", alignItems:"center", justifyContent:"center", color:"#FCEBEB", fontSize:16 }}>🦠</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Biosafety log</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §6.6 · Incidents, PPE, waste, spills</div>
          </div>
        </div>
        <button style={S.btn("#A32D2D")} onClick={()=>setModal("new")}>+ New entry</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Incidents", val:incidentCount, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Spills", val:spillCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Open items", val:openCount, color:"#791F1F", bg:"#FCEBEB" },
            { label:"PPE non-compliant", val:ppeNonCompliant, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Cabinet check fails", val:cabinetFails, color:"#534AB7", bg:"#EEEDFE" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        {openCount>0 && (
          <div style={{ background:"#FCEBEB", border:"0.5px solid #E24B4A", borderRadius:8, padding:"10px 14px", marginBottom:14, fontSize:12, color:"#791F1F" }}>
            ⚠ {openCount} biosafety item(s) require follow-up action.
          </div>
        )}

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:220 }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="All">All entry types</option>
            {ENTRY_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} entries</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No biosafety entries logged.</div>}
          {filtered.map(e => {
            const tc = TYPE_CFG[e.entryType]||TYPE_CFG.Incident;
            const sc = STATUS_CFG[e.status]||STATUS_CFG.Closed;
            return (
              <div key={e.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{e.entryId}</span>
                      <span>{tc.icon}</span>
                      <Badge label={e.entryType} color={tc.color} bg={tc.bg} />
                      {e.severity && <Badge label={e.severity} color={e.severity==="Severe"?"#791F1F":e.severity==="Moderate"?"#854F0B":"#185FA5"} bg={e.severity==="Severe"?"#FCEBEB":e.severity==="Moderate"?"#FAEEDA":"#E6F1FB"} />}
                      <Badge label={e.status} color={sc.color} bg={sc.bg} />
                    </div>
                    <div style={{ fontSize:12, color:"#2C2C2A", marginTop:5 }}>
                      {e.entryType==="Incident" && e.description}
                      {e.entryType==="Spill" && e.description}
                      {e.entryType==="PPE compliance check" && (e.ppeCompliant ? "PPE compliant" : `PPE non-compliant — ${e.ppeNotes}`)}
                      {e.entryType==="Waste disposal" && `${e.wasteCategory} — ${e.wasteQuantity}`}
                      {e.entryType==="Biosafety cabinet check" && `Cabinet check: ${e.cabinetStatus}`}
                    </div>
                    <div style={{ fontSize:11, color:"#B4B2A9", marginTop:3 }}>
                      {e.department} · {fmtDate(e.createdAt)} · by {e.reportedBy}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {e.status!=="Closed" && canClose && (
                      <button style={S.btn("#0F6E56")} onClick={()=>{ setSelected(e); setModal("update"); }}>Update status</button>
                    )}
                    <button style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>{ setSelected(e); setModal("view"); }}>View</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New entry modal */}
      {modal==="new" && (
        <Modal title="New biosafety entry" sub="ISO 15189:2022 §6.6" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Entry type" required><select style={inp} value={form.entryType} onChange={e=>setForm(p=>({...p,entryType:e.target.value}))}>{ENTRY_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Date"><input style={inp} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} /></Field>
            <Field label="Reported by" required><input style={inp} value={form.reportedBy} onChange={e=>setForm(p=>({...p,reportedBy:e.target.value}))} /></Field>
          </div>

          {/* Incident / Spill fields */}
          {(form.entryType==="Incident" || form.entryType==="Spill") && (
            <>
              {form.entryType==="Incident" && (
                <Field label="Incident type" required><select style={inp} value={form.incidentType} onChange={e=>setForm(p=>({...p,incidentType:e.target.value}))}><option value="">Select type</option>{INCIDENT_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
              )}
              <Field label="Severity"><select style={inp} value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))}>{SEVERITY.map(s=><option key={s}>{s}</option>)}</select></Field>
              <Field label="Description" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe what happened, where, and who was involved…" /></Field>
              <Field label="Immediate action taken"><textarea style={{...inp,resize:"vertical"}} rows={2} value={form.actionTaken} onChange={e=>setForm(p=>({...p,actionTaken:e.target.value}))} placeholder="First aid given, area cleaned, PPE used…" /></Field>
            </>
          )}

          {/* PPE check fields */}
          {form.entryType==="PPE compliance check" && (
            <>
              <Field label="PPE compliance">
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setForm(p=>({...p,ppeCompliant:true}))} style={{
                    flex:1, padding:"8px", borderRadius:7, fontSize:12, cursor:"pointer",
                    border: form.ppeCompliant ? "1.5px solid #0F6E56":"0.5px solid #D3D1C7",
                    background: form.ppeCompliant ? "#E1F5EE":"#fff", color: form.ppeCompliant ? "#085041":"#5F5E5A",
                  }}>✓ Compliant</button>
                  <button onClick={()=>setForm(p=>({...p,ppeCompliant:false}))} style={{
                    flex:1, padding:"8px", borderRadius:7, fontSize:12, cursor:"pointer",
                    border: !form.ppeCompliant ? "1.5px solid #A32D2D":"0.5px solid #D3D1C7",
                    background: !form.ppeCompliant ? "#FCEBEB":"#fff", color: !form.ppeCompliant ? "#791F1F":"#5F5E5A",
                  }}>✕ Non-compliant</button>
                </div>
              </Field>
              <Field label="Notes"><textarea style={{...inp,resize:"vertical"}} rows={2} value={form.ppeNotes} onChange={e=>setForm(p=>({...p,ppeNotes:e.target.value}))} placeholder="Which PPE items, who was checked…" /></Field>
            </>
          )}

          {/* Waste disposal fields */}
          {form.entryType==="Waste disposal" && (
            <>
              <Field label="Waste category" required><select style={inp} value={form.wasteCategory} onChange={e=>setForm(p=>({...p,wasteCategory:e.target.value}))}>{WASTE_CATEGORIES.map(w=><option key={w}>{w}</option>)}</select></Field>
              <Field label="Quantity"><input style={inp} value={form.wasteQuantity} onChange={e=>setForm(p=>({...p,wasteQuantity:e.target.value}))} placeholder="e.g. 5 kg, 2 bags" /></Field>
            </>
          )}

          {/* Cabinet check fields */}
          {form.entryType==="Biosafety cabinet check" && (
            <Field label="Cabinet status">
              <div style={{ display:"flex", gap:8 }}>
                {["Pass","Fail"].map(s => (
                  <button key={s} onClick={()=>setForm(p=>({...p,cabinetStatus:s}))} style={{
                    flex:1, padding:"8px", borderRadius:7, fontSize:12, cursor:"pointer",
                    border: form.cabinetStatus===s ? `1.5px solid ${s==="Pass"?"#0F6E56":"#A32D2D"}`:"0.5px solid #D3D1C7",
                    background: form.cabinetStatus===s ? (s==="Pass"?"#E1F5EE":"#FCEBEB"):"#fff",
                    color: form.cabinetStatus===s ? (s==="Pass"?"#085041":"#791F1F"):"#5F5E5A",
                  }}>{s}</button>
                ))}
              </div>
            </Field>
          )}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#A32D2D")} onClick={handleSubmit} disabled={saving}>{saving?"Saving…":"Save entry"}</button>
          </div>
        </Modal>
      )}

      {/* Update status modal */}
      {modal==="update" && selected && (
        <Modal title={`Update status — ${selected.entryId}`} onClose={()=>setModal(null)}>
          <div style={{ display:"flex", gap:8 }}>
            {Object.keys(STATUS_CFG).filter(s=>s!==selected.status).map(s => (
              <button key={s} style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7", flex:1}}
                onClick={()=>updateStatus(s)} disabled={saving}>Mark "{s}"</button>
            ))}
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.entryId} sub={selected.entryType} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {Object.entries(selected).filter(([k]) => !["id","createdAt","createdByEmail","entryId","entryType"].includes(k) && selected[k]!==""&&selected[k]!==undefined).map(([k,v],i) => (
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{k}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{typeof v==="boolean" ? (v?"Yes":"No") : (v?.toDate ? fmtDate(v) : String(v))}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
