// Complaint.jsx
// MBL QMS — Customer Complaints
// ISO 15189:2022 §8.7 — Complaints / KPI 7.7.12
// Registration, investigation, resolution, closure

import { useState, useEffect, useCallback } from "react";
import {
  collection, addDoc, getDocs, doc, updateDoc, setDoc,
  query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "../../../firebase";

const COMPLAINT_SOURCES = ["Patient","Physician","Referring lab","Internal staff","Other"];
const CATEGORIES = ["Report delay","Sample collection","Report error","Staff behaviour","Billing","Facility","Other"];
const SEVERITY = ["Low","Medium","High"];
const STATUS_CFG = {
  Registered: { color:"#A32D2D", bg:"#FCEBEB" },
  "Under investigation": { color:"#854F0B", bg:"#FAEEDA" },
  Resolved: { color:"#185FA5", bg:"#E6F1FB" },
  Closed: { color:"#0F6E56", bg:"#E1F5EE" },
};

function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-IN",{ day:"2-digit", month:"short", year:"numeric" });
}
function monthKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }

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

export default function Complaint({ role, userName, dept }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");

  const isQuality = ["Quality Manager","Quality Executive","Managing Director","Deputy Director"].includes(role) || dept==="Quality" || dept==="Front Office" || dept==="Call Centre";

  const [form, setForm] = useState({
    patientName:"", contactNumber:"", source:"Patient", category:"Report delay",
    severity:"Medium", description:"", department: dept||"", receivedBy: userName||"", dateReceived: today(),
  });

  const [investForm, setInvestForm] = useState({ investigation:"", resolution:"" });

  // Evidence Attachments State
  const [attachments, setAttachments] = useState([]);
  const [resolutionAttachments, setResolutionAttachments] = useState([]);
  const [currentFormId, setCurrentFormId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});

  const handleOpenNewModal = () => {
    const newDocRef = doc(collection(db, "complaints"));
    setCurrentFormId(newDocRef.id);
    setAttachments([]);
    setForm({
      patientName: "",
      contactNumber: "",
      source: "Patient",
      category: "Report delay",
      severity: "Medium",
      description: "",
      department: dept || "",
      receivedBy: userName || "",
      dateReceived: today()
    });
    setModal("new");
  };

  const handleCloseModal = () => {
    setModal(null);
    setAttachments([]);
    setResolutionAttachments([]);
    setUploadingFiles({});
  };

  const handleFileAttach = async (files, type) => {
    const currentList = type === "registration" ? attachments : resolutionAttachments;
    const targetId = type === "registration" ? currentFormId : selected?.id;
    
    if (!targetId) {
      alert("Invalid operation ID.");
      return;
    }

    if (currentList.length + files.length > 7) {
      alert("You can attach a maximum of 7 documents.");
      return;
    }

    const newAttachments = [...currentList];
    for (const file of files) {
      const tempId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => ({ ...prev, [tempId]: { name: file.name } }));
      
      try {
        const path = `complaint_attachments/${targetId}/${type}_${Date.now()}_${file.name}`;
        const fileRef = ref(storage, path);
        const uploadResult = await uploadBytes(fileRef, file);
        const downloadUrl = await getDownloadURL(uploadResult.ref);
        
        newAttachments.push({
          name: file.name,
          url: downloadUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("File upload failed:", error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
      } finally {
        setUploadingFiles(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      }
    }
    
    if (type === "registration") {
      setAttachments(newAttachments);
    } else {
      setResolutionAttachments(newAttachments);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db,"complaints"), orderBy("createdAt","desc")));
      setComplaints(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegister = async () => {
    if (!form.description || !form.receivedBy) { alert("Please fill all required fields."); return; }
    setSaving(true);
    try {
      const seq = complaints.length + 1;
      const complaintNumber = `CMP-${new Date().getFullYear()}-${String(seq).padStart(3,"0")}`;
      
      const docRef = doc(db, "complaints", currentFormId);
      await setDoc(docRef, {
        ...form,
        complaintNumber,
        status: "Registered",
        month: monthKey(),
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || "",
        attachments: attachments,
      });
      
      setModal(null);
      setAttachments([]);
      setForm({ patientName:"", contactNumber:"", source:"Patient", category:"Report delay", severity:"Medium", description:"", department: dept||"", receivedBy: userName||"", dateReceived: today() });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const startInvestigation = async (c) => {
    await updateDoc(doc(db,"complaints",c.id), { status:"Under investigation", investigationStartedAt: serverTimestamp(), investigationBy: userName });
    load();
  };

  const submitResolution = async () => {
    if (!selected || !investForm.resolution) { alert("Please describe the resolution."); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db,"complaints",selected.id), {
        status:"Resolved",
        investigation: investForm.investigation,
        resolution: investForm.resolution,
        resolvedAt: serverTimestamp(), resolvedBy: userName,
        resolutionAttachments: resolutionAttachments,
      });
      setModal(null);
      setResolutionAttachments([]);
      setInvestForm({ investigation:"", resolution:"" });
      load();
    } catch(e){ console.error(e); alert("Error saving."); }
    setSaving(false);
  };

  const closeComplaint = async (c) => {
    if (!window.confirm(`Close complaint ${c.complaintNumber}?`)) return;
    await updateDoc(doc(db,"complaints",c.id), { status:"Closed", closedAt: serverTimestamp(), closedBy: userName });
    load();
  };

  const filtered = complaints.filter(c => filterStatus==="All" || c.status===filterStatus);

  const registeredCount = complaints.filter(c=>c.status==="Registered").length;
  const investCount = complaints.filter(c=>c.status==="Under investigation").length;
  const resolvedCount = complaints.filter(c=>c.status==="Resolved").length;
  const closedCount = complaints.filter(c=>c.status==="Closed").length;

  // KPI 7.7.12 — current month
  const currentMonth = monthKey();
  const monthComplaints = complaints.filter(c=>c.month===currentMonth).length;

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
          <div style={{ width:32, height:32, borderRadius:8, background:"#A32D2D", display:"flex", alignItems:"center", justifyContent:"center", color:"#FCEBEB", fontSize:16 }}>💬</div>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:"#2C2C2A" }}>Customer complaints</div>
            <div style={{ fontSize:11, color:"#888780" }}>ISO 15189:2022 §8.7 · KPI 7.7.12</div>
          </div>
        </div>
        <button style={S.btn("#A32D2D")} onClick={handleOpenNewModal}>+ Register complaint</button>
      </div>

      <div style={{ padding:"16px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Registered", val:registeredCount, color:"#A32D2D", bg:"#FCEBEB" },
            { label:"Investigating", val:investCount, color:"#854F0B", bg:"#FAEEDA" },
            { label:"Resolved", val:resolvedCount, color:"#185FA5", bg:"#E6F1FB" },
            { label:"Closed", val:closedCount, color:"#0F6E56", bg:"#E1F5EE" },
            { label:"This month (KPI 7.7.12)", val:monthComplaints, color:"#534AB7", bg:"#EEEDFE" },
          ].map((c,i) => (
            <div key={i} style={{ background:c.bg, borderRadius:8, padding:"12px 14px", border:`0.5px solid ${c.color}33` }}>
              <div style={{ fontSize:11, color:c.color, fontWeight:500, marginBottom:3 }}>{c.label}</div>
              <div style={{ fontSize:26, fontWeight:600, color:c.color }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <select style={{ ...inp, width:200 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="All">All status</option>
            {Object.keys(STATUS_CFG).map(s=><option key={s}>{s}</option>)}
          </select>
          <span style={{ fontSize:12, color:"#888780", marginLeft:"auto", alignSelf:"center" }}>{filtered.length} complaints</span>
        </div>

        <div style={S.card}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#888780" }}>Loading…</div>}
          {!loading && filtered.length===0 && <div style={{ padding:32, textAlign:"center", color:"#888780", fontSize:13 }}>No complaints registered.</div>}
          {filtered.map(c => {
            const sc = STATUS_CFG[c.status]||STATUS_CFG.Registered;
            return (
              <div key={c.id} style={{ padding:"12px 16px", borderBottom:"0.5px solid #F1EFE8" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <span style={{ fontSize:11, fontFamily:"monospace", color:"#888780" }}>{c.complaintNumber}</span>
                      <Badge label={c.category} color="#534AB7" bg="#EEEDFE" />
                      <Badge label={c.severity} color={c.severity==="High"?"#791F1F":c.severity==="Medium"?"#854F0B":"#185FA5"} bg={c.severity==="High"?"#FCEBEB":c.severity==="Medium"?"#FAEEDA":"#E6F1FB"} />
                      <Badge label={c.status} color={sc.color} bg={sc.bg} />
                      {((c.attachments && c.attachments.length > 0) || (c.resolutionAttachments && c.resolutionAttachments.length > 0)) && (
                        <span title="Evidence attached" style={{ fontSize: 11, color: "#5F5E5A" }}>📎 { (c.attachments?.length || 0) + (c.resolutionAttachments?.length || 0) }</span>
                      )}
                    </div>
                    <div style={{ fontSize:12, color:"#2C2C2A", marginTop:4 }}>{c.description}</div>
                    <div style={{ fontSize:11, color:"#B4B2A9", marginTop:3 }}>
                      {c.patientName && `${c.patientName} · `}Source: {c.source} · {c.department} · {fmtDate(c.createdAt)}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    {c.status==="Registered" && isQuality && (
                      <button style={S.btn("#854F0B")} onClick={()=>startInvestigation(c)}>Investigate</button>
                    )}
                    {c.status==="Under investigation" && isQuality && (
                      <button style={S.btn("#185FA5")} onClick={()=>{
                        setSelected(c);
                        setInvestForm({ investigation: c.investigation || "", resolution: c.resolution || "" });
                        setResolutionAttachments(c.resolutionAttachments || []);
                        setModal("resolve");
                      }}>Resolve</button>
                    )}
                    {c.status==="Resolved" && isQuality && (
                      <button style={S.btn("#0F6E56")} onClick={()=>closeComplaint(c)}>Close</button>
                    )}
                    <button style={{...S.btn("#F7F6F2","#5F5E5A"),border:"0.5px solid #D3D1C7"}} onClick={()=>{ setSelected(c); setModal("view"); }}>View</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* New complaint modal */}
      {modal==="new" && (
        <Modal title="Register complaint" sub="ISO 15189:2022 §8.7" onClose={handleCloseModal} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <Field label="Patient / complainant name"><input style={inp} value={form.patientName} onChange={e=>setForm(p=>({...p,patientName:e.target.value}))} /></Field>
            <Field label="Contact number"><input style={inp} value={form.contactNumber} onChange={e=>setForm(p=>({...p,contactNumber:e.target.value}))} /></Field>
            <Field label="Source"><select style={inp} value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}>{COMPLAINT_SOURCES.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Category"><select style={inp} value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Severity"><select style={inp} value={form.severity} onChange={e=>setForm(p=>({...p,severity:e.target.value}))}>{SEVERITY.map(s=><option key={s}>{s}</option>)}</select></Field>
            <Field label="Date received"><input style={inp} type="date" value={form.dateReceived} onChange={e=>setForm(p=>({...p,dateReceived:e.target.value}))} /></Field>
            <Field label="Received by" required><input style={inp} value={form.receivedBy} onChange={e=>setForm(p=>({...p,receivedBy:e.target.value}))} /></Field>
            <Field label="Department"><input style={inp} value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} /></Field>
          </div>
          <Field label="Complaint description" required><textarea style={{...inp,resize:"vertical"}} rows={4} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="Describe the complaint in detail…" /></Field>
          
          {/* 📁 Drag & Drop File Attachments Box */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize:11, fontWeight:500, color:"#5F5E5A" }}>Evidence Documents (Max 7 files)</span>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleFileAttach(Array.from(e.dataTransfer.files), "registration");
                }
              }}
              onClick={() => document.getElementById("complaint-file-input-reg").click()}
              style={{
                border: isDragging ? "2px dashed #0F6E56" : "2px dashed #D3D1C7",
                background: isDragging ? "#E1F5EE" : "#FBFBFA",
                borderRadius: 8,
                padding: "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                marginTop: 6
              }}
            >
              <input
                type="file"
                id="complaint-file-input-reg"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileAttach(Array.from(e.target.files), "registration");
                  }
                }}
              />
              <span style={{ fontSize: 20 }}>📥</span>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A", marginTop: 6 }}>
                Drag & Drop files here, or <span style={{ color: "#0F6E56" }}>browse</span>
              </div>
              <div style={{ fontSize: 10, color: "#888780", marginTop: 3 }}>
                Supports PDF, Word, Excel, and Images. Max 10MB per file.
              </div>
            </div>
          </div>

          {/* Uploading Status list */}
          {Object.keys(uploadingFiles).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {Object.values(uploadingFiles).map((uf, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#D97706" }}>⏳ Uploading: <strong>{uf.name}</strong>...</span>
                </div>
              ))}
            </div>
          )}

          {/* Current Attachments List with delete */}
          {attachments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A", marginBottom: 6, textTransform: "uppercase" }}>
                ATTACHED EVIDENCE ({attachments.length}/7)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {attachments.map((file, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "5px 10px", background: "#F7F6F2", borderRadius: 6, border: "0.5px solid #E0DDD6"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span>📄</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#2C2C2A", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 300 }}>{file.name}</span>
                      {file.size && <span style={{ fontSize: 9.5, color: "#888780" }}>({(file.size / 1024).toFixed(1)} KB)</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0F6E56", textDecoration: "none", fontWeight: 500 }}>View</a>
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={handleCloseModal}>Cancel</button>
            <button style={S.btn("#A32D2D")} onClick={handleRegister} disabled={saving}>{saving?"Saving…":"Register complaint"}</button>
          </div>
        </Modal>
      )}

      {/* Resolve modal */}
      {modal==="resolve" && selected && (
        <Modal title={`Resolve — ${selected.complaintNumber}`} sub={selected.description} onClose={handleCloseModal} wide>
          <Field label="Investigation findings"><textarea style={{...inp,resize:"vertical"}} rows={3} value={investForm.investigation} onChange={e=>setInvestForm(p=>({...p,investigation:e.target.value}))} placeholder="What was found during investigation?" /></Field>
          <Field label="Resolution" required><textarea style={{...inp,resize:"vertical"}} rows={3} value={investForm.resolution} onChange={e=>setInvestForm(p=>({...p,resolution:e.target.value}))} placeholder="How was this resolved? Was the customer informed?" /></Field>
          
          {/* 📁 Drag & Drop File Attachments Box for Resolution */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize:11, fontWeight:500, color:"#5F5E5A" }}>Resolution Evidence Documents (Max 7 files)</span>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files) {
                  handleFileAttach(Array.from(e.dataTransfer.files), "resolution");
                }
              }}
              onClick={() => document.getElementById("complaint-file-input-res").click()}
              style={{
                border: isDragging ? "2px dashed #185FA5" : "2px dashed #D3D1C7",
                background: isDragging ? "#E6F1FB" : "#FBFBFA",
                borderRadius: 8,
                padding: "20px 16px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                marginTop: 6
              }}
            >
              <input
                type="file"
                id="complaint-file-input-res"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileAttach(Array.from(e.target.files), "resolution");
                  }
                }}
              />
              <span style={{ fontSize: 20 }}>📥</span>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A", marginTop: 6 }}>
                Drag & Drop files here, or <span style={{ color: "#185FA5" }}>browse</span>
              </div>
              <div style={{ fontSize: 10, color: "#888780", marginTop: 3 }}>
                Supports PDF, Word, Excel, and Images. Max 10MB per file.
              </div>
            </div>
          </div>

          {/* Uploading Status list */}
          {Object.keys(uploadingFiles).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {Object.values(uploadingFiles).map((uf, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#D97706" }}>⏳ Uploading: <strong>{uf.name}</strong>...</span>
                </div>
              ))}
            </div>
          )}

          {/* Current Resolution Attachments List with delete */}
          {resolutionAttachments.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#5F5E5A", marginBottom: 6, textTransform: "uppercase" }}>
                ATTACHED RESOLUTION EVIDENCE ({resolutionAttachments.length}/7)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {resolutionAttachments.map((file, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "5px 10px", background: "#F7F6F2", borderRadius: 6, border: "0.5px solid #E0DDD6"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span>📄</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: "#2C2C2A", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", maxWidth: 300 }}>{file.name}</span>
                      {file.size && <span style={{ fontSize: 9.5, color: "#888780" }}>({(file.size / 1024).toFixed(1)} KB)</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#185FA5", textDecoration: "none", fontWeight: 500 }}>View</a>
                      <button
                        type="button"
                        onClick={() => setResolutionAttachments(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: "none", border: "none", color: "#E24B4A", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button style={{...S.btn("#F7F6F2","#2C2C2A"),border:"0.5px solid #D3D1C7"}} onClick={handleCloseModal}>Cancel</button>
            <button style={S.btn("#185FA5")} onClick={submitResolution} disabled={saving}>{saving?"Saving…":"Mark resolved"}</button>
          </div>
        </Modal>
      )}

      {/* View modal */}
      {modal==="view" && selected && (
        <Modal title={selected.complaintNumber} sub={selected.description} onClose={handleCloseModal} wide>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {(() => {
              const fields = [
                { label:"Status", val:<Badge label={selected.status} color={STATUS_CFG[selected.status]?.color} bg={STATUS_CFG[selected.status]?.bg} /> },
                { label:"Severity", val:selected.severity },
                { label:"Category", val:selected.category },
                { label:"Source", val:selected.source },
                { label:"Patient/complainant", val:selected.patientName||"—" },
                { label:"Contact", val:selected.contactNumber||"—" },
                { label:"Received by", val:`${selected.receivedBy} · ${fmtDate(selected.createdAt)}` },
                { label:"Department", val:selected.department },
                { label:"Investigation", val:selected.investigation||"—" },
                { label:"Resolution", val:selected.resolution||"—" },
                { label:"Resolved by", val: selected.resolvedBy ? `${selected.resolvedBy} · ${fmtDate(selected.resolvedAt)}` : "—" },
                { label:"Closed by", val: selected.closedBy ? `${selected.closedBy} · ${fmtDate(selected.closedAt)}` : "—" },
              ];

              if (selected.attachments && selected.attachments.length > 0) {
                fields.push({
                  label: "Initial Complaint Evidence",
                  val: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                      {selected.attachments.map((file, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: "#FFF", borderRadius: 6, border: "0.5px solid #E0DDD6" }}>
                          <span style={{ fontSize: 11, color: "#2C2C2A" }}>📄 {file.name}</span>
                          <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0F6E56", textDecoration: "none", fontWeight: 600 }}>Open File</a>
                        </div>
                      ))}
                    </div>
                  )
                });
              }

              if (selected.resolutionAttachments && selected.resolutionAttachments.length > 0) {
                fields.push({
                  label: "Resolution Evidence",
                  val: (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                      {selected.resolutionAttachments.map((file, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", background: "#FFF", borderRadius: 6, border: "0.5px solid #E0DDD6" }}>
                          <span style={{ fontSize: 11, color: "#2C2C2A" }}>📄 {file.name}</span>
                          <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#185FA5", textDecoration: "none", fontWeight: 600 }}>Open File</a>
                        </div>
                      ))}
                    </div>
                  )
                });
              }

              return fields.map((f,i)=>(
                <div key={i} style={{ background:"#F7F6F2", borderRadius:7, padding:"8px 10px", gridColumn: ["Investigation","Resolution","Initial Complaint Evidence","Resolution Evidence"].includes(f.label)?"1/-1":"auto" }}>
                  <div style={{ fontSize:10, color:"#888780" }}>{f.label}</div>
                  <div style={{ fontSize:12, color:"#2C2C2A", marginTop:2 }}>{f.val}</div>
                </div>
              ));
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
}
