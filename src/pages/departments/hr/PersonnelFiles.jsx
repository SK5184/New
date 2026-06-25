import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const CHECKLIST_ITEMS = [
  "Signed Employment Contract",
  "Identity Proof (Aadhaar, PAN, Passport)",
  "Educational Certificates Verification",
  "Professional License & Registration Proof",
  "Signed Job Description (JD) Acknowledgment",
  "Signed Confidentiality & Ethics Agreement",
  "Medical Fitness & Immunization Record"
];

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
  btn: (bg, color) => ({
    padding: "6px 12px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer"
  }),
  listGroup: { display: "flex", flexDirection: "column", maxHeight: "65vh", overflowY: "auto" },
  listItem: (active) => ({
    padding: "10px 14px", borderBottom: "0.5px solid #F1EFE8", cursor: "pointer",
    background: active ? "#E1F5EE" : "transparent",
    color: active ? "#0F6E56" : "#2C2C2A",
    fontWeight: active ? 600 : 400
  }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "8px 12px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "10px 12px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

export default function PersonnelFiles({ role, userName, dept }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "employees"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(list);

      if (list.length > 0) {
        // Retain selection if valid, or default to first employee
        const match = selected ? list.find(e => e.id === selected.id) : null;
        setSelected(match || list[0]);
      }
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleStatusChange = async (itemKey, field, value) => {
    if (!selected) return;
    setSaving(true);
    try {
      const pFiles = selected.personnelFiles || {};
      const itemRecord = pFiles[itemKey] || { status: "Missing", verifiedBy: "", dateVerified: "", fileUrl: "" };
      itemRecord[field] = value;
      if (field === "status" && value === "Verified") {
        itemRecord.verifiedBy = userName || "HR Officer";
        itemRecord.dateVerified = new Date().toISOString().split("T")[0];
      }

      const updatedFiles = { ...pFiles, [itemKey]: itemRecord };
      await updateDoc(doc(db, "employees", selected.id), { personnelFiles: updatedFiles });

      setSelected(p => ({ ...p, personnelFiles: updatedFiles }));
      setEmployees(list => list.map(emp => emp.id === selected.id ? { ...emp, personnelFiles: updatedFiles } : emp));
    } catch (e) {
      console.error(e);
      alert("Error updating personnel files.");
    }
    setSaving(false);
  };

  const filtered = employees.filter(e => {
    const nameVal = e.fullName || e.employeeName || "";
    const idVal = e.empId || e.employeeId || "";
    return nameVal.toLowerCase().includes(search.toLowerCase()) || idVal.toLowerCase().includes(search.toLowerCase());
  });

  // Calculate compliance statistics for selected employee
  const getStats = (emp) => {
    if (!emp) return { count: 0, verified: 0, pct: 0 };
    const pFiles = emp.personnelFiles || {};
    let verifiedCount = 0;
    CHECKLIST_ITEMS.forEach(item => {
      if (pFiles[item]?.status === "Verified") verifiedCount++;
    });
    return {
      count: CHECKLIST_ITEMS.length,
      verified: verifiedCount,
      pct: Math.round((verifiedCount / CHECKLIST_ITEMS.length) * 100)
    };
  };

  const currentStats = getStats(selected);

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div>
          <h2 style={S.title}>Personnel Files Audit</h2>
          <div style={S.subtitle}>ISO 15189:2022 §6.2.2 · Maintain credential verification logs and safety files</div>
        </div>
      </div>

      <div style={S.layout}>
        {/* Left Side: Employee List */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>Employees</div>
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
              const { pct } = getStats(emp);
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelected(emp)}
                  style={S.listItem(active)}
                >
                  <div style={{ fontSize: 12 }}>{emp.fullName || emp.employeeName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, fontSize: 10, color: active ? "#0F6E56" : "#888780" }}>
                    <span>ID: {emp.empId || emp.employeeId}</span>
                    <span style={{ fontWeight: 600 }}>{pct}% verified</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: File checklist */}
        {selected ? (
          <div style={S.card}>
            <div style={{ ...S.cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={S.cardTitle}>{selected.fullName || selected.employeeName}</div>
                <div style={{ fontSize: 11, color: "#888780", marginTop: 2 }}>{selected.department} · {selected.designation || "No Designation"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                  background: currentStats.pct === 100 ? "#E1F5EE" : "#FAEEDA",
                  color: currentStats.pct === 100 ? "#0F6E56" : "#854F0B"
                }}>
                  {currentStats.verified} / {currentStats.count} Verified ({currentStats.pct}%)
                </span>
              </div>
            </div>

            <div style={S.cardBody}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, width: 220 }}>Document Requirement</th>
                    <th style={{ ...S.th, width: 140 }}>Status</th>
                    <th style={{ ...S.th, width: 150 }}>Verification Details</th>
                    <th style={S.th}>Document Reference / URL</th>
                  </tr>
                </thead>
                <tbody>
                  {CHECKLIST_ITEMS.map(item => {
                    const record = (selected.personnelFiles || {})[item] || { status: "Missing", verifiedBy: "", dateVerified: "", fileUrl: "" };
                    return (
                      <tr key={item}>
                        <td style={S.td}>
                          <div style={{ fontWeight: 500, color: "#2C2C2A" }}>{item}</div>
                        </td>
                        <td style={S.td}>
                          <select
                            style={{ ...S.inp, padding: "4px 8px" }}
                            value={record.status}
                            disabled={saving}
                            onChange={e => handleStatusChange(item, "status", e.target.value)}
                          >
                            <option value="Missing">❌ Missing</option>
                            <option value="Pending">⏳ Pending Verification</option>
                            <option value="Verified">✅ Verified</option>
                          </select>
                        </td>
                        <td style={S.td}>
                          {record.status === "Verified" ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{record.verifiedBy}</div>
                              <div style={{ fontSize: 10, color: "#888780", marginTop: 2 }}>on {record.dateVerified}</div>
                            </div>
                          ) : (
                            <span style={{ color: "#888780", fontSize: 11, fontStyle: "italic" }}>Not verified</span>
                          )}
                        </td>
                        <td style={S.td}>
                          <input
                            style={{ ...S.inp, padding: "5px 8px" }}
                            placeholder="e.g. DocRef-102 or Google Drive URL"
                            value={record.fileUrl || ""}
                            disabled={saving}
                            onChange={e => handleStatusChange(item, "fileUrl", e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ marginTop: 14, fontSize: 11, color: "#888780", padding: "10px 12px", background: "#FAFAF8", borderRadius: 8, border: "0.5px solid #E0DDD6" }}>
                ℹ️ <strong>ISO 15189:2022 §6.2.2 Note:</strong> The laboratory must verify the academic qualifications, professional status, and competence of all personnel. Verify records before assigning tasks or releasing laboratory reports.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ ...S.card, padding: 32, textAlign: "center", color: "#888780" }}>
            Select an employee from the directory list to perform file audit reviews.
          </div>
        )}
      </div>
    </div>
  );
}
