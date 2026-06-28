// RetentionDashboard.jsx
import { useState, useEffect } from "react";
import { getStoredSamples, checkExpirations, getDiscardAuditLogs } from "./retentionService";
import SampleRetentionPolicyMaster from "./SampleRetentionPolicyMaster";
import DiscardApproval from "./DiscardApproval";

export default function RetentionDashboard() {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [samples, setSamples] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const loadData = async () => {
    setLoading(true);
    // Fetch all stored samples and audit logs
    const sData = await getStoredSamples();
    const aData = await getDiscardAuditLogs();
    
    // Sort samples by Stored Date desc
    sData.sort((a, b) => new Date(b.storedDate) - new Date(a.storedDate));
    // Sort audits by Timestamp desc
    aData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

    setSamples(sData);
    setAuditLogs(aData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunChecks = async () => {
    setChecking(true);
    const expiredCount = await checkExpirations("All");
    alert(`Expiration scan completed. ${expiredCount} active samples updated to 'Ready for Discard'.`);
    loadData();
    setChecking(false);
  };

  // KPI calculations
  const filteredSamples = samples.filter(s => {
    const matchDept = filterDept === "All" || s.department === filterDept;
    const matchStatus = filterStatus === "All" || s.status === filterStatus;
    const matchSearch = s.sampleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.patientId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        s.test?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchStatus && matchSearch;
  });

  const totalStored = samples.length;
  const activeCount = samples.filter(s => s.status === "Active").length;
  const readyCount = samples.filter(s => s.status === "Ready for Discard").length;
  const pendingCount = samples.filter(s => s.status === "Pending Approval").length;
  const discardedCount = samples.filter(s => s.status === "Discarded").length;

  const S = {
    wrap: { fontFamily: "'Inter', sans-serif" },
    tabBar: { display: "flex", gap: 6, borderBottom: "1.5px solid #E2E8F0", marginBottom: 16 },
    tab: (active) => ({
      padding: "8px 16px", cursor: "pointer", fontSize: 12.5, fontWeight: active ? 600 : 400,
      color: active ? "#0F6E56" : "#475569",
      borderBottom: active ? "3px solid #0F6E56" : "3px solid transparent",
      background: "transparent", border: "none"
    }),
    statGrid: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 20 },
    statCard: (bg, border) => ({
      background: bg || "#fff", border: `0.5px solid ${border || "#CBD5E1"}`, borderRadius: 10, padding: 14,
      display: "flex", flexDirection: "column", gap: 4
    }),
    statNum: (color) => ({ fontSize: 24, fontWeight: 700, color: color || "#1E293B" }),
    statLabel: { fontSize: 10.5, fontWeight: 500, color: "#64748B", textTransform: "uppercase" },
    card: { background: "#fff", border: "0.5px solid #CBD5E1", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
    cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #CBD5E1", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
    cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 12px", borderBottom: "0.5px solid #CBD5E1", color: "#475569", fontWeight: 600, textAlign: "left", background: "#F8FAFC" },
    td: { padding: "10px 12px", borderBottom: "0.5px solid #F1F5F9", color: "#1E293B" },
    badge: (status) => {
      const colors = {
        Active: { bg: "#EFF6FF", color: "#1D4ED8" },
        "Ready for Discard": { bg: "#FEF3C7", color: "#D97706" },
        "Pending Approval": { bg: "#FAF5FF", color: "#7E22CE" },
        Discarded: { bg: "#FEE2E2", color: "#991B1B" }
      };
      const c = colors[status] || { bg: "#F1F5F9", color: "#475569" };
      return {
        padding: "2px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600,
        background: c.bg, color: c.color
      };
    }
  };

  const DEPT_OPTS = ["Biochemistry", "Haematology", "Microbiology", "Serology", "Flow Cytometry", "Cytogenetics"];

  return (
    <div style={S.wrap}>
      {/* Tab control */}
      <div style={S.tabBar}>
        <button onClick={() => setActiveSubTab("overview")} style={S.tab(activeSubTab === "overview")}>
          📊 Storage Overview & Analytics
        </button>
        <button onClick={() => setActiveSubTab("approvals")} style={S.tab(activeSubTab === "approvals")}>
          🔏 Discard Log & Audits
        </button>
        <button onClick={() => setActiveSubTab("policies")} style={S.tab(activeSubTab === "policies")}>
          📘 Policy Master Guideline
        </button>
      </div>

      {activeSubTab === "overview" && (
        <div>
          {/* Stats widgets */}
          <div style={S.statGrid}>
            <div style={S.statCard(null, null)}>
              <span style={S.statLabel}>Total Samples Stored</span>
              <span style={S.statNum()}>{totalStored}</span>
              <span style={{ fontSize: 9, color: "#64748B" }}>Across all technical labs</span>
            </div>
            <div style={S.statCard(null, null)}>
              <span style={S.statLabel}>Active Retention</span>
              <span style={S.statNum("#1D4ED8")}>{activeCount}</span>
              <span style={{ fontSize: 9, color: "#1D4ED8" }}>Currently under storage</span>
            </div>
            <div style={S.statCard(null, null)}>
              <span style={S.statLabel}>Ready for Discard</span>
              <span style={S.statNum("#D97706")}>{readyCount}</span>
              <span style={{ fontSize: 9, color: "#D97706", fontWeight: 600 }}>Duration completed</span>
            </div>
            <div style={S.statCard(null, null)}>
              <span style={S.statLabel}>Pending Approval</span>
              <span style={S.statNum("#7E22CE")}>{pendingCount}</span>
              <span style={{ fontSize: 9, color: "#7E22CE" }}>Awaiting Quality review</span>
            </div>
            <div style={S.statCard("#ECFDF5", "#A7F3D0")}>
              <span style={S.statLabel}>Discarded Samples</span>
              <span style={S.statNum("#047857")}>{discardedCount}</span>
              <span style={{ fontSize: 9, color: "#047857", fontWeight: 600 }}>Archived & destroyed</span>
            </div>
          </div>

          {/* Table list with filters */}
          <div style={{
            display: "flex", gap: 12, marginBottom: 14, background: "#fff",
            padding: 12, borderRadius: 8, border: "0.5px solid #CBD5E1", flexWrap: "wrap", alignItems: "center"
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B" }}>Filter Department</span>
              <select 
                value={filterDept} 
                onChange={e => setFilterDept(e.target.value)}
                style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
              >
                <option value="All">All Departments</option>
                {DEPT_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B" }}>Filter Status</span>
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Ready for Discard">Ready for Discard</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Discarded">Discarded</option>
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              <span style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B" }}>Search Sample ID / Patient ID</span>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: "5px 10px", border: "0.5px solid #CBD5E1", borderRadius: 6, fontSize: 12 }}
              />
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button 
                onClick={handleRunChecks} 
                disabled={checking} 
                style={S.btn("#E2E8F0", "#334155")}
              >
                {checking ? "Scanning Expirations..." : "🔍 Run Expiration Check"}
              </button>
              <button onClick={loadData} style={S.btn(null, null)}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Stored Samples list */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Quality Controlled Sample Storage Log (ISO 15189:2022 §7.2.5)</span>
              <span style={{ fontSize: 10, background: "#E2E8F0", padding: "2px 8px", borderRadius: 12 }}>
                Found: {filteredSamples.length}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              {loading ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Loading specimens database...</div>
              ) : filteredSamples.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>No specimens match current filters.</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Sample ID</th>
                      <th style={S.th}>Patient ID</th>
                      <th style={S.th}>Department</th>
                      <th style={S.th}>Specimen Type</th>
                      <th style={S.th}>Test / Assay</th>
                      <th style={S.th}>Stored Date</th>
                      <th style={S.th}>Retention End Date</th>
                      <th style={S.th}>Storage Temp</th>
                      <th style={S.th}>Policy ID</th>
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSamples.map(s => (
                      <tr key={s.id}>
                        <td style={{ ...S.td, fontWeight: 600 }}>{s.sampleId}</td>
                        <td style={S.td}>{s.patientId}</td>
                        <td style={S.td}>{s.department}</td>
                        <td style={S.td}>{s.sampleType}</td>
                        <td style={S.td}>{s.test}</td>
                        <td style={S.td}>{s.storedDate}</td>
                        <td style={{ ...S.td, fontWeight: 600, color: s.status === "Ready for Discard" ? "#B45309" : "#1E293B" }}>
                          {s.retentionEndDate}
                        </td>
                        <td style={S.td}>{s.storageCondition}</td>
                        <td style={{ ...S.td, fontFamily: "monospace" }}>{s.retentionPolicyId}</td>
                        <td style={S.td}>
                          <span style={S.badge(s.status)}>{s.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === "approvals" && (
        <DiscardApproval auditLogs={auditLogs} samples={samples} onRefresh={loadData} />
      )}

      {activeSubTab === "policies" && (
        <SampleRetentionPolicyMaster />
      )}
    </div>
  );
}
