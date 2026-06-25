// WeeklyDutyRoster.jsx
// Reusable, NABL compliant Weekly Duty Roster Component
// Dynamic Sunday-to-Saturday planner with status workflows and NABL §6.2.2 audit trails.

import { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";

const S = {
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "12px 16px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#10B981", color: color || "#ECFDF5",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none",
    transition: "background 0.15s ease",
    display: "inline-flex", alignItems: "center", gap: 6
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "16px 14px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

export default function WeeklyDutyRoster({ department, role, userName }) {
  const [employees, setEmployees] = useState([]);
  const [rosters, setRosters] = useState({});
  const [rosterStatus, setRosterStatus] = useState("Draft"); // Draft, Submitted, Approved, Published
  const [rosterDocId, setRosterDocId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showMockAlert, setShowMockAlert] = useState(false);

  const [selectedWeek, setSelectedWeek] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day; // Starts on Sunday (0)
    const sunday = new Date(d.setDate(diff));
    return sunday.toISOString().split("T")[0];
  });

  // Resolve roles
  const isSupervisor = role === "Supervisor" || role === "HOD" || role === "Admin" || role === "Managing Director" || role === "Deputy Director" || role === "IT Manager";
  const isHOD = role === "HOD" || role === "Admin" || role === "Managing Director" || role === "Deputy Director" || role === "IT Manager";
  const isHR = role === "HRM" || role === "HRE" || role === "Admin" || role === "Managing Director" || role === "Deputy Director" || role === "IT Manager";
  const isStaffOnly = role === "Staff" || (!isSupervisor && !isHOD && !isHR);

  // Can the user edit the roster based on its current status and their role?
  const canEdit = !isStaffOnly && (
    (rosterStatus === "Draft" || rosterStatus === "Submitted" ? isSupervisor : false) ||
    (rosterStatus === "Approved" || rosterStatus === "Published" ? isHOD : false)
  );

  const getWeekRangeString = (sundayStr) => {
    if (!sundayStr) return "";
    const sun = new Date(sundayStr);
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    return `${sun.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${sat.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const empSnap = await getDocs(query(collection(db, "employees"), where("department", "==", department)));
      const list = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(list);
      setShowMockAlert(list.length === 0);
    } catch (e) {
      console.warn("Error fetching employees:", e);
    } finally {
      setLoading(false);
    }
  }, [department]);

  const loadTabRecords = useCallback(async () => {
    setLoading(true);
    try {
      const rosterRef = query(
        collection(db, "dutyRosters"),
        where("department", "==", department),
        where("weekStartDate", "==", selectedWeek)
      );
      const snap = await getDocs(rosterRef);
      if (!snap.empty) {
        const docData = snap.docs[0].data();
        setRosters(docData.assignments || {});
        setRosterStatus(docData.status || "Draft");
        setRosterDocId(snap.docs[0].id);
      } else {
        setRosters({});
        setRosterStatus("Draft");
        setRosterDocId(null);
      }

      // Fetch audit logs for this roster
      const logsRef = query(
        collection(db, "dutyRosterLogs"),
        where("department", "==", department),
        where("weekStartDate", "==", selectedWeek),
        orderBy("createdAt", "desc")
      );
      const logsSnap = await getDocs(logsRef);
      setAuditLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn("Error loading tab records:", e);
    } finally {
      setLoading(false);
    }
  }, [department, selectedWeek]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    loadTabRecords();
  }, [loadTabRecords]);

  // Handle Generate Mock Employees for testing
  const handleGenerateMockEmployees = async () => {
    setSaving(true);
    try {
      const mockList = [
        { fullName: `Dr. Sarah Adams (${department})`, empId: `EMP-${department.substring(0,3).toUpperCase()}-001`, department: department, designation: "Supervisor / Consultant", status: "Active" },
        { fullName: `Nisha Patel (${department})`, empId: `EMP-${department.substring(0,3).toUpperCase()}-002`, department: department, designation: "Senior Technician", status: "Active" },
        { fullName: `Rajesh Kumar (${department})`, empId: `EMP-${department.substring(0,3).toUpperCase()}-003`, department: department, designation: "Junior Technician", status: "Active" },
        { fullName: `Vikram Singh (${department})`, empId: `EMP-${department.substring(0,3).toUpperCase()}-004`, department: department, designation: "Assistant", status: "Active" }
      ];
      for (const emp of mockList) {
        await addDoc(collection(db, "employees"), {
          ...emp,
          qualifications: [{ type: "Degree", title: "Technical Specialty", institution: "AIIMS", year: "2018" }],
          licenses: [{ name: "Practice License", number: "PL-405", issuedDate: "2020-01-10", expiryDate: "2030-01-10" }],
          createdAt: serverTimestamp()
        });
      }
      alert(`Successfully created 4 mock employees for ${department} in Firestore!`);
      loadInitial();
    } catch (e) {
      console.error(e);
      alert("Error adding mock employees: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to record roster audit log
  const logRosterAction = async (actionText) => {
    try {
      await addDoc(collection(db, "dutyRosterLogs"), {
        department: department,
        weekStartDate: selectedWeek,
        action: actionText,
        performedBy: userName || "System User",
        role: role || "Staff",
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Failed to log roster action:", e);
    }
  };

  // 1. Save Roster (Draft)
  const handleSaveRosterDraft = async () => {
    setSaving(true);
    try {
      const payload = {
        department: department,
        weekStartDate: selectedWeek,
        status: rosterStatus === "Draft" ? "Draft" : rosterStatus, // Keep status or set Draft
        assignments: rosters,
        updatedAt: serverTimestamp(),
        updatedBy: userName || "System"
      };

      if (rosterDocId) {
        await updateDoc(doc(db, "dutyRosters", rosterDocId), payload);
      } else {
        const newDoc = await addDoc(collection(db, "dutyRosters"), payload);
        setRosterDocId(newDoc.id);
      }

      await logRosterAction("Saved Duty Roster Draft");
      alert("Weekly Duty Roster draft saved successfully.");
      loadTabRecords();
    } catch (e) {
      console.error(e);
      alert("Error saving roster draft.");
    } finally {
      setSaving(false);
    }
  };

  // 2. Submit to HOD
  const handleSubmitToHOD = async () => {
    if (Object.keys(rosters).length === 0) {
      alert("Roster is empty. Please set shift duties before submitting.");
      return;
    }
    const confirm = window.confirm("Are you sure you want to submit this roster to the HOD for approval?");
    if (!confirm) return;

    setSaving(true);
    try {
      const payload = {
        department: department,
        weekStartDate: selectedWeek,
        status: "Submitted",
        assignments: rosters,
        updatedAt: serverTimestamp(),
        updatedBy: userName || "System"
      };

      if (rosterDocId) {
        await updateDoc(doc(db, "dutyRosters", rosterDocId), payload);
      } else {
        const newDoc = await addDoc(collection(db, "dutyRosters"), payload);
        setRosterDocId(newDoc.id);
      }

      await logRosterAction("Submitted Duty Roster to HOD");
      alert("Weekly Roster successfully submitted to HOD.");
      loadTabRecords();
    } catch (e) {
      console.error(e);
      alert("Error submitting roster.");
    } finally {
      setSaving(false);
    }
  };

  // 3. Approve Roster (HOD Action)
  const handleApproveRoster = async () => {
    const confirm = window.confirm("Do you approve this weekly duty roster?");
    if (!confirm) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "dutyRosters", rosterDocId), {
        status: "Approved",
        approvedAt: serverTimestamp(),
        approvedBy: userName || "HOD",
        updatedAt: serverTimestamp()
      });

      await logRosterAction("Approved Weekly Duty Roster");
      alert("Roster approved successfully.");
      loadTabRecords();
    } catch (e) {
      console.error(e);
      alert("Error approving roster.");
    } finally {
      setSaving(false);
    }
  };

  // 4. Publish Roster (HR Action)
  const handlePublishRoster = async () => {
    const confirm = window.confirm("Do you acknowledge and publish this duty roster for the laboratory staff?");
    if (!confirm) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "dutyRosters", rosterDocId), {
        status: "Published",
        publishedAt: serverTimestamp(),
        publishedBy: userName || "HR Officer",
        updatedAt: serverTimestamp()
      });

      await logRosterAction("Acknowledged & Published Duty Roster");
      alert("Roster published successfully to the department dashboard and HR module.");
      loadTabRecords();
    } catch (e) {
      console.error(e);
      alert("Error publishing roster.");
    } finally {
      setSaving(false);
    }
  };

  // Handle Roster Cell Changes
  const handleRosterCellChange = (empId, day, shiftStatus) => {
    setRosters(prev => {
      const updated = { ...prev };
      updated[`${empId}_${day}`] = shiftStatus;

      // Handle time automatically
      if (shiftStatus === "OD") {
        updated[`${empId}_${day}_time`] = "09:00 am to 05:00 pm"; // Default on-duty timing
      } else {
        updated[`${empId}_${day}_time`] = "N/A"; // Leave / Off hours
      }
      return updated;
    });
  };

  const handleRosterTimeChange = (empId, day, timeString) => {
    setRosters(prev => ({
      ...prev,
      [`${empId}_${day}_time`]: timeString
    }));
  };

  if (loading && employees.length === 0) {
    return <div style={{ fontSize: 13, color: "#888780", textAlign: "center", padding: 40 }}>Loading Weekly Roster database...</div>;
  }

  return (
    <div>
      {/* Mock Employee alert */}
      {showMockAlert && (
        <div style={{
          background: "#FFF5F5", border: "0.5px solid #E24B4A", borderRadius: 10,
          padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <strong style={{ fontSize: 13, color: "#A32D2D", display: "block" }}>No Staff Records Found</strong>
            <span style={{ fontSize: 11.5, color: "#64748B" }}>There are no active employee records assigned to {department} in the HR database.</span>
          </div>
          <button style={S.btn("#A32D2D", "#FFF")} onClick={handleGenerateMockEmployees} disabled={saving}>
            {saving ? "Generating..." : "➕ Generate Mock Staff"}
          </button>
        </div>
      )}

      {/* Top Status Bar */}
      <div style={{
        background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12,
        padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#888780", display: "block" }}>Roster Period</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#2C2C2A" }}>{getWeekRangeString(selectedWeek)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#5F5E5A" }}>Roster Status:</span>
          <span style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: rosterStatus === "Published" ? "#ECFDF5" : rosterStatus === "Approved" ? "#EEF2FF" : rosterStatus === "Submitted" ? "#FEF3C7" : "#F1F5F9",
            color: rosterStatus === "Published" ? "#065F46" : rosterStatus === "Approved" ? "#312E81" : rosterStatus === "Submitted" ? "#92400E" : "#475569",
            border: `0.5px solid ${rosterStatus === "Published" ? "#10B981" : rosterStatus === "Approved" ? "#818CF8" : rosterStatus === "Submitted" ? "#F59E0B" : "#CBD5E1"}`
          }}>
            {rosterStatus === "Published" ? "📢 Published & Active" : rosterStatus === "Approved" ? "✓ Approved" : rosterStatus === "Submitted" ? "⏳ Pending Approval" : "✏ Draft"}
          </span>
        </div>
      </div>

      {/* Main Interactive Table Card */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Interactive Shift Planner</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="date"
              style={{ ...S.inp, width: 140 }}
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
            />

            {/* Supervisor Controls */}
            {isSupervisor && (rosterStatus === "Draft" || rosterStatus === "Submitted") && (
              <>
                <button style={S.btn("#FAFAF8", "#5F5E5A")} onClick={handleSaveRosterDraft} disabled={saving}>
                  💾 Save Draft
                </button>
                <button style={S.btn("#0F6E56", "#fff")} onClick={handleSubmitToHOD} disabled={saving}>
                  📤 Submit to HOD
                </button>
              </>
            )}

            {/* HOD Approval Controls */}
            {isHOD && rosterStatus === "Submitted" && (
              <button style={S.btn("#312E81", "#fff")} onClick={handleApproveRoster} disabled={saving}>
                ✓ Approve Roster
              </button>
            )}

            {/* HOD Post-Approval Modifications */}
            {isHOD && (rosterStatus === "Approved" || rosterStatus === "Published") && (
              <button style={S.btn("#0F6E56", "#fff")} onClick={handleSaveRosterDraft} disabled={saving}>
                💾 Save Roster Changes
              </button>
            )}

            {/* HR Publishing Controls */}
            {isHR && rosterStatus === "Approved" && (
              <button style={S.btn("#10B981", "#fff")} onClick={handlePublishRoster} disabled={saving}>
                📢 Acknowledge & Publish
              </button>
            )}
          </div>
        </div>
        <div style={{ ...S.cardBody, overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 180 }}>Staff Member</th>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                  <th key={day} style={{ ...S.th, textAlign: "center" }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ ...S.td, textAlign: "center", color: "#888780", padding: "24px 0" }}>
                    No staff records found. Use the alert box above to generate mock staff for testing.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ ...S.td, fontWeight: 600 }}>
                      <div>{emp.fullName || emp.name}</div>
                      <div style={{ fontSize: 10, color: "#888780", fontWeight: 400 }}>{emp.designation}</div>
                    </td>
                    {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map(day => {
                      const statusVal = rosters[`${emp.id}_${day}`] || "OD";
                      const timeVal = rosters[`${emp.id}_${day}_time`] || "09:00 am to 05:00 pm";

                      return (
                        <td key={day} style={{ ...S.td, background: statusVal !== "OD" ? "#FAF9F5" : "transparent" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                            {/* Shift status dropdown */}
                            <select
                              style={{
                                ...S.inp,
                                padding: "5px 8px",
                                fontSize: "12px",
                                textAlign: "center",
                                fontWeight: 600,
                                minWidth: "120px",
                                borderColor: statusVal === "WO" ? "#CBD5E1" : statusVal === "OD" ? "#10B981" : "#F59E0B",
                                color: statusVal === "WO" ? "#64748B" : statusVal === "OD" ? "#065F46" : "#B45309"
                              }}
                              value={statusVal}
                              disabled={!canEdit}
                              onChange={(e) => handleRosterCellChange(emp.id, day, e.target.value)}
                            >
                              <option value="OD">OD (On Duty)</option>
                              <option value="WO">WO (Week Off)</option>
                              <option value="HO">HO (Holiday Off)</option>
                              <option value="CL">CL (Casual Leave)</option>
                              <option value="SL">SL (Sick Leave)</option>
                              <option value="AL">AL (Annual Leave)</option>
                            </select>

                            {/* Shift timings entry */}
                            <input
                              type="text"
                              style={{
                                ...S.inp,
                                padding: "5px 8px",
                                fontSize: "11px",
                                textAlign: "center",
                                minWidth: "120px",
                                marginTop: "6px",
                                background: statusVal !== "OD" ? "#F1EFE8" : "#fff",
                                color: statusVal !== "OD" ? "#888780" : "#2C2C2A",
                                borderColor: "#E0DDD6"
                              }}
                              value={timeVal}
                              placeholder="e.g. 09:00 am to 05:00 pm"
                              disabled={!canEdit || statusVal !== "OD"}
                              onChange={(e) => handleRosterTimeChange(emp.id, day, e.target.value)}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail List */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>📜 Roster Workflow & Audit Trail (NABL §6.2.2)</span>
        </div>
        <div style={S.cardBody}>
          {auditLogs.length === 0 ? (
            <div style={{ fontSize: 12, color: "#888780", textAlign: "center", padding: "10px 0" }}>
              No actions logged for this week's roster yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {auditLogs.map(log => (
                <div key={log.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 11.5, padding: "8px 12px", background: "#F8FAFC", borderRadius: 8, border: "0.5px solid #E0DDD6"
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "#0F6E56" }}>{log.action}</span>
                    <span style={{ color: "#888780" }}>by</span>
                    <span style={{ fontWeight: 500, color: "#2C2C2A" }}>{log.performedBy}</span>
                    <span style={{ fontSize: 9.5, padding: "1px 6px", background: "#E0DDD6", borderRadius: 4 }}>{log.role}</span>
                  </div>
                  <div style={{ color: "#888780" }}>
                    {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString("en-IN") : "Just now"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
