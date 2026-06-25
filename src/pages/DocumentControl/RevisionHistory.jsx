import { useState } from "react";

const S = {
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  inp: { padding: "6px 10px", border: "1px solid #CBD5E1", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box" },
  btn: (secondary) => ({
    padding: "6px 12px", background: secondary ? "#F1F5F9" : "#0D9488", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 })
};

export default function RevisionHistory({ docs = [] }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState("");

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.docNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>🕰️ QMS Revision Logs (ISO 15189 §8.3.1.4)</div>
      </div>
      <div style={S.cardBody}>
        <div style={{ marginBottom: 16, maxWidth: 300 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>Search Document by Code or Title</span>
          <input 
            type="text" 
            style={S.inp} 
            placeholder="Search documents..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Doc Number</th>
              <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Document Title</th>
              <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Department</th>
              <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Current Version</th>
              <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Total Revisions</th>
              <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map(d => {
              const revisionCount = d.revisions?.length || 0;
              return (
                <tr key={d.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><code>{d.docNumber}</code></td>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><strong>{d.title}</strong></td>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>{d.department}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>v{d.version}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                    <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: "bold" }}>
                      {revisionCount}
                    </span>
                  </td>
                  <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                    <button style={S.btn(true)} onClick={() => setSelectedDoc(selectedDoc?.id === d.id ? null : d)}>
                      👁️ View History
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {selectedDoc && (
          <div style={{ marginTop: 20, border: "1px solid #E2E8F0", borderRadius: 8, padding: 16, background: "#F8FAFC" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 13, color: "#1E293B" }}>Version Log History: {selectedDoc.title}</h4>
              <button style={{ ...S.btn(true), padding: "4px 8px" }} onClick={() => setSelectedDoc(null)}>Close</button>
            </div>
            
            {(!selectedDoc.revisions || selectedDoc.revisions.length === 0) ? (
              <div style={{ padding: 10, background: "#FFF", borderRadius: 6, fontSize: 12, border: "1px solid #E2E8F0", color: "#64748B" }}>
                No revision history records registered for this document. Initial version v{selectedDoc.version} is active.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedDoc.revisions.map((rev, idx) => (
                  <div key={idx} style={{ background: "#FFF", borderRadius: 6, border: "1px solid #E2E8F0", padding: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, borderBottom: "1px solid #F1F5F9", paddingBottom: 6, marginBottom: 6 }}>
                      <span><strong>Version:</strong> <code style={{ color: "#0D9488" }}>v{rev.version}</code></span>
                      <span style={{ color: "#64748B" }}><strong>Effective Date:</strong> {rev.date}</span>
                      <span style={{ color: "#64748B" }}><strong>By:</strong> {rev.changedBy}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#475569" }}>
                      <strong>Change Notes:</strong> {rev.notes || "Initial entry."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
