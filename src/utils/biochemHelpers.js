// biochemHelpers.js
// MBL QMS — Biochemistry module statistical calculations & reference master databases
// ISO 15189:2022 compliant data structures

// ─── Linear Regression Calculations ──────────────────────────────────────────
export function calculateLinearRegression(xArr, yArr) {
  const n = xArr.length;
  if (n === 0 || n !== yArr.length) return { slope: 0, intercept: 0, rValue: 0, equation: "Y = 0" };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
  for (let i = 0; i < n; i++) {
    const x = xArr[i];
    const y = yArr[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denominator = (n * sumXX - sumX * sumX);
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  const rNumerator = (n * sumXY - sumX * sumY);
  const rDenominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  const rValue = rDenominator !== 0 ? rNumerator / rDenominator : 0;

  return {
    slope: parseFloat(slope.toFixed(4)),
    intercept: parseFloat(intercept.toFixed(4)),
    rValue: parseFloat(rValue.toFixed(4)),
    r2: parseFloat((rValue * rValue).toFixed(4)),
    equation: `Y = ${slope.toFixed(3)}X ${intercept >= 0 ? "+" : ""} ${intercept.toFixed(3)}`
  };
}

// ─── Bland-Altman Calculations ──────────────────────────────────────────────
export function calculateBlandAltman(xArr, yArr) {
  const n = xArr.length;
  if (n === 0 || n !== yArr.length) return { differences: [], meanDifference: 0, sdDifference: 0, loaUpper: 0, loaLower: 0 };

  const averages = [];
  const differences = [];
  const pctDifferences = [];

  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    const x = xArr[i];
    const y = yArr[i];
    const avg = (x + y) / 2;
    const diff = y - x;
    const pctDiff = avg !== 0 ? (diff / avg) * 100 : 0;

    averages.push(parseFloat(avg.toFixed(2)));
    differences.push(parseFloat(diff.toFixed(2)));
    pctDifferences.push(parseFloat(pctDiff.toFixed(2)));
    sumDiff += pctDiff;
  }

  const meanDifference = sumDiff / n;

  let sumSqDiff = 0;
  for (let i = 0; i < n; i++) {
    sumSqDiff += Math.pow(pctDifferences[i] - meanDifference, 2);
  }
  const varianceDifference = n > 1 ? sumSqDiff / (n - 1) : 0;
  const sdDifference = Math.sqrt(varianceDifference);

  return {
    averages,
    pctDifferences,
    meanDifference: parseFloat(meanDifference.toFixed(2)),
    sdDifference: parseFloat(sdDifference.toFixed(2)),
    loaUpper: parseFloat((meanDifference + 1.96 * sdDifference).toFixed(2)),
    loaLower: parseFloat((meanDifference - 1.96 * sdDifference).toFixed(2))
  };
}

// ─── Total Allowable Error (TEa) Database ─────────────────────────────────────
export const TEA_LIMITS = [
  { analyte: "Glucose", code: "GLU", limit: 6.0, source: "CLIA 2024", unit: "%" },
  { analyte: "Creatinine", code: "CREA", limit: 10.0, source: "CLIA 2024", unit: "%" },
  { analyte: "Urea", code: "UREA", limit: 9.0, source: "CLIA 2024", unit: "%" },
  { analyte: "Sodium", code: "NA", limit: 4.0, source: "CLIA 2024", unit: "mmol/L" },
  { analyte: "Potassium", code: "K", limit: 0.3, source: "CLIA 2024", unit: "mmol/L" },
  { analyte: "ALT (Alanine Aminotransferase)", code: "ALT", limit: 15.0, source: "CLIA 2024", unit: "%" },
  { analyte: "AST (Aspartate Aminotransferase)", code: "AST", limit: 15.0, source: "CLIA 2024", unit: "%" },
  { analyte: "Total Bilirubin", code: "TBIL", limit: 20.0, source: "CLIA 2024", unit: "%" },
  { analyte: "Total Cholesterol", code: "CHOL", limit: 10.0, source: "CLIA 2024", unit: "%" }
];

// ─── Biological Reference Range Master ────────────────────────────────────────
export const REFERENCE_RANGES = [
  { analyte: "Glucose", ageGroup: "Adult", sex: "Both", range: "70 - 100", unit: "mg/dL", criticalLow: "<50", criticalHigh: ">400" },
  { analyte: "Glucose", ageGroup: "Neonatal", sex: "Both", range: "40 - 80", unit: "mg/dL", criticalLow: "<40", criticalHigh: ">250" },
  { analyte: "Creatinine", ageGroup: "Adult", sex: "Male", range: "0.7 - 1.3", unit: "mg/dL", criticalLow: null, criticalHigh: ">4.0" },
  { analyte: "Creatinine", ageGroup: "Adult", sex: "Female", range: "0.6 - 1.1", unit: "mg/dL", criticalLow: null, criticalHigh: ">4.0" },
  { analyte: "Urea", ageGroup: "Adult", sex: "Both", range: "15 - 45", unit: "mg/dL", criticalLow: null, criticalHigh: ">100" },
  { analyte: "Sodium", ageGroup: "All", sex: "Both", range: "136 - 145", unit: "mmol/L", criticalLow: "<120", criticalHigh: ">160" },
  { analyte: "Potassium", ageGroup: "All", sex: "Both", range: "3.5 - 5.1", unit: "mmol/L", criticalLow: "<2.8", criticalHigh: ">6.2" },
  { analyte: "ALT", ageGroup: "Adult", sex: "Male", range: "10 - 50", unit: "U/L", criticalLow: null, criticalHigh: ">1000" },
  { analyte: "ALT", ageGroup: "Adult", sex: "Female", range: "7 - 35", unit: "U/L", criticalLow: null, criticalHigh: ">1000" },
  { analyte: "AST", ageGroup: "Adult", sex: "Male", range: "15 - 40", unit: "U/L", criticalLow: null, criticalHigh: ">1000" }
];

// ─── Clinical Decision Levels ────────────────────────────────────────────────
export const CLINICAL_DECISION_LEVELS = [
  { analyte: "Glucose", level: "50 mg/dL", significance: "Hypoglycemic coma risk, immediate IV dextrose required" },
  { analyte: "Glucose", level: "126 mg/dL", significance: "Fasting threshold for diagnosis of Diabetes Mellitus" },
  { analyte: "Glucose", level: "200 mg/dL", significance: "Random threshold for diabetes with classic symptoms" },
  { analyte: "Creatinine", level: "1.5 mg/dL", significance: "Indicative of early stage chronic kidney disease" },
  { analyte: "Creatinine", level: "3.0 mg/dL", significance: "Severe renal impairment, dose adjustment of renal-cleared drugs needed" },
  { analyte: "Potassium", level: "3.0 mmol/L", significance: "Moderate hypokalemia - cardiac arrhythmia risk" },
  { analyte: "Potassium", level: "6.0 mmol/L", significance: "Severe hyperkalemia - critical risk of cardiac arrest" }
];

// ─── Time Limits for Receiving & Processing Samples (Pre-Analytical) ────────
export const TIME_LIMITS = [
  { sampleType: "Fluoride Blood (Glucose)", maxDelay: "4 hours", temp: "20-25°C", notes: "Stable up to 24h at 2-8°C" },
  { sampleType: "Serum (Urea/Creatinine)", maxDelay: "2 hours", temp: "20-25°C", notes: "Must separate serum from clot within 2h" },
  { sampleType: "Serum (Electrolytes)", maxDelay: "1 hour", temp: "20-25°C", notes: "Delayed separation causes false high Potassium" },
  { sampleType: "Serum (Enzymes AST/ALT)", maxDelay: "4 hours", temp: "2-8°C", notes: "Stable for 7 days refrigerated" },
  { sampleType: "Blood Gas (Heparinised)", maxDelay: "30 minutes", temp: "Ice slurry", notes: "Must be run immediately to avoid metabolic shifts" }
];

// ─── Record Retention Schedule ──────────────────────────────────────────────
export const RETENTION_SCHEDULE = [
  { recordType: "Patient Test Reports", period: "5 years", storage: "Digital Backup & Server", clause: "ISO 15189 §8.4" },
  { recordType: "IQC Chart & logs", period: "3 years", storage: "QMS Archive & Digital", clause: "ISO 15189 §7.3.2" },
  { recordType: "EQA Reports", period: "5 years", storage: "Quality Department binder", clause: "ISO 15189 §7.3.7" },
  { recordType: "Equipment Maintenance logs", period: "Life of Instrument + 2 yrs", storage: "Biomedical Engineering Room", clause: "ISO 15189 §6.5" },
  { recordType: "Lot Verification Reports", period: "3 years", storage: "Department Supervisor Cabinet", clause: "ISO 15189 §6.6" },
  { recordType: "Nonconformity/CAPA records", period: "5 years", storage: "Quality Manager Database", clause: "ISO 15189 §8.7" }
];

// ─── Hemolysis, Icterus, Lipemia (HIL) Integrity Grades ──────────────────────
export const HIL_INTEGRITY_GRADES = [
  { criteria: "Hemolysis (H-Index)", grade: "Normal", limit: "<50 mg/dL Hb", status: "Accept", action: "None" },
  { criteria: "Hemolysis (H-Index)", grade: "1+", limit: "50-100 mg/dL Hb", status: "Accept with Comment", action: "Append hemolysis caveat to Potassium and LDH results" },
  { criteria: "Hemolysis (H-Index)", grade: "2+", limit: "100-200 mg/dL Hb", status: "Accept with Comment", action: "Do not report Potassium; report other analytes with comment" },
  { criteria: "Hemolysis (H-Index)", grade: "3+", limit: ">200 mg/dL Hb", status: "Reject", action: "Request fresh redraw" },
  { criteria: "Icterus (I-Index)", grade: "Normal / Elevated", limit: "<15 mg/dL Bilirubin", status: "Accept", action: "None" },
  { criteria: "Icterus (I-Index)", grade: "Marked Icterus", limit: ">20 mg/dL Bilirubin", status: "Accept with Comment", action: "May interfere with creatinine Jaffe method; use enzymatic method if possible" },
  { criteria: "Lipemia (L-Index)", grade: "Turbid / Lipemic", limit: ">150 mg/dL Intralipid", status: "Accept with Comment", action: "Centrifuge at high speed or clear lipids before assaying electrolytes" }
];

// ─── Weekly Duty Roster Template ────────────────────────────────────────────
export const WEEKLY_ROSTER = [
  { day: "Monday", routineArea: "Supervisor: Sasikala", analyzer1: "Anbu (Cobas c311)", analyzer2: "Praveen (Atellica)", criticals: "Sasikala" },
  { day: "Tuesday", routineArea: "Supervisor: Sasikala", analyzer1: "Anbu (Cobas c311)", analyzer2: "Praveen (Atellica)", criticals: "Sasikala" },
  { day: "Wednesday", routineArea: "Supervisor: Sasikala", analyzer1: "Praveen (Cobas c311)", analyzer2: "Anbu (Atellica)", criticals: "Sasikala" },
  { day: "Thursday", routineArea: "Supervisor: Sasikala", analyzer1: "Praveen (Cobas c311)", analyzer2: "Anbu (Atellica)", criticals: "Sasikala" },
  { day: "Friday", routineArea: "Supervisor: Nandini", analyzer1: "Anbu (Cobas c311)", analyzer2: "Praveen (Atellica)", criticals: "Nandini" },
  { day: "Saturday", routineArea: "Supervisor: Nandini", analyzer1: "Praveen (Cobas c311)", analyzer2: "Anbu (Atellica)", criticals: "Nandini" },
  { day: "Sunday", routineArea: "On-Call: Sasikala", analyzer1: "Anbu (Emergency Line)", analyzer2: "Anbu (Emergency Line)", criticals: "Sasikala" }
];

// ─── Mock Data for Lot to Lot Comparison (N=20 Patient Samples) ────────────────
export const MOCK_LOT_COMPARISON_DATA = [
  { sampleId: "P001", currentLot: 85, newLot: 86 },
  { sampleId: "P002", currentLot: 110, newLot: 112 },
  { sampleId: "P003", currentLot: 145, newLot: 148 },
  { sampleId: "P004", currentLot: 92, newLot: 91 },
  { sampleId: "P005", currentLot: 75, newLot: 77 },
  { sampleId: "P006", currentLot: 210, newLot: 215 },
  { sampleId: "P007", currentLot: 180, newLot: 182 },
  { sampleId: "P008", currentLot: 102, newLot: 104 },
  { sampleId: "P009", currentLot: 118, newLot: 120 },
  { sampleId: "P010", currentLot: 65, newLot: 64 },
  { sampleId: "P011", currentLot: 130, newLot: 132 },
  { sampleId: "P012", currentLot: 250, newLot: 256 },
  { sampleId: "P013", currentLot: 88, newLot: 89 },
  { sampleId: "P014", currentLot: 95, newLot: 94 },
  { sampleId: "P015", currentLot: 162, newLot: 165 },
  { sampleId: "P016", currentLot: 70, newLot: 72 },
  { sampleId: "P017", currentLot: 124, newLot: 126 },
  { sampleId: "P018", currentLot: 140, newLot: 142 },
  { sampleId: "P019", currentLot: 198, newLot: 202 },
  { sampleId: "P020", currentLot: 115, newLot: 117 }
];

// ─── Mock Data for Analyzer Comparison (Cobas vs Atellica, N=20) ───────────────
export const MOCK_ANALYZER_COMPARISON_DATA = [
  { sampleId: "S001", cobas: 1.22, atellica: 1.25 },
  { sampleId: "S002", cobas: 0.85, atellica: 0.84 },
  { sampleId: "S003", cobas: 3.42, atellica: 3.48 },
  { sampleId: "S004", cobas: 1.76, atellica: 1.79 },
  { sampleId: "S005", cobas: 0.94, atellica: 0.96 },
  { sampleId: "S006", cobas: 2.10, atellica: 2.15 },
  { sampleId: "S007", cobas: 4.85, atellica: 4.98 },
  { sampleId: "S008", cobas: 1.10, atellica: 1.11 },
  { sampleId: "S009", cobas: 0.64, atellica: 0.65 },
  { sampleId: "S010", cobas: 1.35, atellica: 1.38 },
  { sampleId: "S011", cobas: 2.80, atellica: 2.86 },
  { sampleId: "S012", cobas: 5.12, atellica: 5.25 },
  { sampleId: "S013", cobas: 1.05, atellica: 1.06 },
  { sampleId: "S014", cobas: 0.90, atellica: 0.89 },
  { sampleId: "S015", cobas: 2.40, atellica: 2.45 },
  { sampleId: "S016", cobas: 0.72, atellica: 0.74 },
  { sampleId: "S017", cobas: 1.50, atellica: 1.53 },
  { sampleId: "S018", cobas: 1.88, atellica: 1.91 },
  { sampleId: "S019", cobas: 3.90, atellica: 4.02 },
  { sampleId: "S020", cobas: 1.20, atellica: 1.22 }
];
