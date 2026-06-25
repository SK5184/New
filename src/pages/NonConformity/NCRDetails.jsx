import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../context/AuthContext";

const S = {
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16 }),
  field: { background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", border: "1px solid #E2E8F0" },
  label: { fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase" },
  val: { fontSize: 12, color: "#1E293B", marginTop: 4, fontWeight: 500 },
  inp: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", marginTop: 4 },
  btn: (secondary, danger) => ({
    padding: "8px 16px",
    background: danger ? "#FEF2F2" : (secondary ? "#F1F5F9" : "#0D9488"),
    color: danger ? "#991B1B" : (secondary ? "#475569" : "#FFF"),
    border: danger ? "1px solid #FCA5A5" : (secondary ? "1px solid #CBD5E1" : "none"),
    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8
  }),
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12, marginTop: 20, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }
};

export default function NCRDetails({ ncr, onComplete }) {
  const { role, name: userName, dept } = useAuth();
  const [saving, setSaving] = useState(false);

  // Expand permission check to HODs, Supervisors, Managers, Incharges
  const canInvestigate = [
    "Quality Manager", "Quality Executive", "Managing Director", "Admin", 
    "HOD", "Supervisor", "Manager", "Incharge", "Director", "Chief Incharge"
  ].includes(role) || 
    role?.toLowerCase().includes("supervisor") || 
    role?.toLowerCase().includes("manager") || 
    role?.toLowerCase().includes("incharge") || 
    dept === "Quality";

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  // Investigation form inputs
  const [investForm, setInvestForm] = useState({
    rootCause: ncr.rootCause || "",
    immediateAction: ncr.immediateAction || "",
    assignedTo: ncr.assignedTo || ""
  });

  // Attachments State
  const [attachments, setAttachments] = useState(ncr.attachments || []);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  const handleSaveInvestigation = async (e) => {
    e.preventDefault();
    if (!investForm.rootCause || !investForm.immediateAction) {
      alert("Please enter Root Cause and Immediate Action taken.");
      return;
    }
    setSaving(true);
    try {
      const docRef = doc(db, "nonConformities", ncr.id);
      await updateDoc(docRef, {
        status: "Under investigation",
        rootCause: investForm.rootCause,
        immediateAction: investForm.immediateAction,
        assignedTo: investForm.assignedTo,
        investigationStartedAt: serverTimestamp(),
        investigationBy: userName,
        attachments: attachments
      });
      alert("Investigation findings saved successfully.");
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to save investigation.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileAttach = async (files) => {
    if (attachments.length + files.length > 7) {
      alert("You can attach a maximum of 7 documents.");
      return;
    }

    const newAttachments = [...attachments];
    for (const file of files) {
      const tempId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => ({ ...prev, [tempId]: { name: file.name } }));
      
      try {
        const fileRef = ref(storage, `ncr_attachments/${ncr.id || "temp"}/${Date.now()}_${file.name}`);
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
    setAttachments(newAttachments);
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleRaiseCAPA = async () => {
    if (!window.confirm("Mark this NCR as CAPA Raised? This transitions control to the CAPA module.")) return;
    setSaving(true);
    try {
      const docRef = doc(db, "nonConformities", ncr.id);
      await updateDoc(docRef, {
        status: "CAPA raised",
        capaRaisedAt: serverTimestamp(),
        capaRaisedBy: userName
      });
      alert("NCR marked as CAPA Raised. Please open the CAPA module to compile the Action Plan.");
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to initiate CAPA.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseNCR = async () => {
    if (!window.confirm("Close this NCR? Verify that all actions are completed and verified.")) return;
    setSaving(true);
    try {
      const docRef = doc(db, "nonConformities", ncr.id);
      await updateDoc(docRef, {
        status: "Closed",
        closedAt: serverTimestamp(),
        closedBy: userName
      });
      alert("Non-Conformance Ticket Closed & Logged.");
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to close NCR.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={S.grid(3)}>
        <div style={S.field}>
          <div style={S.label}>NCR Ticket ID</div>
          <div style={{ ...S.val, fontFamily: "monospace", fontSize: 13, color: "#991B1B" }}>{ncr.ncrNumber}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Current Status</div>
          <div style={S.val}>
            <span style={{
              padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: "bold",
              background: ncr.status === "Closed" ? "#E1F5EE" : ncr.status === "CAPA raised" ? "#E6F1FB" : "#FCEBEB",
              color: ncr.status === "Closed" ? "#0F6E56" : ncr.status === "CAPA raised" ? "#185FA5" : "#A32D2D"
            }}>{ncr.status}</span>
          </div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Severity Level</div>
          <div style={{ ...S.val, color: ncr.severity === "Critical" ? "#991B1B" : "#1E293B" }}>{ncr.severity}</div>
        </div>
      </div>

      <div style={S.grid(3)}>
        <div style={S.field}>
          <div style={S.label}>Responsible Department</div>
          <div style={S.val}>{ncr.department}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>ISO 15189 Clause</div>
          <div style={S.val}>{ncr.isoClause || "§8.4 Nonconforming Work"}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Source of Deviation</div>
          <div style={S.val}>{ncr.source}</div>
        </div>
      </div>

      <div style={S.grid(2)}>
        <div style={S.field}>
          <div style={S.label}>Raised By</div>
          <div style={S.val}>{ncr.raisedBy}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Linked Risk Registry ID</div>
          <div style={S.val}>{ncr.linkedRiskId ? `🔗 ${ncr.linkedRiskId}` : "No Direct Risk Linked"}</div>
        </div>
      </div>

      <div style={S.field}>
        <div style={S.label}>Description of Deviation</div>
        <div style={{ ...S.val, whiteSpace: "pre-line", lineHeight: 1.5, background: "#FFF", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>{ncr.description}</div>
      </div>

      {/* Investigation Details Section */}
      <div style={S.sectionTitle}>Investigation & Root Cause (ISO 15189 §8.4.2)</div>

      {(ncr.status === "Open" || ncr.status === "Under investigation") ? (
        canInvestigate ? (
          <form onSubmit={handleSaveInvestigation}>
            <div style={S.grid(2)}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={S.label}>Root Cause Analysis (RCA) *</span>
                <textarea
                  style={{ ...S.inp, minHeight: 70 }}
                  placeholder="Explain why this deviation occurred (5 Whys methodology)..."
                  value={investForm.rootCause}
                  onChange={e => setInvestForm({ ...investForm, rootCause: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={S.label}>Immediate Corrective Action Taken *</span>
                <textarea
                  style={{ ...S.inp, minHeight: 70 }}
                  placeholder="What containment actions were executed instantly to prevent diagnostic errors?"
                  value={investForm.immediateAction}
                  onChange={e => setInvestForm({ ...investForm, immediateAction: e.target.value })}
                  required
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 300, marginBottom: 16 }}>
              <span style={S.label}>Assigned Investigating Staff</span>
              <input
                type="text"
                style={S.inp}
                placeholder="e.g. Deputy HOD / Senior Tech"
                value={investForm.assignedTo}
                onChange={e => setInvestForm({ ...investForm, assignedTo: e.target.value })}
              />
            </div>

            {/* 📁 Drag & Drop File Attachments Box */}
            <div style={{ marginBottom: 16 }}>
              <span style={S.label}>Evidence Documents (Max 7 files)</span>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) {
                    handleFileAttach(Array.from(e.dataTransfer.files));
                  }
                }}
                onClick={() => document.getElementById("ncr-file-input").click()}
                style={{
                  border: isDragging ? "2px dashed #0D9488" : "2px dashed #CBD5E1",
                  background: isDragging ? "#F0FDFA" : "#F8FAFC",
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
                  id="ncr-file-input"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileAttach(Array.from(e.target.files));
                    }
                  }}
                />
                <span style={{ fontSize: 24 }}>📥</span>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginTop: 8 }}>
                  Drag & Drop files here, or <span style={{ color: "#0D9488" }}>browse</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                  Supports PDF, Word, Excel, and Images. Max 10MB per file.
                </div>
              </div>
            </div>

            {/* Uploading Status list */}
            {Object.keys(uploadingFiles).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {Object.values(uploadingFiles).map((uf, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: 8, background: "#FEF3C7", borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#D97706" }}>⏳ Uploading: <strong>{uf.name}</strong>...</span>
                  </div>
                ))}
              </div>
            )}

            {/* Current Attachments List with delete */}
            {attachments.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                  ATTACHED EVIDENCE ({attachments.length}/7)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {attachments.map((file, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 12px", background: "#F1F5F9", borderRadius: 6, border: "1px solid #E2E8F0"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>📄</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#1E293B" }}>{file.name}</span>
                        {file.size && <span style={{ fontSize: 10, color: "#64748B" }}>({(file.size / 1024).toFixed(1)} KB)</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0D9488", textDecoration: "none", fontWeight: 600 }}>👁️ View</a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
                        >
                          ✕ Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: 16 }}>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (attachments.length === 1) {
                      window.open(attachments[0].url, "_blank");
                    } else {
                      setShowEvidenceModal(true);
                    }
                  }}
                  style={{ ...S.btn(true, false), background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                >
                  🔍 View Evidence ({attachments.length})
                </button>
              )}
              <button type="submit" style={S.btn(false)} disabled={saving}>{saving ? "Saving..." : "Save Investigation Findings"}</button>
            </div>
          </form>
        ) : (
          <div style={{ padding: 12, background: "#F1F5F9", color: "#475569", borderRadius: 8, fontSize: 12 }}>
            Investigation is pending. HODs, Supervisors, Incharges, or Quality Manager signatures are required to enter Root Cause and immediate actions.
          </div>
        )
      ) : (
        <div>
          <div style={S.grid(2)}>
            <div style={S.field}>
              <div style={S.label}>Root Cause Findings (RCA)</div>
              <div style={S.val}>{ncr.rootCause}</div>
            </div>
            <div style={S.field}>
              <div style={S.label}>Immediate Containment Actions</div>
              <div style={S.val}>{ncr.immediateAction}</div>
            </div>
          </div>
          <div style={S.grid(2)}>
            <div style={S.field}>
              <div style={S.label}>Assigned Staff</div>
              <div style={S.val}>{ncr.assignedTo || "—"}</div>
            </div>
            <div style={S.field}>
              <div style={S.label}>Investigation By</div>
              <div style={S.val}>
                {ncr.investigationBy} on {ncr.investigationStartedAt ? new Date(ncr.investigationStartedAt.toDate?.() || ncr.investigationStartedAt).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          {/* Read-Only Attachments List */}
          {attachments.length > 0 && (
            <div style={{ ...S.field, marginTop: 12 }}>
              <div style={S.label}>Attached Evidence ({attachments.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {attachments.map((file, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 12px", background: "#FFF", borderRadius: 6, border: "1px solid #E2E8F0"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📄</span>
                      <span style={{ fontSize: 11.5, fontWeight: 500, color: "#1E293B" }}>{file.name}</span>
                    </div>
                    <a href={file.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#0D9488", textDecoration: "none", fontWeight: 600 }}>👁️ View Document</a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button Controls for HOD / Quality */}
          {isQuality && ncr.status !== "Closed" && (
            <div style={{ marginTop: 24, borderTop: "1px solid #E2E8F0", paddingTop: 16, textAlign: "right" }}>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (attachments.length === 1) {
                      window.open(attachments[0].url, "_blank");
                    } else {
                      setShowEvidenceModal(true);
                    }
                  }}
                  style={{ ...S.btn(true, false), background: "#EFF6FF", color: "#1D4ED8", borderColor: "#BFDBFE" }}
                >
                  🔍 View Evidence ({attachments.length})
                </button>
              )}
              {ncr.status === "Under investigation" && (
                <button style={S.btn(false, false)} onClick={handleRaiseCAPA} disabled={saving}>
                  Initiate / Raise CAPA
                </button>
              )}
              <button style={S.btn(false, true)} onClick={handleCloseNCR} disabled={saving}>
                Close NCR Ticket (Verified)
              </button>
            </div>
          )}

          {ncr.status === "Closed" && (
            <div style={{ ...S.field, background: "#ECFDF5", border: "1px solid #A7F3D0", marginTop: 16 }}>
              <div style={{ ...S.label, color: "#065F46" }}>Verification & Closure Logs</div>
              <div style={{ ...S.val, color: "#065F46" }}>
                This ticket has been marked as <strong>CLOSED</strong>. Action items completed and verified by <strong>{ncr.closedBy}</strong> on {ncr.closedAt ? new Date(ncr.closedAt.toDate?.() || ncr.closedAt).toLocaleDateString() : "—"}.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Viewer modal overlay for multiple attachments */}
      {showEvidenceModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 11000
        }}>
          <div style={{
            background: "#FFF", borderRadius: 12, padding: 24, width: "100%",
            maxWidth: 500, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", border: "1px solid #E2E8F0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 10, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>📂 Investigation Evidence Documents</h3>
              <button onClick={() => setShowEvidenceModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#64748B" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attachments.map((file, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{file.name}</span>
                  </div>
                  <a href={file.url} target="_blank" rel="noreferrer" style={{
                    padding: "4px 10px", background: "#0D9488", color: "#FFF",
                    borderRadius: 6, fontSize: 11, textDecoration: "none", fontWeight: 600
                  }}>
                    Open File
                  </a>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button onClick={() => setShowEvidenceModal(false)} style={{
                padding: "8px 16px", background: "#F1F5F9", color: "#475569",
                border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
