// SampleRetentionView.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { 
  addStoredSample, getStoredSamples, discardSampleSpecimen, 
  checkExpirations, getRetentionPolicies 
} from "../../quality/retentionService";

export default function SampleRetentionView({ department }) {
  const { userName } = useAuth();
  
  const [samples, setSamples] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  // Form State
  const [form, setForm] = useState({
    sampleId: "",
    patientId: "",
    sampleType: department === "Microbiology" ? "Urine" : department === "Haematology" ? "Whole Blood" : "Serum",
    test: department === "Microbiology" ? "Urine Culture" : department === "Haematology" ? "Complete Blood Count" : "Glucose",
    collectionDate: new Date().toISOString().split("T")[0],
    storedDate: new Date().toISOString().split("T")[0]
  });

  // Modal State for Discard Confirmation
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [discardReason, setDiscardReason] = useState("Retention period completed");

  const loadData = async () => {
    setLoading(true);
    // Expiration check run first
    await checkExpirations(department);
    const sData = await getStoredSamples(department);
    const pData = await getRetentionPolicies(department);
    
    // Sort samples by Stored Date desc
    sData.sort((a, b) => new Date(b.storedDate) - new Date(a.storedDate));
    
    setSamples(sData);
    setPolicies(pData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [department]);

  const handleRegisterSample = async (e) => {
    e.preventDefault();
    if (!form.sampleId || !form.patientId || !form.test) {
      alert("Please fill in Sample ID, Patient ID, and Test.");
      return;
    }

    setSaving(true);
    try {
      await addStoredSample({
        ...form,
        department,
        createdBy: userName || "Technologist"
      });
      alert("Specimen registered into storage audit successfully.");
      setForm(prev => ({
        ...prev,
        sampleId: "",
        patientId: ""
      }));
      loadData();
    } catch (err) {
      alert("Error registering sample. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDiscard = (sample) => {
    setSelectedSample(sample);
    setShowDiscardModal(true);
  };

  const handleConfirmDiscard = async () => {
    if (!selectedSample) return;

    setSaving(true);
    try {
      await discardSampleSpecimen(
        selectedSample.id,
        userName || "Technologist",
        "Pathologist", // default approval authority
        discardReason,
        selectedSample.retentionPolicyId
      );
      alert("Specimen successfully discarded. Audit trail logged.");
      setShowDiscardModal(false);
      setSelectedSample(null);
      loadData();
    } catch (err) {
      alert("Error logging specimen discard. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const totalCount = samples.length;
  const activeCount = samples.filter(s => s.status === "Active").length;
  const readyCount = samples.filter(s => s.status === "Ready for Discard").length;
  const discardedCount = samples.filter(s => s.status === "Discarded").length;

  const filteredSamples = samples.filter(s => {
    const matchSearch = s.sampleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.patientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.test?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const S = {
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    cardBody: { padding: 16 },
    inp: { padding: "6px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 11, fontWeight: 500, color: "#475569", display: "block", marginBottom: 4 },
    btn: (bg, color) => ({
      padding: "6px 14px", background: bg || "#0F6E56", color: color || "#FFF",
      border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 12px", borderBottom: "0.5px solid #CBD5E1", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" },
    statGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 },
    statCard: (bg, border) => ({
      background: bg || "#fff", border: `0.5px solid ${border || "#CBD5E1"}`, borderRadius: 10, padding: 14,
      display: "flex", flexDirection: "column", gap: 4
    }),
    statNum: (color) => ({ fontSize: 24, fontWeight: 700, color: color || "#1E293B" }),
    statLabel: { fontSize: 10.5, fontWeight: 500, color: "#64748B", textTransform: "uppercase" },
    badge: (status) => {
      const colors = {
        Active: { bg: "#EFF6FF", color: "#1D4ED8" },
        "Ready for Discard": { bg: "#FEF3C7", color: "#D97706" },
        Discarded: { bg: "#FEE2E2", color: "#991B1B" }
      };
      const c = colors[status] || { bg: "#F1F5F9", color: "#475569" };
      return {
        padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600,
        background: c.bg, color: c.color
      };
    },
    // Modal styles
    modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" },
    modalContent: { background: "#fff", border: "1px solid #94A3B8", borderRadius: 12, width: 440, padding: 20, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }
  };

  return (
    <div>
      {/* Scorecard KPIs */}
      <div style={S.statGrid}>
        <div style={S.statCard(null, null)}>
          <span style={S.statLabel}>Total Stored Samples</span>
          <span style={S.statNum()}>{totalCount}</span>
          <span style={{ fontSize: 9.5, color: "#64748B" }}>Registered in {department}</span>
        </div>
        <div style={S.statCard(null, null)}>
          <span style={S.statLabel}>Active Retention</span>
          <span style={S.statNum("#1D4ED8")}>{activeCount}</span>
          <span style={{ fontSize: 9.5, color: "#1D4ED8" }}>Monitoring active</span>
        </div>
        <div style={S.statCard(null, null)}>
          <span style={S.statLabel}>Ready for Discard</span>
          <span style={S.statNum("#D97706")}>{readyCount}</span>
          <span style={{ fontSize: 9.5, color: "#D97706", fontWeight: 600 }}>Retention completed</span>
        </div>
        <div style={S.statCard("#ECFDF5", "#A7F3D0")}>
          <span style={S.statLabel}>Discarded Samples</span>
          <span style={S.statNum("#047857")}>{discardedCount}</span>
          <span style={{ fontSize: 9.5, color: "#047857", fontWeight: 600 }}>Archived & logged</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.8fr", gap: 20 }}>
        {/* Storage log registration */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Register Stored Specimen</span>
            <span style={{ fontSize: 10, background: "#E2E8F0", padding: "2px 6px", borderRadius: 12 }}>
              ISO 15189 §7.2.5
            </span>
          </div>
          <div style={S.cardBody}>
            <form onSubmit={handleRegisterSample}>
              <div style={{ marginBottom: 10 }}>
                <span style={S.label}>Sample / Barcode ID *</span>
                <input 
                  style={S.inp} 
                  placeholder="e.g. S-0081" 
                  required 
                  value={form.sampleId} 
                  onChange={e => setForm({...form, sampleId: e.target.value})} 
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <span style={S.label}>Patient ID *</span>
                <input 
                  style={S.inp} 
                  placeholder="e.g. P-1209" 
                  required 
                  value={form.patientId} 
                  onChange={e => setForm({...form, patientId: e.target.value})} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <span style={S.label}>Sample Type</span>
                  <input 
                    style={S.inp} 
                    value={form.sampleType} 
                    onChange={e => setForm({...form, sampleType: e.target.value})} 
                  />
                </div>
                <div>
                  <span style={S.label}>Test / Assay *</span>
                  <input 
                    style={S.inp} 
                    placeholder="e.g. Glucose, CBC" 
                    required 
                    value={form.test} 
                    onChange={e => setForm({...form, test: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <span style={S.label}>Collection Date</span>
                  <input 
                    type="date"
                    style={S.inp} 
                    value={form.collectionDate} 
                    onChange={e => setForm({...form, collectionDate: e.target.value})} 
                  />
                </div>
                <div>
                  <span style={S.label}>Stored Date</span>
                  <input 
                    type="date"
                    style={S.inp} 
                    value={form.storedDate} 
                    onChange={e => setForm({...form, storedDate: e.target.value})} 
                  />
                </div>
              </div>

              <button type="submit" disabled={saving} style={{...S.btn(null, null), width: "100%"}}>
                {saving ? "Registering..." : "✓ Register Stored Sample"}
              </button>
            </form>
          </div>
        </div>

        {/* Stored Samples list */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Stored Sample Inventory</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: "4px 8px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 11.5 }}
              />
              <button onClick={loadData} style={S.btn("#64748B", "#FFF")}>🔄 Refresh</button>
            </div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 420 }}>
            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Retrieving storage database...</div>
            ) : filteredSamples.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No matching samples found.</div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Sample ID</th>
                    <th style={S.th}>Patient ID</th>
                    <th style={S.th}>Test</th>
                    <th style={S.th}>Stored Date</th>
                    <th style={S.th}>End Date</th>
                    <th style={S.th}>Policy ID</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSamples.map(s => (
                    <tr key={s.id}>
                      <td style={{ ...S.td, fontWeight: 600 }}>{s.sampleId}</td>
                      <td style={S.td}>{s.patientId}</td>
                      <td style={S.td}>{s.test}</td>
                      <td style={S.td}>{s.storedDate}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: s.status === "Ready for Discard" ? "#B45309" : "#1E293B" }}>
                        {s.retentionEndDate}
                      </td>
                      <td style={{ ...S.td, fontFamily: "monospace" }}>{s.retentionPolicyId}</td>
                      <td style={S.td}>
                        <span style={S.badge(s.status)}>{s.status}</span>
                      </td>
                      <td style={S.td}>
                        {s.status === "Ready for Discard" && (
                          <button 
                            onClick={() => handleOpenDiscard(s)}
                            style={{
                              padding: "2px 6px", background: "#FEE2E2", color: "#991B1B",
                              border: "0.5px solid #FCA5A5", borderRadius: 4, fontSize: 10,
                              fontWeight: 600, cursor: "pointer"
                            }}
                          >
                            🗑️ Discard
                          </button>
                        )}
                        {s.status === "Discarded" && (
                          <span style={{ fontSize: 10.5, color: "#047857", fontWeight: 500 }}>✓ Disposed</span>
                        )}
                        {s.status === "Active" && (
                          <span style={{ fontSize: 10.5, color: "#1D4ED8", fontWeight: 500 }}>Stored</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardModal && selectedSample && (
        <div style={S.modalOverlay}>
          <div style={S.modalContent}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", borderBottom: "0.5px solid #CBD5E1", paddingBottom: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#991B1B" }}>Sample Discard Confirmation</span>
            </div>
            
            <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, margin: "0 0 14px 0" }}>
              You are about to discard this specimen from inventory. This action is irreversible and writes to the official QMS audit trail.
            </p>

            <div style={{ background: "#F8FAFC", border: "0.5px solid #CBD5E1", borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>Sample ID:</strong> {selectedSample.sampleId}</div>
              <div><strong>Patient ID:</strong> {selectedSample.patientId}</div>
              <div><strong>Test Category:</strong> {selectedSample.test}</div>
              <div><strong>Retention Policy:</strong> {selectedSample.retentionDays} Days ({selectedSample.retentionPolicyId})</div>
              <div><strong>Storage Period:</strong> <span style={{ color: "#B45309", fontWeight: 600 }}>Completed</span></div>
              <div><strong>Disposal Method:</strong> {selectedSample.disposalMethod} ({selectedSample.storageCondition})</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <span style={S.label}>Reason for Disposal / Disposal Method Verified</span>
              <input 
                style={S.inp} 
                value={discardReason} 
                onChange={e => setDiscardReason(e.target.value)} 
                placeholder="e.g. Retention period completed"
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button 
                onClick={() => { setShowDiscardModal(false); setSelectedSample(null); }} 
                style={S.btn("#E2E8F0", "#334155")}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDiscard} 
                disabled={saving} 
                style={S.btn("#DC2626", "#FFF")}
              >
                {saving ? "Processing..." : "Confirm Discard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
