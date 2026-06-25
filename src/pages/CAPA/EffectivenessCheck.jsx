import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const S = {
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16 }),
  field: { background: "#F8FAFC", borderRadius: 8, padding: "10px 14px", border: "1px solid #E2E8F0" },
  label: { fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase" },
  val: { fontSize: 12, color: "#1E293B", marginTop: 4, fontWeight: 500 },
  inp: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", marginTop: 4 },
  btn: (secondary, danger) => ({
    padding: "8px 16px",
    background: danger ? "#FEF2F2" : (secondary ? "#F1F5F9" : "#185FA5"),
    color: danger ? "#991B1B" : (secondary ? "#475569" : "#FFF"),
    border: danger ? "1px solid #FCA5A5" : (secondary ? "1px solid #CBD5E1" : "none"),
    borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8
  }),
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#1E293B", marginBottom: 12, marginTop: 20, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }
};

export default function EffectivenessCheck({ capa, onComplete }) {
  const { role, name: userName, dept } = useAuth();
  const [saving, setSaving] = useState(false);
  const [effective, setEffective] = useState(true);
  const [effectivenessNote, setEffectivenessNote] = useState(capa.effectivenessNote || "");

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  const handleAssessment = async (e) => {
    e.preventDefault();
    if (!effectivenessNote) {
      alert("Please enter effectiveness evaluation notes / evidence.");
      return;
    }
    setSaving(true);
    try {
      const docRef = doc(db, "capas", capa.id);
      await updateDoc(docRef, {
        status: effective ? "Closed" : "Reopened",
        effectivenessNote,
        effectivenessCheckedBy: userName,
        effectivenessCheckedAt: serverTimestamp(),
        closedAt: effective ? serverTimestamp() : null
      });

      // If effective and linked to an NCR, optionally close that NCR automatically if it was CAPA raised
      if (effective && capa.ncrId) {
        try {
          const ncrRef = doc(db, "nonConformities", capa.ncrId);
          await updateDoc(ncrRef, {
            status: "Closed",
            closedAt: serverTimestamp(),
            closedBy: userName
          });
        } catch (err) {
          console.warn("Could not automatically close linked NCR:", err);
        }
      }

      alert(`CAPA evaluation submitted. Status updated to: ${effective ? "Closed" : "Reopened"}`);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to submit effectiveness check.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={S.grid(3)}>
        <div style={S.field}>
          <div style={S.label}>CAPA Ticket ID</div>
          <div style={{ ...S.val, fontFamily: "monospace", fontSize: 13, color: "#185FA5" }}>{capa.capaNumber}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Classification Type</div>
          <div style={S.val}>{capa.actionType} Action</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Current Status</div>
          <div style={S.val}>
            <span style={{
              padding: "4px 8px", borderRadius: 8, fontSize: 11, fontWeight: "bold",
              background: capa.status === "Closed" ? "#E1F5EE" : capa.status === "Pending effectiveness check" ? "#E6F1FB" : "#FAEEDA",
              color: capa.status === "Closed" ? "#0F6E56" : capa.status === "Pending effectiveness check" ? "#185FA5" : "#854F0B"
            }}>{capa.status}</span>
          </div>
        </div>
      </div>

      <div style={S.grid(3)}>
        <div style={S.field}>
          <div style={S.label}>Responsible Owner</div>
          <div style={S.val}>{capa.responsiblePerson}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Target Completion Date</div>
          <div style={S.val}>{capa.targetDate}</div>
        </div>
        <div style={S.field}>
          <div style={S.label}>Linked NCR Ref</div>
          <div style={{ ...S.val, fontFamily: "monospace" }}>{capa.ncrNumber || "No Linked NCR"}</div>
        </div>
      </div>

      {/* Pre & Post Mitigation Risk Displays */}
      <div style={S.grid(2)}>
        <div style={{ ...S.field, borderLeft: "4px solid #EF4444" }}>
          <div style={S.label}>Pre-Mitigation Risk Index</div>
          <div style={{ ...S.val, fontWeight: "bold", color: "#B91C1C" }}>
            {capa.preRiskScore || "9"} / 25
          </div>
        </div>
        <div style={{ ...S.field, borderLeft: "4px solid #10B981" }}>
          <div style={S.label}>Post-Mitigation / Residual Risk Index</div>
          <div style={{ ...S.val, fontWeight: "bold", color: "#047857" }}>
            {capa.postRiskScore || "2"} / 25
          </div>
        </div>
      </div>

      <div style={S.field}>
        <div style={S.label}>Action Plan Details</div>
        <div style={{ ...S.val, whiteSpace: "pre-line", lineHeight: 1.5, background: "#FFF", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>{capa.actionPlan}</div>
      </div>

      <div style={S.sectionTitle}>Effectiveness Assessment Checksheet (ISO 15189 §8.5.1.3)</div>

      {capa.status === "Pending effectiveness check" ? (
        isQuality ? (
          <form onSubmit={handleAssessment}>
            <div style={{ marginBottom: 15 }}>
              <span style={S.label}>Verification Audit Outcome *</span>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setEffective(true)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12,
                    border: effective ? "2px solid #0F6E56" : "1px solid #CBD5E1",
                    background: effective ? "#E1F5EE" : "#FFF",
                    color: effective ? "#085041" : "#475569"
                  }}
                >
                  ✓ CAPA Effective (Close Ticket)
                </button>
                <button
                  type="button"
                  onClick={() => setEffective(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: "bold", fontSize: 12,
                    border: !effective ? "2px solid #A32D2D" : "1px solid #CBD5E1",
                    background: !effective ? "#FCEBEB" : "#FFF",
                    color: !effective ? "#791F1F" : "#475569"
                  }}
                >
                  ✕ Not Fully Effective (Reopen & Revise CAPA)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
              <span style={S.label}>Effectiveness Evaluation Notes & Evidence *</span>
              <textarea
                style={{ ...S.inp, minHeight: 80 }}
                placeholder="Log exact verification checks performed. E.g. Checked IQC z-scores for last 10 days; verified no repeat failures occurred..."
                value={effectivenessNote}
                onChange={e => setEffectivenessNote(e.target.value)}
                required
              />
            </div>

            {!effective && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 12, fontSize: 11, color: "#991B1B", marginBottom: 16 }}>
                ⚠️ <strong>Reopening CAPA:</strong> This will place the CAPA back into the active queue to allow revisions to the action plan.
              </div>
            )}

            <div style={{ textAlign: "right" }}>
              <button type="submit" style={S.btn(false, !effective)} disabled={saving}>
                {saving ? "Submitting..." : effective ? "Confirm & Close CAPA" : "Reopen CAPA Plan"}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: 12, background: "#F1F5F9", color: "#475569", borderRadius: 8, fontSize: 12 }}>
            Action items are complete. Pending Quality Manager effectiveness check and sign-off.
          </div>
        )
      ) : (
        <div>
          {capa.effectivenessCheckedBy ? (
            <div>
              <div style={S.grid(2)}>
                <div style={S.field}>
                  <div style={S.label}>Audited By</div>
                  <div style={S.val}>
                    {capa.effectivenessCheckedBy} on {capa.effectivenessCheckedAt ? new Date(capa.effectivenessCheckedAt.toDate?.() || capa.effectivenessCheckedAt).toLocaleDateString() : "—"}
                  </div>
                </div>
                <div style={S.field}>
                  <div style={S.label}>Audit Verdict</div>
                  <div style={{ ...S.val, fontWeight: "bold", color: capa.status === "Closed" ? "#0F6E56" : "#A32D2D" }}>
                    {capa.status === "Closed" ? "✓ Fully Effective" : "✕ Ineffective / Reopened"}
                  </div>
                </div>
              </div>
              <div style={S.field}>
                <div style={S.label}>Audit Evaluation & Evidence Logs</div>
                <div style={S.val}>{capa.effectivenessNote}</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: "#F1F5F9", color: "#64748B", borderRadius: 8, fontSize: 12, textAlign: "center" }}>
              This CAPA is in a preliminary state. No effectiveness check has been logged yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
