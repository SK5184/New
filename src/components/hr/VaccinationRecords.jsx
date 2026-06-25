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

export default function VaccinationRecords() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employeeId: "", vaccineType: "Hepatitis B (HBV)", doseNumber: "Dose 1", dateAdministered: "", nextDueDate: "", clinicName: "", status: "Completed" });

  useEffect(() => {
    async function loadData() {
      try {
        const snap = await getDocs(query(collection(db, "hrVaccinations"), orderBy("createdAt", "desc")));
        setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const eSnap = await getDocs(collection(db, "employees"));
        setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        console.warn("Firestore error loading vaccination records.");
      }
    }
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.dateAdministered) return alert("Please fill all required fields");
    const payload = {
      ...form,
      createdAt: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, "hrVaccinations"), { ...payload, dbTimestamp: serverTimestamp() });
      alert("Vaccination / Health record saved successfully!");
      setForm({ employeeId: "", vaccineType: "Hepatitis B (HBV)", doseNumber: "Dose 1", dateAdministered: "", nextDueDate: "", clinicName: "", status: "Completed" });
      const snap = await getDocs(query(collection(db, "hrVaccinations"), orderBy("createdAt", "desc")));
      setRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch {
      setRecords(prev => [payload, ...prev]);
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Log Immunization & Health Records (Clause 6.2.3 / Biosafety)</h3></div>
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
              <label style={S.label}>Vaccination / Checkup Type *</label>
              <select style={S.inp} value={form.vaccineType} onChange={e => setForm({ ...form, vaccineType: e.target.value })} required>
                <option>Hepatitis B (HBV)</option>
                <option>Influenza (Annual)</option>
                <option>Tetanus Toxoid</option>
                <option>Typhoid Vaccine</option>
                <option>Annual Physical Examination</option>
                <option>Post-Exposure Prophylaxis (PEP)</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Dose / Stage</label>
              <select style={S.inp} value={form.doseNumber} onChange={e => setForm({ ...form, doseNumber: e.target.value })}>
                <option>Dose 1</option>
                <option>Dose 2</option>
                <option>Dose 3</option>
                <option>Booster Dose</option>
                <option>Annual Screening</option>
                <option>Not Applicable</option>
              </select>
            </div>
          </div>
          <div style={S.grid(4)}>
            <div>
              <label style={S.label}>Date Administered *</label>
              <input type="date" style={S.inp} value={form.dateAdministered} onChange={e => setForm({ ...form, dateAdministered: e.target.value })} required />
            </div>
            <div>
              <label style={S.label}>Next Due Date (Booster/Recall)</label>
              <input type="date" style={S.inp} value={form.nextDueDate} onChange={e => setForm({ ...form, nextDueDate: e.target.value })} />
            </div>
            <div>
              <label style={S.label}>Clinic / Hospital Name</label>
              <input style={S.inp} value={form.clinicName} onChange={e => setForm({ ...form, clinicName: e.target.value })} placeholder="Clinic or Lab Name" />
            </div>
            <div>
              <label style={S.label}>Vaccine Compliance Status</label>
              <select style={S.inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option>Completed</option>
                <option>Scheduled</option>
                <option>Declined (Signed Refusal)</option>
              </select>
            </div>
          </div>
          <button type="submit" style={S.btn}>Save Health/Immunization Record</button>
        </form>
      </div>

      <div style={S.card}>
        <div style={S.cardHeader}><h3 style={S.title}>Staff Health & Immunization Registry</h3></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#FAFAF8", borderBottom: "0.5px solid #E0DDD6" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Employee ID</th>
                <th style={{ padding: 8, textAlign: "left" }}>Type</th>
                <th style={{ padding: 8, textAlign: "center" }}>Dose / Stage</th>
                <th style={{ padding: 8, textAlign: "center" }}>Administered</th>
                <th style={{ padding: 8, textAlign: "center" }}>Next Due</th>
                <th style={{ padding: 8, textAlign: "left" }}>Clinic</th>
                <th style={{ padding: 8, textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: 12, textAlign: "center", color: "#888780" }}>No health/vaccination logs found.</td></tr>
              ) : (
                records.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: "0.5px solid #F1EFE8" }}>
                    <td style={{ padding: 8, fontWeight: 600 }}>{r.employeeId}</td>
                    <td style={{ padding: 8, fontWeight: 500 }}>{r.vaccineType}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.doseNumber}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.dateAdministered}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>{r.nextDueDate || "—"}</td>
                    <td style={{ padding: 8 }}>{r.clinicName || "—"}</td>
                    <td style={{ padding: 8, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 10,
                        background: r.status === "Completed" ? "#E1F5EE" : r.status === "Scheduled" ? "#E6F1FB" : "#FCEBEB",
                        color: r.status === "Completed" ? "#0F6E56" : r.status === "Scheduled" ? "#185FA5" : "#A32D2D",
                        fontWeight: 600
                      }}>{r.status}</span>
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
