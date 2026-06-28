import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { initialTests } from "../data/testMasterData";

const S = {
  wrap: {
    fontFamily: "'Inter',system-ui,sans-serif",
    background: "#F8FAFC",
    minHeight: "100vh",
    color: "#1E293B",
  },
  topbar: {
    background: "#0F172A",
    color: "#F8FAFC",
    padding: "16px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderBottom: "4px solid #0D9488",
  },
  title: { fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  content: { padding: "24px 32px", maxWidth: 1600, margin: "0 auto" },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: {
    padding: "14px 20px",
    borderBottom: "1px solid #E2E8F0",
    background: "#F8FAFC",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1E293B", display: "flex", alignItems: "center", gap: 8 },
  cardBody: { padding: 20 },
  grid: (cols) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gap: 16,
    marginBottom: 20,
  }),
  btn: (variant) => ({
    padding: "8px 16px",
    background: variant === "secondary" ? "#F1F5F9" : variant === "danger" ? "#EF4444" : "#0D9488",
    color: variant === "secondary" ? "#475569" : "#FFFFFF",
    border: variant === "secondary" ? "1px solid #CBD5E1" : "none",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.15s ease",
  }),
  inp: {
    padding: "8px 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 12,
    background: "#FFFFFF",
    color: "#1E293B",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border 0.15s",
  },
  label: { fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 6 },
  tableContainer: {
    overflowX: "auto",
    background: "#FFFFFF",
    borderRadius: 8,
    border: "1px solid #E2E8F0",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "12px 14px", borderBottom: "2px solid #E2E8F0", whiteSpace: "nowrap" },
  td: { padding: "12px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
  toast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    background: "#0F172A",
    color: "#F8FAFC",
    padding: "12px 20px",
    borderRadius: 8,
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
    fontSize: 12.5,
    fontWeight: 500,
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  uploadArea: {
    border: "2px dashed #CBD5E1",
    borderRadius: 8,
    padding: "20px",
    textAlign: "center",
    background: "#F8FAFC",
    cursor: "pointer",
    transition: "border-color 0.15s",
    marginBottom: 16
  }
};

export default function TestMaster() {
  const { role, name: userName, dept } = useAuth();
  const [tests, setTests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [toast, setToast] = useState(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    testName: "",
    nablCode: "",
    department: "Biochemistry",
    sampleMatrix: "Serum",
    testMethod: "",
    type: "Quantitative",
    reportableRange: "",
    equipment: "",
    referenceMaterial: "",
    proficiencyTesting: ""
  });

  const fileInputRef = useRef(null);

  useEffect(() => {
    const cached = localStorage.getItem("mbl_test_master");
    if (cached) {
      setTests(JSON.parse(cached));
    } else {
      setTests(initialTests);
      localStorage.setItem("mbl_test_master", JSON.stringify(initialTests));
    }
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const saveTests = (updated) => {
    setTests(updated);
    localStorage.setItem("mbl_test_master", JSON.stringify(updated));
  };

  // Assign MBL code logically
  const getNextMBLCode = (list) => {
    if (list.length === 0) return "MBL-0005";
    const mblNums = list
      .map((t) => parseInt(t.mblCode.replace("MBL-", "")))
      .filter((n) => !isNaN(n));
    const maxNum = mblNums.length > 0 ? Math.max(...mblNums) : 4;
    return `MBL-${String(maxNum + 1).padStart(4, "0")}`;
  };

  const handleAddTest = (e) => {
    e.preventDefault();
    if (!newTest.testName || !newTest.nablCode) {
      showToast("Test Name and NABL Code are required.");
      return;
    }

    const nextMBL = getNextMBLCode(tests);
    const nextSrNo = tests.length > 0 ? Math.max(...tests.map(t => t.srNo)) + 1 : 1;

    const testToAdd = {
      ...newTest,
      srNo: nextSrNo,
      mblCode: nextMBL
    };

    const updated = [...tests, testToAdd];
    saveTests(updated);
    setIsAddModalOpen(false);
    setNewTest({
      testName: "",
      nablCode: "",
      department: "Biochemistry",
      sampleMatrix: "Serum",
      testMethod: "",
      type: "Quantitative",
      reportableRange: "",
      equipment: "",
      referenceMaterial: "",
      proficiencyTesting: ""
    });
    showToast(`Test '${testToAdd.testName}' added with code ${testToAdd.mblCode}.`);
  };

  const handleDeleteTest = (mblCode, testName) => {
    if (window.confirm(`Are you sure you want to delete the test '${testName}' (${mblCode})?`)) {
      const updated = tests.filter((t) => t.mblCode !== mblCode);
      saveTests(updated);
      showToast(`Test '${testName}' deleted.`);
    }
  };

  // Simple CSV Parser
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));
    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle basic comma separation (without advanced quote escaping for simplicity)
      // If comma is inside quotes, replace temporarily or do simple split:
      // Since equipment names can have commas, we regex split:
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      const values = matches.map(v => v.trim().replace(/^["']|["']$/g, ""));

      if (values.length === 0) continue;

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      parsed.push(row);
    }
    return parsed;
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parsedRows = parseCSV(text);

        if (parsedRows.length === 0) {
          showToast("No valid rows found in file.");
          return;
        }

        let nextSrNo = tests.length > 0 ? Math.max(...tests.map(t => t.srNo)) + 1 : 1;
        let currentMBLList = [...tests];

        const mappedRows = parsedRows.map((row) => {
          const nextMBL = getNextMBLCode(currentMBLList);
          const newRow = {
            srNo: nextSrNo++,
            mblCode: nextMBL,
            testName: row.testName || row["Test Name"] || "Unnamed Test",
            nablCode: row.nablCode || row["NABL Code"] || row.testCode || row["Test Code"] || "N/A",
            department: row.department || row["Department"] || "Biochemistry",
            sampleMatrix: row.sampleMatrix || row["Sample Matrix"] || row.matrix || "Serum",
            testMethod: row.testMethod || row["Test Method"] || "",
            type: row.type || row["Type"] || "Quantitative",
            reportableRange: row.reportableRange || row["Reportable Range"] || row.range || "",
            equipment: row.equipment || row["Equipment"] || "",
            referenceMaterial: row.referenceMaterial || row["Reference Material"] || "",
            proficiencyTesting: row.proficiencyTesting || row["Proficiency Testing"] || ""
          };
          currentMBLList.push(newRow);
          return newRow;
        });

        const updated = [...tests, ...mappedRows];
        saveTests(updated);
        setIsBulkModalOpen(false);
        showToast(`Successfully uploaded ${mappedRows.length} tests from file.`);
      } catch (err) {
        console.error(err);
        showToast("Error parsing upload file.");
      }
    };
    reader.readAsText(file);
  };

  // Filtering Logic
  const filteredTests = tests.filter((t) => {
    const matchesSearch =
      t.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.mblCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.nablCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === "All" || t.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ["All", "Biochemistry", "Clinical Pathology", "Cytogenetics", "Cytopathology", "Flow Cytometry", "Haematology", "Histopathology", "Microbiology", "Molecular Diagnostics"];

  return (
    <div style={S.wrap}>
      {/* Topbar */}
      <div style={S.topbar}>
        <div style={S.title}>
          <span>🗄️</span>
          <span>MBL QMS —                                                                                                                                                                                                                                                                                  Console</span>
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>
          Logged in: <strong>{userName}</strong> ({role})
        </div>
      </div>

      <div style={S.content}>
        {/* Metric Cards Row */}
        <div style={S.grid(4)}>
          <div style={{ ...S.metricCard, background: "#FFF", border: "1px solid #E2E8F0", padding: 20, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={S.metricLabel}>Total MBL Tests</div>
              <div style={S.metricVal}>{tests.length}</div>
            </div>
            <span style={{ fontSize: 28 }}>🔬</span>
          </div>
          <div style={{ ...S.metricCard, background: "#FFF", border: "1px solid #E2E8F0", padding: 20, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={S.metricLabel}>Quantitative Tests</div>
              <div style={S.metricVal}>{tests.filter(t => t.type === "Quantitative").length}</div>
            </div>
            <span style={{ fontSize: 28 }}>📈</span>
          </div>
          <div style={{ ...S.metricCard, background: "#FFF", border: "1px solid #E2E8F0", padding: 20, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={S.metricLabel}>Qualitative Tests</div>
              <div style={S.metricVal}>{tests.filter(t => t.type === "Qualitative").length}</div>
            </div>
            <span style={{ fontSize: 28 }}>📝</span>
          </div>
          <div style={{ ...S.metricCard, background: "#FFF", border: "1px solid #E2E8F0", padding: 20, borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={S.metricLabel}>NABL Mapped</div>
              <div style={S.metricVal}>{tests.filter(t => t.nablCode && t.nablCode !== "N/A").length}</div>
            </div>
            <span style={{ fontSize: 28 }}>🛡️</span>
          </div>
        </div>

        {/* Master Registry Table Card */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardTitle}>
              <span>📋</span>
              <span>Central Test Catalog Database</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search test name, MBL or NABL code..."
                style={{ ...S.inp, width: 260 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select
                style={{ ...S.inp, width: 180 }}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button style={S.btn("primary")} onClick={() => setIsAddModalOpen(true)}>
                <span>➕</span> Add Test
              </button>
              <button style={S.btn("secondary")} onClick={() => setIsBulkModalOpen(true)}>
                <span>📤</span> Bulk Upload
              </button>
            </div>
          </div>

          <div style={S.cardBody} style={{ padding: 0 }}>
            {filteredTests.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748B" }}>
                No tests found matching the selected search or filters.
              </div>
            ) : (
              <div style={S.tableContainer}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Sr No.</th>
                      <th style={S.th}>MBL Code</th>
                      <th style={S.th}>Test Name</th>
                      <th style={S.th}>NABL Code</th>
                      <th style={S.th}>Department</th>
                      <th style={S.th}>Sample Matrix</th>
                      <th style={S.th}>Test Method</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Reportable Range</th>
                      <th style={S.th}>Equipment</th>
                      <th style={S.th}>Reference Material</th>
                      <th style={S.th}>Proficiency Testing</th>
                      <th style={S.th} style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((t) => (
                      <tr key={t.mblCode}>
                        <td style={S.td} style={{ fontWeight: 600, paddingLeft: 18 }}>{t.srNo}</td>
                        <td style={S.td}>
                          <span style={S.badge("#EFF6FF", "#1E40AF")}>{t.mblCode}</span>
                        </td>
                        <td style={S.td} style={{ fontWeight: 600, color: "#0F172A" }}>{t.testName}</td>
                        <td style={S.td}><code>{t.nablCode}</code></td>
                        <td style={S.td}>{t.department}</td>
                        <td style={S.td}>{t.sampleMatrix}</td>
                        <td style={S.td} style={{ fontStyle: "italic", color: "#475569" }}>{t.testMethod || "N/A"}</td>
                        <td style={S.td}>
                          <span style={S.badge(t.type === "Quantitative" ? "#E6F4EA" : "#F1F5F9", t.type === "Quantitative" ? "#137333" : "#475569")}>
                            {t.type}
                          </span>
                        </td>
                        <td style={S.td}>{t.reportableRange || "N/A"}</td>
                        <td style={S.td}>{t.equipment || "N/A"}</td>
                        <td style={S.td}>{t.referenceMaterial || "N/A"}</td>
                        <td style={S.td}>{t.proficiencyTesting || "N/A"}</td>
                        <td style={S.td} style={{ textAlign: "center" }}>
                          <button
                            style={{ ...S.btn("danger"), padding: "4px 8px", fontSize: 11, display: "inline-flex" }}
                            onClick={() => handleDeleteTest(t.mblCode, t.testName)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 540, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#0F172A", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>➕ Add New Test Entry</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setIsAddModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddTest} style={{ padding: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Test Name</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Ammonia"
                    required
                    value={newTest.testName}
                    onChange={(e) => setNewTest({ ...newTest, testName: e.target.value })}
                  />
                </div>
                <div>
                  <label style={S.label}>NABL Code (Test Code)</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. M-CB00086"
                    required
                    value={newTest.nablCode}
                    onChange={(e) => setNewTest({ ...newTest, nablCode: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Department</label>
                  <select
                    style={S.inp}
                    value={newTest.department}
                    onChange={(e) => setNewTest({ ...newTest, department: e.target.value })}
                  >
                    {departments.filter(d => d !== "All").map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Sample Matrix</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Plasma"
                    value={newTest.sampleMatrix}
                    onChange={(e) => setNewTest({ ...newTest, sampleMatrix: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={S.label}>Test Method</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Glutamate Dehydrogenase"
                    value={newTest.testMethod}
                    onChange={(e) => setNewTest({ ...newTest, testMethod: e.target.value })}
                  />
                </div>
                <div>
                  <label style={S.label}>Type</label>
                  <select
                    style={S.inp}
                    value={newTest.type}
                    onChange={(e) => setNewTest({ ...newTest, type: e.target.value })}
                  >
                    <option value="Quantitative">Quantitative</option>
                    <option value="Qualitative">Qualitative</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Reportable Range</label>
                <input
                  type="text"
                  style={S.inp}
                  placeholder="e.g. 13.5 umol/L To 997.9 umol/L"
                  value={newTest.reportableRange}
                  onChange={(e) => setNewTest({ ...newTest, reportableRange: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Equipment</label>
                <input
                  type="text"
                  style={S.inp}
                  placeholder="e.g. Abbott Alinity ci series"
                  value={newTest.equipment}
                  onChange={(e) => setNewTest({ ...newTest, equipment: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={S.label}>Reference Material</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. Alinity Ammonia Calibrator"
                    value={newTest.referenceMaterial}
                    onChange={(e) => setNewTest({ ...newTest, referenceMaterial: e.target.value })}
                  />
                </div>
                <div>
                  <label style={S.label}>Proficiency Testing (Lab)</label>
                  <input
                    type="text"
                    style={S.inp}
                    placeholder="e.g. BIORAD/USA"
                    value={newTest.proficiencyTesting}
                    onChange={(e) => setNewTest({ ...newTest, proficiencyTesting: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" style={S.btn("secondary")} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" style={S.btn()}>Register Test</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 14, width: "100%", maxWidth: 460, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E8F0", background: "#0F172A", color: "#FFF" }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>📤 Bulk Upload Tests via CSV</div>
              <button style={{ background: "none", border: "none", color: "#FFF", fontSize: 18, cursor: "pointer" }} onClick={() => setIsBulkModalOpen(false)}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                Upload a CSV spreadsheet matching the database schema. MBL Codes will be generated automatically.
              </p>
              
              <div style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>CSV Header Format:</div>
                <code style={{ fontSize: 10.5, color: "#0D9488", wordBreak: "break-all" }}>
                  testName,nablCode,department,sampleMatrix,testMethod,type,reportableRange,equipment,referenceMaterial,proficiencyTesting
                </code>
              </div>

              <div 
                style={S.uploadArea}
                onClick={() => fileInputRef.current.click()}
              >
                <span style={{ fontSize: 24, display: "block", marginBottom: 6 }}>📄</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0D9488" }}>Select CSV file to import</span>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  ref={fileInputRef}
                  onChange={handleBulkUpload}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button style={S.btn("secondary")} onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
