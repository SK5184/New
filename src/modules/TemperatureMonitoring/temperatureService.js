// src/modules/TemperatureMonitoring/temperatureService.js
// Central Firestore and LocalStorage service for Temperature & Humidity Monitoring

import { db } from "../../firebase";
import {
  collection, addDoc, getDocs, doc,
  updateDoc, query, where, orderBy, setDoc, getDoc
} from "firebase/firestore";

const POINTS_COLL = "temperatureMonitoringPoints";
const RECORDS_COLL = "temperatureRecords";
const EXCURSIONS_COLL = "temperatureExcursions";
const CAPA_COLL = "actionRequests";

// Default seed monitoring points matching the enterprise lab architecture
const DEFAULT_POINTS = [
  // Biochemistry
  { id: "TMP-BIO-001", department: "Biochemistry", area: "Room 201 (Analytic Room)", type: "Room", minLimit: 20, maxLimit: 25, minHumidity: 30, maxHumidity: 65, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-BIO-002", department: "Biochemistry", area: "Reagent Refrigerator (Cobas)", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-BIO-003", department: "Biochemistry", area: "Calibrator Deep Freezer (-20°C)", type: "Freezer", minLimit: -25, maxLimit: -15, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-BIO-004", department: "Biochemistry", area: "Incubator (Cobas)", type: "Incubator", minLimit: 36.5, maxLimit: 37.5, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },
  
  // Haematology
  { id: "TMP-HAEM-001", department: "Haematology", area: "Room 202 (CBC Room)", type: "Room", minLimit: 20, maxLimit: 25, minHumidity: 30, maxHumidity: 65, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-HAEM-002", department: "Haematology", area: "QC Refrigerator (Sysmex)", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Microbiology
  { id: "TMP-MIC-001", department: "Microbiology", area: "Culture Room 1", type: "Room", minLimit: 20, maxLimit: 25, minHumidity: 30, maxHumidity: 60, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-MIC-002", department: "Microbiology", area: "Incubator 1 (Bacteriology)", type: "Incubator", minLimit: 36, maxLimit: 38, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-MIC-003", department: "Microbiology", area: "Culture Refrigerator", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Histopathology
  { id: "TMP-HISTO-001", department: "Histopathology & Cytopathology", area: "Grossing Room", type: "Room", minLimit: 18, maxLimit: 24, minHumidity: 30, maxHumidity: 65, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-HISTO-002", department: "Histopathology & Cytopathology", area: "Staining Refrigerator", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Serology
  { id: "TMP-SER-001", department: "Serology", area: "Reagent Storage Fridge", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Flow Cytometry
  { id: "TMP-FLOW-001", department: "Flow Cytometry", area: "Reagent Refrigerator", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Molecular Biology / Genetics
  { id: "TMP-MOL-001", department: "Molecular Biology", area: "PCR Setup Room", type: "Room", minLimit: 20, maxLimit: 24, minHumidity: 30, maxHumidity: 60, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-MOL-002", department: "Molecular Biology", area: "Deep Freezer (-80°C)", type: "Deep Freezer", minLimit: -85, maxLimit: -70, frequency: "2 times/day", mode: "sensor", sensorId: "IOT-SENS-MOL80", alertEnabled: true, status: "active" },

  // Purchase & Store
  { id: "TMP-PUR-001", department: "Purchase", area: "Cold Chain Room", type: "Room", minLimit: 2, maxLimit: 8, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },
  { id: "TMP-PUR-002", department: "Purchase", area: "Reagent Store Room", type: "Room", minLimit: 15, maxLimit: 25, minHumidity: 30, maxHumidity: 65, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Sample Collection & Transportation
  { id: "TMP-TRN-001", department: "Sample Collection", area: "Transit Cold Box A", type: "Transport Box", minLimit: 2, maxLimit: 8, frequency: "Continuous", mode: "sensor", sensorId: "IOT-SENS-COLBOXA", alertEnabled: true, status: "active" },
  { id: "TMP-TRN-002", department: "Sample Collection", area: "Transit Cold Box B", type: "Transport Box", minLimit: 2, maxLimit: 8, frequency: "Continuous", mode: "sensor", sensorId: "IOT-SENS-COLBOXB", alertEnabled: true, status: "active" },
  { id: "TMP-TRN-003", department: "Sample CollectionCenter", area: "Phlebotomy Waiting Hall", type: "Room", minLimit: 18, maxLimit: 25, minHumidity: 30, maxHumidity: 65, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Phlebotomy
  { id: "TMP-PHLEB-001", department: "Phlebotomy", area: "Sample Storage Deep Freezer", type: "Deep Freezer", minLimit: -25, maxLimit: -15, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Reception
  { id: "TMP-RECEP-001", department: "Reception", area: "Sample Sorting Area", type: "Room", minLimit: 20, maxLimit: 25, minHumidity: 30, maxHumidity: 65, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Back Office
  { id: "TMP-BO-001", department: "Back Office", area: "Logistics Sorting Area", type: "Room", minLimit: 20, maxLimit: 25, frequency: "3 times/day", mode: "manual", alertEnabled: true, status: "active" },

  // Kitchen
  { id: "TMP-KTCH-001", department: "Kitchen", area: "Pantry Refrigerator", type: "Refrigerator", minLimit: 2, maxLimit: 8, frequency: "2 times/day", mode: "manual", alertEnabled: true, status: "active" }
];

export const temperatureService = {
  // 1. Get Monitoring Points
  async getPoints(deptFilter = null) {
    try {
      const snap = await getDocs(collection(db, POINTS_COLL));
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (list.length === 0) {
        // Seed initial points in Firestore
        for (const p of DEFAULT_POINTS) {
          await setDoc(doc(db, POINTS_COLL, p.id), p);
        }
        list = [...DEFAULT_POINTS];
      }

      // Filter by department if requested (ignoring case)
      if (deptFilter) {
        const dfLower = deptFilter.toLowerCase();
        return list.filter(p => {
          const pDept = p.department.toLowerCase();
          // Support fuzzy matches (e.g. "Sample Collection Center" matches "Sample Collection")
          return pDept.includes(dfLower) || dfLower.includes(pDept);
        });
      }
      return list;
    } catch (e) {
      console.warn("Firestore error reading points, using cache:", e);
      const cached = localStorage.getItem("mbl_temp_points");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (deptFilter) {
          const dfLower = deptFilter.toLowerCase();
          return parsed.filter(p => p.department.toLowerCase().includes(dfLower) || dfLower.includes(p.department.toLowerCase()));
        }
        return parsed;
      }
      // Return hardcoded fallback
      if (deptFilter) {
        const dfLower = deptFilter.toLowerCase();
        return DEFAULT_POINTS.filter(p => p.department.toLowerCase().includes(dfLower) || dfLower.includes(p.department.toLowerCase()));
      }
      return DEFAULT_POINTS;
    }
  },

  // 2. Add / Update Monitoring Point
  async savePoint(point) {
    try {
      await setDoc(doc(db, POINTS_COLL, point.id), point);
      // Refresh local cache in background
      const pts = await this.getPoints();
      localStorage.setItem("mbl_temp_points", JSON.stringify(pts));
      return true;
    } catch (e) {
      console.error("Error saving point:", e);
      // Offline support
      const cached = localStorage.getItem("mbl_temp_points");
      let list = cached ? JSON.parse(cached) : [...DEFAULT_POINTS];
      const idx = list.findIndex(p => p.id === point.id);
      if (idx >= 0) list[idx] = point;
      else list.push(point);
      localStorage.setItem("mbl_temp_points", JSON.stringify(list));
      return true;
    }
  },

  // 3. Save Temperature Record & Check Excursions
  async addRecord(record) {
    const payload = {
      ...record,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Add record to Firestore
      const docRef = await addDoc(collection(db, RECORDS_COLL), payload);
      payload.recordId = docRef.id;

      // 2. Perform out-of-range check
      const temp = parseFloat(record.temperature);
      const hum = record.humidity ? parseFloat(record.humidity) : null;
      let status = "Normal";
      let excursionAlert = false;
      let limitDetails = "";

      if (temp < record.minLimit || temp > record.maxLimit) {
        excursionAlert = true;
        status = temp < record.minLimit ? "Critical Low" : "Critical High";
        limitDetails = `Temperature ${temp}°C (Limit: ${record.minLimit} to ${record.maxLimit}°C)`;
      } else if (hum !== null && (record.minHumidity && hum < record.minHumidity || record.maxHumidity && hum > record.maxHumidity)) {
        excursionAlert = true;
        status = hum < record.minHumidity ? "Warning Low (Humidity)" : "Warning High (Humidity)";
        limitDetails = `Humidity ${hum}%RH (Limit: ${record.minHumidity} to ${record.maxHumidity}%RH)`;
      }

      if (excursionAlert) {
        // Log an active temperature excursion
        const excPayload = {
          pointId: record.pointId,
          department: record.department,
          area: record.area,
          type: record.type,
          actualTemp: temp,
          actualHumidity: hum,
          limitExceeded: limitDetails,
          timestamp: payload.createdAt,
          duration: "Pending Assessment",
          impactAssessment: "",
          actionTaken: "",
          capaRequired: "No",
          resolved: false,
          status: status,
          operator: record.enteredBy || "IoT Sensor"
        };
        await addDoc(collection(db, EXCURSIONS_COLL), excPayload);
      }

      return { success: true, status };
    } catch (e) {
      console.warn("Failed to add temperature record offline, saving to localStorage:", e);
      // Offline fallback
      const cached = localStorage.getItem("mbl_temp_records") || "[]";
      const list = JSON.parse(cached);
      list.unshift(payload);
      localStorage.setItem("mbl_temp_records", JSON.stringify(list));
      return { success: true, status: "Offline Saved" };
    }
  },

  // 4. Get Historical Records for a point
  async getRecords(pointId, limitCount = 30) {
    try {
      const snap = await getDocs(collection(db, RECORDS_COLL));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = list.filter(r => r.pointId === pointId);
      // Sort desc
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return filtered.slice(0, limitCount);
    } catch (e) {
      const cached = localStorage.getItem("mbl_temp_records") || "[]";
      return JSON.parse(cached).filter(r => r.pointId === pointId).slice(0, limitCount);
    }
  },

  // 5. Get Excursions (optionally filtered by department)
  async getExcursions(deptFilter = null) {
    try {
      const snap = await getDocs(collection(db, EXCURSIONS_COLL));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (deptFilter) {
        const dfLower = deptFilter.toLowerCase();
        return list.filter(e => {
          const eDept = e.department.toLowerCase();
          return eDept.includes(dfLower) || dfLower.includes(eDept);
        });
      }
      return list;
    } catch (e) {
      return [];
    }
  },

  // 6. Resolve Excursion & Trigger CAPA
  async resolveExcursion(id, resolution) {
    try {
      const docRef = doc(db, EXCURSIONS_COLL, id);
      const updatePayload = {
        resolved: true,
        duration: resolution.duration || "N/A",
        impactAssessment: resolution.impactAssessment || "",
        actionTaken: resolution.actionTaken || "",
        capaRequired: resolution.capaRequired || "No",
        resolvedBy: resolution.resolvedBy || "Pathology Supervisor",
        resolvedAt: new Date().toISOString()
      };

      await updateDoc(docRef, updatePayload);

      // If CAPA is required, auto-create a document in the central actionRequests collection
      if (resolution.capaRequired === "Yes") {
        const capaId = `CAPA-EXC-${id.slice(0, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
        const capaPayload = {
          addressedDepartment: "Biomedical Engineering",
          assignedTo: "Biomedical Engineer",
          capaRequired: "Yes",
          createdAt: new Date().toISOString(),
          description: `Temperature Excursion Alert: ${resolution.limitExceeded || "Limit Exceeded"} observed at ${resolution.area}. Impact: ${resolution.impactAssessment}. Corrective Action Taken: ${updatePayload.actionTaken}`,
          loggedBy: updatePayload.resolvedBy,
          originatingDepartment: resolution.department || "Pathology",
          priority: "High",
          referenceCode: resolution.pointId || "TMP-001",
          status: "Open",
          subject: `CAPA: Temperature Excursion at ${resolution.area || "Laboratory area"}`
        };
        await setDoc(doc(db, CAPA_COLL, capaId), capaPayload);
      }

      return true;
    } catch (e) {
      console.error("Error resolving excursion:", e);
      return false;
    }
  }
};
