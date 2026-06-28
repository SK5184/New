// reagentCalibrationService.js
// Firestore service for Reagent Calibration and Verification Module

import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc, setDoc, updateDoc, query, where, orderBy, serverTimestamp
} from "firebase/firestore";

// ─── Reagent Masters ──────────────────────────────────────────────────────────
export const loadReagentMasters = async () => {
  try {
    const snap = await getDocs(collection(db, "reagentMasters"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error loading reagent masters:", e);
    throw e;
  }
};

export const saveReagentMaster = async (reagentData) => {
  try {
    const payload = {
      ...reagentData,
      createdAt: new Date().toISOString(),
      status: reagentData.status || "Active"
    };
    const docRef = await addDoc(collection(db, "reagentMasters"), payload);
    return { id: docRef.id, ...payload };
  } catch (e) {
    console.error("Error saving reagent master:", e);
    throw e;
  }
};

export const updateReagentMasterStatus = async (id, status) => {
  try {
    const ref = doc(db, "reagentMasters", id);
    await updateDoc(ref, { status });
  } catch (e) {
    console.error("Error updating reagent status:", e);
    throw e;
  }
};

// ─── Calibrations ─────────────────────────────────────────────────────────────
export const loadCalibrations = async () => {
  try {
    const snap = await getDocs(query(collection(db, "reagentCalibrations"), orderBy("calibrationDate", "desc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error loading calibrations:", e);
    throw e;
  }
};

export const saveCalibration = async (calData) => {
  try {
    const payload = {
      ...calData,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(collection(db, "reagentCalibrations"), payload);
    return { id: docRef.id, ...payload };
  } catch (e) {
    console.error("Error saving calibration entry:", e);
    throw e;
  }
};

export const updateCalibrationStatus = async (id, status, approvalDetails, auditLog) => {
  try {
    const ref = doc(db, "reagentCalibrations", id);
    await updateDoc(ref, {
      status,
      ...approvalDetails,
      auditTrail: auditLog
    });
  } catch (e) {
    console.error("Error updating calibration status:", e);
    throw e;
  }
};

// ─── Auto CAPA Escalation ──────────────────────────────────────────────────────
export const triggerCAPAForCalibrationFailure = async (calData, reason) => {
  try {
    const capaPayload = {
      source: "Reagent Calibration Verification Failure",
      details: `Calibration failure triggered for reagent: ${calData.testName} (ID: ${calData.reagentID}) on Analyzer: ${calData.analyzerID}. Lot Number: ${calData.lotNumber}. Reason: ${reason}`,
      department: calData.department || "Biochemistry",
      status: "Initiated",
      actionPlan: "Pending investigation of calibrator, storage, reagent lot, and analyzer alignment.",
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // +7 days
      createdAt: new Date().toISOString(),
      createdBy: calData.operator || "System"
    };
    const docRef = await addDoc(collection(db, "capa"), capaPayload);
    return docRef.id;
  } catch (e) {
    console.error("Error triggering CAPA for failure:", e);
    throw e;
  }
};
