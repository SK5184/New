// retentionService.js
import { db } from "../../firebase";
import { 
  collection, addDoc, getDocs, doc, getDoc, 
  updateDoc, query, where, writeBatch, serverTimestamp 
} from "firebase/firestore";

// Seed default policies
export const seedDefaultPolicies = async () => {
  try {
    const snap = await getDocs(collection(db, "retentionPolicies"));
    if (!snap.empty) return; // already seeded

    const defaults = [
      {
        policyId: "SRP-BIO-001",
        department: "Biochemistry",
        sampleType: "Serum",
        testCategory: "Clinical Chemistry",
        testName: "Glucose",
        retentionDays: 7,
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      },
      {
        policyId: "SRP-BIO-002",
        department: "Biochemistry",
        sampleType: "Serum",
        testCategory: "Clinical Chemistry",
        testName: "Lipid Profile",
        retentionDays: 7,
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      },
      {
        policyId: "SRP-BIO-003",
        department: "Biochemistry",
        sampleType: "Serum",
        testCategory: "Clinical Chemistry",
        testName: "Hormones",
        retentionDays: 7,
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      },
      {
        policyId: "SRP-BIO-004",
        department: "Biochemistry",
        sampleType: "Plasma",
        testCategory: "Coagulation",
        testName: "Coagulation",
        retentionDays: 1, // 24 hours
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      },
      {
        policyId: "SRP-HEM-001",
        department: "Haematology",
        sampleType: "Whole Blood",
        testCategory: "Haematology CBC",
        testName: "Complete Blood Count",
        retentionDays: 2, // 48 hours
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      },
      {
        policyId: "SRP-MIC-001",
        department: "Microbiology",
        sampleType: "Urine",
        testCategory: "Urine Culture",
        testName: "Urine Culture",
        retentionDays: 2, // 48 hours
        storageCondition: "2-8°C",
        disposalMethod: "Biohazard Disposal",
        effectiveDate: new Date().toISOString().split("T")[0],
        approvedBy: "Quality Manager",
        version: "1.0"
      }
    ];

    const batch = writeBatch(db);
    defaults.forEach(p => {
      const ref = doc(collection(db, "retentionPolicies"));
      batch.set(ref, { ...p, createdAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error seeding default retention policies:", err);
  }
};

// Add customized Policy
export const addRetentionPolicy = async (policy) => {
  return await addDoc(collection(db, "retentionPolicies"), {
    ...policy,
    createdAt: serverTimestamp()
  });
};

// Fetch Policies
export const getRetentionPolicies = async (department) => {
  try {
    const colRef = collection(db, "retentionPolicies");
    let q = colRef;
    if (department && department !== "All") {
      q = query(colRef, where("department", "==", department));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting policies:", err);
    return [];
  }
};

// Fetch Stored Samples
export const getStoredSamples = async (department) => {
  try {
    const colRef = collection(db, "samples");
    let q = colRef;
    if (department && department !== "All") {
      q = query(colRef, where("department", "==", department));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting stored samples:", err);
    return [];
  }
};

// Add sample for storage & calculate retention period
export const addStoredSample = async (sample) => {
  // 1. Get all policies for the department
  const policies = await getRetentionPolicies(sample.department);
  
  // 2. Try to match specific test first, then sampleType
  let matchedPolicy = policies.find(p => 
    p.testName?.toLowerCase() === sample.test?.toLowerCase() &&
    p.sampleType?.toLowerCase() === sample.sampleType?.toLowerCase()
  );

  if (!matchedPolicy) {
    matchedPolicy = policies.find(p => p.sampleType?.toLowerCase() === sample.sampleType?.toLowerCase());
  }

  // Default fallback if no policy matches
  const retentionDays = matchedPolicy ? matchedPolicy.retentionDays : 7; // default 7 days
  const policyId = matchedPolicy ? matchedPolicy.policyId : "SRP-DFT-001";
  const storageCondition = matchedPolicy ? matchedPolicy.storageCondition : "2-8°C";
  const disposalMethod = matchedPolicy ? matchedPolicy.disposalMethod : "Biohazard Disposal";

  // Calculate retentionEndDate (Stored Date + retentionDays)
  const storedDate = new Date(sample.storedDate);
  storedDate.setDate(storedDate.getDate() + retentionDays);
  const retentionEndDate = storedDate.toISOString().split("T")[0];

  // Set status based on expiration date comparison
  const today = new Date().toISOString().split("T")[0];
  const initialStatus = retentionEndDate <= today ? "Ready for Discard" : "Active";

  return await addDoc(collection(db, "samples"), {
    ...sample,
    retentionDays,
    retentionPolicyId: policyId,
    storageCondition,
    disposalMethod,
    retentionEndDate,
    status: initialStatus,
    createdAt: serverTimestamp()
  });
};

// Discard specimen (and log to Audit Trail)
export const discardSampleSpecimen = async (sampleId, operator, approver, reason, policyId) => {
  const sampleRef = doc(db, "samples", sampleId);
  const sampleSnap = await getDoc(sampleRef);
  if (!sampleSnap.exists()) throw new Error("Sample does not exist");
  
  const sampleData = sampleSnap.data();

  // 1. Update sample status to Discarded
  await updateDoc(sampleRef, {
    status: "Discarded",
    discardDate: new Date().toISOString().split("T")[0]
  });

  // 2. Write to Audit Trail
  return await addDoc(collection(db, "sampleDiscardAudit"), {
    sampleId: sampleData.sampleId || sampleId,
    patientId: sampleData.patientId || "Unknown",
    test: sampleData.test || "Unknown",
    discardDate: new Date().toISOString().split("T")[0],
    discardedBy: operator,
    approvedBy: approver || "Quality Manager",
    reason: reason || "Retention period completed",
    retentionPolicyApplied: policyId || sampleData.retentionPolicyId || "SRP-DFT-001",
    timestamp: serverTimestamp()
  });
};

// Check and update expirations for samples
export const checkExpirations = async (department) => {
  try {
    const colRef = collection(db, "samples");
    let q = query(colRef, where("status", "==", "Active"));
    if (department && department !== "All") {
      q = query(colRef, where("status", "==", "Active"), where("department", "==", department));
    }
    
    const snap = await getDocs(q);
    const today = new Date().toISOString().split("T")[0];
    const batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach(d => {
      const data = d.data();
      if (data.retentionEndDate && data.retentionEndDate <= today) {
        batch.update(d.ref, { status: "Ready for Discard" });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (err) {
    console.error("Error checking expirations:", err);
    return 0;
  }
};

// Fetch discard audit log
export const getDiscardAuditLogs = async () => {
  try {
    const colRef = collection(db, "sampleDiscardAudit");
    const snap = await getDocs(colRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Error getting discard audit logs:", err);
    return [];
  }
};
