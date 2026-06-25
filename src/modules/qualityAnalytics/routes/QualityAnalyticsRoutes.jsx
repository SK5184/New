import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import ExecutiveDashboard from "../dashboard/ExecutiveDashboard";
import QualityIndicatorDashboard from "../qualityIndicators/QualityIndicatorDashboard";
import IQCDashboard from "../iqc/IQCDashboard";
import EQASDashboard from "../eqas/EQASDashboard";
import NCRDashboard from "../ncr/NCRDashboard";
import CAPADashboard from "../capa/CAPADashboard";
import RiskDashboard from "../risk/RiskDashboard";
import AuditDashboard from "../audits/AuditDashboard";
import ComplaintDashboard from "../complaints/ComplaintDashboard";
import IncidentDashboard from "../incidents/IncidentDashboard";
import EquipmentDashboard from "../equipment/EquipmentDashboard";
import CompetencyDashboard from "../training/CompetencyDashboard";
import SupplierPerformanceDashboard from "../suppliers/SupplierPerformanceDashboard";
import DocumentDashboard from "../documents/DocumentDashboard";
import ManagementReviewDashboard from "../managementReview/ManagementReviewDashboard";
import RiskPrediction from "../predictive/RiskPrediction";
import NABLReportGenerator from "../reports/NABLReportGenerator";

export default function QualityAnalyticsRoutes() {
  const { role } = useAuth();
  const [tab, setTab] = useState("exec_dashboard");
  const [analyticsFlags, setAnalyticsFlags] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFlags() {
      try {
        const snap = await getDoc(doc(db, "appSettings", "analyticsToggles"));
        if (snap.exists()) {
          setAnalyticsFlags(snap.data());
        }
      } catch (err) {
        console.warn("Failed to load analytics flags:", err);
      } finally {
        setLoading(false);
      }
    }
    loadFlags();
  }, []);

  const menu = [
    { section: "Overview", items: [{ id: "exec_dashboard", label: "Executive Dashboard", icon: "📊" }] },
    {
      section: "Quality Indicators",
      items: [
        { id: "indicators", label: "Quality Indicators", icon: "📈", flag: "indicators" },
        { id: "iqc", label: "IQC Control Stats", icon: "🧪", flag: "iqc" },
        { id: "eqas", label: "EQAS SDI / Z-Scores", icon: "📉", flag: "eqas" }
      ]
    },
    {
      section: "Risk & Corrective Actions",
      items: [
        { id: "ncr", label: "NCR Pareto & Clauses", icon: "⚠️", flag: "ncr" },
        { id: "capa", label: "CAPA Effectiveness", icon: "🔧", flag: "capa" },
        { id: "risk", label: "Risk Matrix Heatmap", icon: "⚡", flag: "risk" }
      ]
    },
    {
      section: "Audits & Performance",
      items: [
        { id: "audits", label: "Audit Findings Analytics", icon: "🔍", flag: "audits" },
        { id: "complaints", label: "Complaint Trends", icon: "💬", flag: "complaints" },
        { id: "incidents", label: "Incident near-misses", icon: "🚨", flag: "incidents" }
      ]
    },
    {
      section: "Resources & Assets",
      items: [
        { id: "equipment", label: "Equipment Uptime logs", icon: "⚙️", flag: "equipment" },
        { id: "training", label: "Competency Matrix", icon: "🎓", flag: "training" },
        { id: "suppliers", label: "Supplier evaluations", icon: "🚚", flag: "suppliers" },
        { id: "documents", label: "SOP Revision cycles", icon: "📚", flag: "documents" }
      ]
    },
    {
      section: "Intelligence & Strategy",
      items: [
        { id: "mr", label: "Auto-Management Review", icon: "🗂️", flag: "mr" },
        { id: "predictive", label: "Predictive Analytics", icon: "🔮", flag: "predictive" },
        { id: "reports", label: "ISO & NABL Report Gen", icon: "📝", flag: "reports" }
      ]
    }
  ];

  const renderContent = () => {
    if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading Quality Analytics configurations...</div>;
    
    switch (tab) {
      case "exec_dashboard": return <ExecutiveDashboard setTab={setTab} />;
      case "indicators": return <QualityIndicatorDashboard />;
      case "iqc": return <IQCDashboard />;
      case "eqas": return <EQASDashboard />;
      case "ncr": return <NCRDashboard />;
      case "capa": return <CAPADashboard />;
      case "risk": return <RiskDashboard />;
      case "audits": return <AuditDashboard />;
      case "complaints": return <ComplaintDashboard />;
      case "incidents": return <IncidentDashboard />;
      case "equipment": return <EquipmentDashboard />;
      case "training": return <CompetencyDashboard />;
      case "suppliers": return <SupplierPerformanceDashboard />;
      case "documents": return <DocumentDashboard />;
      case "mr": return <ManagementReviewDashboard />;
      case "predictive": return <RiskPrediction />;
      case "reports": return <NABLReportGenerator />;
      default: return <ExecutiveDashboard setTab={setTab} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", background: "#F8FAFC" }}>
      {/* Side sub-navigation */}
      <div style={{ width: 250, background: "#0F172A", color: "#94A3B8", borderRight: "1px solid #1E293B", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <strong style={{ color: "#FFF", fontSize: 14, display: "block" }}>Quality Intelligence</strong>
          <span style={{ fontSize: 10, color: "#64748B" }}>ISO 15189:2022 Analytics</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {menu.map(section => {
            const allowedItems = section.items.filter(item => !item.flag || analyticsFlags[item.flag] !== false);
            if (allowedItems.length === 0) return null;
            return (
              <div key={section.section}>
                <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px", marginBottom: 6 }}>{section.section}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {allowedItems.map(item => {
                    const active = tab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          background: active ? "#0D9488" : "transparent",
                          color: active ? "#FFF" : "#94A3B8",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s",
                          outline: "none"
                        }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Viewport content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}