import React from "react";

export default function PaperRecordModal({ title, subtitle, docNumber, metadata = [], onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 16
    }}>
      <div style={{
        background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 640,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)", overflow: "hidden",
        display: "flex", flexDirection: "column", maxHeight: "90vh"
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F172A" }}>📄 Scanned Compliance Paper Record</div>
            <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 2 }}>ISO 15189:2022 Physical Archival Sync</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: "#64748B", cursor: "pointer" }}>✕</button>
        </div>

        {/* Paper Container (Scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", background: "#E2E8F0", padding: "20px 0", display: "flex", justifyContent: "center" }}>
          {/* Simulated Scanned Paper */}
          <div style={{
            width: "100%", maxWidth: 540, background: "#FCFAF2", border: "1px solid #D3C2A9",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)", padding: 40, fontFamily: "Georgia, serif",
            position: "relative", minHeight: 680, boxSizing: "border-box", overflow: "hidden"
          }}>
            {/* Controlled Watermark */}
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: 32, fontWeight: 900, color: "rgba(13, 148, 136, 0.05)", pointerEvents: "none",
              textTransform: "uppercase", letterSpacing: 4, width: "100%", textAlign: "center", userSelect: "none"
            }}>
              ISO 15189 CONTROLLED RECORD
            </div>

            {/* Paper Header */}
            <div style={{ borderBottom: "2px double #8B7355", paddingBottom: 16, marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#8B7355" }}>MBL LABORATORIES DIVISION</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "6px 0", color: "#1E293B" }}>{title || "COMPLIANCE ASSESSMENT RECORD"}</h2>
              <div style={{ fontSize: 10.5, color: "#64748B", fontStyle: "italic" }}>
                Document Ref: {docNumber || "MBL-HR-FORM-104"} | Version: 2.1
              </div>
            </div>

            {/* Paper Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
              {subtitle && (
                <div style={{ fontStyle: "italic", borderBottom: "1px dashed #E2E8F0", paddingBottom: 8, color: "#475569" }}>
                  {subtitle}
                </div>
              )}

              {metadata.map((item, idx) => (
                <div key={idx} style={{ display: "flex", borderBottom: "1px dotted #E2E8F0", paddingBottom: 6 }}>
                  <span style={{ width: 150, fontWeight: 600, color: "#475569" }}>{item.label}:</span>
                  <span style={{
                    flex: 1, fontFamily: "'Courier New', monospace", color: "#1E3A8A",
                    fontWeight: 700, fontSize: 13.5, fontStyle: "italic"
                  }}>{item.value || "—"}</span>
                </div>
              ))}
            </div>

            {/* Assessment Checklist / Verified Items */}
            <div style={{ marginTop: 32, borderTop: "1px solid #8B7355", paddingTop: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8B7355", textTransform: "uppercase", marginBottom: 12 }}>Compliance Verification Check:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "#475569" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#0D9488", fontSize: 12 }}>✔</span>
                  <span>Credentials and primary qualifications verified from original certificates.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#0D9488", fontSize: 12 }}>✔</span>
                  <span>Evaluations signed off by HOD in accordance with ISO 15189 §6.2.3.</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#0D9488", fontSize: 12 }}>✔</span>
                  <span>Physical record scanned, verified, and archived in QMS database.</span>
                </div>
              </div>
            </div>

            {/* Official Stamp Simulator */}
            <div style={{
              position: "absolute", bottom: 120, right: 40, width: 140, height: 60,
              border: "2px solid #DC2626", borderRadius: 8, transform: "rotate(-8deg)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              color: "#DC2626", fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              padding: 4, textAlign: "center", background: "rgba(220, 38, 38, 0.02)", userSelect: "none"
            }}>
              <div style={{ fontSize: 8 }}>VERIFIED & APPROVED</div>
              <div style={{ fontWeight: 900, letterSpacing: 0.5, margin: "2px 0" }}>MBL QMS OFFICE</div>
              <div style={{ fontSize: 7, borderTop: "1px solid #DC2626", width: "100%", paddingTop: 2 }}>ISO 15189 SECURE SEAL</div>
            </div>

            {/* Signatures */}
            <div style={{
              marginTop: 100, display: "flex", justifyContent: "space-between",
              alignItems: "flex-end", fontSize: 11, color: "#64748B"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: 20,
                  color: "#1D4ED8", marginBottom: 2, transform: "rotate(-3deg)"
                }}>
                  {metadata.find(m => m.label.toLowerCase().includes("name"))?.value?.split(" ")[0] || "Staff"}
                </div>
                <div style={{ borderTop: "1px solid #CBD5E1", width: 120, paddingTop: 4 }}>Staff Signature</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Brush Script MT', cursive, sans-serif", fontSize: 22,
                  color: "#1D4ED8", marginBottom: 2, transform: "rotate(2deg)"
                }}>
                  Dr. Anita Roy
                </div>
                <div style={{ borderTop: "1px solid #CBD5E1", width: 120, paddingTop: 4 }}>Quality Manager / HOD</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => window.print()} style={{
            padding: "8px 16px", background: "#E2E8F0", color: "#475569", border: "none",
            borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>🖨️ Print Form</button>
          <button onClick={onClose} style={{
            padding: "8px 16px", background: "#0D9488", color: "#FFFFFF", border: "none",
            borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}>Close Viewer</button>
        </div>
      </div>
    </div>
  );
}
