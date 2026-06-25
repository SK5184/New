import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" },
  progressContainer: { background: "#E0DDD6", borderRadius: 10, height: 8, width: "100%", overflow: "hidden", marginTop: 4 },
  progressBar: (pct, color) => ({ width: `${pct}%`, background: color || "#0F6E56", height: "100%" })
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function ReportsAnalytics({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const eSnap = await getDocs(query(collection(db, "employees")));
      setEmployees(eSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const tSnap = await getDocs(query(collection(db, "hrTraining")));
      setTrainings(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const cSnap = await getDocs(query(collection(db, "hrCompetency")));
      setCompetencies(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const aSnap = await getDocs(query(collection(db, "hrAppraisals")));
      setAppraisals(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.warn("Firestore access error. Using local metrics.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalStaff = employees.length;
  const activeStaff = employees.filter(e => (e.status || "Active") === "Active").length;

  // License warnings
  const expiringLicensesList = [];
  employees.forEach(emp => {
    (emp.licenses || []).forEach(lic => {
      const days = daysUntil(lic.expiryDate);
      if (days !== null && days <= 90) {
        expiringLicensesList.push({
          empName: emp.fullName || emp.employeeName,
          empId: emp.empId || emp.employeeId,
          dept: emp.department,
          licName: lic.name,
          licNo: lic.number,
          expiry: lic.expiryDate,
          daysLeft: days
        });
      }
    });
  });

  // Competency rate (staff with a review logged)
  const auditedIds = new Set(competencies.map(c => c.employeeId));
  const competencyAuditPct = totalStaff > 0 ? Math.round((auditedIds.size / totalStaff) * 100) : 0;

  // Appraisal completion rate (period: 2025-2026)
  const appraisedIds = new Set(appraisals.filter(a => a.period === "2025-2026").map(a => a.employeeId));
  const appraisalCompletionPct = totalStaff > 0 ? Math.round((appraisedIds.size / totalStaff) * 100) : 0;

  // Training compliance score
  const completedTrainings = trainings.filter(t => t.status === "Completed");
  const averageAttendancePct = completedTrainings.length > 0 ? Math.round(
    (completedTrainings.reduce((acc, t) => {
      const att = t.attendance || {};
      const attendedCount = Object.values(att).filter(v => v.status === "Attended").length;
      const totalPossible = totalStaff || 1;
      return acc + (attendedCount / totalPossible);
    }, 0) / completedTrainings.length) * 100
  ) : 0;

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>HR Reports & Analytics</h2>
          <div style={S.subtitle}>ISO 15189:2022 · Compliance indices, training logs, and license audits</div>
        </div>
      </div>

      {/* KPI summaries */}
      <div style={S.grid(3)}>
        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Staff Competency Cycle</div></div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
              <span>Assessments Complete</span>
              <span>{competencyAuditPct}%</span>
            </div>
            <div style={S.progressContainer}>
              <div style={S.progressBar(competencyAuditPct, "#185FA5")} />
            </div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 8 }}>
              {auditedIds.size} of {totalStaff} employees evaluated using clinical criteria.
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Training Course Attendance</div></div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
              <span>Avg Training Attendance</span>
              <span>{averageAttendancePct}%</span>
            </div>
            <div style={S.progressContainer}>
              <div style={S.progressBar(averageAttendancePct, "#0F6E56")} />
            </div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 8 }}>
              Calculated across {completedTrainings.length} completed training sessions.
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardHeader}><div style={S.cardTitle}>Annual Appraisal Completion</div></div>
          <div style={S.cardBody}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
              <span>Period 2025-2026</span>
              <span>{appraisalCompletionPct}%</span>
            </div>
            <div style={S.progressContainer}>
              <div style={S.progressBar(appraisalCompletionPct, "#854F0B")} />
            </div>
            <div style={{ fontSize: 11, color: "#888780", marginTop: 8 }}>
              {appraisedIds.size} of {totalStaff} appraisals logged for the current cycle.
            </div>
          </div>
        </div>
      </div>

      {/* Expiry Auditing */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>⚠️ Professional License Expiry Audit Report</div>
        </div>
        <div style={{ padding: 0 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Employee Name</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>License Name & No</th>
                <th style={S.th}>Expiry Date</th>
                <th style={S.th}>Action Horizon</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading...</td></tr>
              ) : expiringLicensesList.length === 0 ? (
                <tr><td colSpan="5" style={{ ...S.td, textAlign: "center", padding: 24, color: "#0F6E56", fontWeight: 500 }}>✅ No expiring professional licenses found (within 90-day threshold).</td></tr>
              ) : (
                expiringLicensesList.map((lic, idx) => (
                  <tr key={idx}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{lic.empName}</div>
                      <div style={{ fontSize: 10, color: "#888780" }}>ID: {lic.empId}</div>
                    </td>
                    <td style={S.td}>{lic.dept}</td>
                    <td style={S.td}>{lic.licName} (No. {lic.licNo || "N/A"})</td>
                    <td style={S.td}>{lic.expiry}</td>
                    <td style={S.td}>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                        background: lic.daysLeft < 0 ? "#FCEBEB" : lic.daysLeft <= 30 ? "#FAEEDA" : "#F1EFE8",
                        color: lic.daysLeft < 0 ? "#A32D2D" : lic.daysLeft <= 30 ? "#854F0B" : "#5F5E5A"
                      }}>
                        {lic.daysLeft < 0 ? `Expired ${Math.abs(lic.daysLeft)} days ago` : `Expires in ${lic.daysLeft} days`}
                      </span>
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
