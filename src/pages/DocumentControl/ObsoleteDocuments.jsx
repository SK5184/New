import { useState } from "react";

const S = {
  card: { background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "12px 16px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 16 },
  btn: (secondary) => ({
    padding: "6px 12px", background: secondary ? "#F1F5F9" : "#0D9488", color: secondary ? "#475569" : "#FFF",
    border: secondary ? "1px solid #CBD5E1" : "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 })
};

export default function ObsoleteDocuments({ docs = [] }) {
  const [selectedDoc, setSelectedDoc] = useState(null);

  const obsoleteDocs = docs.filter(d => d.status === "Obsolete");

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitle}>🗃️ Superseded & Obsolete Archives (ISO 15189 §8.3.1.5)</div>
      </div>
      <div style={S.cardBody}>
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: 12, fontSize: 11, color: "#991B1B", marginBottom: 16 }}>
          <strong>Superseded Documents Archive:</strong> These documents are deprecated and no longer active. They must not be referenced for patient examinations or testing operations. Retained only for audit trails and regulatory historical logs.
        </div>

        {obsoleteDocs.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 12 }}>No obsolete documents in the QMS archive.</div>
        ) : (
          <div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Doc Number</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Document Title</th>
                  <th style={{ padding: 10, textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>Department</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Final Version</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Archive Date</th>
                  <th style={{ padding: 10, textAlign: "center", borderBottom: "2px solid #E2E8F0" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {obsoleteDocs.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><code>{d.docNumber}</code></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}><strong>{d.title}</strong></td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0" }}>{d.department}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>v{d.version}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                      {d.obsoletedAt ? new Date(d.obsoletedAt.toDate?.() || d.obsoletedAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
                      <button style={S.btn(true)} onClick={() => setSelectedDoc(selectedDoc?.id === d.id ? null : d)}>
                        👁️ View Archival Copy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedDoc && (
              <div style={{ marginTop: 20, border: "2px solid #FCA5A5", borderRadius: 8, padding: 16, background: "#FFF5F5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: "#991B1B" }}>⚠️ OBSOLETE DOCUMENT RECORD: {selectedDoc.title}</h4>
                  <button style={{ ...S.btn(true), padding: "4px 8px" }} onClick={() => setSelectedDoc(null)}>Close Viewer</button>
                </div>
                <div style={S.grid(2)}>
                  <div>
                    <span style={{ fontSize: 11, color: "#991B1B", fontWeight: 600 }}>Obsoleted By:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>{selectedDoc.obsoletedBy || "System"}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#991B1B", fontWeight: 600 }}>Final Archive Date:</span>
                    <p style={{ margin: "2px 0 10px", fontSize: 12, fontWeight: 500 }}>
                      {selectedDoc.obsoletedAt ? new Date(selectedDoc.obsoletedAt.toDate?.() || selectedDoc.obsoletedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div style={{ padding: 12, border: "1px dashed #FCA5A5", borderRadius: 6, background: "#FEF2F2", color: "#991B1B", fontSize: 11, textAlign: "center", fontWeight: "bold" }}>
                  ❌ SUPERSEDED DOCUMENT ARCHIVE - HISTORICAL VIEW ONLY
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
