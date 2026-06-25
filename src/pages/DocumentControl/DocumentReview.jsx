import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const S = {
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (secondary, danger) => ({
    padding: "6px 12px", 
    background: danger ? "#FEF2F2" : (secondary ? "#F1F5F9" : "#0D9488"), 
    color: danger ? "#991B1B" : (secondary ? "#475569" : "#FFF"),
    border: danger ? "1px solid #FCA5A5" : (secondary ? "1px solid #CBD5E1" : "none"), 
    borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", marginRight: 6
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  field: { display: "flex", flexDirection: "column", gap: 6 }
};

export default function DocumentReview({ onComplete }) {
  const { name: userName } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const fetchPendingDocs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "documents"), orderBy("createdAt", "desc")));
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(d => d.status === "Pending review");
      setDocs(pending);
    } catch (e) {
      console.warn("Could not load pending review documents, using fallbacks:", e);
      setDocs([
        { id: "doc6", docNumber: "SOP-SERO-008", title: "ELISA HIV Kit Calibration Protocol", docLevel: "Department SOPs", department: "Serology", status: "Pending review", version: "1.0", docType: "PDF", description: "Standard operating procedure for ELISA diagnostic run startup and troubleshooting.", createdBy: "Lab Tech", effectiveDate: "2026-06-17", revisions: [] }
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingDocs();
  }, [fetchPendingDocs]);

  const handleReview = async (approve) => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const docRef = doc(db, "documents", selectedDoc.id);
      
      const newRevision = {
        version: selectedDoc.version,
        date: new Date().toISOString().split("T")[0],
        changedBy: selectedDoc.createdBy || "System",
        notes: approve ? `Approved by ${userName}. ${reviewNote}` : `Rejected: ${reviewNote}`
      };

      const existingRevisions = selectedDoc.revisions || [];
      const updatedRevisions = approve ? [...existingRevisions, newRevision] : existingRevisions;

      await updateDoc(docRef, {
        status: approve ? "Approved" : "Draft",
        reviewedBy: userName,
        reviewedAt: serverTimestamp(),
        reviewNote: reviewNote,
        approvedBy: approve ? userName : null,
        effectiveDate: new Date().toISOString().split("T")[0],
        revisions: updatedRevisions
      });

      alert(`Document has been successfully ${approve ? "Approved & Released" : "Rejected back to Draft"}.`);
      setSelectedDoc(null);
      setReviewNote("");
      fetchPendingDocs();
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to save document review status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>📋 Document Verification Queue (ISO 15189 §8.3.1.2)</div>
      </div>
      <div style={S.cardBody}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>Loading review queue...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>No documents pending review or approval.</div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Hierarchy</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Doc Number</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Document Title</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Department</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Created By</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", background: "#EFF6FF", color: "#1E40AF", borderRadius: 4, fontWeight: "bold" }}>
                        {d.docLevel}
                      </span>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><code>{d.docNumber}</code></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><strong>{d.title}</strong></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>{d.department}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>{d.createdBy}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                      <button style={S.btn(true)} onClick={() => setSelectedDoc(selectedDoc?.id === d.id ? null : d)}>Review Draft</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedDoc && (
              <div style={{ marginTop: 20, border: "1px solid #E2E8F0", borderRadius: 8, padding: 16, background: "#F8FAFC" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1E293B" }}>Reviewing: {selectedDoc.title} ({selectedDoc.docNumber})</h4>
                <div style={S.grid(3)}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Level:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>{selectedDoc.docLevel}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Format:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>{selectedDoc.docType}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Proposed Version:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>v{selectedDoc.version}</p>
                  </div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Description / Purpose:</span>
                  <p style={{ margin: "2px 0", fontSize: 12, background: "#FFF", padding: 8, borderRadius: 6, border: "1px solid #E2E8F0" }}>{selectedDoc.description || "No description provided."}</p>
                </div>

                <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
                  <div style={S.field}>
                    <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Approver / Review Comments</span>
                    <textarea
                      style={{ ...S.inp, minHeight: 60, resize: "vertical", marginBottom: 12 }}
                      placeholder="Comment on suitability, validation check results, or reason for rejection..."
                      value={reviewNote}
                      onChange={e => setReviewNote(e.target.value)}
                    />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button style={S.btn(false, true)} onClick={() => handleReview(false)} disabled={saving}>Reject & Send Back</button>
                    <button style={S.btn(false, false)} onClick={() => handleReview(true)} disabled={saving}>{saving ? "Processing..." : "Approve & Release Document"}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
