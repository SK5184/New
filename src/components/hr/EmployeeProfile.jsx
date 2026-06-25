import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

const S = {
  wrap: { padding: "16px", fontFamily: "'Inter',system-ui,sans-serif" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { borderBottom: "0.5px solid #E0DDD6", paddingBottom: 10, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 14, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  inp: { padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12, background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none" },
  btn: { padding: "6px 12px", background: "#0F6E56", color: "#E1F5EE", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  badge: (bg, color) => ({ display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: bg, color: color }),
  profileHero: { display: "flex", gap: 16, alignItems: "center", borderBottom: "0.5px solid #E0DDD6", paddingBottom: 16, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#0F6E56", fontWeight: 600 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: "#5F5E5A", borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4, marginBottom: 8, marginTop: 12 }
};

export default function EmployeeProfile() {
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    async function loadEmployees() {
      try {
        const snap = await getDocs(query(collection(db, "employees"), orderBy("fullName", "asc")));
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEmployees(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          setSelectedEmp(list[0]);
        }
      } catch (e) {
        console.warn("Firestore error loading employees.");
      }
    }
    loadEmployees();
  }, []);

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    const emp = employees.find(emp => emp.id === id);
    setSelectedEmp(emp || null);
  };

  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.title}>Employee Profile Directory</h3>
          <div style={{ width: 250 }}>
            <select style={S.inp} value={selectedId} onChange={handleSelect}>
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName || emp.employeeName} ({emp.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedEmp ? (
          <div>
            <div style={S.profileHero}>
              <div style={S.avatar}>
                {(selectedEmp.fullName || selectedEmp.employeeName || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#2C2C2A" }}>
                  {selectedEmp.fullName || selectedEmp.employeeName}
                </div>
                <div style={{ fontSize: 12, color: "#5F5E5A", marginTop: 2 }}>
                  {selectedEmp.designation} · {selectedEmp.department}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={S.badge(selectedEmp.status === "Active" ? "#E1F5EE" : "#FCEBEB", selectedEmp.status === "Active" ? "#0F6E56" : "#A32D2D")}>
                    {selectedEmp.status || "Active"}
                  </span>
                </div>
              </div>
            </div>

            <div style={S.grid(2)}>
              <div>
                <div style={S.sectionTitle}>Employment Details</div>
                <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div><strong>Employee ID:</strong> <span style={{ fontFamily: "monospace" }}>{selectedEmp.empId || selectedEmp.employeeId || "—"}</span></div>
                  <div><strong>Date of Joining:</strong> {selectedEmp.dateOfJoining || selectedEmp.joiningDate || "—"}</div>
                  <div><strong>Email Address:</strong> {selectedEmp.email || "—"}</div>
                  <div><strong>Phone Number:</strong> {selectedEmp.phone || selectedEmp.mobile || "—"}</div>
                </div>
              </div>

              <div>
                <div style={S.sectionTitle}>Qualifications & Credentials</div>
                {(!selectedEmp.qualifications || selectedEmp.qualifications.length === 0) ? (
                  <div style={{ fontSize: 12, color: "#888780", padding: "4px 0" }}>No qualifications recorded.</div>
                ) : (
                  selectedEmp.qualifications.map((q, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, fontSize: 12, alignItems: "center", marginBottom: 6 }}>
                      <span style={S.badge("#EEEDFE", "#534AB7")}>{q.type}</span>
                      <span style={{ fontWeight: 500 }}>{q.title}</span>
                      <span style={{ color: "#888780" }}>({q.institution}, {q.year})</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={S.sectionTitle}>Licenses & Certifications (ISO 15189 Aligned)</div>
              {(!selectedEmp.licenses || selectedEmp.licenses.length === 0) ? (
                <div style={{ fontSize: 12, color: "#888780", padding: "4px 0" }}>No professional licenses logged.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selectedEmp.licenses.map((l, idx) => {
                    const days = getDaysUntil(l.expiryDate);
                    const isExpired = days !== null && days < 0;
                    const isExpiring = days !== null && days >= 0 && days <= 60;
                    return (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8, fontSize: 12 }}>
                        <div>
                          <strong>{l.name}</strong>
                          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>License No: {l.number} | Exp: {l.expiryDate || "—"}</div>
                        </div>
                        {isExpired && <span style={S.badge("#FCEBEB", "#A32D2D")}>Expired</span>}
                        {isExpiring && <span style={S.badge("#FAEEDA", "#854F0B")}>Expiring Soon ({days}d)</span>}
                        {!isExpired && !isExpiring && <span style={S.badge("#E1F5EE", "#0F6E56")}>Current</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: "#888780", fontSize: 12 }}>
            No employee profiles found in the database. Add them in Employee Master.
          </div>
        )}
      </div>
    </div>
  );
}
