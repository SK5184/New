// DiscardApproval.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { discardSampleSpecimen } from "./retentionService";

export default function DiscardApproval({ auditLogs, samples, onRefresh }) {
  const { userName } = useAuth();
  
  const [approverReason, setApproverReason] = useState("Retention period completed");
  const [saving, setSaving] = useState(false);

  // Samples pending discard approval
  const pendingSamples = samples.filter(s => s.status === "Pending Approval" || s.status === "Ready for Discard");

  const handleApproveDiscard = async (sample) => {
    if (!window.confirm(`Confirm discard approval for sample ${sample.sampleId}?`)) return;
    
    setSaving(true);
    try {
      await discardSampleSpecimen(
        sample.id, 
        sample.createdBy || "Technologist", 
        userName || "Quality Manager", 
        approverReason, 
        sample.retentionPolicyId
      );
      alert(`Specimen ${sample.sampleId} successfully marked as Discarded.`);
      onRefresh();
    } catch (err) {
      alert("Error approving discard. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const S = {
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    cardBody: { padding: 16 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 12px", borderBottom: "0.5px solid #CBD5E1", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" },
    inp: { padding: "5px 8px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 11, width: "100%", outline: "none" },
    btn: (bg, color) => ({
      padding: "4px 10px", background: bg || "#0F6E56", color: color || "#FFF",
      border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer"
    })
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 20 }}>
      {/* Pending Discard list */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Samples Awaiting Discard Approval</span>
          <span style={{ fontSize: 10, background: "#FAF5FF", padding: "2px 8px", borderRadius: 12, fontWeight: 600, color: "#7E22CE" }}>
            Pending Review: {pendingSamples.length}
          </span>
        </div>
        <div style={S.cardBody}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: "#475569" }}>Disposal Comment / Audit Reason</span>
            <input 
              style={S.inp} 
              value={approverReason} 
              onChange={e => setApproverReason(e.target.value)} 
              placeholder="e.g. Storage period expired, safe disposal verified"
            />
          </div>

          <div style={{ overflowX: "auto" }}>
            {pendingSamples.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748B" }}>No specimens awaiting discard approval.</div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Sample ID</th>
                    <th style={S.th}>Dept</th>
                    <th style={S.th}>Test</th>
                    <th style={S.th}>End Date</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSamples.map(s => (
                    <tr key={s.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{s.sampleId}</td>
                      <td style={S.td}>{s.department}</td>
                      <td style={S.td}>{s.test}</td>
                      <td style={{ ...S.td, color: "#B45309" }}>{s.retentionEndDate}</td>
                      <td style={S.td}>
                        <button 
                          onClick={() => handleApproveDiscard(s)}
                          disabled={saving}
                          style={S.btn("#DC2626", "#FFF")}
                        >
                          Approve Discard
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Discard Audit Register */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Sample Discard Audit Trail (Tamper-Proof)</span>
          <span style={{ fontSize: 10, background: "#ECFDF5", padding: "2px 8px", borderRadius: 12, fontWeight: 600, color: "#047857" }}>
            Total Audit Records: {auditLogs.length}
          </span>
        </div>
        <div style={{ overflowX: "auto", maxHeight: 450 }}>
          {auditLogs.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No discard audit trails logged.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Sample ID</th>
                  <th style={S.th}>Discard Date</th>
                  <th style={S.th}>Discarded By</th>
                  <th style={S.th}>QA Sign-off</th>
                  <th style={S.th}>Policy ID</th>
                  <th style={S.th}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#B91C1C" }}>{log.sampleId}</td>
                    <td style={S.td}>{log.discardDate}</td>
                    <td style={S.td}>{log.discardedBy}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{log.approvedBy}</td>
                    <td style={{ ...S.td, fontFamily: "monospace" }}>{log.retentionPolicyApplied}</td>
                    <td style={{ ...S.td, color: "#64748B", fontStyle: "italic" }}>"{log.reason}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
