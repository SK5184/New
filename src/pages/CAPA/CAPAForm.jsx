import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const S = {
  inp: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 16 }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#64748B" },
  btn: (secondary) => ({
    padding: "8px 16px", background: secondary ? "#F1F5F9" : "#185FA5", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8
  }),
  riskMatrix: {
    padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, display: "flex", flexDirection: "column", gap: 8
  }
};

const ACTION_TYPES = ["Corrective", "Preventive", "Both"];

export default function CAPAForm({ onComplete, onCancel }) {
  const { name: userName } = useAuth();
  const [saving, setSaving] = useState(false);
  const [ncrs, setNcrs] = useState([]);

  // Form states
  const [form, setForm] = useState({
    ncrId: "",
    ncrNumber: "",
    title: "",
    actionType: "Corrective",
    actionPlan: "",
    responsiblePerson: "",
    targetDate: new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0], // default 14 days out
    preSeverity: 3,
    preLikelihood: 3,
    postSeverity: 2,
    postLikelihood: 1
  });

  useEffect(() => {
    // Fetch NCRs that are awaiting CAPA
    const fetchNcrs = async () => {
      try {
        const snap = await getDocs(query(collection(db, "nonConformities"), where("status", "in", ["Open", "Under investigation", "CAPA raised"])));
        setNcrs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Could not fetch awaiting NCRs from Firestore, using mock list:", err);
        setNcrs([
          { id: "ncr1", ncrNumber: "NCR-2026-001", title: "Roche Cobas c311 Serum Bilirubin Control Outlier" },
          { id: "ncr2", ncrNumber: "NCR-2026-002", title: "Patient Sample Mismatch in Serology" },
          { id: "ncr3", ncrNumber: "NCR-2026-003", title: "LIMS Connection Latency" }
        ]);
      }
    };
    fetchNcrs();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.actionPlan || !form.responsiblePerson) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      // Fetch current capas count to compute seq ID
      let seq = 1;
      try {
        const snap = await getDocs(collection(db, "capas"));
        seq = snap.size + 1;
      } catch (err) {
        seq = Math.floor(Math.random() * 800) + 100;
      }

      const capaNumber = `CAPA-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`;

      const preRiskScore = form.preSeverity * form.preLikelihood;
      const postRiskScore = form.postSeverity * form.postLikelihood;

      const payload = {
        ...form,
        capaNumber,
        preRiskScore,
        postRiskScore,
        status: "Open",
        createdAt: serverTimestamp(),
        createdBy: userName || "Quality Executive"
      };

      await addDoc(collection(db, "capas"), payload);

      // If linked to an NCR, update the NCR status to "CAPA raised" and attach linked CAPA number
      if (form.ncrId) {
        try {
          const docRef = doc(db, "nonConformities", form.ncrId);
          await updateDoc(docRef, {
            status: "CAPA raised",
            capaNumber,
            linkedCapaId: capaNumber
          });
        } catch (err) {
          console.warn("Failed to update linked NCR status:", err);
        }
      }

      alert(`CAPA registered successfully: ${capaNumber}`);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert("Failed to register CAPA.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleCreate}>
      <div style={S.field}>
        <span style={S.label}>Link to Source NCR ticket (Awaiting CAPA)</span>
        <select
          style={S.inp}
          value={form.ncrId}
          onChange={e => {
            const matched = ncrs.find(n => n.id === e.target.value);
            setForm({
              ...form,
              ncrId: e.target.value,
              ncrNumber: matched ? matched.ncrNumber : "",
              title: matched ? `CAPA Action Plan for ${matched.title}` : form.title
            });
          }}
        >
          <option value="">-- No Direct NCR Link --</option>
          {ncrs.map(n => (
            <option key={n.id} value={n.id}>{n.ncrNumber}: {n.title}</option>
          ))}
        </select>
      </div>

      <div style={S.grid(2)}>
        <div style={S.field}>
          <span style={S.label}>CAPA Title *</span>
          <input
            type="text"
            style={S.inp}
            placeholder="e.g. Implement Barcode Scanner Validation Audits"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div style={S.field}>
          <span style={S.label}>Action Classification</span>
          <select
            style={S.inp}
            value={form.actionType}
            onChange={e => setForm({ ...form, actionType: e.target.value })}
          >
            {ACTION_TYPES.map(t => (
              <option key={t} value={t}>{t} Action</option>
            ))}
          </select>
        </div>
      </div>

      <div style={S.grid(2)}>
        <div style={S.field}>
          <span style={S.label}>Responsible Staff Owner *</span>
          <input
            type="text"
            style={S.inp}
            placeholder="Name or Designation"
            value={form.responsiblePerson}
            onChange={e => setForm({ ...form, responsiblePerson: e.target.value })}
            required
          />
        </div>
        <div style={S.field}>
          <span style={S.label}>Target Completion Date *</span>
          <input
            type="date"
            style={S.inp}
            value={form.targetDate}
            onChange={e => setForm({ ...form, targetDate: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Risk Mitigation Scoring Levels */}
      <div style={S.grid(2)}>
        <div style={S.riskMatrix}>
          <span style={{ fontSize: 11, fontWeight: "bold", color: "#991B1B" }}>🔴 Pre-Mitigation Risk Level</span>
          <div style={S.grid(2)}>
            <div style={S.field}>
              <span style={{ fontSize: 10, color: "#64748B" }}>Severity (1-5)</span>
              <select
                style={S.inp}
                value={form.preSeverity}
                onChange={e => setForm({ ...form, preSeverity: parseInt(e.target.value, 10) })}
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <span style={{ fontSize: 10, color: "#64748B" }}>Likelihood (1-5)</span>
              <select
                style={S.inp}
                value={form.preLikelihood}
                onChange={e => setForm({ ...form, preLikelihood: parseInt(e.target.value, 10) })}
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            Calculated Risk Index: <span style={{ color: "#991B1B" }}>{form.preSeverity * form.preLikelihood} / 25</span>
          </div>
        </div>

        <div style={S.riskMatrix}>
          <span style={{ fontSize: 11, fontWeight: "bold", color: "#065F46" }}>🟢 Target Post-Mitigation Risk Level</span>
          <div style={S.grid(2)}>
            <div style={S.field}>
              <span style={{ fontSize: 10, color: "#64748B" }}>Severity (1-5)</span>
              <select
                style={S.inp}
                value={form.postSeverity}
                onChange={e => setForm({ ...form, postSeverity: parseInt(e.target.value, 10) })}
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div style={S.field}>
              <span style={{ fontSize: 10, color: "#64748B" }}>Likelihood (1-5)</span>
              <select
                style={S.inp}
                value={form.postLikelihood}
                onChange={e => setForm({ ...form, postLikelihood: parseInt(e.target.value, 10) })}
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
            Calculated Risk Index: <span style={{ color: "#065F46" }}>{form.postSeverity * form.postLikelihood} / 25</span>
          </div>
        </div>
      </div>

      <div style={{ ...S.field, marginBottom: 20 }}>
        <span style={S.label}>Action Plan (Corrective/Preventive detail) *</span>
        <textarea
          style={{ ...S.inp, minHeight: 80, resize: "vertical" }}
          placeholder="Outline the detailed operational procedures, staff updates, checksheet validations, or hardware fixes that will resolve the deviation permanently..."
          value={form.actionPlan}
          onChange={e => setForm({ ...form, actionPlan: e.target.value })}
          required
        />
      </div>

      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, textAlign: "right" }}>
        {onCancel && <button type="button" style={S.btn(true)} onClick={onCancel}>Cancel</button>}
        <button type="submit" style={S.btn(false)} disabled={saving}>{saving ? "Creating..." : "Save CAPA Action Plan"}</button>
      </div>
    </form>
  );
}
