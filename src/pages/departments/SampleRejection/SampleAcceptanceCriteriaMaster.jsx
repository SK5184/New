// SampleAcceptanceCriteriaMaster.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getAcceptanceCriteria, addAcceptanceCriteria, seedDefaultCriteria } from "./sampleRejectionService";

export default function SampleAcceptanceCriteriaMaster({ department }) {
  const { role } = useAuth();
  const [criteria, setCriteria] = useState([]);
  const [filterDept, setFilterDept] = useState(department || "All");
  const [searchParam, setSearchParam] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    criteriaId: "",
    department: department || "Biochemistry",
    sampleType: "Serum",
    testCategory: "Chemistry",
    parameter: "",
    acceptanceCriteria: "",
    rejectionCriteria: "",
    action: "Reject/Repeat Collection",
    approvedBy: "Quality Manager",
    version: "1.0"
  });

  const isQualityAdmin = role === "Quality Manager" || role === "Quality Executive" || role === "HOD" || role === "Admin";

  const loadCriteria = async () => {
    setLoading(true);
    await seedDefaultCriteria();
    const data = await getAcceptanceCriteria(department);
    setCriteria(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCriteria();
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.criteriaId || !form.parameter || !form.acceptanceCriteria || !form.rejectionCriteria) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await addAcceptanceCriteria(form);
      alert("Acceptance criteria registered successfully.");
      setForm({
        criteriaId: "",
        department: department || "Biochemistry",
        sampleType: "Serum",
        testCategory: "Chemistry",
        parameter: "",
        acceptanceCriteria: "",
        rejectionCriteria: "",
        action: "Reject/Repeat Collection",
        approvedBy: "Quality Manager",
        version: "1.0"
      });
      setShowAddForm(false);
      loadCriteria();
    } catch (err) {
      alert("Error adding criteria. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const filteredCriteria = criteria.filter(c => {
    const matchDept = filterDept === "All" || c.department === filterDept;
    const matchSearch = c.parameter.toLowerCase().includes(searchParam.toLowerCase()) || 
                        c.criteriaId.toLowerCase().includes(searchParam.toLowerCase()) ||
                        c.sampleType.toLowerCase().includes(searchParam.toLowerCase());
    return matchDept && matchSearch;
  });

  const S = {
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    cardBody: { padding: 16 },
    inp: { padding: "7px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none" },
    label: { fontSize: 11, fontWeight: 500, color: "#475569", display: "block", marginBottom: 4 },
    btn: (bg, color) => ({
      padding: "6px 12px", background: bg || "#0F6E56", color: color || "#FFF",
      border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none"
    }),
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 12px", borderBottom: "0.5px solid #CBD5E1", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" }
  };

  const DEPT_OPTS = [
    "Biochemistry", "Haematology", "Microbiology", "Serology", 
    "Flow Cytometry", "Cytogenetics", "Clinical Pathology", 
    "Molecular Biology", "Molecular Genetics"
  ];

  return (
    <div>
      {/* Criteria Add Form (Only Quality Admins / HODs) */}
      {isQualityAdmin && (
        <div style={{ marginBottom: 14 }}>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            style={S.btn(showAddForm ? "#64748B" : "#0F6E56", "#FFF")}
          >
            {showAddForm ? "✕ Close Form" : "➕ Register New Acceptance Criteria"}
          </button>

          {showAddForm && (
            <div style={{ ...S.card, marginTop: 12 }}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Define New Sample Acceptance / Rejection Criteria</span>
              </div>
              <div style={S.cardBody}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={S.label}>Criteria ID *</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. BIO-SAC-003" 
                        required 
                        value={form.criteriaId} 
                        onChange={e => setForm({...form, criteriaId: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Department</span>
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
                        placeholder="e.g. Serum, Whole Blood" 
                        required 
                        value={form.sampleType} 
                        onChange={e => setForm({...form, sampleType: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Test Category</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. Chemistry, CBC" 
                        value={form.testCategory} 
                        onChange={e => setForm({...form, testCategory: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={S.label}>Check Parameter *</span>
                      <input 
                        style={S.inp} 
                        placeholder="e.g. Hemolysis, Tube Labeling" 
                        required 
                        value={form.parameter} 
                        onChange={e => setForm({...form, parameter: e.target.value})} 
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
                    <div>
                      <span style={S.label}>Version</span>
                      <input 
                        style={S.inp} 
                        value={form.version} 
                        onChange={e => setForm({...form, version: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <span style={S.label}>Acceptance Criteria (Parameters for Pass) *</span>
                      <textarea 
                        style={{...S.inp, height: 60, resize: "none"}} 
                        placeholder="Describe what is acceptable..." 
                        required 
                        value={form.acceptanceCriteria} 
                        onChange={e => setForm({...form, acceptanceCriteria: e.target.value})} 
                      />
                    </div>
                    <div>
                      <span style={S.label}>Rejection Criteria (Trigger for Fail) *</span>
                      <textarea 
                        style={{...S.inp, height: 60, resize: "none"}} 
                        placeholder="Describe what triggers rejection..." 
                        required 
                        value={form.rejectionCriteria} 
                        onChange={e => setForm({...form, rejectionCriteria: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={S.label}>Action on Deviation</span>
                      <select 
                        style={{...S.inp, width: 220}} 
                        value={form.action} 
                        onChange={e => setForm({...form, action: e.target.value})}
                      >
                        <option value="Reject">Reject / Discard</option>
                        <option value="Reject/Repeat Collection">Reject & Request Repeat Collection</option>
                        <option value="Conditional Acceptance / Exception">Conditional Acceptance with Approved Exception</option>
                      </select>
                    </div>
                    <button type="submit" disabled={saving} style={S.btn(null, null)}>
                      {saving ? "Saving Criteria..." : "✓ Approve & Publish Master Criteria"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter / Search Panel */}
      <div style={{
        display: "flex", gap: 12, marginBottom: 14, background: "#fff",
        padding: 12, borderRadius: 8, border: "0.5px solid #CBD5E1", flexWrap: "wrap", alignItems: "center"
      }}>
        {!department && (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#64748B" }}>Filter Department</span>
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)}
              style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
            >
              <option value="All">All Technical Departments</option>
              {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#64748B" }}>Search Parameter or Code</span>
          <input 
            type="text" 
            placeholder="e.g. Hemolysis, BIO-SAC-001..." 
            value={searchParam}
            onChange={e => setSearchParam(e.target.value)}
            style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
          />
        </div>

        <button onClick={loadCriteria} style={S.btn("#64748B", "#FFF")}>
          🔄 Refresh
        </button>
      </div>

      {/* Criteria Grid Table */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Quality Controlled Sample Acceptance Criteria Master (ISO 15189:2022 §7.2.5)</span>
          <span style={{ fontSize: 10, background: "#E2E8F0", padding: "2px 8px", borderRadius: 12 }}>
            Total active criteria: {filteredCriteria.length}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>Loading criteria database...</div>
          ) : filteredCriteria.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>No matching criteria records found in QMS database.</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{...S.th, width: 100}}>Criteria ID</th>
                  {!department && <th style={{...S.th, width: 120}}>Department</th>
                  }<th style={{...S.th, width: 90}}>Sample</th>
                  <th style={{...S.th, width: 90}}>Test Cat</th>
                  <th style={{...S.th, width: 110}}>Parameter</th>
                  <th style={S.th}>Acceptance Criteria</th>
                  <th style={S.th}>Rejection Criteria</th>
                  <th style={{...S.th, width: 140}}>Required Action</th>
                  <th style={{...S.th, width: 90}}>Version</th>
                </tr>
              </thead>
              <tbody>
                {filteredCriteria.map((c) => (
                  <tr key={c.id}>
                    <td style={{...S.td, fontWeight: 600, color: "#0F6E56"}}>{c.criteriaId}</td>
                    {!department && <td style={S.td}>{c.department}</td>}
                    <td style={S.td}>{c.sampleType}</td>
                    <td style={S.td}>{c.testCategory}</td>
                    <td style={{...S.td, fontWeight: 500}}>{c.parameter}</td>
                    <td style={{...S.td, color: "#166534"}}>{c.acceptanceCriteria}</td>
                    <td style={{...S.td, color: "#991B1B"}}>{c.rejectionCriteria}</td>
                    <td style={S.td}>
                      <span style={{
                        padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 500,
                        background: c.action.includes("Reject") ? "#FEE2E2" : "#FEF3C7",
                        color: c.action.includes("Reject") ? "#991B1B" : "#D97706"
                      }}>
                        {c.action}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>v{c.version}</div>
                      <div style={{ fontSize: 9, color: "#64748B" }}>by {c.approvedBy}</div>
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
