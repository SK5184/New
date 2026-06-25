import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
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
  badge: (status) => {
    let bg = "#F1F5F9", fg = "#475569";
    if (status === "Approved") { bg = "#ECFDF5"; fg = "#065F46"; }
    if (status === "Rejected") { bg = "#FEF2F2"; fg = "#991B1B"; }
    if (status === "Pending") { bg = "#FFFBEB"; fg = "#92400E"; }
    return { padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg };
  }
};

export default function DocumentChangeRequest({ targetDoc, onCancel, onSuccess, onComplete }) {
  const { role, name: userName, dept } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDCR, setActiveDCR] = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  // Form fields for a new request
  const [form, setForm] = useState({
    reason: "",
    proposedChanges: "",
    sectionAffected: "",
    priority: "Routine" // Routine | Urgent
  });

  const fetchRequests = useCallback(async () => {
    if (targetDoc) return; // Don't fetch list if we are in "Create Request" modal mode
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "document_change_requests"), orderBy("createdAt", "desc")));
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Could not load change requests, using fallbacks:", e);
      setRequests([
        { id: "dcr1", docId: "doc3", docNumber: "SOP-BIOC-012", docTitle: "Roche Cobas c311 Analyzer Operation SOP", reason: "New calibration protocol released by Roche for serum proteins.", proposedChanges: "Update Section 4.2 calibration schedule from bi-weekly to weekly.", sectionAffected: "Section 4.2 Calibration", requestedBy: "Dr. Suresh Kumar", requestedAt: new Date(Date.now() - 86400000).toISOString(), status: "Pending", priority: "Routine" },
        { id: "dcr2", docId: "doc2", docNumber: "QSP-GEN-002", docTitle: "Non-Conforming Work Management Procedure", reason: "Clarify CAPA trigger thresholds.", proposedChanges: "Add clause that 3 repeat non-conformities of minor status trigger a CAPA.", sectionAffected: "Section 6.1 Trigger Events", requestedBy: "Sarah Jenkins", requestedAt: new Date(Date.now() - 172800000).toISOString(), status: "Approved", priority: "Urgent", approvedBy: "Quality Manager", approvedAt: new Date(Date.now() - 86400000).toISOString(), reviewNote: "Approved. Moving document back to draft for edits." }
      ]);
    }
    setLoading(false);
  }, [targetDoc]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!form.reason || !form.proposedChanges) {
      alert("Please specify the reason for change and proposed modifications.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "document_change_requests"), {
        docId: targetDoc.id,
        docNumber: targetDoc.docNumber,
        docTitle: targetDoc.title,
        reason: form.reason,
        proposedChanges: form.proposedChanges,
        sectionAffected: form.sectionAffected || "Entire Document",
        priority: form.priority,
        status: "Pending",
        requestedBy: userName || "Staff",
        createdAt: serverTimestamp()
      });
      alert("Document Change Request (DCR) submitted for Quality department review.");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to submit change request.");
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (dcr, approve) => {
    setSaving(true);
    try {
      const requestRef = doc(db, "document_change_requests", dcr.id);
      await updateDoc(requestRef, {
        status: approve ? "Approved" : "Rejected",
        reviewedBy: userName,
        reviewedAt: serverTimestamp(),
        reviewNote: reviewNote
      });

      // If approved, automatically transition the target document back to "Draft" to allow Quality to apply revisions.
      if (approve) {
        const docRef = doc(db, "documents", dcr.docId);
        await updateDoc(docRef, {
          status: "Draft",
          dcrReference: dcr.id,
          dcrApprovedBy: userName
        });
      }

      alert(`Change request successfully ${approve ? "approved" : "rejected"}.`);
      setActiveDCR(null);
      setReviewNote("");
      fetchRequests();
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Error updating change request:", err);
      alert("Failed to review request.");
    } finally {
      setSaving(false);
    }
  };

  // If in targetDoc creation form mode:
  if (targetDoc) {
    return (
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>🔄 Raise Document Change Request (DCR): {targetDoc.title}</div>
          <button style={S.btn(true)} onClick={onCancel}>Cancel</button>
        </div>
        <div style={S.cardBody}>
          <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: 12, fontSize: 11, color: "#92400E", marginBottom: 16 }}>
            <strong>ISO 15189 §8.3 Control:</strong> Department staff cannot modify documents directly. Submitting this form alerts the Quality department who will review the request, draft a new revision, and route it through verification.
          </div>
          <form onSubmit={handleSubmitRequest}>
            <div style={S.grid(2)}>
              <div>
                <span style={{ fontSize: 11, color: "#64748B" }}>Document Reference</span>
                <div style={{ padding: "8px 12px", background: "#F1F5F9", borderRadius: 6, fontSize: 12, fontWeight: "bold" }}>{targetDoc.docNumber}</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#64748B" }}>Active Version</span>
                <div style={{ padding: "8px 12px", background: "#F1F5F9", borderRadius: 6, fontSize: 12, fontWeight: "bold" }}>v{targetDoc.version}</div>
              </div>
            </div>

            <div style={S.grid(2)}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Section / Clause Affected</span>
                <input type="text" style={S.inp} placeholder="e.g. Section 3.2 Calibration Frequency" value={form.sectionAffected} onChange={e => setForm({ ...form, sectionAffected: e.target.value })} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Priority Level</span>
                <select style={S.inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                  <option value="Routine">Routine Review</option>
                  <option value="Urgent">Urgent Change (Audit / Compliance Issue)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Reason for Modification Request *</span>
              <textarea style={{ ...S.inp, minHeight: 60, resize: "vertical" }} placeholder="Why is this document change required? e.g. Manufacturer kit insert updated..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Details of Proposed Changes *</span>
              <textarea style={{ ...S.inp, minHeight: 80, resize: "vertical" }} placeholder="Provide explicit details of what text or parameters should be modified, added, or deleted..." value={form.proposedChanges} onChange={e => setForm({ ...form, proposedChanges: e.target.value })} required />
            </div>

            <div style={{ textAlign: "right", borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
              <button type="button" style={S.btn(true)} onClick={onCancel}>Cancel</button>
              <button type="submit" style={S.btn(false)} disabled={saving}>{saving ? "Submitting..." : "Submit Change Request (DCR)"}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If in list review dashboard mode:
  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>🔄 Document Change Requests Inbox (DCR Approval Flow)</div>
      </div>
      <div style={S.cardBody}>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>No Change Requests (DCRs) recorded in logs.</div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Doc Number</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Document Title</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Requested By</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Priority</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Status</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><code>{r.docNumber}</code></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><strong>{r.docTitle}</strong></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>{r.requestedBy}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>
                      <span style={{ color: r.priority === "Urgent" ? "#E11D48" : "#475569", fontWeight: r.priority === "Urgent" ? 600 : 400 }}>
                        {r.priority}
                      </span>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>
                      <span style={S.badge(r.status)}>{r.status}</span>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                      <button style={S.btn(true)} onClick={() => setActiveDCR(activeDCR?.id === r.id ? null : r)}>👁️ View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activeDCR && (
              <div style={{ marginTop: 20, border: "1px solid #E2E8F0", borderRadius: 8, padding: 16, background: "#F8FAFC" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "#1E293B" }}>DCR Details: {activeDCR.docTitle} ({activeDCR.docNumber})</h4>
                <div style={S.grid(2)}>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Section Affected:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>{activeDCR.sectionAffected}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#64748B" }}>Requested:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>{activeDCR.requestedBy} on {new Date(activeDCR.requestedAt || activeDCR.createdAt?.toDate?.() || activeDCR.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Reason for Change:</span>
                  <p style={{ margin: "2px 0", fontSize: 12, background: "#FFF", padding: 8, borderRadius: 6, border: "1px solid #E2E8F0" }}>{activeDCR.reason}</p>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Proposed Changes:</span>
                  <p style={{ margin: "2px 0", fontSize: 12, background: "#FFF", padding: 8, borderRadius: 6, border: "1px solid #E2E8F0" }}>{activeDCR.proposedChanges}</p>
                </div>

                {activeDCR.status === "Pending" && isQuality ? (
                  <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 12 }}>
                    <span style={{ fontSize: 11, color: "#64748B", display: "block", marginBottom: 6 }}>Quality Review Notes / Instructions</span>
                    <input type="text" style={{ ...S.inp, marginBottom: 12 }} placeholder="Specify comments or action requirements..." value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
                    <div style={{ textAlign: "right" }}>
                      <button style={S.btn(false, true)} onClick={() => handleReview(activeDCR, false)} disabled={saving}>Reject Request</button>
                      <button style={S.btn(false, false)} onClick={() => handleReview(activeDCR, true)} disabled={saving}>Approve & Create Draft Revision</button>
                    </div>
                  </div>
                ) : (
                  activeDCR.reviewedBy && (
                    <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 10, fontSize: 11, color: "#475569" }}>
                      <strong>Reviewed By:</strong> {activeDCR.reviewedBy} ({activeDCR.status}) <br />
                      <strong>Notes:</strong> {activeDCR.reviewNote || "No notes added."}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
