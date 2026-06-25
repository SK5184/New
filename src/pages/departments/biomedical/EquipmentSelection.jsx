import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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
  card: { background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden", marginBottom: 20, maxWidth: 680, margin: "0 auto" },
  cardHeader: { padding: "10px 14px", borderBottom: "0.5px solid #E0DDD6", background: "#FAFAF8", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 13, fontWeight: 600, color: "#2C2C2A" },
  cardBody: { padding: 16 },
  inp: {
    padding: "7px 10px", border: "0.5px solid #D3D1C7", borderRadius: 6, fontSize: 12,
    background: "#fff", color: "#2C2C2A", width: "100%", boxSizing: "border-box", outline: "none"
  },
  btn: (bg, color) => ({
    padding: "8px 16px", background: bg || "#0F6E56", color: color || "#E1F5EE",
    border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 500, cursor: "pointer", transition: "background 0.15s ease"
  }),
  grid: (cols) => ({
    display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 12
  }),
  label: { fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function EquipmentSelection({ role, userName }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetCode: "",
    name: "",
    model: "",
    serialNo: "",
    department: "",
    manufacturer: "",
    supplier: "",
    installDate: today(),
    warrantyExpiry: today(),
    status: "Active",
    chkVisual: false,
    chkPower: false,
    chkManual: false,
    chkGrounding: false
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.assetCode || !form.department) {
      alert("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "equipmentList"), {
        ...form,
        commissionedBy: userName || "BME Engineer",
        createdAt: serverTimestamp()
      });
      alert(`Equipment "${form.name}" registered successfully.`);
      setForm({
        assetCode: "", name: "", model: "", serialNo: "", department: "",
        manufacturer: "", supplier: "", installDate: today(), warrantyExpiry: today(),
        status: "Active", chkVisual: false, chkPower: false, chkManual: false, chkGrounding: false
      });
    } catch (e) {
      console.error(e);
      alert("Error registering equipment.");
    }
    setSaving(false);
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitle}>Register & Commission New Equipment</div>
          <span style={{ fontSize: 10.5, color: "#854F0B", fontFamily: "monospace" }}>ISO 15189 §6.4.1</span>
        </div>
        <form onSubmit={handleSubmit} style={S.cardBody}>
          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Asset ID / Equipment Code *</label>
              <input style={S.inp} name="assetCode" value={form.assetCode} onChange={handleChange} placeholder="e.g. EQ-HAEM-102" required />
            </div>
            <div>
              <label style={S.label}>Equipment / Instrument Name *</label>
              <input style={S.inp} name="name" value={form.name} onChange={handleChange} placeholder="e.g. Sysmex XN-1000 Analyser" required />
            </div>
          </div>

          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Manufacturer</label>
              <input style={S.inp} name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="e.g. Sysmex Corp" />
            </div>
            <div>
              <label style={S.label}>Model Number</label>
              <input style={S.inp} name="model" value={form.model} onChange={handleChange} placeholder="e.g. XN-1000" />
            </div>
          </div>

          <div style={S.grid(2)}>
            <div>
              <label style={S.label}>Serial Number</label>
              <input style={S.inp} name="serialNo" value={form.serialNo} onChange={handleChange} placeholder="e.g. SN-887262" />
            </div>
            <div>
              <label style={S.label}>Department Assignment *</label>
              <select style={S.inp} name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={S.grid(3)}>
            <div>
              <label style={S.label}>Supplier / Vendor</label>
              <input style={S.inp} name="supplier" value={form.supplier} onChange={handleChange} placeholder="e.g. Transasia Ltd" />
            </div>
            <div>
              <label style={S.label}>Installation Date</label>
              <input style={S.inp} type="date" name="installDate" value={form.installDate} onChange={handleChange} />
            </div>
            <div>
              <label style={S.label}>Warranty Expiry</label>
              <input style={S.inp} type="date" name="warrantyExpiry" value={form.warrantyExpiry} onChange={handleChange} />
            </div>
          </div>

          {/* Commissioning Checklist */}
          <div style={{ background: "#FAFAF8", border: "0.5px solid #E0DDD6", borderRadius: 8, padding: 14, marginTop: 14, marginBottom: 20 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#5F5E5A", marginBottom: 10 }}>Commissioning Checks Checklist</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                <input type="checkbox" name="chkVisual" checked={form.chkVisual} onChange={handleCheckboxChange} />
                Visual Inspection Passed (No structural damage, all parts present)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                <input type="checkbox" name="chkPower" checked={form.chkPower} onChange={handleCheckboxChange} />
                Power and Utility Connections Verified (UPS support, correct voltage)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                <input type="checkbox" name="chkManual" checked={form.chkManual} onChange={handleCheckboxChange} />
                Manufacturer User Manual & IFU Received & Catalogued
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#2C2C2A" }}>
                <input type="checkbox" name="chkGrounding" checked={form.chkGrounding} onChange={handleCheckboxChange} />
                Electrical Safety, Grounding & Leakage Current Checked
              </label>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={S.btn("#0F6E56", "#E1F5EE")} disabled={saving}>
              {saving ? "Registering..." : "💾 Commission & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
