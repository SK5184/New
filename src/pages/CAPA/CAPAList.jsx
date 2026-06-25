import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import CAPAForm from "./CAPAForm";
import EffectivenessCheck from "./EffectivenessCheck";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", color: "#1E293B" },
  topbar: { background: "#0F172A", color: "#FFF", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "4px solid #185FA5" },
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
    padding: "6px 12px", background: secondary ? "#F1F5F9" : "#185FA5", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all 0.15s"
  }),
  badge: (status) => {
    let bg = "#FCEBEB", fg = "#A32D2D";
    if (status === "In progress") { bg = "#FAEEDA"; fg = "#854F0B"; }
    if (status === "Pending effectiveness check") { bg = "#E6F1FB"; fg = "#185FA5"; }
    if (status === "Closed") { bg = "#E1F5EE"; fg = "#0F6E56"; }
    if (status === "Reopened") { bg = "#FEE2E2"; fg = "#991B1B"; }
    return { padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg };
  },
  riskBadge: (score) => {
    let bg = "#ECFDF5", fg = "#065F46";
    if (score >= 15) { bg = "#FEE2E2"; fg = "#991B1B"; }
    else if (score >= 8) { bg = "#FEF3C7"; fg = "#92400E"; }
    return { padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: "bold", background: bg, color: fg };
  },
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 })
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function CAPAList() {
  const { role, name: userName, dept } = useAuth();
  const [capas, setCapas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const [raisingCapa, setRaisingCapa] = useState(false);
  const [checkingCapa, setCheckingCapa] = useState(null);

  const isQuality = ["Quality Manager", "Quality Executive", "Managing Director", "Admin"].includes(role) || dept === "Quality";

  const fetchCapas = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "capas"), orderBy("createdAt", "desc")));
      setCapas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Could not load capas from Firestore, using fallbacks:", e);
      setCapas([
        { id: "capa1", capaNumber: "CAPA-2026-001", title: "Automate Barcode Validation Checks", actionType: "Preventive", status: "In progress", responsiblePerson: "Dr. Suresh Kumar", targetDate: "2026-07-02", ncrNumber: "NCR-2026-002", preRiskScore: 15, postRiskScore: 3, actionPlan: "Procure and mount automated barcode scanning validation devices at all Serology sample loading lines." },
        { id: "capa2", capaNumber: "CAPA-2026-002", title: "Establish Daily Calibration Verification Protocol", actionType: "Corrective", status: "Pending effectiveness check", responsiblePerson: "Sarah Jenkins", targetDate: "2026-06-15", ncrNumber: "NCR-2026-001", preRiskScore: 9, postRiskScore: 2, actionPlan: "Train staff on daily calibration run validation checks. Add Westgard chart checksheets.", completedAt: "2026-06-14", completedBy: "Sarah Jenkins" }
      ]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCapas();
  }, [fetchCapas]);

  const handleStartCapa = async (id) => {
    try {
      await updateDoc(doc(db, "capas", id), {
        status: "In progress",
        startedAt: serverTimestamp()
      });
      alert("CAPA action items marked as In Progress.");
      fetchCapas();
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleSubmitForCheck = async (id) => {
    try {
      await updateDoc(doc(db, "capas", id), {
        status: "Pending effectiveness check",
        completedAt: serverTimestamp(),
        completedBy: userName
      });
      alert("Action plan submitted for Quality department effectiveness audit.");
      fetchCapas();
    } catch (err) {
      console.error(err);
      alert("Failed to submit CAPA.");
    }
  };

  const filtered = capas.filter(c => {
    const matchStatus = filterStatus === "All" || c.status === filterStatus;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.capaNumber.toLowerCase().includes(search.toLowerCase()) || (c.ncrNumber || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const openCount = capas.filter(c => c.status === "Open").length;
  const progressCount = capas.filter(c => c.status === "In progress").length;
  const checkCount = capas.filter(c => c.status === "Pending effectiveness check").length;
  const closedCount = capas.filter(c => c.status === "Closed").length;
  const overdueCount = capas.filter(c => ["Open", "In progress"].includes(c.status) && daysUntil(c.targetDate) < 0).length;

  return (
    <div style={S.wrap}>
      <div style={S.topbar}>
        <div style={S.title}>
          <span>🔧</span>
          <span>MBL QMS — Corrective & Preventive Actions (ISO 15189 §8.5)</span>
        </div>
        {isQuality && <button style={S.btn(false)} onClick={() => { setRaisingCapa(true); setCheckingCapa(null); }}>+ New CAPA</button>}
      </div>

      <div style={S.content}>
        {/* Statistics Widgets */}
        {!raisingCapa && !checkingCapa && (
          <div style={S.grid(5)}>
            {[
              { label: "Open CAPAs", val: openCount, color: "#A32D2D", bg: "#FCEBEB" },
              { label: "In Progress", val: progressCount, color: "#854F0B", bg: "#FAEEDA" },
              { label: "Awaiting Audit", val: checkCount, color: "#185FA5", bg: "#E6F1FB" },
              { label: "Closed / Verified", val: closedCount, color: "#0F6E56", bg: "#E1F5EE" },
              { label: "Overdue Actions", val: overdueCount, color: "#791F1F", bg: "#FEE2E2" }
            ].map((stat, i) => (
              <div key={i} style={{ background: stat.bg, border: `1px solid ${stat.color}33`, borderRadius: 12, padding: "14px 16px" }}>
                <span style={{ fontSize: 10, color: stat.color, fontWeight: 600 }}>{stat.label}</span>
                <h2 style={{ margin: "4px 0 0", color: stat.color, fontSize: 24, fontWeight: 700 }}>{stat.val}</h2>
              </div>
            ))}
          </div>
        )}

        {/* Raise new CAPA form view */}
        {raisingCapa && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>🔧 Register Corrective & Preventive Action (CAPA) Plan</div>
              <button style={S.btn(true)} onClick={() => setRaisingCapa(false)}>Back to List</button>
            </div>
            <div style={S.cardBody}>
              <CAPAForm onComplete={() => { setRaisingCapa(false); fetchCapas(); }} onCancel={() => setRaisingCapa(false)} />
            </div>
          </div>
        )}

        {/* Effectiveness Check Auditing View */}
        {checkingCapa && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>📋 Effectiveness Assessment: {checkingCapa.capaNumber}</div>
              <button style={S.btn(true)} onClick={() => { setCheckingCapa(null); fetchCapas(); }}>Back to List</button>
            </div>
            <div style={S.cardBody}>
              <EffectivenessCheck capa={checkingCapa} onComplete={() => { setCheckingCapa(null); fetchCapas(); }} />
            </div>
          </div>
        )}

        {/* CAPA Listing table view */}
        {!raisingCapa && !checkingCapa && (
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>Corrective & Preventive Action Register Logs</div>
            </div>
            <div style={S.cardBody}>
              <div style={S.grid(2)}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Search by Title, CAPA code, or linked NCR reference</span>
                  <input type="text" style={S.inp} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Filter by Status</span>
                  <select style={S.inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="In progress">In progress</option>
                    <option value="Pending effectiveness check">Pending effectiveness check</option>
                    <option value="Closed">Closed</option>
                    <option value="Reopened">Reopened</option>
                  </select>
                </div>
              </div>

              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>CAPA Code</th>
                    <th style={S.th}>Action Title</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Linked NCR</th>
                    <th style={S.th}>Pre-Risk Index</th>
                    <th style={S.th}>Post-Risk Index</th>
                    <th style={S.th}>Target Date</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#64748B" }}>No CAPAs found matching criteria.</td>
                    </tr>
                  ) : (
                    filtered.map(c => {
                      const overdue = ["Open", "In progress"].includes(c.status) && daysUntil(c.targetDate) < 0;
                      return (
                        <tr key={c.id}>
                          <td style={S.td}><code>{c.capaNumber}</code></td>
                          <td style={S.td}><strong>{c.title}</strong></td>
                          <td style={S.td}>{c.actionType}</td>
                          <td style={S.td}>
                            {c.ncrNumber ? (
                              <span style={{ fontFamily: "monospace", padding: "2px 6px", background: "#F1F5F9", borderRadius: 4 }}>
                                {c.ncrNumber}
                              </span>
                            ) : (
                              <span style={{ color: "#94A3B8" }}>None</span>
                            )}
                          </td>
                          <td style={S.td}>
                            <span style={S.riskBadge(c.preRiskScore || 9)}>
                              {c.preRiskScore || 9} / 25
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={S.riskBadge(c.postRiskScore || 2)}>
                              {c.postRiskScore || 2} / 25
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={{ color: overdue ? "#EF4444" : "#334155", fontWeight: overdue ? "bold" : "normal" }}>
                              {c.targetDate} {overdue && "⚠️"}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(c.status)}>{c.status}</span>
                          </td>
                          <td style={S.td}>
                            <div style={{ display: "flex", gap: 6 }}>
                              {c.status === "Open" && (
                                <button style={S.btn(false)} onClick={() => handleStartCapa(c.id)}>
                                  Start Action
                                </button>
                              )}
                              {c.status === "In progress" && (
                                <button style={{ ...S.btn(false), background: "#0D9488" }} onClick={() => handleSubmitForCheck(c.id)}>
                                  Submit Audit
                                </button>
                              )}
                              {c.status === "Pending effectiveness check" && isQuality && (
                                <button style={{ ...S.btn(false), background: "#0F6E56" }} onClick={() => setCheckingCapa(c)}>
                                  Verify Check
                                </button>
                              )}
                              <button style={S.btn(true)} onClick={() => setCheckingCapa(c)}>
                                View Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
