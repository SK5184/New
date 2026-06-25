// Vendors.jsx
// MBL QMS — Vendor Management / Approved Vendor List (AVL)
// ISO 15189:2022 §5.5 — External services and supplies

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const VENDOR_CATEGORIES = ["Reagents","Equipment","Consumables","Calibration services","Maintenance services","IT services","Courier/Logistics","Other"];
const STATUS_CFG = {
  "Pending evaluation": { color:"#854F0B", bg:"#FAEEDA" },
  Approved: { color:"#0F6E56", bg:"#E1F5EE" },
  "On hold": { color:"#A32D2D", bg:"#FCEBEB" },
  Rejected: { color:"#791F1F", bg:"#FCEBEB" },
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

function StarRating({ value, onChange, readOnly }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(n => (
        <span key={n} onClick={()=>!readOnly && onChange(n)} style={{
          fontSize:16, cursor: readOnly?"default":"pointer",
          color: n<=value ? "#EF9F27" : "#E0DDD6",
        }}>★</span>
      ))}
    </div>
  );
}

export default function Vendors({ role, userName }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const isPurchase = ["Purchase Manager","Purchase User","Quality Manager","Managing Director"].includes(role);

  const [form, setForm] = useState({
    name:"", category: VENDOR_CATEGORIES[0], contactPerson:"", phone:"", email:"",
    address:"", gstNumber:"", productsServices:"",
  });

  const [evalForm, setEvalForm] = useState({
    quality:3, delivery:3, pricing:3, responsiveness:3, remarks:"",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"vendors"), orderBy("createdAt","desc")));
      setVendors(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.name || !form.contactPerson) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = vendors.length + 1;
      const vendorId = `VEN-${String(seq).padStart(4,"0")}`;
      await addDoc(collection(db,"vendors"), {
        ...form, vendorId, status:"Pending evaluation", evaluations:[],
        createdAt: serverTimestamp(), createdByEmail: auth.currentUser?.email||"",
      });
      setModal(null);
      setForm({ name:"", category:VENDOR_CATEGORIES[0], contactPerson:"", phone:"", email:"", address:"", gstNumber:"", productsServices:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const submitEvaluation = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const avgScore = (evalForm.quality+evalForm.delivery+evalForm.pricing+evalForm.responsiveness)/4;
      const evaluations = [...(selected.evaluations||[]), {
        ...evalForm, avgScore, date: today(), evaluatedBy: userName,
      }];
      await updateDoc(doc(db,"vendors",selected.id), { evaluations });
      setSelected(p=>({...p,evaluations}));
      setEvalForm({ quality:3, delivery:3, pricing:3, responsiveness:3, remarks:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    await updateDoc(doc(db,"vendors",selected.id), { status, statusUpdatedAt: serverTimestamp(), statusUpdatedBy: userName });
    setModal(null);
    load();
  };

  const filtered = vendors.filter(v => {
    const mc = filterCategory==="All" || v.category===filterCategory;
    const ms = filterStatus==="All" || v.status===filterStatus;
    return mc && ms;
  });

  const approvedCount = vendors.filter(v=>v.status==="Approved").length;
  const pendingCount = vendors.filter(v=>v.status==="Pending evaluation").length;
  const onHoldCount = vendors.filter(v=>v.status==="On hold" || v.status==="Rejected").length;

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#0F6E56", display:"flex", alignItems:"center", justifyContent:"center", color:"#E1F5EE", fontSize:16 }}>🚚</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Vendor management</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §5.5 · Approved Vendor List</div>
          </div>
        </div>
        {isPurchase && <button style={S.btn("#0F6E56")} onClick={()=>setModal("new")}>+ Add vendor</button>}
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Approved vendors (AVL)", val:approvedCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"Pending evaluation", val:pendingCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"On hold / rejected", val:onHoldCount, color:"#A32D2D", bg:"#FCEBEB" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:200 }} value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}>
            <option value="All">All categories</option>
            {VENDOR_CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
          <select style={{ ...inp, width:180 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="All">All status</option>
            {Object.keys(STATUS_CFG).map(s=><option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} vendors</span>
        </div>

        <div style={S.card}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 150px 130px 100px 100px 100px", padding:"7px 16px", background:"#F7F6F2", borderBottom:"0.5px solid #E0DDD6", gap:8 }}>
            {["Vendor","Category","Contact","Status","Rating",""].map((h,i)=>(
              <div key={i} style={{ fontSize:10, fontWeight:500, color:"#888780" }}>{h}</div>
            ))}
          </div>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No vendors found.</div>}
          {filtered.map(v => {
            const sc = STATUS_CFG[v.status]||STATUS_CFG["Pending evaluation"];
            const avgRating = v.evaluations?.length>0
              ? (v.evaluations.reduce((s,e)=>s+e.avgScore,0)/v.evaluations.length).toFixed(1)
              : null;
            return (
              <div key={v.id} style={{ display:"grid", gridTemplateColumns:"1fr 150px 130px 100px 100px 100px", padding:"10px 16px", borderBottom:"0.5px solid #F1EFE8", gap:8, alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A" }}>{v.name}</div>
                  <div style={{ fontSize:11, color:"#888780", fontFamily:"monospace" }}>{v.vendorId}</div>
                </div>
                <div style={{ fontSize:11, color:"#5F5E5A" }}>{v.category}</div>
                <div style={{ fontSize:11, color:"#5F5E5A" }}>{v.contactPerson}</div>
                <div><Badge label={v.status} color={sc.color} bg={sc.bg} /></div>
                <div style={{ fontSize:12 }}>{avgRating ? <StarRating value={Math.round(avgRating)} readOnly /> : <span style={{ color:"#B4B2A9" }}>—</span>}</div>
                <div>
                  <button style={{ padding:"3px 8px", background:"#F7F6F2", border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:11, cursor:"pointer" }}
                    onClick={()=>{ setSelected(v); setModal("view"); }}>View</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New vendor modal */}
      {modal==="new" && (
        <Modal title="Add vendor" sub="ISO 15189:2022 §5.5" onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Vendor name" required><input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} /></Field>
            <Field label="Category"><select style={inp} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{VENDOR_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Contact person" required><input style={inp} value={form.contactPerson} onChange={e=>setForm(p=>({...p,contactPerson:e.target.value}))} /></Field>
            <Field label="Phone"><input style={inp} value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} /></Field>
            <Field label="Email"><input style={inp} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} /></Field>
            <Field label="GST number"><input style={inp} value={form.gstNumber} onChange={e=>setForm(p=>({...p,gstNumber:e.target.value}))} /></Field>
          </div>
          <Field label="Address"><textarea style={{...inp,resize:"vertical"}} rows={2} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} /></Field>
          <Field label="Products / services supplied"><textarea style={{...inp,resize:"vertical"}} rows={2} value={form.productsServices} onChange={e=>setForm(p=>({...p,productsServices:e.target.value}))} /></Field>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={()=>setModal(null)}>Cancel</button>
            <button style={S.btn("#0F6E56")} onClick={handleCreate} disabled={saving}>{saving?"Saving…":"Add vendor"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.name} sub={`${selected.vendorId} · ${selected.category}`} onClose={()=>setModal(null)} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Status", val:<Badge label={selected.status} color={STATUS_CFG[selected.status]?.color} bg={STATUS_CFG[selected.status]?.bg} /> },
              { label:"Contact person", val:selected.contactPerson },
              { label:"Phone", val:selected.phone||"—" },
              { label:"Email", val:selected.email||"—" },
              { label:"GST number", val:selected.gstNumber||"—" },
              { label:"Added", val:fmtDate(selected.createdAt) },
              { label:"Address", val:selected.address||"—" },
              { label:"Products/services", val:selected.productsServices||"—" },
            ].map((f,i)=>(
              <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: ["Address","Products/services"].includes(f.label)?"1/-1":"auto" }}>
                <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
              </div>
            ))}
          </div>

          {/* Evaluations history */}
          <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", marginBottom:8 }}>Evaluation history</div>
          {(selected.evaluations||[]).map((ev,i)=>(
            <div key={i} style={{ padding:"8px 10px", background:"#F7F6F2", borderRadius:7, marginBottom:6, fontSize:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ color:"#888780" }}>{ev.date} · {ev.evaluatedBy}</span>
                <span style={{ fontWeight:600, color:"#0F6E56" }}>Avg: {ev.avgScore.toFixed(1)}/5</span>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                <div>Quality: <StarRating value={ev.quality} readOnly /></div>
                <div>Delivery: <StarRating value={ev.delivery} readOnly /></div>
                <div>Pricing: <StarRating value={ev.pricing} readOnly /></div>
                <div>Response: <StarRating value={ev.responsiveness} readOnly /></div>
              </div>
              {ev.remarks && <div style={{ marginTop:4, color:"#5F5E5A" }}>{ev.remarks}</div>}
            </div>
          ))}

          {isPurchase && (
            <>
              <div style={{ fontSize:12, fontWeight:500, color:"#2C2C2A", margin:"12px 0 8px" }}>New evaluation</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:10 }}>
                {[
                  { key:"quality", label:"Quality" },
                  { key:"delivery", label:"Delivery" },
                  { key:"pricing", label:"Pricing" },
                  { key:"responsiveness", label:"Responsiveness" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ fontSize:11, color:"#888780", marginBottom:4 }}>{f.label}</div>
                    <StarRating value={evalForm[f.key]} onChange={(v)=>setEvalForm(p=>({...p,[f.key]:v}))} />
                  </div>
                ))}
              </div>
              <Field label="Remarks"><textarea style={{...inp,resize:"vertical"}} rows={2} value={evalForm.remarks} onChange={e=>setEvalForm(p=>({...p,remarks:e.target.value}))} /></Field>
              <div style={{ display:"flex", gap:8, justifyContent:"space-between", flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:6 }}>
                  {Object.keys(STATUS_CFG).filter(s=>s!==selected.status).map(s => (
                    <button key={s} style={{ padding:"6px 10px", background:"#F7F6F2", border:"0.5px solid #D3D1C7", borderRadius:6, fontSize:11, cursor:"pointer" }}
                      onClick={()=>updateStatus(s)}>Mark "{s}"</button>
                  ))}
                </div>
                <button style={S.btn("#0F6E56")} onClick={submitEvaluation} disabled={saving}>{saving?"Saving…":"Submit evaluation"}</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
