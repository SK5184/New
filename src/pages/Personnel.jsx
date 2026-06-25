// Personnel.jsx
// MBL QMS — Personnel / Employee Master
// ISO 15189:2022 §6.2 — Personnel records, qualifications, licenses

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const DEPARTMENTS = [
  "Microbiology","Serology","Histopathology & Cytopathology","Flow Cytometry","Cytogenetics",
  "Biochemistry","Haematology","Clinical Pathology","Molecular Biology","Molecular Genetics",
  "Quality","Human Resource","Biomedical Engineering","Purchase","Maintenance","Housekeeping",
  "Information Technology","Kitchen","Security","Collection","Front Office","Back Office",
  "Sample Collection Centre","Call Centre","Accounts","Administration","Design","Marketing",
  "ERP Administration",
];

const QUALIFICATION_TYPES = ["Degree","Diploma","Certification","License"];
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

export default function Personnel({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterDept, setFilterDept] = useState("All");
  const [search, setSearch] = useState("");

  const isHR = ["HRM","HRE","Managing Director","Admin","Assistant Admin"].includes(role) || dept==="Human Resource" || dept==="ERP Administration";

  const [form, setForm] = useState({
    fullName:"", empId:"", department:"", designation:"",
    dateOfJoining: today(), email:"", phone:"",
    qualifications:[], licenses:[],
  });

  const [qualForm, setQualForm] = useState({ type:"Degree", title:"", institution:"", year:"" });
  const [licForm, setLicForm] = useState({ name:"", number:"", issuedDate:"", expiryDate:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"employees"), orderBy("createdAt","desc")));
      setEmployees(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.fullName || !form.empId || !form.department) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      await addDoc(collection(db,"employees"), {
        ...form, qualifications:[], licenses:[],
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ fullName:"", empId:"", department:"", designation:"", dateOfJoining: today(), email:"", phone:"", qualifications:[], licenses:[] });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const addQualification = async () => {
    if (!selected || !qualForm.title) return;
    setSaving(true);
    try {
      const quals = [...(selected.qualifications||[]), qualForm];
      await updateDoc(doc(db,"employees",selected.id), { qualifications: quals });
      setSelected(p => ({...p, qualifications: quals}));
      setQualForm({ type:"Degree", title:"", institution:"", year:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const addLicense = async () => {
    if (!selected || !licForm.name) return;
    setSaving(true);
    try {
      const lics = [...(selected.licenses||[]), licForm];
      await updateDoc(doc(db,"employees",selected.id), { licenses: lics });
      setSelected(p => ({...p, licenses: lics}));
      setLicForm({ name:"", number:"", issuedDate:"", expiryDate:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const filtered = employees.filter(e => {
    const md = filterDept==="All" || e.department===filterDept;
    const mq = !search || e.fullName?.toLowerCase().includes(search.toLowerCase()) || e.empId?.toLowerCase().includes(search.toLowerCase());
    return md && mq;
  });

  // License expiry check
  let expiringLicenses = 0, expiredLicenses = 0;
  employees.forEach(e => (e.licenses||[]).forEach(l => {
    const d = daysUntil(l.expiryDate);
    if (d !== null) {
      if (d < 0) expiredLicenses++;
      else if (d <= 60) expiringLicenses++;
    }
  }));

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#185FA5", display:"flex", alignItems:"center", justifyContent:"center", color:"#E6F1FB", fontSize:16 }}>👤</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Personnel</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §6.2 · Employee master & qualifications</div>
          </div>
        </div>
        {isHR && <button style={S.btn("#185FA5")} onClick={()=>setModal("new")}>+ Add employee</button>}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Total employees", val:employees.length, color:"#2C2C2A", bg:"#F7F6F2" },
            { label:"Licenses expiring (60d)", val:expiringLicenses, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Licenses expired", val:expiredLicenses, color:"#A32D2D", bg:"#FCEBEB" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <input style={{ ...inp, width:200 }} placeholder="Search name or employee ID…" value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={{ ...inp, width:220 }} value={filterDept} onChange={e=>setFilterDept(e.target.value)}>
            <option value="All">All departments</option>
            {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} employees</span>
        </div>

        <div style={S.card}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 150px 150px 120px 110px", padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:8 }}>
            {["Name / ID","Department","Designation","Joined","Records"].map((h,i)=>(
              <div key={i} style={{ fontSize:10, fontWeight:500, color:"#888780" }}>{h}</div>
            ))}
          </div>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No employees found.</div>}
          {filtered.map(e => {
            const hasExpiring = (e.licenses||[]).some(l => { const d=daysUntil(l.expiryDate); return d!==null && d<=60; });
            return (
              <div key={e.id} style={{ display:"grid", gridTemplateColumns:"1fr 150px 150px 120px 110px", padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{e.fullName}</div>
                  <div style={{ fontSize:11, color:"#888780", fontFamily:"monospace" }}>{e.empId}</div>
                </div>
                <div style={{ fontSize:11, color:"#5F5E5A" }}>{e.department}</div>
                <div style={{ fontSize:11, color:"#5F5E5A" }}>{e.designation}</div>
                <div style={{ fontSize:11, color:"#888780" }}>{e.dateOfJoining}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {hasExpiring && <Badge label="License due" color="#854F0B" bg="#FAEEDA" />}
                  <button style={{ padding:"3px 8px", background:"#F7F6F2", border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:11, cursor:"pointer" }}
                    onClick={()=>{ setSelected(e); setModal("view"); }}>View</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New employee modal */}
      {modal==="new" && (
        <Modal title="Add employee" sub="ISO 15189:2022 §6.2" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Full name" required><input style={inp} value={form.fullName} onChange={e=>setForm(p=>({...p,fullName:e.target.value}))} /></Field>
            <Field label="Employee ID" required><input style={inp} value={form.empId} onChange={e=>setForm(p=>({...p,empId:e.target.value}))} placeholder="e.g. MBL-0123" /></Field>
            <Field label="Department" required><select style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}><option value="">Select department</option>{DEPARTMENTS.map(d=><option key={d}>{d}</option>)}</select></Field>
            <Field label="Designation" required><input style={inp} value={form.designation} onChange={e=>setForm(p=>({...p,designation:e.target.value}))} /></Field>
            <Field label="Date of joining"><input style={inp} type="date" value={form.dateOfJoining} onChange={e=>setForm(p=>({...p,dateOfJoining:e.target.value}))} /></Field>
            <Field label="Email"><input style={inp} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></Field>
            <Field label="Phone"><input style={inp} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></Field>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#185FA5")} onClick={handleCreate} disabled={saving}>{saving?"Saving…":"Add employee"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.fullName} sub={`${selected.empId} · ${selected.department} · ${selected.designation}`} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Joined", val:selected.dateOfJoining },
              { label:"Email", val:selected.email||"—" },
              { label:"Phone", val:selected.phone||"—" },
              { label:"Department", val:selected.department },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>

          {/* Qualifications */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Qualifications</div>
          {(selected.qualifications||[]).map((q,i)=>(
            <div key={i} style={{ display:"flex", gap:10, padding:"6px 10px", background:"#F7F6F2", borderRadius:6, marginBottom:4, fontSize:12 }}>
              <Badge label={q.type} color="#534AB7" bg="#EEEDFE" />
              <span style={{ flex:1 }}>{q.title}</span>
              <span style={{ color:"#888780" }}>{q.institution}</span>
              <span style={{ color:"#888780" }}>{q.year}</span>
            </div>
          ))}
          {isHR && (
            <div style={{ display:"flex", gap:6, marginTop:8, marginBottom:16 }}>
              <select style={{ ...inp, width:110 }} value={qualForm.type} onChange={e=>setQualForm(p=>({...p,type:e.target.value}))}>{QUALIFICATION_TYPES.map(t=><option key={t}>{t}</option>)}</select>
              <input style={{...inp,flex:1}} placeholder="Title" value={qualForm.title} onChange={e=>setQualForm(p=>({...p,title:e.target.value}))} />
              <input style={{...inp,width:140}} placeholder="Institution" value={qualForm.institution} onChange={e=>setQualForm(p=>({...p,institution:e.target.value}))} />
              <input style={{...inp,width:70}} placeholder="Year" value={qualForm.year} onChange={e=>setQualForm(p=>({...p,year:e.target.value}))} />
              <button style={S.btn("#185FA5")} onClick={addQualification} disabled={saving}>+</button>
            </div>
          )}

          {/* Licenses */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Licenses / certifications</div>
          {(selected.licenses||[]).map((l,i)=>{
            const d = daysUntil(l.expiryDate);
            const expired = d!==null && d<0;
            const expiring = d!==null && d>=0 && d<=60;
            return (
              <div key={i} style={{ display:"flex", gap:10, padding:"6px 10px", background:"#F7F6F2", borderRadius:6, marginBottom:4, fontSize:12, alignItems:"center" }}>
                <span style={{ flex:1, fontWeight:500 }}>{l.name}</span>
                <span style={{ color:"#888780", fontFamily:"monospace" }}>{l.number}</span>
                <span style={{ color:"#888780" }}>Exp: {l.expiryDate}</span>
                {expired && <Badge label="Expired" color="#791F1F" bg="#FCEBEB" />}
                {expiring && <Badge label="Expiring soon" color="#854F0B" bg="#FAEEDA" />}
              </div>
            );
          })}
          {isHR && (
            <div style={{ display:"flex", gap:6, marginTop:8 }}>
              <input style={{...inp,flex:1}} placeholder="License name" value={licForm.name} onChange={e=>setLicForm(p=>({...p,name:e.target.value}))} />
              <input style={{...inp,width:120}} placeholder="Number" value={licForm.number} onChange={e=>setLicForm(p=>({...p,number:e.target.value}))} />
              <input style={{...inp,width:130}} type="date" value={licForm.issuedDate} onChange={e=>setLicForm(p=>({...p,issuedDate:e.target.value}))} />
              <input style={{...inp,width:130}} type="date" value={licForm.expiryDate} onChange={e=>setLicForm(p=>({...p,expiryDate:e.target.value}))} />
              <button style={S.btn("#185FA5")} onClick={addLicense} disabled={saving}>+</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
