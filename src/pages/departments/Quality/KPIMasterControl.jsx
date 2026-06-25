import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const DEPARTMENTS = [
  "Microbiology",
  "Serology",
  "Histopathology & Cytopathology",
  "Flow Cytometry",
  "Cytogenetics",
  "Biochemistry",
  "Haematology",
  "Clinical Pathology",
  "Molecular Biology",
  "Molecular Genetics"
];

const DEPARTMENTAL_KPIS = [
  { id: "7.5.4", name: "Sample Rejection", desc: "Rejected / Received × 100", limit: "≤ 5%" },
  { id: "7.5.5", name: "Processing Error", desc: "Wrongly analyzed / Total × 100", limit: "≤ 2%" },
  { id: "7.5.6", name: "IQC Performance", desc: "Failed IQC / Total IQC × 100", limit: "≤ 10%" },
  { id: "7.5.7", name: "EQAS Performance", desc: "Failed PT / Total PT × 100", limit: "≤ 20%" },
  { id: "7.5.8", name: "Report Errors", desc: "Failed reports / Total reports × 100", limit: "≤ 1%" },
  { id: "7.7.11", name: "TAT Breach", desc: "Beyond TAT / Total released × 100", limit: "≤ 10%" },
  { id: "7.7.15", name: "CV% Coefficient", desc: "Sum of CV% / Analyte count", limit: "≤ 10%" }
];

