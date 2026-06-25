import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const S = {
  inp: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, background: "#fff", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 16 }),
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 11, fontWeight: 600, color: "#64748B" },
  btn: (secondary) => ({
    padding: "8px 16px", background: secondary ? "#F1F5F9" : "#A32D2D", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 8
  })
};

const DEPARTMENTS = [
  "Biochemistry", "Microbiology", "Haematology", "Serology", "Flow Cytometry", "Quality", "Administration", "Sample Collection Centre", "Phlebotomy", "Reception"
];

const SOURCES = [
  "Internal audit", "Customer complaint", "IQC failure", "EQA failure", "Equipment breakdown", "Staff observation", "Document review", "Other"
];

const SEVERITIES = ["Minor", "Major", "Critical"];

const ISO_CLAUSES = [
  "Clause 1: Scope",
  "Clause 2: Normative References",
  "Clause 3: Terms and Definitions",
  "Clause 4.1: General Requirements",
  "Clause 4.2: Impartiality",
  "Clause 4.3: Confidentiality",
  "Clause 5.1: Legal Entity",
  "Clause 5.2: Laboratory Director",
  "Clause 5.3: Laboratory Activities",
  "Clause 5.4: Structure and Authority",
  "Clause 5.5: Objectives and Policies",
  "Clause 5.6: Risk Management",
  "Clause 6.1: General Resource Requirements",
  "Clause 6.2: Personnel",
  "Clause 6.3: Facilities and Environmental Conditions",
  "Clause 6.4: Equipment",
  "Clause 6.5: Reagents and Consumables",
  "Clause 6.6: Service Agreements",
  "Clause 6.7: Externally Provided Products and Services",
  "Clause 7.1: General Pre-Examination Processes",
  "Clause 7.2: Pre-Examination Information",
  "Clause 7.3: Sample Collection Activities",
  "Clause 7.4: Sample Handling and Transportation",
  "Clause 7.5: Examination Processes",
  "Clause 7.6: Ensuring Valid Results",
  "Clause 7.7: Post-Examination Processes",
  "Clause 7.8: Reporting of Results",
  "Clause 7.9: Release of Results",
  "Clause 7.10: Nonconforming Work",
  "Clause 7.11: Control of Data and Information Management",
  "Clause 8.1: General Management System Requirements",
  "Clause 8.2: Management System Documentation",
  "Clause 8.3: Control of Management System Documents",
  "Clause 8.4: Control of Records",
  "Clause 8.5: Actions to Address Risks and Opportunities",
  "Clause 8.6: Improvement",
  "Clause 8.7: Corrective Action",
  "Clause 8.8: Evaluations and Audits",
  "Clause 8.9: Management Review"
];

