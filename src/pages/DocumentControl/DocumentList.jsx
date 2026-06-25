import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import NewDocument from "./NewDocument";
import DocumentChangeRequest from "./DocumentChangeRequest";
import DocumentReview from "./DocumentReview";
import RevisionHistory from "./RevisionHistory";
import ObsoleteDocuments from "./ObsoleteDocuments";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" },
  topbar: { background: "#0F172A", color: "#FFF", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "4px solid #0D9488" },
  title: { fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 },
  tabs: { display: "flex", background: "#FFF", borderBottom: "1px solid #E2E8F0", padding: "0 24px", gap: 10, overflowX: "auto" },
  tabBtn: (active) => ({
    padding: "12px 16px", background: "transparent", color: active ? "#0D9488" : "#64748B",
    border: "none", borderBottom: active ? "3px solid #0D9488" : "3px solid transparent",
    fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer", transition: "all 0.15s"
  }),
  content: { padding: "24px 32px", maxWidth: 1200, margin: "0 auto" },
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  btn: (secondary) => ({
    padding: "6px 12px", background: secondary ? "#F1F5F9" : "#0D9488", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
};

export default function DocumentList() {
  const { role, name: userName, dept } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("active_docs"); // active_docs | new_doc | review_queue | change_req | history | obsolete
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterLevel, setFilterLevel] = useState("All");
  const [viewingDoc, setViewingDoc] = useState(null);
  const [requestingChangeDoc, setRequestingChangeDoc] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [securityAlert, setSecurityAlert] = useState(null);

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "documents"), orderBy("createdAt", "desc")));
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Could not load documents from Firestore, using mock fallback:", e);
      // Fallback QMS library matching Apex hierarchy
      setDocs([
        { id: "doc1", docNumber: "QM-MBL-001", title: "MBL Laboratory Quality Manual", docLevel: "Quality Manual", department: "Quality", status: "Approved", version: "4.0", docType: "PDF", description: "Apex QMS compliance guidelines under ISO 15189:2022.", createdBy: "Sarah Jenkins", effectiveDate: "2026-01-10", revisions: [] },
        { id: "doc2", docNumber: "QSP-GEN-002", title: "Non-Conforming Work Management Procedure", docLevel: "Quality System Procedure", department: "Quality", status: "Approved", version: "2.1", docType: "Word", description: "Identifies corrective actions and NCR logging paths.", createdBy: "Sarah Jenkins", effectiveDate: "2026-02-15", revisions: [] },
        { id: "doc3", docNumber: "SOP-BIOC-012", title: "Roche Cobas c311 Analyzer Operation SOP", docLevel: "Department SOPs", department: "Biochemistry", status: "Approved", version: "3.0", docType: "PDF", description: "Maintenance, calibration, and run startup SOP.", createdBy: "Dr. Suresh Kumar", effectiveDate: "2026-03-01", revisions: [] },
        { id: "doc4", docNumber: "WI-MICR-004", title: "GeneXpert Sample Loading Work Instructions", docLevel: "Work Instructions", department: "Microbiology", status: "Approved", version: "1.0", docType: "PDF", description: "Cartridge loading steps.", createdBy: "Alex Mercer", effectiveDate: "2026-04-12", revisions: [] },
        { id: "doc5", docNumber: "REC-HAEM-001", title: "Sysmex XN-1000 Calibration Record", docLevel: "Forms & Records", department: "Haematology", status: "Approved", version: "1.0", docType: "Excel", description: "Daily Z-score calibration logs sheet.", createdBy: "David Miller", effectiveDate: "2026-05-18", revisions: [] },
        { id: "doc6", docNumber: "SOP-SERO-008", title: "ELISA HIV Kit Calibration Protocol", docLevel: "Department SOPs", department: "Serology", status: "Pending review", version: "1.0", docType: "PDF", description: "ELISA run SOP.", createdBy: "Lab Tech", effectiveDate: "2026-06-17", revisions: [] }
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Filter logic
  const filteredDocs = docs.filter(d => {
    const isApproved = d.status === "Approved";
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.docNumber.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "All" || d.department.toLowerCase() === filterDept.toLowerCase() || d.department === "All departments";
    const matchLevel = filterLevel === "All" || d.docLevel === filterLevel;
    
    // Regular staff can only see approved documents for their department (or All departments)
    const canView = isApproved && (isQuality || dept === "Administration" || d.department.toLowerCase() === dept.toLowerCase() || d.department === "All departments" || d.department === "All");
    return matchSearch && matchDept && matchLevel && canView;
  });

  const getFileIcon = (type) => {
    if (type?.toLowerCase() === "word" || type?.toLowerCase() === "docx") return "📝 (Word)";
    if (type?.toLowerCase() === "excel" || type?.toLowerCase() === "xlsx") return "📊 (Excel)";
    return "📕 (PDF)";
  };

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={S.title}>
          <span>📄</span>
          <span>MBL QMS — Document Control Center (ISO 15189 §8.3)</span>
        </div>
        <div style={{ fontSize: 12, background: "#1E293B", padding: "4px 10px", borderRadius: 12 }}>
          Scope: <strong>{dept || "Lab Staff"}</strong> ({role})
        </div>
      </div>

      <div style={S.tabs}>
        <button style={S.tabBtn(activeTab === "active_docs")} onClick={() => { setActiveTab("active_docs"); setViewingDoc(null); setRequestingChangeDoc(null); }}>📂 Approved Documents</button>
        {isQuality && <button style={S.tabBtn(activeTab === "new_doc")} onClick={() => setActiveTab("new_doc")}>➕ Register Document</button>}
        {isQuality && <button style={S.tabBtn(activeTab === "review_queue")} onClick={() => setActiveTab("review_queue")}>📋 Review Queue ({docs.filter(d => d.status === "Pending review").length})</button>}
        <button style={S.tabBtn(activeTab === "change_req")} onClick={() => setActiveTab("change_req")}>🔄 Change Requests</button>
        <button style={S.tabBtn(activeTab === "history")} onClick={() => setActiveTab("history")}>🕰️ Revision History</button>
        {isQuality && <button style={S.tabBtn(activeTab === "obsolete")} onClick={() => setActiveTab("obsolete")}>🗃️ Obsolete Archive</button>}
      </div>

      <div style={S.content}>
        {activeTab === "active_docs" && !viewingDoc && !requestingChangeDoc && (
          <div>
            <div style={S.card}>
              <div style={S.cardHeader}>
                <div style={S.cardTitle}>Intranet Document Library Hierarchy</div>
              </div>
              <div style={S.cardBody}>
                <div style={S.grid(3)}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Search by Title / Code</span>
                    <input type="text" style={S.inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Filter by Department</span>
                    <select style={S.inp} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                      <option value="All">All Departments</option>
                      <option value="Biochemistry">Biochemistry</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Haematology">Haematology</option>
                      <option value="Serology">Serology</option>
                      <option value="Quality">Quality</option>
                    </select>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Apex Hierarchy Level</span>
                    <select style={S.inp} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                      <option value="All">All Levels</option>
                      <option value="Quality Manual">Level 1: Quality Manual</option>
                      <option value="Quality System Procedure">Level 2: Quality System Procedures</option>
                      <option value="Department SOPs">Level 3: Department SOPs</option>
                      <option value="Work Instructions">Level 4: Work Instructions (WI)</option>
                      <option value="Forms & Records">Level 5: Forms & Records</option>
                    </select>
                  </div>
                </div>

                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Hierarchy Level</th>
                      <th style={S.th}>Doc Number</th>
                      <th style={S.th}>Document Title</th>
                      <th style={S.th}>Department</th>
                      <th style={S.th}>Format</th>
                      <th style={S.th}>Version</th>
                      <th style={S.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No approved QMS documents match filters.</td>
                      </tr>
                    ) : (
                      filteredDocs.map(d => (
                        <tr key={d.id}>
                          <td style={S.td}>
                            <span style={S.badge(
                              d.docLevel === "Quality Manual" ? "#FEE2E2" : d.docLevel === "Quality System Procedure" ? "#EFF6FF" : "#ECFDF5",
                              d.docLevel === "Quality Manual" ? "#991B1B" : d.docLevel === "Quality System Procedure" ? "#1E40AF" : "#065F46"
                            )}>
                              {d.docLevel}
                            </span>
                          </td>
                          <td style={S.td}><code>{d.docNumber}</code></td>
                          <td style={S.td}><strong>{d.title}</strong></td>
                          <td style={S.td}>{d.department}</td>
                          <td style={S.td}>{getFileIcon(d.docType)}</td>
                          <td style={S.td}>v{d.version}</td>
                          <td style={S.td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button style={{ ...S.btn(true), padding: "4px 8px" }} onClick={() => setViewingDoc(d)}>👁️ View</button>
                              <button style={{ ...S.btn(true), padding: "4px 8px", background: "#FEF2F2", color: "#991B1B" }} onClick={() => setRequestingChangeDoc(d)}>🔄 Request Change</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Style Full-Screen Secure Reading Console */}
        {viewingDoc && (
          <div style={{
            position: "fixed", inset: 0, background: "#1F1F1F", zIndex: 10000,
            display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif"
          }}>
            {/* Google Drive Style Header Bar */}
            <div style={{
              background: "#1A1A1A", height: 56, display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid #333333",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}>
              {/* Left Section: Doc Details */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#FFF", fontSize: 18,
                    cursor: "pointer", display: "flex", alignItems: "center", padding: 8, borderRadius: "50%"
                  }}
                  onClick={() => setViewingDoc(null)}
                  title="Back to library"
                >
                  ←
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>
                    {viewingDoc.docType === "PDF" ? "📕" : viewingDoc.docType === "Word" ? "📝" : "📊"}
                  </span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ color: "#FFF", fontSize: 13, fontWeight: 600 }}>
                      {viewingDoc.title}
                    </span>
                    <span style={{ color: "#9A9A9A", fontSize: 11, fontFamily: "monospace" }}>
                      {viewingDoc.docNumber} (v{viewingDoc.version} · {viewingDoc.status})
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Section: Zoom Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#2D2D2D", borderRadius: 20, padding: "2px 8px" }}>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#FFF", fontSize: 14,
                    width: 24, height: 24, cursor: zoom <= 50 ? "not-allowed" : "pointer", opacity: zoom <= 50 ? 0.4 : 1
                  }}
                  disabled={zoom <= 50}
                  onClick={() => setZoom(z => Math.max(50, z - 10))}
                  title="Zoom out"
                >
                  −
                </button>
                <span style={{ color: "#FFF", fontSize: 11, minWidth: 40, textAlign: "center", fontWeight: "bold" }}>
                  {zoom}%
                </span>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#FFF", fontSize: 14,
                    width: 24, height: 24, cursor: zoom >= 150 ? "not-allowed" : "pointer", opacity: zoom >= 150 ? 0.4 : 1
                  }}
                  disabled={zoom >= 150}
                  onClick={() => setZoom(z => Math.min(150, z + 10))}
                  title="Zoom in"
                >
                  +
                </button>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#38BDF8", fontSize: 10,
                    cursor: "pointer", fontWeight: "bold", padding: "0 6px"
                  }}
                  onClick={() => setZoom(100)}
                >
                  Reset
                </button>
              </div>

              {/* Right Section: Audited Actions & Close */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#FFF", fontSize: 16,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 4
                  }}
                  onClick={() => setSecurityAlert("print")}
                  title="Print Document"
                >
                  🖨️ <span style={{ fontSize: 11, color: "#D1D5DB" }}>Print</span>
                </button>
                <button
                  style={{
                    background: "transparent", border: "none", color: "#FFF", fontSize: 16,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 4
                  }}
                  onClick={() => setSecurityAlert("download")}
                  title="Download File"
                >
                  📥 <span style={{ fontSize: 11, color: "#D1D5DB" }}>Download</span>
                </button>
                <button
                  style={{
                    padding: "6px 14px", background: "#0D9488", color: "#FFF",
                    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer"
                  }}
                  onClick={() => setViewingDoc(null)}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Google Drive Style Document Sheet Container */}
            <div style={{
              flex: 1, background: "#282828", overflow: "auto", display: "flex",
              justifyContent: "center", padding: "24px 16px", position: "relative"
            }}>
              {/* Confidentially Watermark */}
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexWrap: "wrap",
                alignContent: "space-around", justifyContent: "space-around",
                pointerEvents: "none", zIndex: 1, opacity: 0.02, transform: "rotate(-15deg)",
                fontSize: 24, fontWeight: 800, color: "#FFF", letterSpacing: 2
              }}>
                {Array(24).fill("CONFIDENTIAL - MBL QMS - SECURE AUDIT").map((txt, i) => (
                  <div key={i}>{txt}</div>
                ))}
              </div>

              {/* White A4 Document Sheet scaled by Zoom state */}
              <div style={{
                width: "100%", maxWidth: 850 * (zoom / 100), background: "#FFF", color: "#1E293B",
                borderRadius: 4, boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                padding: (60 * (zoom / 100)) + "px " + (80 * (zoom / 100)) + "px", boxSizing: "border-box", 
                position: "relative", zIndex: 2, minHeight: 1100 * (zoom / 100), alignSelf: "flex-start",
                transition: "all 0.1s ease-out"
              }}>
                {/* Letterhead */}
                <div style={{ textAlign: "center", borderBottom: (2 * (zoom / 100)) + "px solid #CBD5E1", paddingBottom: 20 * (zoom / 100), marginBottom: 30 * (zoom / 100) }}>
                  <h1 style={{ margin: 0, fontSize: 22 * (zoom / 100), fontWeight: 800, letterSpacing: "-0.02em", color: "#0F172A" }}>
                    MBL DIAGNOSTIC LABORATORIES
                  </h1>
                  <span style={{ fontSize: 11 * (zoom / 100), color: "#0D9488", fontWeight: 700, letterSpacing: 2 * (zoom / 100), textTransform: "uppercase" }}>
                    Quality Management System
                  </span>
                </div>

                {/* Doc Details Grid */}
                <div style={{ 
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 * (zoom / 100), 
                  fontSize: 12 * (zoom / 100), marginBottom: 30 * (zoom / 100), 
                  borderBottom: (1 * (zoom / 100)) + "px dashed #CBD5E1", paddingBottom: 20 * (zoom / 100) 
                }}>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Document Level</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{viewingDoc.docLevel}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Reference Code</div>
                    <div style={{ fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>{viewingDoc.docNumber}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Effective Date</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{viewingDoc.effectiveDate}</div>
                  </div>
                  <div>
                    <div style={{ color: "#64748B", fontWeight: 600 }}>Attachment Format</div>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{viewingDoc.docType} File</div>
                  </div>
                </div>

                {/* Interactive File Preview Mockup */}
                <div style={{ marginBottom: 30 * (zoom / 100) }}>
                  <div style={{ display: "flex", borderBottom: (2 * (zoom / 100)) + "px solid #E2E8F0", marginBottom: 16 * (zoom / 100) }}>
                    <div style={{ padding: (8 * (zoom / 100)) + "px " + (16 * (zoom / 100)) + "px", borderBottom: (2 * (zoom / 100)) + "px solid #0D9488", fontWeight: 700, fontSize: 12 * (zoom / 100), color: "#0D9488" }}>
                      📄 Document Text
                    </div>
                    <div style={{ padding: (8 * (zoom / 100)) + "px " + (16 * (zoom / 100)) + "px", color: "#64748B", fontSize: 12 * (zoom / 100), cursor: "not-allowed" }}>
                      📎 Original Attachment ({viewingDoc.docType})
                    </div>
                  </div>

                  <div style={{ fontSize: 13 * (zoom / 100), lineHeight: 1.7, color: "#334155" }}>
                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0" }}><strong>1.0 PURPOSE & SCOPE:</strong></p>
                    <p style={{ margin: "0 0 " + 24 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                      {viewingDoc.description || "This document outlines standard operating procedures for MBL quality control compliance and personnel operations."}
                    </p>

                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0" }}><strong>2.0 RESPONSIBILITY:</strong></p>
                    <p style={{ margin: "0 0 " + 24 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                      All laboratory technical staff, HODs, and Quality Executives are bound to adhere to these instructions. Modifications are prohibited except through an authorized Document Change Request (DCR) approved by the Quality Department.
                    </p>

                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0" }}><strong>3.0 OPERATIONAL PROTOCOLS & CONTROLS:</strong></p>
                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                      3.1 Technical verification of results must follow NABL guidelines. All calibration outliers must be logged as NCRs and linked to appropriate risk codes.
                    </p>
                    <p style={{ margin: "0 0 " + 24 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                      3.2 Daily maintenance of instruments must be signed off on the respective equipment logs. Breakdown requests are managed through the Biomedical engineering flow.
                    </p>

                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0" }}><strong>4.0 QUALITY ASSURANCE & AUDITS:</strong></p>
                    <p style={{ margin: "0 0 " + 16 * (zoom / 100) + "px 0", paddingLeft: 16 * (zoom / 100) }}>
                      Regular compliance audits will verify adherence to this SOP. Document versions must match the approved apex hierarchy register. Superseded records are archived instantly.
                    </p>
                  </div>
                </div>

                {/* Secure Seal Footer */}
                <div style={{
                  borderTop: (2 * (zoom / 100)) + "px solid #CBD5E1", paddingTop: 20 * (zoom / 100), marginTop: 40 * (zoom / 100),
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div style={{ fontSize: 10 * (zoom / 100), color: "#64748B" }}>
                    Generated dynamically for: <strong>{userName || "Lab Staff"}</strong> ({role}) <br />
                    Session ID: <code>{Math.random().toString(36).substring(2, 10).toUpperCase()}</code>
                  </div>
                  <div style={{
                    border: (1 * (zoom / 100)) + "px solid #10B981", borderRadius: 4 * (zoom / 100), padding: (4 * (zoom / 100)) + "px " + (12 * (zoom / 100)) + "px",
                    background: "#ECFDF5", color: "#047857", fontSize: 10 * (zoom / 100), fontWeight: 700
                  }}>
                    🛡️ AUDITED ISO 15189 COMPLIANT COPY
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Alert Toast/Modal */}
        {securityAlert && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
            justifyContent: "center", zIndex: 11000, fontFamily: "'Inter', sans-serif"
          }}>
            <div style={{
              background: "#FFF", borderRadius: 12, padding: 24, maxWidth: 450,
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", textAlign: "center",
              border: "1px solid #E2E8F0"
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
              <h3 style={{ margin: "0 0 10px 0", color: "#0F172A", fontSize: 16, fontWeight: 700 }}>
                Security Action Blocked
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, margin: "0 0 20px" }}>
                Uncontrolled printing or downloading of QMS compliance documents is restricted under 
                <strong> ISO 15189 §8.3</strong> guidelines to prevent circulation of deprecated versions.
              </p>
              <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, fontSize: 11.5, color: "#475569", marginBottom: 20 }}>
                For offline distribution or print permissions, please raise a Document Change Request (DCR) or contact the Quality Department.
              </div>
              <button
                style={{
                  padding: "8px 20px", background: "#0F172A", color: "#FFF",
                  border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer"
                }}
                onClick={() => setSecurityAlert(null)}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        )}

        {/* Request Change view */}
        {requestingChangeDoc && (
          <DocumentChangeRequest 
            targetDoc={requestingChangeDoc} 
            onCancel={() => setRequestingChangeDoc(null)} 
            onSuccess={() => {
              setRequestingChangeDoc(null);
              setActiveTab("change_req");
            }}
          />
        )}

        {/* Modular Tabs */}
        {activeTab === "new_doc" && <NewDocument onComplete={() => { setActiveTab("active_docs"); fetchDocs(); }} />}
        {activeTab === "change_req" && <DocumentChangeRequest onComplete={fetchDocs} />}
        {activeTab === "review_queue" && <DocumentReview onComplete={fetchDocs} />}
        {activeTab === "history" && <RevisionHistory docs={docs} />}
        {activeTab === "obsolete" && <ObsoleteDocuments docs={docs} />}
      </div>
    </div>
  );
}
