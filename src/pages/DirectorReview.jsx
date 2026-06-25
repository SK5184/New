import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const S = {
  wrap: {
    fontFamily: "'Inter',system-ui,sans-serif",
    background: "#F8FAFC",
    minHeight: "100vh",
    color: "#1E293B",
  },
  topbar: {
    background: "#0F172A",
    color: "#F8FAFC",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderBottom: "4px solid #0D9488",
  },
  title: { fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  content: { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  banner: {
    background: "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
    borderRadius: 14,
    padding: "24px 32px",
    color: "#fff",
    marginBottom: 24,
    border: "1px solid #334155",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
  },
  bannerTitle: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" },
  bannerSub: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  grid: (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
    marginBottom: 20,
  }),
  card: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    overflow: "hidden",
    height: "100%",
  },
  cardHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid #E2E8F0",
    background: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  btn: {
    padding: "10px 18px",
    background: "#0D9488",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "background 0.15s",
    marginTop: 14,
  },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
};

export default function DirectorReview() {
  const { role, name: userName, dept } = useAuth();
  
  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={S.title}>
          <span>👑</span>
          <span>MBL QMS — Executive Director's Cockpit</span>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>
          User: <strong>{userName}</strong> ({role})
        </div>
      </div>

      <div style={S.content}>
        {/* Welcome Banner */}
        <div style={S.banner}>
          <div style={S.bannerTitle}>Executive Compliance Review Dashboard</div>
          <div style={S.bannerSub}>
            Centralized overview for MD, Deputy Directors, and Quality Directors. Verify ISO 15189:2022 indicators.
          </div>
        </div>

        {/* Metrics summary */}
        <div style={S.grid(3)}>
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>📊 ISO 15189 Quality KPIs</div>
            </div>
            <div style={S.cardBody}>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                13/15 Quality Indicators are performing within target boundaries.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <span style={S.badge("#E6F4EA", "#137333")}>Pass Rate: 86.6%</span>
                <span style={S.badge("#EFF6FF", "#1E40AF")}>Last Audit: Passed</span>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>🛡️ Compliance Scope Register</div>
            </div>
            <div style={S.cardBody}>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                Manage the clinical test master scope database, mapping NABL test codes, reportable ranges, and equipment.
              </p>
              <button 
                style={S.btn}
                onClick={() => window.location.href = "/test-master"}
              >
                🔬 Open NABL Test Master
              </button>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>⚠️ Pending Approvals</div>
            </div>
            <div style={S.cardBody}>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                There are <strong>2 SOP revisions</strong> and <strong>1 CAPA verification</strong> waiting for Director signature.
              </p>
              <span style={S.badge("#FFF3CD", "#856404")} style={{ display: "inline-block", marginTop: 10 }}>
                Requires Attention
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