export default function NCRForm({ onComplete, onCancel }) {
  const { name: userName, dept: userDept } = useAuth();
  const [saving, setSaving] = useState(false);
  const [risks, setRisks] = useState([]);

  const [form, setForm] = useState({
    title: "",
    department: userDept || "Biochemistry",
    source: "Staff observation",
    severity: "Minor",
    description: "",
    raisedBy: userName || "Staff Member",
    dateRaised: new Date().toISOString().split("T")[0],
    isoClause: "Clause 7.10: Nonconforming Work",
    linkedRiskId: ""
  });

  useEffect(() => {
    // Fetch active risks to link to the NCR
    const fetchRisks = async () => {
      try {
        const snap = await getDocs(collection(db, "risks"));
        setRisks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("Could not fetch risks from Firestore, using mock fallback list:", err);
        setRisks([
          { id: "risk_cobas", title: "Roche Cobas c311 calibration drift risk", category: "Technical" },
          { id: "risk_pre_exam", title: "Pre-analytical mislabeling in Phlebotomy", category: "Pre-analytical" },
          { id: "risk_lims", title: "LIMS connection latency causing delayed TAT", category: "Operational" }
        ]);
      }
    };
    fetchRisks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      alert("Please enter a title and description for the NCR.");
      return;
    }
    setSaving(true);
    try {
      // Find the next sequence number for generating the NCR ID
      let seq = 1;
      try {
        const snap = await getDocs(query(collection(db, "nonConformities"), orderBy("createdAt", "desc"), limit(1)));
        if (!snap.empty) {
          const lastNcr = snap.docs[0].data();
          if (lastNcr.ncrNumber) {
            const parts = lastNcr.ncrNumber.split("-");
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) seq = lastSeq + 1;
          }
        }
      } catch (err) {
        // Fallback random sequence
        seq = Math.floor(Math.random() * 800) + 100;
      }

      const ncrNumber = `NCR-${new Date().getFullYear()}-${String(seq).padStart(3, "0")}`;

      const ncrPayload = {
        ...form,
        ncrNumber,
        status: "Open",
        createdAt: serverTimestamp(),
        createdByEmail: auth.currentUser?.email || ""
      };

      await addDoc(collection(db, "nonConformities"), ncrPayload);
      
      // Mirror to the "ncr" collection to support the dashboard KPI counters if they look up that collection
      try {
        await addDoc(collection(db, "ncr"), {
          department: form.department,
          description: form.description,
          actionProposed: "",
          isoClause: form.isoClause,
          status: "Open",
          createdAt: serverTimestamp(),
          createdBy: form.raisedBy
        });
      } catch (err) {
        console.warn("Could not mirror to ncr collection, continuing:", err);
      }

      alert(`Non-Conformance successfully raised: ${ncrNumber}`);
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Error raising NCR:", err);
      alert("Failed to raise NCR.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ animation: "modalScale 0.2s ease-out" }}>
      <div style={S.grid(2)}>
        <div style={S.field}>
          <span style={S.label}>NCR Incident Title *</span>
          <input
            type="text"
            style={S.inp}
            placeholder="e.g. IQC Failure for Serum Bilirubin Control Level II"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div style={S.field}>
          <span style={S.label}>Responsible Department *</span>
          <select
            style={S.inp}
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
          >
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={S.grid(3)}>
        <div style={S.field}>
          <span style={S.label}>Source of NCR</span>
          <select
            style={S.inp}
            value={form.source}
            onChange={e => setForm({ ...form, source: e.target.value })}
          >
            {SOURCES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <span style={S.label}>Severity level</span>
          <select
            style={S.inp}
            value={form.severity}
            onChange={e => setForm({ ...form, severity: e.target.value })}
          >
            {SEVERITIES.map(sev => (
              <option key={sev} value={sev}>{sev}</option>
            ))}
          </select>
        </div>
        <div style={S.field}>
          <span style={S.label}>ISO 15189:2022 Clause Reference</span>
          <select
            style={S.inp}
            value={form.isoClause}
            onChange={e => setForm({ ...form, isoClause: e.target.value })}
          >
            {ISO_CLAUSES.map(clause => (
              <option key={clause} value={clause}>{clause}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={S.grid(3)}>
        <div style={S.field}>
          <span style={S.label}>Raised By *</span>
          <input
            type="text"
            style={S.inp}
            value={form.raisedBy}
            onChange={e => setForm({ ...form, raisedBy: e.target.value })}
            required
          />
        </div>
        <div style={S.field}>
          <span style={S.label}>Date Raised</span>
          <input
            type="date"
            style={S.inp}
            value={form.dateRaised}
            onChange={e => setForm({ ...form, dateRaised: e.target.value })}
          />
        </div>
        <div style={S.field}>
          <span style={S.label}>Link to Risk Register ID</span>
          <select
            style={S.inp}
            value={form.linkedRiskId}
            onChange={e => setForm({ ...form, linkedRiskId: e.target.value })}
          >
            <option value="">-- No Direct Link --</option>
            {risks.map(r => (
              <option key={r.id} value={r.id}>{r.id}: {r.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ ...S.field, marginBottom: 20 }}>
        <span style={S.label}>Detailed Description of the Deviation *</span>
        <textarea
          style={{ ...S.inp, minHeight: 80, resize: "vertical" }}
          placeholder="What went wrong? Document exact instrument readings, sample IDs, and immediate steps taken to isolate the problem..."
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>

      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 16, textAlign: "right" }}>
        {onCancel && <button type="button" style={S.btn(true)} onClick={onCancel}>Cancel</button>}
        <button type="submit" style={S.btn(false)} disabled={saving}>{saving ? "Saving..." : "Raise NCR Ticket"}</button>
      </div>
    </form>
  );
}
