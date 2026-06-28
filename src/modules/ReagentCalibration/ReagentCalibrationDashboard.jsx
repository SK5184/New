// ReagentCalibrationDashboard.jsx
// Centralized Reagent Performance Verification / Calibration Verification Module controller
// Aligned with ISO 15189:2022 and Metrological Traceability guidelines

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ReagentMaster from "./ReagentMaster";
import CalibrationEntry from "./CalibrationEntry";
import CalibrationReview from "./CalibrationReview";
import CAPAForm from "./CAPAForm";
import {
  loadReagentMasters,
  saveReagentMaster,
  updateReagentMasterStatus,
  loadCalibrations,
  saveCalibration,
  updateCalibrationStatus,
  triggerCAPAForCalibrationFailure
} from "./reagentCalibrationService";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100vh", padding: "20px 28px" },
  header: { marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: 700, color: "#0F172A", display: "flex", alignItems: "center", gap: 10 },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 4 },
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 24 }),
  metricCard: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  metricLabel: { fontSize: 12, color: "#64748B", fontWeight: 500 },
  metricVal: { fontSize: 24, fontWeight: 700, color: "#0F172A", marginTop: 4 },
  tabBar: { display: "flex", gap: 16, borderBottom: "1px solid #E2E8F0", marginBottom: 20 },
  tabBtn: (active) => ({ padding: "10px 16px", background: "transparent", border: "none", borderBottom: active ? "3px solid #0D9488" : "3px solid transparent", color: active ? "#0D9488" : "#64748B", fontWeight: active ? 600 : 500, cursor: "pointer", transition: "all 0.15s ease" }),
  card: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 24, overflow: "hidden" },
  cardHeader: { padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  cardBody: { padding: 20 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { background: "#F8FAFC", color: "#475569", fontWeight: 600, textAlign: "left", padding: "10px 14px", borderBottom: "2px solid #E2E8F0" },
  td: { padding: "10px 14px", borderBottom: "1px solid #E2E8F0", color: "#334155" },
  badge: (bg, fg) => ({ padding: "3px 8px", borderRadius: 12, fontSize: 10.5, fontWeight: 600, background: bg, color: fg }),
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)", fontSize: 12.5, zIndex: 2000, display: "flex", alignItems: "center", gap: 8 },
  alertList: { background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 16, marginBottom: 24 },
  alertItem: { display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#92400E", marginBottom: 6 }
};

export default function ReagentCalibrationDashboard() {
  const { name: currentUserName, role } = useAuth();
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "master" | "entry" | "review" | "capa"
  const [reagents, setReagents] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Role permissions checks
  const isQualityStaff = role === "Quality Manager" || role === "Admin" || role === "Managing Director";
  const isHOD = role === "HOD" || role === "Quality Manager" || role === "Admin" || role === "Managing Director";

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rList = await loadReagentMasters();
      const cList = await loadCalibrations();
      setReagents(rList);
      setCalibrations(cList);
    } catch (e) {
      console.error(e);
      showToast("Error synchronizing records with database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Master add
  const handleAddReagent = async (reagentData) => {
    try {
      await saveReagentMaster(reagentData);
      showToast("Reagent master successfully configured.");
      loadData();
    } catch (e) {
      showToast("Error saving reagent configuration.");
    }
  };

  // Toggle status
  const handleToggleReagentStatus = async (id, status) => {
    try {
      await updateReagentMasterStatus(id, status);
      showToast(`Reagent status set to ${status}.`);
      loadData();
    } catch (e) {
      showToast("Error updating reagent status.");
    }
  };

  // Calibration entry save
  const handleSaveCalibration = async (calData) => {
    try {
      const saved = await saveCalibration(calData);
      
      // If calibration failed, trigger auto CAPA escalation
      if (calData.status === "Failed") {
        const capaId = await triggerCAPAForCalibrationFailure(calData, "Run yields values exceeding bias limits.");
        
        // Update the calibration entry with CAPA link
        await updateCalibrationStatus(saved.id, "Failed", { capaID: capaId }, saved.auditTrail);
        showToast("Calibration verification failed. CAPA investigation logged.");
      } else {
        showToast("Calibration verification logged successfully.");
      }
      loadData();
    } catch (e) {
      console.error(e);
      showToast("Error recording calibration results.");
    }
  };

  // Calibration review & approval
  const handleReviewCalibration = async (id, status, approvalDetails, auditLog, calData) => {
    try {
      if (status === "Failed") {
        // Trigger auto CAPA escalation on HOD rejection
        const capaId = await triggerCAPAForCalibrationFailure(calData, "Rejected during HOD clinical audit.");
        await updateCalibrationStatus(id, "Failed", { ...approvalDetails, capaID: capaId }, auditLog);
        showToast("Calibration rejected. CAPA workflow initiated.");
      } else {
        await updateCalibrationStatus(id, "Approved", approvalDetails, auditLog);
        showToast("Calibration run approved and verified.");
      }
      loadData();
    } catch (e) {
      showToast("Error saving review status.");
    }
  };

  // CAPA submission
  const handleCapaInvestigationSubmit = async (calData, reason, formDetails) => {
    try {
      // Find global CAPA matching this ID or create reference
      const hoRef = doc(db, "reagentCalibrations", calData.id);
      
      const newAuditLog = {
        user: currentUserName || "HOD",
        action: `CAPA Logged: ${reason}`,
        date: new Date().toISOString()
      };

      await updateDoc(hoRef, {
        status: "Resolved",
        capaDetails: formDetails,
        auditTrail: [...calData.auditTrail, newAuditLog]
      });

      showToast("CAPA successfully registered. Calibration resolved.");
      loadData();
    } catch (e) {
      console.error(e);
      showToast("Failed to resolve CAPA.");
    }
  };

  // Calculate Metrics & Alerts
  const totalReagents = reagents.length;
  let validCount = 0;
  let dueSoonCount = 0;
  let expiredCount = 0;
  let failedCount = 0;
  const alertsList = [];

  reagents.forEach(r => {
    // Find latest calibration run for this reagent ID
    const runs = calibrations.filter(c => c.reagentID === r.reagentID);
    const latestRun = runs.length > 0 ? runs[0] : null;

    // Check reagent lot expiry date
    const daysToLotExpiry = Math.ceil((new Date(r.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (r.status === "Inactive") {
      return;
    }

    if (latestRun) {
      if (latestRun.status === "Failed") {
        failedCount++;
        alertsList.push({
          reagentName: r.testName,
          analyzer: r.analyzerID,
          msg: `⚠ Calibration FAILED: Requires CAPA verification`,
          type: "danger"
        });
      } else if (latestRun.status === "Approved" || latestRun.status === "Resolved") {
        // Calculate calibration age
        const calAgeDays = Math.ceil((Date.now() - new Date(latestRun.calibrationDate).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysToLotExpiry <= 0) {
          expiredCount++;
          alertsList.push({
            reagentName: r.testName,
            analyzer: r.analyzerID,
            msg: `🚨 Reagent Lot EXPIRED: Replace reagent lot pack`,
            type: "danger"
          });
        } else if (calAgeDays > 30) {
          expiredCount++;
          alertsList.push({
            reagentName: r.testName,
            analyzer: r.analyzerID,
            msg: `🚨 Calibration EXPIRED (${calAgeDays} days old): Recalibration required`,
            type: "danger"
          });
        } else if (calAgeDays > 23 || daysToLotExpiry <= 7) {
          dueSoonCount++;
          alertsList.push({
            reagentName: r.testName,
            analyzer: r.analyzerID,
            msg: daysToLotExpiry <= 7 
              ? `⚠ Reagent Lot expires in ${daysToLotExpiry} days` 
              : `⚠ Calibration due soon (expires in ${30 - calAgeDays} days)`,
            type: "warn"
          });
        } else {
          validCount++;
        }
      } else {
        // Pending approval
        validCount++; 
      }
    } else {
      // Missing calibration
      expiredCount++;
      alertsList.push({
        reagentName: r.testName,
        analyzer: r.analyzerID,
        msg: `🚨 Missing calibration: Perform calibration verification`,
        type: "danger"
      });
    }
  });

  return (
    <div style={S.wrap}>
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>
            <span>⚖️</span> Reagent Calibration &amp; Verification Board
          </h1>
          <p style={S.subtitle}>ISO 15189:2022 §6.6 &amp; §7.3 - Metrological Traceability &amp; Verification Matrix</p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div style={S.tabBar}>
        <button style={S.tabBtn(activeTab === "overview")} onClick={() => setActiveTab("overview")}>
          📊 Overview
        </button>
        <button style={S.tabBtn(activeTab === "master")} onClick={() => setActiveTab("master")}>
          ⚙️ Reagent Master
        </button>
        <button style={S.tabBtn(activeTab === "entry")} onClick={() => setActiveTab("entry")}>
          📥 Perform Calibration Run
        </button>
        <button style={S.tabBtn(activeTab === "review")} onClick={() => setActiveTab("review")}>
          🔑 HOD Review Board
        </button>
        <button style={S.tabBtn(activeTab === "capa")} onClick={() => setActiveTab("capa")}>
          ⚠️ CAPA Investigations
        </button>
      </div>

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div>
          {/* Metrics */}
          <div style={S.grid(5)}>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Total Active Reagents</div>
                <div style={S.metricVal}>{reagents.filter(r=>r.status==="Active").length}</div>
              </div>
              <span style={{ fontSize: 24 }}>🗄️</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Calibration Valid</div>
                <div style={{ ...S.metricVal, color: "#10B981" }}>{validCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>🟢</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Calibration Due Soon</div>
                <div style={{ ...S.metricVal, color: "#F59E0B" }}>{dueSoonCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>🟡</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Calibration Expired</div>
                <div style={{ ...S.metricVal, color: "#EF4444" }}>{expiredCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>🔴</span>
            </div>
            <div style={S.metricCard}>
              <div>
                <div style={S.metricLabel}>Calibration Failed</div>
                <div style={{ ...S.metricVal, color: "#EF4444" }}>{failedCount}</div>
              </div>
              <span style={{ fontSize: 24 }}>🚨</span>
            </div>
          </div>

          {/* Alert panel */}
          {alertsList.length > 0 && (
            <div style={S.alertList}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#92400E", margin: "0 0 10px 0" }}>⚠️ Calibration Verification Alerts</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {alertsList.map((alert, idx) => (
                  <div key={idx} style={{ ...S.alertItem, color: alert.type === "danger" ? "#991B1B" : "#92400E" }}>
                    <span>{alert.type === "danger" ? "🚨" : "⚠️"}</span>
                    <strong>{alert.reagentName} ({alert.analyzer}):</strong> {alert.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Calibrations History list */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <div style={S.cardTitle}>📜 Recent Calibration Run History</div>
            </div>
            <div style={{ padding: 0 }}>
              {loading ? (
                <div style={{ padding: 35, textAlign: "center", color: "#64748B" }}>Syncing...</div>
              ) : calibrations.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>No calibration history logged.</div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Calibration ID</th>
                      <th style={S.th}>Test / Department</th>
                      <th style={S.th}>Run Date</th>
                      <th style={S.th}>Calibrator Lot</th>
                      <th style={S.th}>Bias verification</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Verified By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrations.slice(0, 10).map(c => {
                      const maxBias = Math.max(...c.results.map(r => Math.abs(r.bias)));
                      return (
                        <tr key={c.id}>
                          <td style={{ ...S.td, fontWeight: 700 }}><code>{c.id.slice(0, 8).toUpperCase()}</code></td>
                          <td style={S.td}>
                            <div style={{ fontWeight: 600 }}>{c.testName}</div>
                            <div style={{ fontSize: 10, color: "#64748B" }}>{c.analyzerID}</div>
                          </td>
                          <td style={S.td}>{c.calibrationDate}</td>
                          <td style={S.td}>{c.calibrator.name} (Lot: {c.calibrator.lotNumber})</td>
                          <td style={S.td}>Max Bias: {maxBias}%</td>
                          <td style={S.td}>
                            <span style={S.badge(
                              c.status === "Approved" || c.status === "Resolved" ? "#ECFDF5" : c.status === "Failed" ? "#FEE2E2" : "#FEF3C7",
                              c.status === "Approved" || c.status === "Resolved" ? "#047857" : c.status === "Failed" ? "#B91C1C" : "#D97706"
                            )}>
                              {c.status}
                            </span>
                          </td>
                          <td style={S.td}>{c.approvedBy || <span style={{ color: "#94A3B8" }}>Pending</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. REAGENT MASTER TAB */}
      {activeTab === "master" && (
        <ReagentMaster
          reagents={reagents}
          onAdd={handleAddReagent}
          onStatusToggle={handleToggleReagentStatus}
          isQualityStaff={isQualityStaff}
        />
      )}

      {/* 3. CALIBRATION RUN ENTRY TAB */}
      {activeTab === "entry" && (
        <CalibrationEntry
          reagents={reagents}
          onSave={handleSaveCalibration}
          operatorName={currentUserName}
        />
      )}

      {/* 4. REVIEW BOARD TAB */}
      {activeTab === "review" && (
        <CalibrationReview
          calibrations={calibrations}
          onReview={handleReviewCalibration}
          reviewerName={currentUserName}
          isAuthorized={isHOD}
        />
      )}

      {/* 5. CAPA INVESTIGATIONS TAB */}
      {activeTab === "capa" && (
        <CAPAForm
          calibrations={calibrations}
          onSubmitCAPA={handleCapaInvestigationSubmit}
          operatorName={currentUserName}
        />
      )}
    </div>
  );
}
