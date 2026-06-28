// src/modules/TemperatureMonitoring/TemperatureDashboard.jsx
// Central Temperature & Humidity Monitoring Module Dashboard Wrapper

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { temperatureService } from "./temperatureService";
import MonitoringMaster from "./MonitoringMaster";
import ManualEntry from "./ManualEntry";
import SensorIntegration from "./SensorIntegration";
import ExcursionManagement from "./ExcursionManagement";
import Reports from "./Reports";

const S = {
  wrap: { fontFamily: "'Inter',system-ui,sans-serif", background: "#F8FAFC", minHeight: "100%", padding: 12 },
  tabBar: { display: "flex", borderBottom: "1px solid #E2E8F0", gap: 4, marginBottom: 16, overflowX: "auto" },
  tabBtn: (active) => ({
    padding: "10px 16px", background: "transparent", border: "none",
    borderBottom: active ? "3px solid #0D9488" : "3px solid transparent",
    color: active ? "#0D9488" : "#64748B", fontWeight: active ? 600 : 500,
    cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6
  }),
  grid: (cols) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 16 }),
  kpiCard: { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  kpiVal: { fontSize: 20, fontWeight: 700, marginTop: 4 },
  kpiLabel: { fontSize: 10.5, color: "#64748B", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.02em" },
  toast: { position: "fixed", bottom: 24, right: 24, background: "#0F172A", color: "#F8FAFC", padding: "12px 20px", borderRadius: 8, fontSize: 12.5, zIndex: 3000, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)" }
};

export default function TemperatureDashboard({ department }) {
  const { name: currentUserName, role: userRole, dept: userDept, isSuperAdmin, isERPAdmin } = useAuth();

  // Access check: BME / Admin / ERP Admin have full configurator master view
  const isDirector = isSuperAdmin || userRole?.toLowerCase().includes("director") || userDept === "Administration";
  const isAdmin = userRole === "Admin" || isERPAdmin;
  const isBME = userRole?.toLowerCase() === "bme" || userDept?.toLowerCase().includes("biomedical");
  const hasAdminRights = isDirector || isAdmin || isBME;

  const [points, setPoints] = useState([]);
  const [excursions, setExcursions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Set default tab based on role
  const [activeTab, setActiveTab] = useState("overview");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pts = await temperatureService.getPoints(department);
      setPoints(pts);

      const excs = await temperatureService.getExcursions(department);
      setExcursions(excs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregate KPI calculations
  const totalPoints = points.length;
  const manualCount = points.filter(p => p.mode === "manual").length;
  const sensorCount = points.filter(p => p.mode === "sensor").length;
  const activeExcursions = excursions.filter(e => !e.resolved);
  
  const criticalCount = activeExcursions.filter(e => e.status?.includes("Critical")).length;
  const warningCount = activeExcursions.filter(e => e.status?.includes("Warning")).length;
  const normalCount = totalPoints - activeExcursions.length;

  return (
    <div style={S.wrap}>
      {/* Real-time status cards */}
      <div style={S.grid(6)}>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Total Points</div>
          <div style={{ ...S.kpiVal, color: "#1E293B" }}>{totalPoints}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Normal Status</div>
          <div style={{ ...S.kpiVal, color: "#0D9488" }}>{normalCount}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Warning Alerts</div>
          <div style={{ ...S.kpiVal, color: warningCount > 0 ? "#D97706" : "#0D9488" }}>{warningCount}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Critical Breaches</div>
          <div style={{ ...S.kpiVal, color: criticalCount > 0 ? "#EF4444" : "#0D9488" }}>{criticalCount}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Manual Logs</div>
          <div style={{ ...S.kpiVal, color: "#475569" }}>{manualCount}</div>
        </div>
        <div style={S.kpiCard}>
          <div style={S.kpiLabel}>Sensor Monitored</div>
          <div style={{ ...S.kpiVal, color: "#0369A1" }}>{sensorCount}</div>
        </div>
      </div>

      {/* Tab Menu bar */}
      <div style={S.tabBar}>
        <button style={S.tabBtn(activeTab === "overview")} onClick={() => setActiveTab("overview")}>🖥️ Cockpit Overview</button>
        <button style={S.tabBtn(activeTab === "manual_entry")} onClick={() => setActiveTab("manual_entry")}>✍️ Manual Log Entries</button>
        <button style={S.tabBtn(activeTab === "excursions")} onClick={() => setActiveTab("excursions")}>
          🚨 Excursions & CAPA {activeExcursions.length > 0 && <span style={{ background: "#EF4444", color: "#FFF", borderRadius: 10, padding: "1px 5px", fontSize: 9.5 }}>{activeExcursions.length}</span>}
        </button>
        <button style={S.tabBtn(activeTab === "reports")} onClick={() => setActiveTab("reports")}>📈 Trend Reports</button>
        
        {hasAdminRights && (
          <>
            <button style={S.tabBtn(activeTab === "sensor_integration")} onClick={() => setActiveTab("sensor_integration")}>🔌 IoT Sensor Config</button>
            <button style={S.tabBtn(activeTab === "master_config")} onClick={() => setActiveTab("master_config")}>⚙️ Monitoring Point Master</button>
          </>
        )}
      </div>

      {/* Loading state indicator */}
      {loading && <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 12 }}>Refreshing environmental data stream...</div>}

      {/* Tab contents */}
      <div>
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {points.map(p => {
              const activeExc = excursions.find(e => e.pointId === p.id && !e.resolved);
              const cardBg = activeExc ? (activeExc.status?.includes("Critical") ? "#FEF2F2" : "#FFFBEB") : "#FFFFFF";
              const borderCol = activeExc ? (activeExc.status?.includes("Critical") ? "#FCA5A5" : "#FDE68A") : "#E2E8F0";
              const statusColor = activeExc ? (activeExc.status?.includes("Critical") ? "#EF4444" : "#D97706") : "#0D9488";
              
              return (
                <div key={p.id} style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: 12, padding: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{p.area}</div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Point: {p.id} | {p.department}</div>
                    </div>
                    <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 12, background: p.mode === "sensor" ? "#E0F2FE" : "#F1F5F9", color: p.mode === "sensor" ? "#0369A1" : "#475569", fontWeight: 600 }}>
                      {p.mode.toUpperCase()}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontSize: 11, color: "#475569" }}>
                      Limits: <strong>{p.minLimit} to {p.maxLimit}°C</strong>
                      {p.minHumidity ? <><br/>Humidity: <strong>{p.minHumidity}-{p.maxHumidity}%</strong></> : ""}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: statusColor }}>
                      {activeExc ? activeExc.status.toUpperCase() : "NORMAL"}
                    </div>
                  </div>
                  {activeExc && (
                    <div style={{ background: activeExc.status?.includes("Critical") ? "#FEE2E2" : "#FEF3C7", border: "0.5px solid transparent", borderRadius: 8, padding: 8, marginTop: 10, fontSize: 10.5, color: activeExc.status?.includes("Critical") ? "#991B1B" : "#92400E" }}>
                      🚨 {activeExc.limitExceeded}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "manual_entry" && (
          <ManualEntry points={points} department={department || "All Departments"} showToast={showToast} />
        )}

        {activeTab === "excursions" && (
          <ExcursionManagement excursions={excursions} onRefresh={loadData} showToast={showToast} />
        )}

        {activeTab === "reports" && (
          <Reports points={points} excursions={excursions} />
        )}

        {activeTab === "sensor_integration" && (
          <SensorIntegration points={points} onRefresh={loadData} showToast={showToast} />
        )}

        {activeTab === "master_config" && (
          <MonitoringMaster points={points} onRefresh={loadData} showToast={showToast} />
        )}
      </div>

      {/* TOAST SYSTEM */}
      {toast && (
        <div style={S.toast}>
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
