// sampleRejectionService.js
// Centralized service for Sample Acceptance / Rejection QMS records

import { db } from "../../../firebase";
import {
  collection, addDoc, getDocs, doc, getDoc,
  setDoc, query, where, serverTimestamp, updateDoc
} from "firebase/firestore";

// Helper to extract year-month key (e.g., "2026-06") from date string "YYYY-MM-DD"
export function getMonthKey(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 7);
  return dateStr.slice(0, 7);
}

// Convert "2026-06" to "June 2026"
export function getMonthLabel(monthKeyStr) {
  if (!monthKeyStr) return "Current Month";
  const [year, month] = monthKeyStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// Determine status based on rejection limit (Target < 2.0%)
export function getKpiStatus(val, limit = 2.0) {
  if (val === null || isNaN(val)) return "none";
  if (val <= limit * 0.8) return "pass"; // Green
  if (val <= limit) return "warn";       // Amber
  return "fail";                         // Red
}

// Seed default acceptance criteria database
export async function seedDefaultCriteria() {
  try {
    const q = await getDocs(collection(db, "sampleAcceptanceCriteria"));
    if (!q.empty) return; // already seeded

    const defaults = [
      {
        criteriaId: "BIO-SAC-001",
        department: "Biochemistry",
        sampleType: "Serum",
        testCategory: "Chemistry",
        parameter: "Hemolysis",
        acceptanceCriteria: "Clear serum, no significant hemolysis",
        rejectionCriteria: "Moderate to severe hemolysis (interferes with potassium/LDH)",
        action: "Reject/Repeat Collection",
        approvedBy: "Quality Manager",
        version: "1.0",
        createdAt: new Date()
      },
      {
        criteriaId: "BIO-SAC-002",
        department: "Biochemistry",
        sampleType: "Serum",
        testCategory: "Chemistry",
        parameter: "Volume",
        acceptanceCriteria: "Minimum volume 2.0 mL",
        rejectionCriteria: "Insufficient volume (< 1.0 mL)",
        action: "Reject / Conditional Acceptance",
        approvedBy: "Quality Manager",
        version: "1.0",
        createdAt: new Date()
      },
      {
        criteriaId: "HEM-SAC-001",
        department: "Haematology",
        sampleType: "Whole Blood",
        testCategory: "CBC",
        parameter: "Clot Presence",
        acceptanceCriteria: "Homogeneous liquid, zero clots",
        rejectionCriteria: "Any visible microclot or clot in EDTA tube (invalidates platelet counts)",
        action: "Reject / Repeat Collection",
        approvedBy: "Haematology Director",
        version: "1.0",
        createdAt: new Date()
      },
      {
        criteriaId: "HEM-SAC-002",
        department: "Haematology",
        sampleType: "Whole Blood",
        testCategory: "CBC",
        parameter: "Tube Type",
        acceptanceCriteria: "EDTA Purple top tube",
        rejectionCriteria: "Plain, heparin, or citrate tube used for cell counts",
        action: "Reject",
        approvedBy: "Haematology HOD",
        version: "1.0",
        createdAt: new Date()
      },
      {
        criteriaId: "MIC-SAC-001",
        department: "Microbiology",
        sampleType: "Urine",
        testCategory: "Culture",
        parameter: "Contamination",
        acceptanceCriteria: "Clean catch midstream in sterile container",
        rejectionCriteria: "Non-sterile bottle or delayed transport (> 2 hrs without preservative)",
        action: "Reject/Repeat Collection",
        approvedBy: "Microbiologist HOD",
        version: "1.0",
        createdAt: new Date()
      },
      {
        criteriaId: "SER-SAC-001",
        department: "Serology",
        sampleType: "Serum",
        testCategory: "Immunology",
        parameter: "Lipemia",
        acceptanceCriteria: "Clear serum",
        rejectionCriteria: "Gross lipemia (causes turbidity interference in spectrophotometry)",
        action: "Conditional Acceptance / Exception",
        approvedBy: "Quality Manager",
        version: "1.0",
        createdAt: new Date()
      }
    ];

    for (const item of defaults) {
      await addDoc(collection(db, "sampleAcceptanceCriteria"), item);
    }
    console.log("Successfully seeded default sample acceptance criteria.");
  } catch (err) {
    console.error("Error seeding default criteria:", err);
  }
}

// Fetch acceptance criteria
export async function getAcceptanceCriteria(dept = null) {
  try {
    let q = collection(db, "sampleAcceptanceCriteria");
    if (dept) {
      q = query(q, where("department", "==", dept));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error loading criteria master:", err);
    return [];
  }
}

// Log new criteria
export async function addAcceptanceCriteria(data) {
  try {
    const docRef = await addDoc(collection(db, "sampleAcceptanceCriteria"), {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (err) {
    console.error("Error creating criteria:", err);
    throw err;
  }
}

// Add sample assessment log
export async function addAssessment(assessment) {
  try {
    const docRef = await addDoc(collection(db, "sampleAssessments"), {
      ...assessment,
      createdAt: serverTimestamp()
    });
    
    // Auto-calculate monthly KPI indicator
    const monthKey = getMonthKey(assessment.collectionDate);
    await syncMonthlyKPI(assessment.department, monthKey);

    return docRef.id;
  } catch (err) {
    console.error("Error adding assessment:", err);
    throw err;
  }
}

// Retrieve assessments
export async function getAssessments(dept = null, monthKeyStr = null) {
  try {
    let q = collection(db, "sampleAssessments");
    if (dept && monthKeyStr) {
      const start = `${monthKeyStr}-01`;
      const end = `${monthKeyStr}-32`;
      q = query(q, where("department", "==", dept), where("collectionDate", ">=", start), where("collectionDate", "<=", end));
    } else if (dept) {
      q = query(q, where("department", "==", dept));
    } else if (monthKeyStr) {
      const start = `${monthKeyStr}-01`;
      const end = `${monthKeyStr}-32`;
      q = query(q, where("collectionDate", ">=", start), where("collectionDate", "<=", end));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error fetching assessments:", err);
    return [];
  }
}

// Add deviation exception approval
export async function addException(exception) {
  try {
    const docRef = await addDoc(collection(db, "sampleExceptions"), {
      ...exception,
      createdAt: serverTimestamp()
    });

    // Update assessment if there is a linked assessment record
    if (exception.assessmentId) {
      const assessmentRef = doc(db, "sampleAssessments", exception.assessmentId);
      await updateDoc(assessmentRef, {
        decision: "Accepted with Exception",
        exceptionId: docRef.id
      });
    }

    return docRef.id;
  } catch (err) {
    console.error("Error adding exception:", err);
    throw err;
  }
}

// Fetch exception logs
export async function getExceptions(dept = null) {
  try {
    let q = collection(db, "sampleExceptions");
    if (dept) {
      q = query(q, where("department", "==", dept));
    }
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.error("Error loading exception log:", err);
    return [];
  }
}

// Sync/Aggregate monthly statistics and write to qualityKPI & kpiData
export async function syncMonthlyKPI(department, monthKeyStr) {
  try {
    // 1. Fetch all raw assessments for department in month
    const start = `${monthKeyStr}-01`;
    const end = `${monthKeyStr}-32`;
    const q = query(
      collection(db, "sampleAssessments"),
      where("department", "==", department),
      where("collectionDate", ">=", start),
      where("collectionDate", "<=", end)
    );
    const snap = await getDocs(q);
    
    let totalReceived = 0;
    let totalRejected = 0;
    const reasonsMap = {};

    snap.forEach(d => {
      const data = d.data();
      totalReceived++;
      if (data.decision === "Reject") {
        totalRejected++;
        // Count reasons
        if (data.reasons && Array.isArray(data.reasons)) {
          data.reasons.forEach(r => {
            reasonsMap[r] = (reasonsMap[r] || 0) + 1;
          });
        }
      }
    });

    const rejectionRate = totalReceived > 0 ? parseFloat(((totalRejected / totalReceived) * 100).toFixed(2)) : 0.0;

    // Sort reasons by count
    const sortedReasons = Object.entries(reasonsMap)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Top 3 reasons
    const topReasons = sortedReasons.slice(0, 3);
    
    // Percentages breakdown for top reasons
    const reasonsBreakdown = {};
    Object.entries(reasonsMap).forEach(([reason, count]) => {
      reasonsBreakdown[reason] = totalRejected > 0 ? parseFloat(((count / totalRejected) * 100).toFixed(1)) : 0.0;
    });

    const monthLabel = getMonthLabel(monthKeyStr);

    // 2. Save/merge into qualityKPI collection
    const kpiDocRef = doc(db, "qualityKPI", `${department}_${monthKeyStr}`);
    await setDoc(kpiDocRef, {
      department,
      month: monthLabel,
      monthKey: monthKeyStr,
      metrics: {
        sampleReceived: totalReceived,
        sampleRejected: totalRejected,
        rejectionRate: rejectionRate
      },
      topReasons,
      reasonsBreakdown,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 3. Sync to main QMS KPI collection (kpiData) for indicator 7.5.4
    // Limit for 7.5.4 is 5.0%
    const standardDocRef = doc(db, "kpiData", department, "monthlyData", monthKeyStr);
    
    const kpiStatus = getKpiStatus(rejectionRate, 5.0);
    const remarks = topReasons.length > 0
      ? `Top reasons: ${topReasons.map(r => `${r} (${reasonsBreakdown[r]}%)`).join(", ")}`
      : "No rejections recorded.";

    await setDoc(standardDocRef, {
      month: monthKeyStr,
      department: department,
      indicators: {
        "7.5.4": {
          num: String(totalRejected),
          den: String(totalReceived),
          pct: rejectionRate,
          status: kpiStatus,
          remarks: remarks
        }
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    console.log(`KPI aggregated for ${department} [${monthKeyStr}]: received=${totalReceived}, rejected=${totalRejected}, rate=${rejectionRate}%`);
    return { totalReceived, totalRejected, rejectionRate, topReasons, reasonsBreakdown };
  } catch (err) {
    console.error("Error syncing monthly KPI stats:", err);
    throw err;
  }
}
