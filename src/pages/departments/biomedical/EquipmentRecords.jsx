import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

const DEPARTMENTS = [
  "Microbiology", "Serology", "Histopathology & Cytopathology", "Flow Cytometry", "Cytogenetics",
  "Biochemistry", "Haematology", "Clinical Pathology", "Molecular Biology", "Molecular Genetics",
  "Quality", "Human Resource", "Biomedical Engineering", "Purchase", "Maintenance", "Housekeeping",
  "Information Technology", "Kitchen", "Security", "Collection", "Front Office", "Back Office",
  "Sample Collection Centre", "Call Centre", "Accounts", "Administration", "Design", "Marketing",
  "ERP Administration",
];

const S = {
  wrap: { padding: "20px 24px", fontFamily: "'Inter',system-ui,sans-serif", background: "#F7F6F2", minHeight: "80vh" },
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20 },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 0, overflowX: "auto" },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", color: "#888780", fontWeight: 500, textAlign: "left", background: "#FAFAF8" },
  td: { padding: "12px 14px", borderBottom: "0.5px solid #F1EFE8", color: "#2C2C2A" }
};

export default function EquipmentRecords({ role, userName }) {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "equipmentList"), orderBy("createdAt", "desc")));
      setEquipment(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.warn("Firestore access error. Using offline fallback.", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const filtered = equipment.filter(eq => {
    const md = filterDept === "All" || eq.department === filterDept;
    const ms = filterStatus === "All" || (eq.status || "Active") === filterStatus;
    const nameVal = eq.name || "";
    const codeVal = eq.assetCode || "";
    const mq = !search ||
      nameVal.toLowerCase().includes(search.toLowerCase()) ||
      codeVal.toLowerCase().includes(search.toLowerCase());
    return md && ms && mq;
  });

  return (
    <div style={S.wrap}>
      {/* Search and Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          style={{ ...S.inp, width: 260 }}
          placeholder="Search by equipment name or asset ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{ ...S.inp, width: 200 }}
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="All">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select
          style={{ ...S.inp, width: 180 }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active / In Service</option>
          <option value="Out of service">Out of Service</option>
          <option value="Decommissioned">Decommissioned</option>
        </select>
        <span style={{ fontSize: 11.5, color: "#888780", marginLeft: "auto", alignSelf: "center" }}>
          Showing {filtered.length} instruments
        </span>
      </div>

      {/* Spreadsheet directory */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Master Equipment Register (ISO 15189 §6.4.10)</div>
        </div>
        <div style={S.cardBody}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Asset ID</th>
                <th style={S.th}>Equipment Name</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>Manufacturer / Model</th>
                <th style={S.th}>Serial Number</th>
                <th style={S.th}>Install Date</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>Loading master registry...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 24, color: "#888780" }}>No records found.</td></tr>
              ) : (
                filtered.map(eq => (
                  <tr key={eq.id}>
                    <td style={{ ...S.td, fontFamily: "monospace", fontWeight: 600 }}>{eq.assetCode}</td>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600 }}>{eq.name}</div>
                      {eq.commissionedBy && <div style={{ fontSize: 9.5, color: "#888780", marginTop: 2 }}>Commissioned by {eq.commissionedBy}</div>}
                    </td>
                    <td style={S.td}>{eq.department}</td>
                    <td style={S.td}>{eq.manufacturer || "—"} / {eq.model || "—"}</td>
                    <td style={S.td}>{eq.serialNo || "—"}</td>
                    <td style={S.td}>{eq.installDate || "—"}</td>
                    <td style={S.td}>
                      <span style={{
                        display: "inline-block", fontSize: 9.5, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                        background: (eq.status || "Active") === "Active" ? "#E1F5EE" : (eq.status || "Active") === "Decommissioned" ? "#F1EFE8" : "#FCEBEB",
                        color: (eq.status || "Active") === "Active" ? "#0F6E56" : (eq.status || "Active") === "Decommissioned" ? "#5F5E5A" : "#A32D2D"
                      }}>{eq.status || "Active"}</span>
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
