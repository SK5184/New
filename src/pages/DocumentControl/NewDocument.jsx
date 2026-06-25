import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const S = {
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 20 },
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 16 }),
  btn: (secondary) => ({
    padding: "8px 16px", background: secondary ? "#F1F5F9" : "#0D9488", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", marginRight: 8
  }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#64748B" },
  dropzone: {
    border: "2px dashed #CBD5E1", borderRadius: 8, padding: "32px 16px", textAlign: "center", background: "#F8FAFC",
    cursor: "pointer", transition: "all 0.2s", color: "#64748B", fontSize: 12
  },
  toggleBtn: (active) => ({
    padding: "6px 12px", background: active ? "#0F172A" : "#F1F5F9", color: active ? "#FFF" : "#475569",
    border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s"
  })
};

const DOC_LEVELS = [
  "Quality Manual",
  "Quality System Procedure",
  "Department SOPs",
  "Work Instructions",
  "Forms & Records"
];

const DEPARTMENTS = [
  "Biochemistry", "Microbiology", "Haematology", "Serology", "Flow Cytometry", "Quality", "Administration", "All departments"
];

export default function NewDocument({ onComplete }) {
  const { name: userName } = useAuth();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("single"); // single | bulk
  
  // Single document form state
  const [form, setForm] = useState({
    title: "",
    docNumber: "",
    docLevel: "Department SOPs",
    department: "Biochemistry",
    docType: "PDF",
    version: "1.0",
    effectiveDate: new Date().toISOString().split("T")[0],
    reviewDate: "",
    description: "",
  });

  // Bulk upload files list state
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkCommon, setBulkCommon] = useState({
    docLevel: "Department SOPs",
    department: "Biochemistry",
    effectiveDate: new Date().toISOString().split("T")[0]
  });

  const handleCreateSingle = async (e) => {
    e.preventDefault();
    if (!form.title || !form.docNumber) {
      alert("Please fill in all required fields (Title and Document Number).");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "documents"), {
        ...form,
        status: "Draft",
        createdBy: userName || "Quality Team",
        createdByEmail: auth.currentUser?.email || "",
        createdAt: serverTimestamp(),
        revisions: [{ version: form.version, date: form.effectiveDate, changedBy: userName || "System", notes: "Initial Document registration" }],
        acknowledgedBy: []
      });
      alert("Document registered successfully in Draft status.");
      onComplete();
    } catch (err) {
      console.error("Error creating document:", err);
      alert("Failed to register document.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files || e.dataTransfer?.files || []);
    if (!files.length) return;

    const newDocs = files.map(file => {
      // Guess document number and title from filename
      const cleanedName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      const parts = cleanedName.split(/[-_]+/);
      let docNumber = "SOP-NEW-000";
      let title = cleanedName;
      if (parts.length > 1 && parts[0].length >= 3) {
        docNumber = parts[0].toUpperCase();
        title = parts.slice(1).join(" ");
      }
      
      const ext = file.name.split(".").pop().toLowerCase();
      let docType = "PDF";
      if (["doc", "docx"].includes(ext)) docType = "Word";
      if (["xls", "xlsx", "csv"].includes(ext)) docType = "Excel";

      return {
        id: Math.random().toString(36).substring(7),
        title: title.charAt(0).toUpperCase() + title.slice(1),
        docNumber,
        docLevel: bulkCommon.docLevel,
        department: bulkCommon.department,
        docType,
        version: "1.0",
        effectiveDate: bulkCommon.effectiveDate,
        description: `Imported via bulk upload from ${file.name}`
      };
    });

    setBulkFiles(prev => [...prev, ...newDocs]);
  };

  const handleRemoveBulkFile = (id) => {
    setBulkFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleBulkUploadSubmit = async () => {
    if (bulkFiles.length === 0) {
      alert("Please add files to upload.");
      return;
    }
    setSaving(true);
    let successCount = 0;
    try {
      for (const docItem of bulkFiles) {
        const { id, ...docData } = docItem;
        await addDoc(collection(db, "documents"), {
          ...docData,
          status: "Approved", // Bulk uploads are typically approved directly for legacy imports
          createdBy: userName || "Bulk Import",
          createdByEmail: auth.currentUser?.email || "",
          createdAt: serverTimestamp(),
          revisions: [{ version: docData.version, date: docData.effectiveDate, changedBy: userName || "Bulk Import", notes: "Legacy Document Bulk Import" }],
          acknowledgedBy: []
        });
        successCount++;
      }
      alert(`Successfully imported ${successCount} documents to the active library.`);
      onComplete();
    } catch (err) {
      console.error("Bulk upload error:", err);
      alert(`Successfully imported ${successCount} documents, but encountered an error. check logs.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>Register Document / Initial Import (ISO 15189 §8.3)</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.toggleBtn(mode === "single")} onClick={() => setMode("single")}>Single Register</button>
          <button style={S.toggleBtn(mode === "bulk")} onClick={() => setMode("bulk")}>Bulk Legacy Import</button>
        </div>
      </div>
      <div style={S.cardBody}>
        {mode === "single" ? (
          <form onSubmit={handleCreateSingle}>
            <div style={S.grid(2)}>
              <div style={S.field}>
                <span style={S.label}>Document Title *</span>
                <input type="text" style={S.inp} placeholder="e.g. Standard Operating Procedure for Roche Cobas Analyzer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div style={S.field}>
                <span style={S.label}>Document Reference Number *</span>
                <input type="text" style={S.inp} placeholder="e.g. SOP-BIOC-012" value={form.docNumber} onChange={e => setForm({ ...form, docNumber: e.target.value })} required />
              </div>
            </div>

            <div style={S.grid(3)}>
              <div style={S.field}>
                <span style={S.label}>Apex Hierarchy Level</span>
                <select style={S.inp} value={form.docLevel} onChange={e => setForm({ ...form, docLevel: e.target.value })}>
                  {DOC_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Department Scope</span>
                <select style={S.inp} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Attachment Format</span>
                <select style={S.inp} value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })}>
                  <option value="PDF">📕 PDF Document</option>
                  <option value="Word">📝 Word Document (.docx)</option>
                  <option value="Excel">📊 Excel Spreadsheet (.xlsx)</option>
                </select>
              </div>
            </div>

            <div style={S.grid(3)}>
              <div style={S.field}>
                <span style={S.label}>Initial Version</span>
                <input type="text" style={S.inp} placeholder="1.0" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Effective Date</span>
                <input type="date" style={S.inp} value={form.effectiveDate} onChange={e => setForm({ ...form, effectiveDate: e.target.value })} />
              </div>
              <div style={S.field}>
                <span style={S.label}>Next Review Date</span>
                <input type="date" style={S.inp} value={form.reviewDate} onChange={e => setForm({ ...form, reviewDate: e.target.value })} />
              </div>
            </div>

            <div style={{ ...S.field, marginBottom: 20 }}>
              <span style={S.label}>Document Description / Purpose</span>
              <textarea style={{ ...S.inp, minHeight: 80, resize: "vertical" }} placeholder="Brief description of scope, calibration metrics, reference materials, etc." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, textAlign: "right" }}>
              <button type="button" style={S.btn(true)} onClick={onComplete}>Cancel</button>
              <button type="submit" style={S.btn(false)} disabled={saving}>{saving ? "Saving..." : "Create Document Draft"}</button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 12, fontSize: 11, color: "#1E40AF", marginBottom: 16 }}>
              <strong>One-time Bulk Upload Tool:</strong> Select or drop multiple legacy documents. They will be imported into the active registry in <strong>Approved</strong> status for immediate viewing across laboratory endpoints.
            </div>

            <div style={S.grid(3)}>
              <div style={S.field}>
                <span style={S.label}>Default Hierarchy Level</span>
                <select style={S.inp} value={bulkCommon.docLevel} onChange={e => setBulkCommon({ ...bulkCommon, docLevel: e.target.value })}>
                  {DOC_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Default Department</span>
                <select style={S.inp} value={bulkCommon.department} onChange={e => setBulkCommon({ ...bulkCommon, department: e.target.value })}>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div style={S.field}>
                <span style={S.label}>Effective Date</span>
                <input type="date" style={S.inp} value={bulkCommon.effectiveDate} onChange={e => setBulkCommon({ ...bulkCommon, effectiveDate: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={S.dropzone}
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("bulkFileInp").click()}
              >
                📥 Drag & drop legacy Word, Excel, or PDF documents here, or click to browse
                <input
                  id="bulkFileInp"
                  type="file"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleFileDrop}
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                />
              </div>
            </div>

            {bulkFiles.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <span style={{ ...S.label, display: "block", marginBottom: 8 }}>Pending Upload Queue ({bulkFiles.length} files)</span>
                <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#F8FAFC" }}>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>Doc ID</th>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>Title</th>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>Hierarchy</th>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>Dept</th>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "left" }}>Type</th>
                        <th style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkFiles.map((file, idx) => (
                        <tr key={file.id}>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
                            <input
                              type="text"
                              style={{ ...S.inp, padding: "4px 8px" }}
                              value={file.docNumber}
                              onChange={e => {
                                const copy = [...bulkFiles];
                                copy[idx].docNumber = e.target.value;
                                setBulkFiles(copy);
                              }}
                            />
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
                            <input
                              type="text"
                              style={{ ...S.inp, padding: "4px 8px" }}
                              value={file.title}
                              onChange={e => {
                                const copy = [...bulkFiles];
                                copy[idx].title = e.target.value;
                                setBulkFiles(copy);
                              }}
                            />
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
                            <select
                              style={{ ...S.inp, padding: "4px 8px" }}
                              value={file.docLevel}
                              onChange={e => {
                                const copy = [...bulkFiles];
                                copy[idx].docLevel = e.target.value;
                                setBulkFiles(copy);
                              }}
                            >
                              {DOC_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
                            <select
                              style={{ ...S.inp, padding: "4px 8px" }}
                              value={file.department}
                              onChange={e => {
                                const copy = [...bulkFiles];
                                copy[idx].department = e.target.value;
                                setBulkFiles(copy);
                              }}
                            >
                              {DEPARTMENTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0" }}>
                            <select
                              style={{ ...S.inp, padding: "4px 8px" }}
                              value={file.docType}
                              onChange={e => {
                                const copy = [...bulkFiles];
                                copy[idx].docType = e.target.value;
                                setBulkFiles(copy);
                              }}
                            >
                              <option value="PDF">📕 PDF</option>
                              <option value="Word">📝 Word</option>
                              <option value="Excel">📊 Excel</option>
                            </select>
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                            <button
                              style={{ ...S.btn(true), background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5", padding: "4px 8px" }}
                              onClick={() => handleRemoveBulkFile(file.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, textAlign: "right" }}>
              <button type="button" style={S.btn(true)} onClick={onComplete}>Cancel</button>
              <button type="button" style={S.btn(false)} onClick={handleBulkUploadSubmit} disabled={saving || bulkFiles.length === 0}>
                {saving ? "Importing..." : `Approve & Import (${bulkFiles.length}) Items`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
