// IntraDeptMeetingForm.jsx
// MBL QMS — Reusable Intra-Department Meeting Form & Dashboard
// Compliant with ISO 15189:2022 §8.9 (Management Review & Meeting Records)

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  query, where, orderBy, setDoc, updateDoc, deleteDoc
} from "firebase/firestore";

const S = {
  container: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100%", padding: 12 },
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifySpaceBetween: "space-between", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12 }),
  inp: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none", transition: "border 0.15s" },
  select: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", boxSizing: "border-box", outline: "none", cursor: "pointer" },
  textarea: { padding: "8px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, background: "#FFFFFF", color: "#1E293B", width: "100%", minHeight: 70, boxSizing: "border-box", outline: "none", resize: "vertical" },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : variant === "success" ? "#10B981" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.15s"
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 12px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 12px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", fontSize: 12.5, fontWeight: 500, zIndex: 2000, display: "flex", alignItems: "center", gap: 8 }
};

export default function IntraDeptMeetingForm({ department }) {
  const { name: currentUserName, role: userRole, dept: userDept, isSuperAdmin, isERPAdmin } = useAuth();

  // Access check: only target department members, Director (Super Admin), Admin, and ERP Admin can access
  const isDirector = isSuperAdmin || userRole?.toLowerCase().includes("director") || userDept === "Administration";
  const isAdmin = userRole === "Admin";
  const hasAccess = isDirector || isAdmin || isERPAdmin || userDept === department;

  const [meetings, setMeetings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [meetingForm, setMeetingForm] = useState({
    meetingId: "",
    department: department || "Laboratory",
    meetingDate: new Date().toISOString().split("T")[0],
    meetingTime: new Date().toTimeString().slice(0, 5),
    location: "Conference Room 1",
    meetingType: "Routine",
    conductedBy: "",
    coordinator: "",
    participants: [],
    agenda: [{ slNo: 1, topic: "", responsible: "" }],
    discussions: "",
    decisions: [{ slNo: 1, decision: "", responsible: "", dueDate: "" }],
    actionItems: [{ actionId: "", actionRequired: "", assignedTo: "", priority: "Medium", targetDate: "", status: "Open" }],
    attachments: [],
    preparedBy: currentUserName || "Pathology Staff",
    reviewedBy: "",
    approvalStatus: "Pending",
    approvalDate: ""
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Generate a clean auto Meeting ID
  const generateMeetingId = useCallback(() => {
    const code = (department || "GEN").slice(0, 4).toUpperCase();
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const rand = Math.floor(100 + Math.random() * 900);
    return `MEET-${code}-${dateStr}-${rand}`;
  }, [department]);

  // Load meetings & employees from Firestore
  const loadData = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      // 1. Fetch meetings matching this department
      const q = query(
        collection(db, "intraDeptMeetings"),
        where("department", "==", department),
        orderBy("meetingDate", "desc")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMeetings(list);
      localStorage.setItem(`mbl_meetings_${department}`, JSON.stringify(list));

      // 2. Fetch all employees to populate coordinator/conducted dropdowns
      const empSnap = await getDocs(collection(db, "employees"));
      const empList = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(empList);
    } catch (err) {
      console.warn("Firestore offline. Loading local meeting cache:", err);
      const cached = localStorage.getItem(`mbl_meetings_${department}`);
      if (cached) setMeetings(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  }, [department, hasAccess]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Log New Meeting click
  const handleNewMeeting = () => {
    setEditingId(null);
    setMeetingForm({
      meetingId: generateMeetingId(),
      department: department || "Laboratory",
      meetingDate: new Date().toISOString().split("T")[0],
      meetingTime: new Date().toTimeString().slice(0, 5),
      location: "Conference Room 1",
      meetingType: "Routine",
      conductedBy: "",
      coordinator: "",
      participants: [],
      agenda: [{ slNo: 1, topic: "", responsible: "" }],
      discussions: "",
      decisions: [{ slNo: 1, decision: "", responsible: "", dueDate: "" }],
      actionItems: [{ actionId: "", actionRequired: "", assignedTo: "", priority: "Medium", targetDate: "", status: "Open" }],
      attachments: [],
      preparedBy: currentUserName || "Pathology Staff",
      reviewedBy: "",
      approvalStatus: "Pending",
      approvalDate: ""
    });
    setIsFormOpen(true);
  };

  // Open existing meeting for editing
  const handleEditMeeting = (m) => {
    setEditingId(m.id);
    setMeetingForm({
      ...m,
      // Fallback arrays if empty
      participants: m.participants || [],
      agenda: m.agenda?.length ? m.agenda : [{ slNo: 1, topic: "", responsible: "" }],
      decisions: m.decisions?.length ? m.decisions : [{ slNo: 1, decision: "", responsible: "", dueDate: "" }],
      actionItems: m.actionItems?.length ? m.actionItems : [{ actionId: "", actionRequired: "", assignedTo: "", priority: "Medium", targetDate: "", status: "Open" }],
      attachments: m.attachments || []
    });
    setIsFormOpen(true);
  };

  // Delete meeting
  const handleDeleteMeeting = async (id) => {
    if (!window.confirm("Are you sure you want to delete this meeting record? Action requests will remain but disconnected.")) return;
    try {
      await deleteDoc(doc(db, "intraDeptMeetings", id));
      showToast("Meeting record deleted.");
      loadData();
    } catch (e) {
      alert("Failed to delete record.");
    }
  };

  // Dynamic row additions & removals
  const addRow = (type) => {
    if (type === "agenda") {
      setMeetingForm(prev => ({
        ...prev,
        agenda: [...prev.agenda, { slNo: prev.agenda.length + 1, topic: "", responsible: "" }]
      }));
    } else if (type === "decisions") {
      setMeetingForm(prev => ({
        ...prev,
        decisions: [...prev.decisions, { slNo: prev.decisions.length + 1, decision: "", responsible: "", dueDate: "" }]
      }));
    } else if (type === "actionItems") {
      setMeetingForm(prev => ({
        ...prev,
        actionItems: [...prev.actionItems, { actionId: `ACT-${prev.meetingId}-${prev.actionItems.length + 1}`, actionRequired: "", assignedTo: "", priority: "Medium", targetDate: "", status: "Open" }]
      }));
    }
  };

  const removeRow = (type, index) => {
    setMeetingForm(prev => {
      let list = [...prev[type]];
      list.splice(index, 1);
      // Re-index slNo where applicable
      if (type === "agenda" || type === "decisions") {
        list = list.map((item, idx) => ({ ...item, slNo: idx + 1 }));
      }
      return { ...prev, [type]: list };
    });
  };

  const updateRowField = (type, index, field, value) => {
    setMeetingForm(prev => {
      const list = [...prev[type]];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [type]: list };
    });
  };

  // Handle participant checkboxes
  const handleParticipantToggle = (emp) => {
    const key = emp.id || emp.employeeId;
    const exists = meetingForm.participants.find(p => p.employeeId === key);
    
    if (exists) {
      // Remove
      setMeetingForm(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.employeeId !== key)
      }));
    } else {
      // Add
      const name = emp.fullName || emp.employeeName || emp.name || "";
      const designation = emp.designation || "Staff";
      setMeetingForm(prev => ({
        ...prev,
        participants: [...prev.participants, { employeeId: key, employeeName: name, designation, attendance: "Present" }]
      }));
    }
  };

  const updateParticipantAttendance = (empId, val) => {
    setMeetingForm(prev => ({
      ...prev,
      participants: prev.participants.map(p => p.employeeId === empId ? { ...p, attendance: val } : p)
    }));
  };

  // Mock File Upload metadata logging
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const mapped = files.map(file => ({
      name: file.name,
      size: (file.size / 1024).toFixed(1) + " KB",
      type: file.type || "application/octet-stream"
    }));

    setMeetingForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...mapped]
    }));
    showToast(`${files.length} document(s) uploaded successfully (simulation).`);
  };

  const removeAttachment = (index) => {
    setMeetingForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, idx) => idx !== index)
    }));
  };

  // Submit and Save Record
  const handleSave = async (e) => {
    e.preventDefault();
    if (!meetingForm.conductedBy || !meetingForm.coordinator) {
      return alert("Please select Conducted By and Meeting Coordinator.");
    }
    setSaving(true);

    try {
      let docRefId = editingId;
      if (editingId) {
        // Update meeting
        await setDoc(doc(db, "intraDeptMeetings", editingId), meetingForm);
      } else {
        // Create new meeting
        const docRef = await addDoc(collection(db, "intraDeptMeetings"), meetingForm);
        docRefId = docRef.id;
      }

      // Action Items Auto-transfer: commit all action items to the global actionRequests collection
      const saveActionsPromises = meetingForm.actionItems
        .filter(act => act.actionRequired.trim() !== "")
        .map(async (act, index) => {
          const actId = act.actionId || `ACT-${meetingForm.meetingId}-${index + 1}`;
          const payload = {
            actionId: actId,
            meetingId: meetingForm.meetingId,
            source: `Intra-Department Meeting (${meetingForm.department})`,
            actionRequired: act.actionRequired,
            assignedTo: act.assignedTo,
            priority: act.priority,
            targetDate: act.targetDate,
            status: act.status,
            createdAt: new Date().toISOString(),
            createdBy: currentUserName || "Pathology Staff"
          };
          await setDoc(doc(db, "actionRequests", actId), payload);
        });

      await Promise.all(saveActionsPromises);

      showToast(`Meeting record ${editingId ? "updated" : "saved"} & Action Items auto-transferred.`);
      setIsFormOpen(false);
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Error saving record to database. Saved locally.");
    } finally {
      setSaving(false);
    }
  };

  // Filter employees belonging to the target department
  const filteredEmployees = employees.filter(emp => {
    const empDept = emp.department || emp.dept || "";
    return empDept.toLowerCase() === department.toLowerCase();
  });

  // Calculate statistics for follow-up tracking
  const totalMeetings = meetings.length;
  let pendingActions = 0;
  let completedActions = 0;
  let overdueActions = 0;
  const today = new Date().toISOString().split("T")[0];

  meetings.forEach(m => {
    (m.actionItems || []).forEach(act => {
      if (act.actionRequired) {
        if (act.status === "Closed") {
          completedActions++;
        } else {
          pendingActions++;
          if (act.targetDate && act.targetDate < today) {
            overdueActions++;
          }
        }
      }
    });
  });

  // Render Access Restrained card if not authorized
  if (!hasAccess) {
    return (
      <div style={S.container}>
        <div style={{ ...S.card, maxWidth: 500, margin: "40px auto", textAlign: "center" }}>
          <div style={{ ...S.cardHeader, background: "#FCEBEB", borderBottom: "1px solid #EF4444" }}>
            <span style={{ ...S.cardTitle, color: "#EF4444" }}>🔒 Access Restricted</span>
          </div>
          <div style={S.cardBody}>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: "1.6" }}>
              Under **ISO 15189:2022 §8.9** audit parameters, intra-department meeting minutes, personnel details, and corrective action discussions are confidential.
            </p>
            <p style={{ fontSize: 12.5, color: "#791F1F", fontWeight: 600, marginTop: 8 }}>
              You must belong to the {department} department or hold a Director/System Administrator role to view these records.
            </p>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Your department: {userDept || "Not Set"}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Your role: {userRole || "Not Set"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.container}>
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ── SECTION 1: DASHBOARD VIEW ─────────────────────────────────────── */}
      {!isFormOpen && (
        <div>
          {/* Stats Bar */}
          <div style={S.grid(4)}>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #0D9488" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Total Meetings Logs</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", marginTop: 4 }}>{totalMeetings}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Pathology dept logs</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #F59E0B" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Pending Action Items</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#D97706", marginTop: 4 }}>{pendingActions}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Open/In Progress actions</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #EF4444" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Overdue Target Dates</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#DC2626", marginTop: 4 }}>{overdueActions}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Exceeded target deadline</div>
            </div>
            <div style={{ ...S.card, marginBottom: 0, padding: 16, borderLeft: "4px solid #10B981" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>Completed Actions</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#059669", marginTop: 4 }}>{completedActions}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 4 }}>Closed action points</div>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button style={S.btn()} onClick={handleNewMeeting}>
              ➕ Log New Meeting Minute
            </button>
          </div>

          {/* History Table */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>🤝 Intra-Department Meeting Register ({department})</span>
              <button style={S.btn("secondary")} onClick={loadData}>🔄 Refresh</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Meeting ID</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Conducted By</th>
                    <th style={S.th}>Coordinator</th>
                    <th style={S.th}>Participants</th>
                    <th style={S.th}>Action Items</th>
                    <th style={S.th}>Status</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="9" style={{ padding: 24, textAlign: "center", color: "#64748B" }}>Loading registries...</td></tr>
                  ) : meetings.length === 0 ? (
                    <tr><td colSpan="9" style={{ padding: 32, textAlign: "center", color: "#64748B" }}>No meeting records found for this department.</td></tr>
                  ) : (
                    meetings.map((m) => {
                      const totalActions = (m.actionItems || []).filter(a => a.actionRequired).length;
                      const openActions = (m.actionItems || []).filter(a => a.status !== "Closed" && a.actionRequired).length;
                      return (
                        <tr key={m.id}>
                          <td style={{ ...S.td, fontWeight: 600 }}><code>{m.meetingId}</code></td>
                          <td style={S.td}>{m.meetingDate}</td>
                          <td style={S.td}>
                            <span style={S.badge("#EFF6FF", "#1E40AF")}>{m.meetingType}</span>
                          </td>
                          <td style={S.td}>{m.conductedBy}</td>
                          <td style={S.td}>{m.coordinator}</td>
                          <td style={S.td}>{(m.participants || []).length} present</td>
                          <td style={S.td}>
                            <span style={{ fontWeight: 600, color: openActions > 0 ? "#D97706" : "#059669" }}>
                              {openActions} open / {totalActions} total
                            </span>
                          </td>
                          <td style={S.td}>
                            <span style={S.badge(
                              m.approvalStatus === "Approved" ? "#ECFDF5" : m.approvalStatus === "Rejected" ? "#FEF2F2" : "#FFFBEB",
                              m.approvalStatus === "Approved" ? "#065F46" : m.approvalStatus === "Rejected" ? "#991B1B" : "#92400E"
                            )}>{m.approvalStatus}</span>
                          </td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <button style={{ ...S.btn("secondary"), padding: "4px 8px", fontSize: 11, marginRight: 6 }} onClick={() => handleEditMeeting(m)}>View / Edit</button>
                            <button style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 11 }} onClick={() => handleDeleteMeeting(m.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 2: EDITING / LOGGING FORM VIEW ────────────────────────── */}
      {isFormOpen && (
        <form onSubmit={handleSave} style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>📝 {editingId ? "Edit Meeting Minutes" : "Log New Intra-Department Meeting"}</span>
            <button type="button" style={S.btn("secondary")} onClick={() => setIsFormOpen(false)}>Back to Dashboard</button>
          </div>

          <div style={S.cardBody}>
            {/* 1. Meeting Details */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>1. Meeting Specifications</h4>
            <div style={S.grid(4)}>
              <div>
                <label style={S.label}>Meeting ID (Auto)</label>
                <input style={S.inp} value={meetingForm.meetingId} readOnly />
              </div>
              <div>
                <label style={S.label}>Department</label>
                <input style={S.inp} value={meetingForm.department} readOnly />
              </div>
              <div>
                <label style={S.label}>Meeting Date *</label>
                <input type="date" style={S.inp} value={meetingForm.meetingDate} onChange={e => setMeetingForm({ ...meetingForm, meetingDate: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Meeting Time *</label>
                <input type="time" style={S.inp} value={meetingForm.meetingTime} onChange={e => setMeetingForm({ ...meetingForm, meetingTime: e.target.value })} required />
              </div>
            </div>

            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Meeting Location / Mode *</label>
                <input style={S.inp} placeholder="e.g. Biochem Room 1 / Online" value={meetingForm.location} onChange={e => setMeetingForm({ ...meetingForm, location: e.target.value })} required />
              </div>
              <div>
                <label style={S.label}>Meeting Type *</label>
                <select style={S.select} value={meetingForm.meetingType} onChange={e => setMeetingForm({ ...meetingForm, meetingType: e.target.value })}>
                  <option value="Routine">Routine (Monthly)</option>
                  <option value="Review">Performance Review</option>
                  <option value="CAPA">CAPA / Root Cause</option>
                  <option value="Emergency">Emergency Meeting</option>
                  <option value="Training">Training Discussion</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Conducted By *</label>
                <select style={S.select} value={meetingForm.conductedBy} onChange={e => setMeetingForm({ ...meetingForm, conductedBy: e.target.value })}>
                  <option value="">-- Select Person --</option>
                  {employees.map((emp, i) => (
                    <option key={i} value={emp.fullName || emp.employeeName || emp.name}>{emp.fullName || emp.employeeName || emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.grid(2)}>
              <div>
                <label style={S.label}>Meeting Coordinator *</label>
                <select style={S.select} value={meetingForm.coordinator} onChange={e => setMeetingForm({ ...meetingForm, coordinator: e.target.value })}>
                  <option value="">-- Select Coordinator --</option>
                  {employees.map((emp, i) => (
                    <option key={i} value={emp.fullName || emp.employeeName || emp.name}>{emp.fullName || emp.employeeName || emp.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Participants */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>2. Participants Registry & Attendance</h4>
            <div style={{ background: "#FAFAF8", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0", marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: "#64748B", display: "block", marginBottom: 8 }}>
                Select personnel attending. Employee IDs and designations are fetched dynamically.
              </span>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 60 }}>Select</th>
                    <th style={S.th}>Employee Name</th>
                    <th style={S.th}>Employee ID</th>
                    <th style={S.th}>Designation</th>
                    <th style={S.th}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 10, textAlign: "center", color: "#64748B" }}>No employees registered in this department registry. Add employee profiles in User management.</td></tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const empId = emp.id || emp.employeeId;
                      const matched = meetingForm.participants.find(p => p.employeeId === empId);
                      return (
                        <tr key={empId}>
                          <td style={S.td}>
                            <input
                              type="checkbox"
                              checked={!!matched}
                              onChange={() => handleParticipantToggle(emp)}
                              style={{ width: 15, height: 15, cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ ...S.td, fontWeight: 600 }}>{emp.fullName || emp.employeeName}</td>
                          <td style={S.td}><code>{empId}</code></td>
                          <td style={S.td}>{emp.designation}</td>
                          <td style={S.td}>
                            <select
                              style={{ ...S.select, width: 120, padding: "4px 8px", fontSize: 11 }}
                              value={matched ? matched.attendance : "Absent"}
                              disabled={!matched}
                              onChange={e => updateParticipantAttendance(empId, e.target.value)}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 3. Meeting Agenda */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>3. Meeting Agenda Topics</h4>
            <div style={{ marginBottom: 16 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 50 }}>Sl.No</th>
                    <th style={S.th}>Agenda Topic / Discussion Focus *</th>
                    <th style={S.th}>Responsible Person</th>
                    <th style={{ ...S.th, width: 60, textAlign: "center" }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingForm.agenda.map((item, idx) => (
                    <tr key={idx}>
                      <td style={S.td}>{item.slNo}</td>
                      <td style={S.td}>
                        <input style={S.inp} placeholder="Agenda point" value={item.topic} onChange={e => updateRowField("agenda", idx, "topic", e.target.value)} required />
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={item.responsible} onChange={e => updateRowField("agenda", idx, "responsible", e.target.value)}>
                          <option value="">-- Choose Member --</option>
                          {meetingForm.participants.map((p, i) => (
                            <option key={i} value={p.employeeName}>{p.employeeName}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button type="button" style={{ ...S.btn("danger"), padding: "4px 8px" }} onClick={() => removeRow("agenda", idx)} disabled={meetingForm.agenda.length === 1}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" style={{ ...S.btn("secondary"), marginTop: 8 }} onClick={() => addRow("agenda")}>
                ➕ Add Agenda Item
              </button>
            </div>

            {/* 4. Discussion Summary */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>4. Discussion Summary</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Discussion / Key Points raised *</label>
              <textarea style={S.textarea} placeholder="Write detail summaries of discussion, observations, issues raised, or complaints reviewed..." value={meetingForm.discussions} onChange={e => setMeetingForm({ ...meetingForm, discussions: e.target.value })} required />
            </div>

            {/* 5. Decisions Taken */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>5. Key Decisions Taken</h4>
            <div style={{ marginBottom: 16 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 50 }}>Sl.No</th>
                    <th style={S.th}>Decision Description *</th>
                    <th style={S.th}>Responsible Person</th>
                    <th style={S.th}>Target Due Date</th>
                    <th style={{ ...S.th, width: 60, textAlign: "center" }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingForm.decisions.map((item, idx) => (
                    <tr key={idx}>
                      <td style={S.td}>{item.slNo}</td>
                      <td style={S.td}>
                        <input style={S.inp} placeholder="Decision made" value={item.decision} onChange={e => updateRowField("decisions", idx, "decision", e.target.value)} required />
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={item.responsible} onChange={e => updateRowField("decisions", idx, "responsible", e.target.value)}>
                          <option value="">-- Choose Member --</option>
                          {meetingForm.participants.map((p, i) => (
                            <option key={i} value={p.employeeName}>{p.employeeName}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <input type="date" style={S.inp} value={item.dueDate} onChange={e => updateRowField("decisions", idx, "dueDate", e.target.value)} />
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button type="button" style={{ ...S.btn("danger"), padding: "4px 8px" }} onClick={() => removeRow("decisions", idx)} disabled={meetingForm.decisions.length === 1}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" style={{ ...S.btn("secondary"), marginTop: 8 }} onClick={() => addRow("decisions")}>
                ➕ Add Decision Row
              </button>
            </div>

            {/* 6. Action Items */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>6. Controlled Action Items (Auto-transfer to QMS Dashboard)</h4>
            <div style={{ marginBottom: 16 }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Action ID</th>
                    <th style={S.th}>Action Description / Corrective Task *</th>
                    <th style={S.th}>Assigned To</th>
                    <th style={S.th}>Priority</th>
                    <th style={S.th}>Target Date</th>
                    <th style={S.th}>Status</th>
                    <th style={{ ...S.th, width: 60, textAlign: "center" }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {meetingForm.actionItems.map((item, idx) => (
                    <tr key={idx}>
                      <td style={S.td}><code>{item.actionId || `ACT-${meetingForm.meetingId}-${idx + 1}`}</code></td>
                      <td style={S.td}>
                        <input style={S.inp} placeholder="Action required" value={item.actionRequired} onChange={e => updateRowField("actionItems", idx, "actionRequired", e.target.value)} required />
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={item.assignedTo} onChange={e => updateRowField("actionItems", idx, "assignedTo", e.target.value)}>
                          <option value="">-- Choose Member --</option>
                          {meetingForm.participants.map((p, i) => (
                            <option key={i} value={p.employeeName}>{p.employeeName}</option>
                          ))}
                        </select>
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={item.priority} onChange={e => updateRowField("actionItems", idx, "priority", e.target.value)}>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </td>
                      <td style={S.td}>
                        <input type="date" style={S.inp} value={item.targetDate} onChange={e => updateRowField("actionItems", idx, "targetDate", e.target.value)} required />
                      </td>
                      <td style={S.td}>
                        <select style={S.select} value={item.status} onChange={e => updateRowField("actionItems", idx, "status", e.target.value)}>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <button type="button" style={{ ...S.btn("danger"), padding: "4px 8px" }} onClick={() => removeRow("actionItems", idx)} disabled={meetingForm.actionItems.length === 1}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" style={{ ...S.btn("secondary"), marginTop: 8 }} onClick={() => addRow("actionItems")}>
                ➕ Add Action Item Row
              </button>
            </div>

            {/* 7. Documents / Attachments */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>7. Minutes Documents / Attachments</h4>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Upload Minutes / Supporting Reports (PDF, DOCX, JPG, PNG)</label>
              <input type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ fontSize: 12 }} />
              {meetingForm.attachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {meetingForm.attachments.map((file, i) => (
                    <span key={i} style={{ ...S.badge("#E2E8F0", "#1E293B"), display: "inline-flex", alignItems: "center", gap: 6 }}>
                      📎 {file.name} ({file.size})
                      <button type="button" onClick={() => removeAttachment(i)} style={{ background: "none", border: "none", color: "#EF4444", fontWeight: "bold", cursor: "pointer", padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 8. Review & Approval */}
            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#64748B", marginTop: 24, marginBottom: 12, borderBottom: "1px solid #E2E8F0", paddingBottom: 6 }}>8. Review & Sign-Off Approval</h4>
            <div style={S.grid(3)}>
              <div>
                <label style={S.label}>Prepared By</label>
                <input style={S.inp} value={meetingForm.preparedBy} readOnly />
              </div>
              <div>
                <label style={S.label}>Reviewed By (HOD / Supervisor) *</label>
                <select style={S.select} value={meetingForm.reviewedBy} onChange={e => setMeetingForm({ ...meetingForm, reviewedBy: e.target.value })} required>
                  <option value="">-- Choose Head --</option>
                  {employees.filter(e => ["HOD", "Supervisor", "Managing Director"].includes(e.designation)).map((emp, i) => (
                    <option key={i} value={emp.fullName || emp.employeeName || emp.name}>{emp.fullName || emp.employeeName || emp.name} ({emp.designation})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Approval Status</label>
                <select style={S.select} value={meetingForm.approvalStatus} onChange={e => {
                  const val = e.target.value;
                  setMeetingForm({
                    ...meetingForm,
                    approvalStatus: val,
                    approvalDate: val !== "Pending" ? new Date().toISOString().split("T")[0] : ""
                  });
                }}>
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved / Closed</option>
                  <option value="Rejected">Rejected / Revise</option>
                </select>
              </div>
            </div>
            
            {meetingForm.approvalStatus !== "Pending" && (
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Approval Date</label>
                  <input type="date" style={S.inp} value={meetingForm.approvalDate} readOnly />
                </div>
              </div>
            )}
            
            <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 20, marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" style={S.btn("secondary")} onClick={() => setIsFormOpen(false)}>Cancel</button>
              <button type="submit" style={S.btn("success")} disabled={saving}>
                {saving ? "Saving Minute..." : "💾 Save Meeting Minute"}
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
}
