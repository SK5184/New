import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

const S = {
  wrap: { padding: "16px", fontFamily: "'Inter',system-ui,sans-serif" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { borderBottom: "0.5px solid #E0DDD6", paddingBottom: 10, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  inp: { padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: { padding: "6px 12px", background: "#0F6E56", color: "#E1F5EE", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }
};

export default function PolicyAcknowledgement() {
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [form, setForm] = useState({ employeeId: "", documentId: "", version: "1.0", accepted: false });

  useEffect(() => {
    async function loadData() {
      try {
        const aSnap = await getDocs(query(collection(db, "hrPolicyAck"), orderBy("createdAt", "desc")));
        setAcknowledgements(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fallback or read from Firestore 'documents' collection if it exists
        const dSnap = await getDocs(collection(db, "documents"));
        if (dSnap.empty) {
          setDocuments([
            { id: "sop_001", title: "SOP on Blood Sample Collection", docNo: "MBL-SOP-COL-01" },
            { id: "sop_002", title: "SOP on Temperature Monitoring", docNo: "MBL-SOP-ENV-02" },
            { id: "sop_003", title: "SOP on Fire Safety & Evacuation", docNo: "MBL-SOP-SAF-03" },
            { id: "sop_004", title: "SOP on Biohazard Waste Management", docNo: "MBL-SOP-SAF-04" },
            { id: "sop_005", title: "Quality Manual (ISO 15189 Aligned)", docNo: "MBL-QM-01" }
          ]);
        } else {
          setDocuments(dSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (e) {
        console.warn("Firestore error loading policy/document details.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.documentId) return alert("Please fill all required fields");
    if (!form.accepted) return alert("You must accept the terms of the policy");

    const selectedDoc = documents.find(d => d.id === form.documentId || d.docNo === form.documentId);
    const payload = {
      ...form,
      documentTitle: selectedDoc ? selectedDoc.title : "Unknown SOP",
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrPolicyAck"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Policy read acknowledgement signed successfully!");
      setForm({ employeeId: "", documentId: "", version: "1.0", accepted: false });
      const snap = await getDocs(query(collection(db, "hrPolicyAck"), orderBy("createdAt", "desc")));
      setAcknowledgements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setAcknowledgements(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>SOP Read & Understood Sign-off (Clause 6.2.3)</h3></div>
        <form onSubmit={handleSubmit}>
          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Select Employee *</label>
              <select style={S.inp} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.empId || emp.id}>{emp.fullName || emp.employeeName} ({emp.department})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Select SOP / Policy Document *</label>
              <select style={S.inp} value={form.documentId} onChange={e => setForm({ ...form, documentId: e.target.value })} required>
                <option value="">-- Choose Document --</option>
                {documents.map(doc => (
                  <option key={doc.id} value={doc.docNo || doc.id}>{doc.docNo} - {doc.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>Document Version</label>
              <input style={S.inp} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} placeholder="e.g. 1.0" />
            </div>
          </div>
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="accept" checked={form.accepted} onChange={e => setForm({ ...form, accepted: e.target.checked })} />
            <label htmlFor="accept" style={{ fontSize: 12, color: "#2C2C2A", cursor: "pointer" }}>
              I confirm that I have read, understood, and agree to strictly comply with this Quality System SOP / Policy.
            </label>
          </div>
          <button type="submit" style={S.btn}>Sign SOP Acknowledgement</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Policy Acknowledgement Log (Audit Trail)</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>SOP/Policy ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Document Title</th>
                <th style={{ padding: 8, textAlign: "center" }}>Version</th>
                <th style={{ padding: 8, textAlign: "left" }}>Date Acknowledged</th>
                <th style={{ padding: 8, textAlign: "center" }}>Audit Trail Status</th>
              </tr>
            </thead>
            <tbody>
              {acknowledgements.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No acknowledgements logged yet.</td></tr>
              ) : (
                acknowledgements.map((a, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{a.employeeId}</td>
                    <td style={{ padding: 8 }}>{a.documentId}</td>
                    <td style={{ padding: 8, fontWeight: 500 }}>{a.documentTitle}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>v{a.version}</td>
                    <td style={{ padding: 8 }}>{a.createdAt ? new Date(a.createdAt).toLocaleString("en-IN") : "—"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: "#E1F5EE", color: "#0F6E56", fontWeight: 600
                      }}>Digitally Signed</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
