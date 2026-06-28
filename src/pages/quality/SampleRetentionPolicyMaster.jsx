// SampleRetentionPolicyMaster.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getRetentionPolicies, addRetentionPolicy, seedDefaultPolicies } from "./retentionService";

export default function SampleRetentionPolicyMaster({ department }) {
  const { role } = useAuth();
  
  const [policies, setPolicies] = useState([]);
  const [filterDept, setFilterDept] = useState(department || "All");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [form, setForm] = useState({
    policyId: "",
    department: department || "Biochemistry",
    sampleType: "Serum",
    testCategory: "Clinical Chemistry",
    testName: "",
    retentionDays: 7,
    storageCondition: "2-8°C",
    disposalMethod: "Biohazard Disposal",
    effectiveDate: new Date().toISOString().split("T")[0],
    approvedBy: "Quality Manager",
    version: "1.0"
  });

  const isQualityAdmin = role === "Quality Manager" || role === "Quality Executive" || role === "HOD" || role === "Admin";

  const loadPolicies = async () => {
    setLoading(true);
    await seedDefaultPolicies();
    const data = await getRetentionPolicies(department);
    setPolicies(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPolicies();
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.policyId || !form.testName || !form.retentionDays) {
      alert("Please fill in Policy ID, Test Name, and Retention Days.");
      return;
    }

    setSaving(true);
    try {
      await addRetentionPolicy(form);
      alert("Retention policy registered and approved.");
      setForm({
        policyId: "",
        department: department || "Biochemistry",
        sampleType: "Serum",
        testCategory: "Clinical Chemistry",
        testName: "",
        retentionDays: 7,
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      });
      setShowAddForm(false);
      loadPolicies();
    } catch (err) {
      alert("Error saving policy. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPolicies = policies.filter(p => {
    return filterDept === "All" || p.department === filterDept;
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
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" }
  };

  const DEPT_OPTS = ["Biochemistry", "Haematology", "Microbiology", "Serology", "Flow Cytometry", "Cytogenetics"];

  return (
    <div>
      {isQualityAdmin && (
        <div style={{ marginBottom: 14 }}>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            style={S.btn(showAddForm ? "#64748B" : "#0F6E56", "#FFF")}
          >
            {showAddForm ? "✕ Close Form" : "➕ Define New Retention Policy"}
          </button>

          {showAddForm && (
            <div style={{ ...S.card, marginTop: 12 }}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Define Official Sample Retention Policy (ISO 15189:2022 §7.2.5)</span>
              </div>
              <div style={S.cardBody}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={S.label}>Policy ID *</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. SRP-BIO-005" 
                        required 
                        value={form.policyId} 
                        onChange={e => setForm({...form, policyId: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Department Scope</span>
                      {department ? (
                        <input style={{...S.inp, background: "#F1F5F9"}} value={department} readOnly />
                      ) : (
                        <select 
                          style={S.inp} 
                          value={form.department} 
                          onChange={e => setForm({...form, department: e.target.value})}
                        >
                          {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <span style={S.label}>Sample Type *</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. Serum, Plasma, CSF" 
                        required 
                        value={form.sampleType} 
                        onChange={e => setForm({...form, sampleType: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Test Name / Specific Assay *</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. Glucose, Lipid, APTT" 
                        required 
                        value={form.testName} 
                        onChange={e => setForm({...form, testName: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={S.label}>Retention Days *</span>
                      <input 
                        type="number"
                        style={S.inp} 
                        placeholder="e.g. 7" 
                        required 
                        value={form.retentionDays} 
                        onChange={e => setForm({...form, retentionDays: parseInt(e.target.value) || 0})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Storage Condition</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. 2–8°C, Room Temp" 
                        value={form.storageCondition} 
                        onChange={e => setForm({...form, storageCondition: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Disposal Method</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. Biohazard Disposal" 
                        value={form.disposalMethod} 
                        onChange={e => setForm({...form, disposalMethod: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Approved By</span>
                      <input 
                        style={S.inp} 
                        value={form.approvedBy} 
                        onChange={e => setForm({...form, approvedBy: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="submit" disabled={saving} style={S.btn(null, null)}>
                      {saving ? "Saving Policy..." : "✓ Approve & Publish Policy Master"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Policies List Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Official Sample Retention Policy Register</span>
          {!department && (
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)}
              style={{ padding: "4px 8px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
            >
              <option value="All">All Departments</option>
              {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Retrieving policy master records...</div>
          ) : filteredPolicies.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No official policies logged.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Policy ID</th>
                  {!department && <th style={S.th}>Department</th>}
                  <th style={S.th}>Sample Type</th>
                  <th style={S.th}>Assay / Test</th>
                  <th style={S.th}>Retention Limit</th>
                  <th style={S.th}>Storage Temperature</th>
                  <th style={S.th}>Disposal Protocol</th>
                  <th style={S.th}>Version</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#0F6E56" }}>{p.policyId}</td>
                    {!department && <td style={S.td}>{p.department}</td>}
                    <td style={S.td}>{p.sampleType}</td>
                    <td style={{ ...S.td, fontWeight: 500 }}>{p.testName}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: "#1E293B" }}>{p.retentionDays} Days</td>
                    <td style={S.td}>{p.storageCondition}</td>
                    <td style={S.td}>
                      <span style={{
                        padding: "2px 6px", background: "#FEF3C7", color: "#D97706", borderRadius: 4, fontSize: 10, fontWeight: 500
                      }}>{p.disposalMethod}</span>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>v{p.version}</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>by {p.approvedBy}</div>
                    </td>
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