export default function KPIMasterControl() {
  const [toggles, setToggles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedText, setSavedText] = useState("All changes saved");

  useEffect(() => {
    async function loadToggles() {
      try {
        const docRef = doc(db, "appSettings", "kpiToggles");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setToggles(snap.data());
        }
      } catch (err) {
        console.error("Error loading KPI toggles:", err);
      } finally {
        setLoading(false);
      }
    }
    loadToggles();
  }, []);

  const handleToggle = async (dept, kpiId) => {
    const key = `${dept}_${kpiId}`;
    const currentValue = toggles[key] !== false; // default is true
    const newToggles = { ...toggles, [key]: !currentValue };
    
    setToggles(newToggles);
    setSaving(true);
    setSavedText("Saving changes...");

    try {
      await setDoc(doc(db, "appSettings", "kpiToggles"), newToggles);
      setSavedText("✓ Changes saved");
    } catch (err) {
      console.error("Error saving KPI toggles:", err);
      setSavedText("⚠ Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllDept = async (dept, enable) => {
    const newToggles = { ...toggles };
    DEPARTMENTAL_KPIS.forEach(kpi => {
      newToggles[`${dept}_${kpi.id}`] = enable;
    });

    setToggles(newToggles);
    setSaving(true);
    setSavedText("Saving changes...");

    try {
      await setDoc(doc(db, "appSettings", "kpiToggles"), newToggles);
      setSavedText("✓ Changes saved");
    } catch (err) {
      console.error("Error saving KPI toggles:", err);
      setSavedText("⚠ Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAllKPI = async (kpiId, enable) => {
    const newToggles = { ...toggles };
    DEPARTMENTS.forEach(dept => {
      newToggles[`${dept}_${kpiId}`] = enable;
    });

    setToggles(newToggles);
    setSaving(true);
    setSavedText("Saving changes...");

    try {
      await setDoc(doc(db, "appSettings", "kpiToggles"), newToggles);
      setSavedText("✓ Changes saved");
    } catch (err) {
      console.error("Error saving KPI toggles:", err);
      setSavedText("⚠ Error saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888780", fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          border: "2px solid #E0DDD6", borderTopColor: "#0F6E56",
          animation: "spin 0.8s linear infinite", margin: "0 auto 12px"
        }} />
        Loading toggle settings...
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header Info */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, background: "#fff", padding: "12px 18px",
        borderRadius: 8, border: "0.5px solid #E0DDD6"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#2C2C2A" }}>
            KPI Configuration Control Grid
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#888780" }}>
            Enable or disable specific quality indicators per department. Disabled KPIs are hidden from department forms.
          </p>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 500, color: saving ? "#854F0B" : savedText.startsWith("⚠") ? "#A32D2D" : "#0F6E56",
          background: saving ? "#FEF3C7" : savedText.startsWith("⚠") ? "#FFF5F5" : "#E1F5EE",
          padding: "4px 10px", borderRadius: 20, border: "0.5px solid currentColor",
          transition: "all 0.2s"
        }}>
          {savedText}
        </div>
      </div>

      {/* Grid Container */}
      <div style={{
        background: "#fff", border: "0.5px solid #E0DDD6", borderRadius: 12, overflow: "hidden"
      }}>
        {/* Table Head */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "180px repeat(7, 1fr)",
          background: "#F7F6F2",
          borderBottom: "0.5px solid #E0DDD6",
          alignItems: "center"
        }}>
          <div style={{ padding: "12px 16px", fontSize: 11, fontWeight: 600, color: "#888780" }}>
            Department
          </div>
          {DEPARTMENTAL_KPIS.map(kpi => (
            <div key={kpi.id} style={{
              padding: "10px 8px", fontSize: 11, fontWeight: 600, color: "#2C2C2A",
              textAlign: "center", borderLeft: "0.5px solid #E0DDD6"
            }}>
              <div>{kpi.id}</div>
              <div style={{ fontSize: 9, color: "#888780", fontWeight: 400, marginTop: 1 }}>{kpi.name}</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 6 }}>
                <span onClick={() => handleToggleAllKPI(kpi.id, true)} style={{ fontSize: 9, color: "#0F6E56", cursor: "pointer", fontWeight: 600 }}>All</span>
                <span onClick={() => handleToggleAllKPI(kpi.id, false)} style={{ fontSize: 9, color: "#A32D2D", cursor: "pointer", fontWeight: 600 }}>None</span>
              </div>
            </div>
          ))}
        </div>

        {/* Table Rows */}
        {DEPARTMENTS.map((dept, idx) => (
          <div key={dept} style={{
            display: "grid",
            gridTemplateColumns: "180px repeat(7, 1fr)",
            borderBottom: idx === DEPARTMENTS.length - 1 ? "none" : "0.5px solid #F1EFE8",
            alignItems: "center",
            background: idx % 2 === 1 ? "#FAFAF9" : "#fff"
          }}>
            {/* Department Label & Quick controls */}
            <div style={{ padding: "10px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#2C2C2A" }}>{dept}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <span onClick={() => handleToggleAllDept(dept, true)} style={{ fontSize: 9, color: "#0F6E56", cursor: "pointer", fontWeight: 500 }}>Enable All</span>
                <span onClick={() => handleToggleAllDept(dept, false)} style={{ fontSize: 9, color: "#A32D2D", cursor: "pointer", fontWeight: 500 }}>Disable All</span>
              </div>
            </div>

            {/* Checkboxes */}
            {DEPARTMENTAL_KPIS.map(kpi => {
              const key = `${dept}_${kpi.id}`;
              const enabled = toggles[key] !== false; // default is true
              return (
                <div key={kpi.id} style={{
                  padding: "10px 8px", display: "flex", justifyContent: "center",
                  borderLeft: "0.5px solid #E0DDD6", height: "100%", alignItems: "center"
                }}>
                  <label style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    width: 36, height: 24, borderRadius: 12, cursor: "pointer",
                    background: enabled ? "#E1F5EE" : "#FFF5F5",
                    border: `0.5px solid ${enabled ? "#5DCAA5" : "#E24B4A"}`,
                    transition: "all 0.15s"
                  }}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => handleToggle(dept, kpi.id)}
                      style={{ display: "none" }}
                    />
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: enabled ? "#085041" : "#A32D2D"
                    }}>
                      {enabled ? "ON" : "OFF"}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
