import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import NCRForm from "./NCRForm";
import NCRDetails from "./NCRDetails";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" },
  topbar: { background: "#0F172A", color: "#FFF", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "4px solid #A32D2D" },
  title: { fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 },
  content: { padding: "24px 32px", maxWidth: 1200, margin: "0 auto" },
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  btn: (secondary) => ({
    padding: "6px 12px", background: secondary ? "#F1F5F9" : "#A32D2D", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s"
  }),
  badge: (status) => {
    let bg = "#FCEBEB", fg = "#A32D2D";
    if (status === "Under investigation") { bg = "#FAEEDA"; fg = "#854F0B"; }
    if (status === "CAPA raised") { bg = "#E6F1FB"; fg = "#185FA5"; }
    if (status === "Closed") { bg = "#E1F5EE"; fg = "#0F6E56"; }
    return { padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg };
  },
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 })
};

const DEPARTMENTS = [
  "Biochemistry", "Microbiology", "Haematology", "Serology", "Flow Cytometry", "Quality", "Administration", "Sample Collection Centre", "Phlebotomy", "Reception"
];

export default function NCRList() {
  const { role, name: userName, dept } = useAuth();
  const [ncrs, setNcrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDept, setFilterDept] = useState("All");
  const [search, setSearch] = useState("");
  
  // Navigation states
  const [viewingNcr, setViewingNcr] = useState(null);
  const [raisingNcr, setRaisingNcr] = useState(false);

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  const fetchNcrs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "nonConformities"), orderBy("createdAt", "desc")));
      setNcrs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Could not load nonConformities from Firestore, using fallbacks:", e);
      setNcrs([
        { id: "ncr1", ncrNumber: "NCR-2026-001", title: "Roche Cobas c311 Serum Bilirubin Control Outlier", department: "Biochemistry", source: "IQC failure", severity: "Major", status: "Under investigation", raisedBy: "Sarah Jenkins", dateRaised: "2026-06-12", description: "Bilirubin level 2 control ran at +2.8 SD. Recalibration and repeat required.", isoClause: "§8.4 Nonconforming Work", linkedRiskId: "risk_cobas", rootCause: "Calibration drift on the Bilirubin assay module.", immediateAction: "Recalibrated assay using fresh Calibrator vial. Repeat IQC ran at +0.4 SD." },
        { id: "ncr2", ncrNumber: "NCR-2026-002", title: "Patient Sample Mismatch in Serology", department: "Serology", source: "Staff observation", severity: "Critical", status: "CAPA raised", raisedBy: "Alex Mercer", dateRaised: "2026-06-15", description: "Liaison run sample ID mismatched during batch loading.", isoClause: "§7.3 Examination processes", linkedRiskId: "risk_pre_exam", rootCause: "Manual barcode entry error due to scanning failure.", immediateAction: "Halted run, re-printed barcoded labels, verified barcode scanner, ran controls." },
        { id: "ncr3", ncrNumber: "NCR-2026-003", title: "LIMS Connection Latency", department: "Administration", source: "Equipment breakdown", severity: "Minor", status: "Open", raisedBy: "Sarah Jenkins", dateRaised: "2026-06-17", description: "LIMS reports delayed TAT on biochemistry results sync by 45 minutes.", isoClause: "§5.3 Laboratory Equipment", linkedRiskId: "risk_lims" }
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNcrs();
  }, [fetchNcrs]);

  const filtered = ncrs.filter(n => {
    const matchStatus = filterStatus === "All" || n.status === filterStatus;
    const matchDept = filterDept === "All" || n.department.toLowerCase() === filterDept.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase()) || n.ncrNumber.toLowerCase().includes(search.toLowerCase()) || (n.linkedRiskId || "").toLowerCase().includes(search.toLowerCase());
    
    // Non-quality staff can only see their own department's NCRs
    const canAccess = isQuality || dept === "Administration" || n.department.toLowerCase() === dept.toLowerCase();
    return matchStatus && matchDept && matchSearch && canAccess;
  });

  const openCount = ncrs.filter(n => n.status === "Open").length;
  const investCount = ncrs.filter(n => n.status === "Under investigation").length;
  const capaCount = ncrs.filter(n => n.status === "CAPA raised").length;
  const closedCount = ncrs.filter(n => n.status === "Closed").length;

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={S.title}>
          <span>⚠️</span>
          <span>MBL QMS — Non-Conformance Reports (ISO 15189 §8.4)</span>
        </div>
        <button style={S.btn(false)} onClick={() => { setRaisingNcr(true); setViewingNcr(null); }}>+ Raise NCR</button>
      </div>

      <div style={S.content}>
        {/* NCR Statistics Summary */}
        {!raisingNcr && !viewingNcr && (
          <div style={S.grid(4)}>
            {[
              { label: "Open Tickets", val: openCount, color: "#A32D2D", bg: "#FCEBEB" },
              { label: "Under Investigation", val: investCount, color: "#854F0B", bg: "#FAEEDA" },
              { label: "CAPA Initiated", val: capaCount, color: "#185FA5", bg: "#E6F1FB" },
              { label: "Closed / Verified", val: closedCount, color: "#0F6E56", bg: "#E1F5EE" }
            ].map((stat, i) => (
              <div key={i} style={{ background: stat.bg, border: `1px solid ${stat.color}33`, borderRadius: 12, padding: "14px 18px" }}>
                <span style={{ fontSize: 11, color: stat.color, fontWeight: 600 }}>{stat.label}</span>
                <h2 style={{ margin: "4px 0 0", color: stat.color, fontSize: 28, fontWeight: 700 }}>{stat.val}</h2>
              </div>
            ))}
          </div>
        )}

        {/* Raise NCR view */}
        {raisingNcr && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>⚠️ Raise Non-Conformance Report</div>
              <button style={S.btn(true)} onClick={() => setRaisingNcr(false)}>Back to List</button>
            </div>
            <div style={S.cardBody}>
              <NCRForm onComplete={() => { setRaisingNcr(false); fetchNcrs(); }} onCancel={() => setRaisingNcr(false)} />
            </div>
          </div>
        )}

        {/* View / Investigate NCR view */}
        {viewingNcr && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>🔍 NCR Details & Investigation: {viewingNcr.ncrNumber}</div>
              <button style={S.btn(true)} onClick={() => { setViewingNcr(null); fetchNcrs(); }}>Back to List</button>
            </div>
            <div style={S.cardBody}>
              <NCRDetails ncr={viewingNcr} onComplete={() => { setViewingNcr(null); fetchNcrs(); }} />
            </div>
          </div>
        )}

        {/* NCR Main Table Listing */}
        {!raisingNcr && !viewingNcr && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>Non-Conformance Register Log</div>
            </div>
            <div style={S.cardBody}>
              <div style={S.grid(3)}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Search by Title, ID, or Risk Code</span>
                  <input type="text" style={S.inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Filter by Department</span>
                  <select style={S.inp} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                    <option value="All">All Departments</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Filter by Status</span>
                  <select style={S.inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Under investigation">Under investigation</option>
                    <option value="CAPA raised">CAPA raised</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>NCR Code</th>
                    <th style={S.th}>Incident Title</th>
                    <th style={S.th}>Department</th>
                    <th style={S.th}>Severity</th>
                    <th style={S.th}>ISO Reference</th>
                    <th style={S.th}>Risk Link</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No Non-Conformities match the filter criteria.</td>
                    </tr>
                  ) : (
                    filtered.map(n => (
                      <tr key={n.id}>
                        <td style={S.td}><code>{n.ncrNumber}</code></td>
                        <td style={S.td}><strong>{n.title}</strong></td>
                        <td style={S.td}>{n.department}</td>
                        <td style={S.td}>
                          <span style={{
                            color: n.severity === "Critical" ? "#991B1B" : n.severity === "Major" ? "#92400E" : "#1E40AF",
                            fontWeight: "bold"
                          }}>
                            {n.severity}
                          </span>
                        </td>
                        <td style={S.td}>{n.isoClause || "§8.4"}</td>
                        <td style={S.td}>
                          {n.linkedRiskId ? (
                            <span style={{ padding: "2px 6px", background: "#FEF3C7", color: "#92400E", borderRadius: 4, fontSize: 10, fontWeight: "bold" }}>
                              🔗 {n.linkedRiskId}
                            </span>
                          ) : (
                            <span style={{ color: "#94A3B8" }}>None</span>
                          )}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(n.status)}>{n.status}</span>
                        </td>
                        <td style={S.td}>
                          <button style={{ ...S.btn(true), padding: "4px 8px" }} onClick={() => setViewingNcr(n)}>
                            🔎 Investigate / Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
