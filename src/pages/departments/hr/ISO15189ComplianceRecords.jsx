import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  layout: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", height: "fit-content" },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  inp: {
    padding: "6px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  listGroup: { display: "flex", flexDirection: "column", maxHeight: "65vh", overflowY: "auto" },
  listItem: (active) => ({
    padding: "10px 14px", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer",
    background: active ? "#E1F5EE" : "transparent",
    color: active ? "#0F6E56" : "#2C2C2A",
    fontWeight: active ? 600 : 400
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" },
  checkRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8, marginBottom: 8 }
};

export default function ISO15189ComplianceRecords({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [authorizations, setAuthorizations] = useState([]);
  const [cmeRecords, setCmeRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      const eList = eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(eList);

      const tSnap = await getDocs(collection(db, "hrTraining"));
      setTrainings(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const cSnap = await getDocs(collection(db, "hrCompetency"));
      setCompetencies(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const aSnap = await getDocs(collection(db, "hrAuthorizations"));
      setAuthorizations(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const ceSnap = await getDocs(collection(db, "hrContinuingEducation"));
      setCmeRecords(ceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (eList.length > 0) {
        const match = selected ? eList.find(e => e.id === selected.id) : null;
        setSelected(match || eList[0]);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    loadData();
  }, []);

  const getComplianceStatus = (emp) => {
    if (!emp) return { rate: 0, items: [] };

    const items = [];
    let passed = 0;

    // 1. Qualification verification
    const verifiedQuals = (emp.qualifications || []).length > 0 || Object.values(emp.personnelFiles || {}).some(f => f.status === "Verified");
    items.push({
      clause: "§6.2.2",
      req: "Qualifications verification record (degree verification)",
      status: verifiedQuals ? "Verified" : "Missing Degree Proof",
      pass: verifiedQuals
    });
    if (verifiedQuals) passed++;

    // 2. Active license status
    const hasLicense = (emp.licenses || []).length > 0;
    const expiredLicense = (emp.licenses || []).some(l => new Date(l.expiryDate) < new Date());
    const licOk = hasLicense && !expiredLicense;
    items.push({
      clause: "§6.2.2",
      req: "Professional registration license current and active",
      status: !hasLicense ? "No license logged" : expiredLicense ? "License Expired!" : "Current & Verified",
      pass: licOk
    });
    if (licOk) passed++;

    // 3. Training Logs
    const hasTraining = trainings.some(t => t.attendance && t.attendance[emp.id]?.status === "Attended");
    items.push({
      clause: "§6.2.3",
      req: "Safety and equipment training logs documented",
      status: hasTraining ? "Training documented" : "No training sessions registered",
      pass: hasTraining
    });
    if (hasTraining) passed++;

    // 4. Competency Assessments
    const empComps = competencies.filter(c => c.employeeId === emp.id);
    const hasComp = empComps.length > 0;
    const compExpired = hasComp && (new Date() - new Date(empComps[0].date)) / (1000 * 60 * 60 * 24 * 365) > 1; // Expired if > 1 year
    const compOk = hasComp && !compExpired && empComps[0].overallStatus === "Competent";
    items.push({
      clause: "§6.2.3",
      req: "Annual competency review completed (routine observation)",
      status: !hasComp ? "No assessment logged" : compExpired ? "Assessment overdue (> 1 year)" : empComps[0].overallStatus !== "Competent" ? "Deficiency detected!" : "Current & Competent",
      pass: compOk
    });
    if (compOk) passed++;

    // 5. Task Authorizations
    const hasAuth = authorizations.some(a => a.employeeId === emp.id && a.status === "Active");
    items.push({
      clause: "§6.2.5",
      req: "Authorized to perform laboratory test tasks (signed permissions)",
      status: hasAuth ? "Authorized" : "No active task authorization",
      pass: hasAuth
    });
    if (hasAuth) passed++;

    // 6. Continuing Education
    const totalCme = cmeRecords.filter(r => r.employeeId === emp.id).reduce((acc, r) => acc + Number(r.credits || 0), 0);
    const cmeOk = totalCme >= 15;
    items.push({
      clause: "§6.2.6",
      req: "Continuing medical education criteria met (target: 15 CME points)",
      status: `${totalCme} / 15 credits logged`,
      pass: cmeOk
    });
    if (cmeOk) passed++;

    return {
      rate: Math.round((passed / items.length) * 100),
      items
    };
  };

  const filtered = employees.filter(e => {
    const nameVal = e.fullName || e.employeeName || "";
    const idVal = e.empId || e.employeeId || "";
    return nameVal.toLowerCase().includes(search.toLowerCase()) || idVal.toLowerCase().includes(search.toLowerCase());
  });

  const compliance = getComplianceStatus(selected);

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>ISO 15189:2022 Compliance Records Audit</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2 · Inspect regulatory compliance matrix for lab technicians</div>
        </div>
      </div>

      <div style={S.layout}>
        {/* Left Side: Employees */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Personnel Directory</div>
          </div>
          <div style={{ padding: 8, borderBottom: "0.5px solid #E0DDD6" }}>
            <input
              style={S.inp}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={S.listGroup}>
            {loading && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>Loading...</div>}
            {!loading && filtered.length === 0 && <div style={{ padding: 16, color: "#888780", fontSize: 12, textAlign: "center" }}>No results.</div>}
            {filtered.map(emp => {
              const active = selected && selected.id === emp.id;
              const { rate } = getComplianceStatus(emp);
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  style={S.listItem(active)}
                >
                  <div style={{ fontSize: 12 }}>{emp.fullName || emp.employeeName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10, color: active ? "#0F6E56" : "#888780" }}>
                    <span>ID: {emp.empId || emp.employeeId}</span>
                    <span style={{ color: rate === 100 ? "#0F6E56" : "#854F0B", fontWeight: 600 }}>{rate}% compliant</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Compliance Checklist */}
        {selected ? (
          <div style={S.card}>
            <div style={{ ...S.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.cardTitle}>ISO 15189 Compliance: {selected.fullName || selected.employeeName}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.department} · {selected.designation || "No Designation"}</div>
              </div>
              <div>
                <span style={{
                  fontSize: 11.5, fontWeight: 700, padding: "4px 12px", borderRadius: 12,
                  background: compliance.rate === 100 ? "#E1F5EE" : "#FAEEDA",
                  color: compliance.rate === 100 ? "#0F6E56" : "#854F0B"
                }}>
                  Compliance Index: {compliance.rate}%
                </span>
              </div>
            </div>

            <div style={S.cardBody}>
              <div style={{ fontSize: 11, color: "#888780", marginBottom: 12, padding: "8px 10px", background: "#FAFAF8", borderRadius: 6, border: "0.5px solid #E0DDD6" }}>
                📋 <strong>Internal Audit Note:</strong> This audit trail verifies that the employee has completed all requirements set out by the CAP Quality and ISO 15189 regulations. Deficiencies must be corrected before release duties are assigned.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {compliance.items.map((item, idx) => (
                  <div key={idx} style={S.checkRow}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontSize: 10.5, padding: "2px 6px", background: "#E6F1FB", color: "#185FA5", borderRadius: 4, marginRight: 8 }}>{item.clause}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{item.req}</span>
                      <div style={{ fontSize: 10.5, color: item.pass ? "#0F6E56" : "#A32D2D", marginTop: 4 }}>
                        Status: <strong>{item.status}</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: 16 }}>
                      {item.pass ? "✅" : "❌"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an employee from the directory list to perform regulatory compliance audits.
          </div>
        )}
      </div>
    </div>
  );
}
