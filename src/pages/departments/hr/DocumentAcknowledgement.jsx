import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";

const MOCK_DOCS = [
  { id: "doc1", code: "SOP-MB-001", title: "Culture Media Preparation & Quality Control" },
  { id: "doc2", code: "SOP-MB-002", title: "Gram Staining and Microscopy Examination" },
  { id: "doc3", code: "SOP-QC-001", title: "Internal Quality Control & Westgard Rules" },
  { id: "doc4", code: "POL-QMS-001", title: "MBL QMS Laboratory Quality Manual" }
];

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", height: "fit-content" },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContents: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, marginBottom: 10
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function DocumentAcknowledgement({ role, userName, dept }) {
  const [docsList, setDocsList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [acks, setAcks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    documentId: "",
    dateRead: today(),
    understood: true
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch documents
      const dSnap = await getDocs(query(collection(db, "documents"), orderBy("createdAt", "desc")));
      const dList = dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDocsList(dList.length > 0 ? dList : MOCK_DOCS);

      // 2. Fetch employees
      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 3. Fetch acknowledgements
      const aSnap = await getDocs(query(collection(db, "hrDocAcknowledgements")));
      setAcks(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const initialDoc = dList.length > 0 ? dList[0] : MOCK_DOCS[0];
      setSelectedDoc(selectedDoc ? (dList.find(d => d.id === selectedDoc.id) || selectedDoc) : initialDoc);
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
      setDocsList(MOCK_DOCS);
      setSelectedDoc(selectedDoc || MOCK_DOCS[0]);
    }
    setLoading(false);
  }, [selectedDoc]);

  useEffect(() => {
    loadData();
  }, []);

  const getEmpName = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? (match.fullName || match.employeeName) : "Unknown Employee";
  };

  const getEmpDept = (empId) => {
    const match = employees.find(e => e.id === empId || e.empId === empId);
    return match ? match.department : "—";
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.documentId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "hrDocAcknowledgements"), {
        ...form,
        createdAt: serverTimestamp()
      });
      setForm({ employeeId: "", documentId: "", dateRead: today(), understood: true });
      setModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error saving acknowledgement.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Document Acknowledgements</h2>
          <div style={S.subtitle}>ISO 15189:2022 · Track SOP read-and-understood training logs for lab staff</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => { setForm({ employeeId: "", documentId: selectedDoc?.id || "", dateRead: today(), understood: true }); setModal(true); }}>
          ✍️ Log SOP Sign-off
        </button>
      </div>

      <div style={S.layout}>
        {/* Left: Documents List */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>QMS Active SOPs & Policies</div>
          </div>
          <div style={{ padding: 0 }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Document Code</th>
                  <th style={S.th}>Document Title</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="2" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
                ) : docsList.length === 0 ? (
                  <tr><td colSpan="2" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No documents found.</td></tr>
                ) : (
                  docsList.map(doc => {
                    const active = selectedDoc && selectedDoc.id === doc.id;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        style={{ background: active ? "#E1F5EE" : "transparent", cursor: "pointer" }}
                      >
                        <td style={{ ...S.td, fontWeight: active ? 600 : 400, color: active ? "#0F6E56" : "#2C2C2A", fontFamily: "monospace" }}>{doc.code || doc.documentCode || "DOC-00"}</td>
                        <td style={S.td}>{doc.title || doc.documentName}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Acknowledgement audit for selected document */}
        {selectedDoc ? (
          <div style={S.card}>
            <div style={{ ...S.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.cardTitle}>SOP Read Signatures: {selectedDoc.code || selectedDoc.documentCode}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selectedDoc.title || selectedDoc.documentName}</div>
              </div>
            </div>
            <div style={S.cardBody}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#888780", marginBottom: 12 }}>
                Audit of technicians authorized for this procedure:
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Staff Name</th>
                    <th style={S.th}>Department</th>
                    <th style={S.th}>Read Status</th>
                    <th style={S.th}>Sign-off Date</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan="4" style={{ ...S.td, textAlign: "center", color: "#888780" }}>No active staff registered.</td></tr>
                  ) : (
                    employees.map(emp => {
                      const ack = acks.find(a => a.employeeId === emp.id && a.documentId === selectedDoc.id);
                      return (
                        <tr key={emp.id}>
                          <td style={S.td}>{emp.fullName || emp.employeeName}</td>
                          <td style={S.td}>{emp.department}</td>
                          <td style={S.td}>
                            {ack ? (
                              <span style={{ color: "#0F6E56", fontWeight: 600 }}>✅ Read & Understood</span>
                            ) : (
                              <span style={{ color: "#A32D2D", fontWeight: 500 }}>❌ Pending Read</span>
                            )}
                          </td>
                          <td style={S.td}>{ack ? ack.dateRead : "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an SOP from the active list to inspect technician reading status.
          </div>
        )}
      </div>

      {/* Log SOP Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 450, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Log SOP Read Confirmation</div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleApply} style={{ padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Document SOP</label>
                <select style={S.inp} value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })} required>
                  <option value="">Select SOP</option>
                  {docsList.map(doc => <option key={doc.id} value={doc.id}>{doc.code || doc.documentCode} - {doc.title || doc.documentName}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Select Staff Employee</label>
                <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                  <option value="">Select Employee</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Read Date</label>
                <input style={S.inp} type="date" value={form.dateRead} onChange={e => setForm({ ...form, dateRead: e.target.value })} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#2C2C2A" }}>
                  <input type="checkbox" checked={form.understood} onChange={e => setForm({ ...form, understood: e.target.checked })} required />
                  Staff confirms they have read, understood and will comply with this procedure *
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Log Acknowledgment"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
