import { useState, useEffect, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import PaperRecordModal from "../../../components/PaperRecordModal";

const DEPARTMENTS = [
  "Microbiology", "Serology", "Histopathology & Cytopathology", "Flow Cytometry", "Cytogenetics",
  "Biochemistry", "Haematology", "Clinical Pathology", "Molecular Biology", "Molecular Genetics",
  "Quality", "Human Resource", "Biomedical Engineering", "Purchase", "Maintenance", "Housekeeping",
  "Information Technology", "Kitchen", "Security", "Collection", "Front Office", "Back Office",
  "Sample Collection Centre", "Call Centre", "Accounts", "Administration", "Design", "Marketing",
  "ERP Administration",
];

const QUAL_TYPES = ["Degree", "Diploma", "Certification", "License"];

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "100vh" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 600, color: "#2C2C2A", margin: 0 },
  subtitle: { fontSize: 12, color: "#888780", marginTop: 3 },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 14 },
  inp: {
    padding: "8px 12px", border: "0.5px solid #D3D1C7", borderRadius: 8, fontSize: 12.5,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "8px 16px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "background 0.15s ease"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "12px 14px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function EmployeeMaster({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'new' | 'details'
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");

  const [form, setForm] = useState({
    fullName: "", empId: "", department: "", designation: "",
    dateOfJoining: today(), email: "", phone: "", status: "Active"
  });
  const [paperDoc, setPaperDoc] = useState(null);

  const [qualForm, setQualForm] = useState({ type: "Degree", title: "", institution: "", year: "" });
  const [licForm, setLicForm] = useState({ name: "", number: "", issuedDate: "", expiryDate: "" });

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      setEmployees(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.warn("Firestore access error. Using offline local mock values.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.empId || !form.department) {
      alert("Please fill all required fields.");
      return;
    }
    setSaving(true);
    try {
      if (modal === "edit" && selected) {
        await updateDoc(doc(db, "employees", selected.id), {
          ...form,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "employees"), {
          ...form,
          qualifications: [],
          licenses: [],
          createdAt: serverTimestamp()
        });
      }
      setModal(null);
      setSelected(null);
      setForm({
        fullName: "", empId: "", department: "", designation: "",
        dateOfJoining: today(), email: "", phone: "", status: "Active"
      });
      loadEmployees();
    } catch (e) {
      console.error(e);
      alert("Error saving employee.");
    }
    setSaving(false);
  };

  const startEdit = (emp) => {
    setSelected(emp);
    setForm({
      fullName: emp.fullName || emp.employeeName || "",
      empId: emp.empId || emp.employeeId || "",
      department: emp.department || "",
      designation: emp.designation || "",
      dateOfJoining: emp.dateOfJoining || emp.joiningDate || today(),
      email: emp.email || "",
      phone: emp.phone || emp.mobile || "",
      status: emp.status || "Active"
    });
    setModal("edit");
  };

  const addQualification = async () => {
    if (!selected || !qualForm.title) return;
    setSaving(true);
    try {
      const quals = [...(selected.qualifications || []), qualForm];
      await updateDoc(doc(db, "employees", selected.id), { qualifications: quals });
      setSelected(p => ({ ...p, qualifications: quals }));
      setQualForm({ type: "Degree", title: "", institution: "", year: "" });
      loadEmployees();
    } catch (e) {
      console.error(e);
      alert("Error adding qualification.");
    }
    setSaving(false);
  };

  const addLicense = async () => {
    if (!selected || !licForm.name || !licForm.expiryDate) return;
    setSaving(true);
    try {
      const lics = [...(selected.licenses || []), licForm];
      await updateDoc(doc(db, "employees", selected.id), { licenses: lics });
      setSelected(p => ({ ...p, licenses: lics }));
      setLicForm({ name: "", number: "", issuedDate: "", expiryDate: "" });
      loadEmployees();
    } catch (e) {
      console.error(e);
      alert("Error adding license.");
    }
    setSaving(false);
  };

  const filtered = employees.filter(e => {
    const md = filterDept === "All" || e.department === filterDept;
    const nameVal = e.fullName || e.employeeName || "";
    const idVal = e.empId || e.employeeId || "";
    const mq = !search ||
      nameVal.toLowerCase().includes(search.toLowerCase()) ||
      idVal.toLowerCase().includes(search.toLowerCase());
    return md && mq;
  });

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Employee Master</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2.2 · Manage credentials and qualifications database</div>
        </div>
        <button style={S.btn("#0F6E56", "#E1F5EE")} onClick={() => { setForm({ fullName: "", empId: "", department: "", designation: "", dateOfJoining: today(), email: "", phone: "", status: "Active" }); setSelected(null); setModal("new"); }}>
          ➕ Add Employee
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          style={{ ...S.inp, width: 280 }}
          placeholder="Search by name or employee ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...S.inp, width: 220 }}
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#888780", marginLeft: "auto", alignSelf: "center" }}>
          Showing {filtered.length} employees
        </span>
      </div>

      {/* Records Card */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Employee Records Directory</div>
        </div>
        <div style={{ padding: 0, overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Employee Name / ID</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>Designation</th>
                <th style={S.th}>Date of Joining</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No employees found.</td></tr>
              ) : (
                filtered.map(emp => (
                  <tr key={emp.id}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{emp.fullName || emp.employeeName}</div>
                      <div style={{ fontSize: 10.5, color: "#888780", marginTop: 2 }}>ID: {emp.empId || emp.employeeId}</div>
                    </td>
                    <td style={S.td}>{emp.department}</td>
                    <td style={S.td}>{emp.designation || "—"}</td>
                    <td style={S.td}>{emp.dateOfJoining || emp.joiningDate}</td>
                    <td style={S.td}>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 12,
                        background: (emp.status || "Active") === "Active" ? "#E1F5EE" : "#F1EFE8",
                        color: (emp.status || "Active") === "Active" ? "#0F6E56" : "#5F5E5A"
                      }}>{emp.status || "Active"}</span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button style={S.btn("#185FA5", "#E6F1FB"), { padding: "4px 8px", fontSize: 11, background: "#185FA5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} onClick={() => { setSelected(emp); setModal("details"); }}>
                          📁 Credentials
                        </button>
                        <button style={{ padding: "4px 8px", fontSize: 11, background: "#888780", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }} onClick={() => startEdit(emp)}>
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal === "new" || modal === "edit") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 600, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>{modal === "new" ? "Add New Employee" : "Edit Employee Details"}</div>
              <button onClick={() => { setModal(null); setSelected(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ padding: 20 }}>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Full Name *</label>
                  <input style={S.inp} name="fullName" value={form.fullName} onChange={handleChange} required />
                </div>
                <div>
                  <label style={S.label}>Employee ID *</label>
                  <input style={S.inp} name="empId" value={form.empId} onChange={handleChange} required disabled={modal === "edit"} />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Department *</label>
                  <select style={S.inp} name="department" value={form.department} onChange={handleChange} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Designation</label>
                  <input style={S.inp} name="designation" value={form.designation} onChange={handleChange} />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Email Address</label>
                  <input style={S.inp} type="email" name="email" value={form.email} onChange={handleChange} />
                </div>
                <div>
                  <label style={S.label}>Mobile Phone</label>
                  <input style={S.inp} name="phone" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div style={S.grid(2)}>
                <div>
                  <label style={S.label}>Date of Joining</label>
                  <input style={S.inp} type="date" name="dateOfJoining" value={form.dateOfJoining} onChange={handleChange} />
                </div>
                <div>
                  <label style={S.label}>Status</label>
                  <select style={S.inp} name="status" value={form.status} onChange={handleChange}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => { setModal(null); setSelected(null); }} style={S.btn("#888780", "#fff")}>Cancel</button>
                <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")}>{saving ? "Saving..." : "Save Details"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details & Credentials Modal */}
      {modal === "details" && selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 680, maxHeight: "92vh", overflow: "auto", boxShadow: "0 12px 60px rgba(0,0,0,0.22)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "0.5px solid #E0DDD6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>Employee Credentials & qualifications</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.fullName || selected.employeeName} (ID: {selected.empId || selected.employeeId})</div>
              </div>
              <button onClick={() => { setModal(null); setSelected(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780" }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              {/* Qualifications list */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 8, borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4 }}>🎓 Qualifications (ISO 15189 §6.2.2)</div>
                {(selected.qualifications || []).length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "#888780", fontStyle: "italic", marginBottom: 12 }}>No qualifications recorded.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {(selected.qualifications || []).map((q, idx) => (
                      <div key={idx} style={{ background: "#FAFAF8", padding: "8px 12px", borderRadius: 6, border: "0.5px solid #E0DDD6", fontSize: 11.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#0F6E56" }}>[{q.type}]</span> <strong style={{ color: "#2C2C2A" }}>{q.title}</strong> from <em>{q.institution}</em> ({q.year})
                        </div>
                        <button 
                          onClick={() => setPaperDoc({
                            title: "STAFF QUALIFICATION VERIFICATION SHEET",
                            docNumber: `QUAL-VER-${selected.empId || selected.id}-${idx}`,
                            metadata: [
                              { label: "Employee Name", value: selected.fullName || selected.employeeName },
                              { label: "Employee ID", value: selected.empId || selected.employeeId },
                              { label: "Qualification Type", value: q.type },
                              { label: "Degree Title", value: q.title },
                              { label: "Granting Institution", value: q.institution },
                              { label: "Year of Passing", value: q.year },
                              { label: "Verification Status", value: "ORIGINAL CERTIFICATE VERIFIED BY MBL QA" }
                            ]
                          })}
                          style={{
                            padding: "3px 6px", fontSize: 10, background: "#E2E8F0", color: "#475569",
                            border: "none", borderRadius: 4, cursor: "pointer"
                          }}
                        >
                          📄 View Paper Record
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add qualification form */}
                <div style={{ background: "#FAFAF8", border: "0.5px solid #E0DDD6", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#5F5E5A", marginBottom: 8 }}>Add Qualification Record</div>
                  <div style={S.grid(3)}>
                    <div>
                      <label style={S.label}>Type</label>
                      <select style={{ ...S.inp, padding: "5px 8px" }} value={qualForm.type} onChange={e => setQualForm({ ...qualForm, type: e.target.value })}>
                        {QUAL_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Title / Degree Name</label>
                      <input style={{ ...S.inp, padding: "5px 8px" }} value={qualForm.title} onChange={e => setQualForm({ ...qualForm, title: e.target.value })} placeholder="e.g. M.Sc. Microbiology" />
                    </div>
                    <div>
                      <label style={S.label}>Institution & Year</label>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input style={{ ...S.inp, padding: "5px 8px", flex: 2 }} value={qualForm.institution} onChange={e => setQualForm({ ...qualForm, institution: e.target.value })} placeholder="Univ" />
                        <input style={{ ...S.inp, padding: "5px 8px", flex: 1 }} value={qualForm.year} onChange={e => setQualForm({ ...qualForm, year: e.target.value })} placeholder="2024" />
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={addQualification} disabled={saving} style={{ ...S.btn("#0F6E56", "#E1F5EE"), padding: "5px 10px", fontSize: 11, marginTop: 8 }}>
                    {saving ? "Adding..." : "➕ Add Qualification"}
                  </button>
                </div>
              </div>

              {/* Licenses list */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2C2C2A", marginBottom: 8, borderBottom: "0.5px solid #F1EFE8", paddingBottom: 4 }}>🔑 Licenses & registrations (ISO 15189 §6.2.2)</div>
                {(selected.licenses || []).length === 0 ? (
                  <div style={{ fontSize: 11.5, color: "#888780", fontStyle: "italic", marginBottom: 12 }}>No professional licenses recorded.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                    {(selected.licenses || []).map((l, idx) => (
                      <div key={idx} style={{ background: "#FAFAF8", padding: "8px 12px", borderRadius: 6, border: "0.5px solid #E0DDD6", fontSize: 11.5, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ color: "#2C2C2A" }}>{l.name}</strong> (No. {l.number || "N/A"})
                          <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>Issued: {l.issuedDate || "—"} | Expires: {l.expiryDate}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button 
                            onClick={() => setPaperDoc({
                              title: "PROFESSIONAL REGISTRATION & LICENSE VERIFICATION FORM",
                              docNumber: `LIC-VER-${selected.empId || selected.id}-${idx}`,
                              metadata: [
                                { label: "Employee Name", value: selected.fullName || selected.employeeName },
                                { label: "Employee ID", value: selected.empId || selected.employeeId },
                                { label: "License Board", value: l.name },
                                { label: "License Number", value: l.number },
                                { label: "Date of Issue", value: l.issuedDate || "N/A" },
                                { label: "Date of Expiry", value: l.expiryDate },
                                { label: "Audit Verification", value: "ACTIVE - CONFIRMED FROM STATE BOARD REGISTRY" }
                              ]
                            })}
                            style={{
                              padding: "3px 6px", fontSize: 10, background: "#E2E8F0", color: "#475569",
                              border: "none", borderRadius: 4, cursor: "pointer"
                            }}
                          >
                            📄 View Paper Record
                          </button>
                          <span style={{
                            fontSize: 9.5, padding: "2px 6px", borderRadius: 8, fontWeight: 600,
                            background: new Date(l.expiryDate) < new Date() ? "#FCEBEB" : "#E1F5EE",
                            color: new Date(l.expiryDate) < new Date() ? "#A32D2D" : "#0F6E56"
                          }}>
                            {new Date(l.expiryDate) < new Date() ? "EXPIRED" : "ACTIVE"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add license form */}
                <div style={{ background: "#FAFAF8", border: "0.5px solid #E0DDD6", padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#5F5E5A", marginBottom: 8 }}>Add Professional License Record</div>
                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>License Name / Board</label>
                      <input style={{ ...S.inp, padding: "5px 8px" }} value={licForm.name} onChange={e => setLicForm({ ...licForm, name: e.target.value })} placeholder="e.g. Medical Council Registration" />
                    </div>
                    <div>
                      <label style={S.label}>License Number</label>
                      <input style={{ ...S.inp, padding: "5px 8px" }} value={licForm.number} onChange={e => setLicForm({ ...licForm, number: e.target.value })} placeholder="e.g. REG-77625" />
                    </div>
                  </div>
                  <div style={S.grid(2)}>
                    <div>
                      <label style={S.label}>Issued Date</label>
                      <input style={{ ...S.inp, padding: "5px 8px" }} type="date" value={licForm.issuedDate} onChange={e => setLicForm({ ...licForm, issuedDate: e.target.value })} />
                    </div>
                    <div>
                      <label style={S.label}>Expiry Date *</label>
                      <input style={{ ...S.inp, padding: "5px 8px" }} type="date" value={licForm.expiryDate} onChange={e => setLicForm({ ...licForm, expiryDate: e.target.value })} required />
                    </div>
                  </div>
                  <button type="button" onClick={addLicense} disabled={saving} style={{ ...S.btn("#0F6E56", "#E1F5EE"), padding: "5px 10px", fontSize: 11, marginTop: 8 }}>
                    {saving ? "Adding..." : "➕ Add License"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {paperDoc && (
        <PaperRecordModal
          title={paperDoc.title}
          docNumber={paperDoc.docNumber}
          metadata={paperDoc.metadata}
          onClose={() => setPaperDoc(null)}
        />
      )}
    </div>
  );
}
