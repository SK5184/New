import React from "react";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "85vh", color: "#1E293B" },
  card: { background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 },
  title: { fontSize: 16, fontWeight: 600, color: "#0F172A", margin: 0 },
  subtitle: { fontSize: 11, color: "#64748B", marginTop: 4 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  field: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 600, color: "#475569" },
  input: { padding: "8px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (bg, color) => ({ padding: "8px 16px", background: bg || "#0D9488", color: color || "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "opacity 0.2s", outline: "none" }),
  badge: (bg, color) => ({ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: bg, color: color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { background: "#F8FAFC", padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "12px", borderBottom: "1px solid #F1F5F9", color: "#334155" },
  isoBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#E0F2FE", color: "#0369A1", border: "0.5px solid #7DD3FC", fontWeight: 500 }
};


export default function RiskHeatMap() {
  const cellColor = (l, i) => {
    const score = l * i;
    if (score >= 15) return "#FEE2E2"; // Red
    if (score >= 8) return "#FEF3C7";  // Yellow
    return "#E6FDF5";                 // Green
  };

  const risks = [
    { title: "R1: Cold Chain Breach", l: 3, i: 4 },
    { title: "R2: LIMS Outage", l: 2, i: 5 },
    { title: "R3: Pipette drift", l: 4, i: 2 }
  ];

  return (
    <div style={S.card}>
      <h3 style={S.title}>5×5 Likelihood vs Impact Risk Matrix Grid</h3>
      <p style={S.subtitle}>Live mapping of active QMS risks based on severity scoring</p>

      <div style={{ display: "flex", gap: 32, marginTop: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 280 }}>
          {[5, 4, 3, 2, 1].map((impact) => (
            <div key={impact} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#64748B", width: 14 }}>{impact}</span>
              {[1, 2, 3, 4, 5].map((like) => {
                const bg = cellColor(like, impact);
                const activeRisks = risks.filter(r => r.l === like && r.i === impact);
                return (
                  <div
                    key={like}
                    style={{
                      flex: 1,
                      height: 48,
                      background: bg,
                      border: "0.5px solid #CBD5E1",
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative"
                    }}
                  >
                    {activeRisks.map((r, idx) => (
                      <span
                        key={idx}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "#1E293B",
                          color: "#FFF",
                          fontSize: 8.5,
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}
                        title={r.title}
                      >
                        {r.title.substring(1, 2)}
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          <div style={{ display: "flex", gap: 4, marginLeft: 18 }}>
            {[1, 2, 3, 4, 5].map((like) => (
              <span key={like} style={{ flex: 1, textAlign: "center", fontSize: 10, color: "#64748B" }}>{like}</span>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <span style={{ fontSize: 12, fontWeight: "bold", display: "block", marginBottom: 12 }}>Active Risk Points Index</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {risks.map((r, i) => (
              <div key={i} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#1E293B" }} />
                <strong>R{r.title.substring(1, 2)}:</strong> {r.title.substring(4)} (Score: {r.l * r.i})
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}