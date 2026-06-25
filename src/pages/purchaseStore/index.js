import React, { useState } from "react";
import PurchaseStoreDashboard from "./dashboard/PurchaseStoreDashboard";
import PurchaseRequestPage from "./procurement/PurchaseRequestPage";
import PurchaseOrderPage from "./procurement/PurchaseOrderPage";
import DeliveryChallanPage from "./procurement/DeliveryChallanPage";
import OrderCancellationPage from "./procurement/OrderCancellationPage";
import SuppliersRegister from "./suppliers/SuppliersRegister";
import SupplierEvaluation from "./suppliers/SupplierEvaluation";
import SupplierCommunication from "./suppliers/SupplierCommunication";
import MaterialSpecifications from "./materials/MaterialSpecifications";
import MaterialAcceptance from "./materials/MaterialAcceptance";
import MaterialRejection from "./materials/MaterialRejection";
import StockRegister from "./inventory/StockRegister";
import ReagentRegister from "./inventory/ReagentRegister";
import ConsumableRegister from "./inventory/ConsumableRegister";
import MaterialOutward from "./inventory/MaterialOutward";
import ExternalServices from "./equipmentServices/ExternalServices";
import AdverseIncidents from "./quality/AdverseIncidents";
import InternalAudit from "./quality/InternalAudit";
import TemperatureLogs from "./environment/TemperatureLogs";
import TrainingRecords from "./training/TrainingRecords";
import CompetencyAssessment from "./training/CompetencyAssessment";
import SOPRegister from "./documents/SOPRegister";
import PurchasePlanning from "./planning/PurchasePlanning";
import PurchaseStoreReports from "./reports/PurchaseStoreReports";

export default function PurchaseStoreIndex() {
  const [tab, setTab] = useState("dashboard");

  const renderContent = () => {
    switch (tab) {
      case "dashboard": return <PurchaseStoreDashboard setTab={setTab} />;
      case "prs": return <PurchaseRequestPage />;
      case "pos": return <PurchaseOrderPage />;
      case "dcs": return <DeliveryChallanPage />;
      case "cancellation": return <OrderCancellationPage />;
      case "suppliers": return <SuppliersRegister />;
      case "evaluation": return <SupplierEvaluation />;
      case "communications": return <SupplierCommunication />;
      case "specs": return <MaterialSpecifications />;
      case "acceptance": return <MaterialAcceptance />;
      case "rejection": return <MaterialRejection />;
      case "stock": return <StockRegister />;
      case "reagents": return <ReagentRegister />;
      case "consumables": return <ConsumableRegister />;
      case "outward": return <MaterialOutward />;
      case "services": return <ExternalServices />;
      case "incidents": return <AdverseIncidents />;
      case "audits": return <InternalAudit />;
      case "temperature": return <TemperatureLogs />;
      case "training": return <TrainingRecords />;
      case "competency": return <CompetencyAssessment />;
      case "sop": return <SOPRegister />;
      case "planning": return <PurchasePlanning />;
      case "reports": return <PurchaseStoreReports />;
      default: return <PurchaseStoreDashboard setTab={setTab} />;
    }
  };

  const menu = [
    { section: "Main", items: [{ id: "dashboard", label: "Dashboard", icon: "📊" }] },
    {
      section: "Procurement",
      items: [
        { id: "prs", label: "Requisitions (PR)", icon: "📋" },
        { id: "pos", label: "Purchase Orders (PO)", icon: "📄" },
        { id: "dcs", label: "Delivery Challans (DC)", icon: "🚚" },
        { id: "cancellation", label: "Cancellations & Risks", icon: "❌" }
      ]
    },
    {
      section: "Suppliers & Materials",
      items: [
        { id: "suppliers", label: "Approved Suppliers", icon: "🤝" },
        { id: "evaluation", label: "Performance Evaluation", icon: "⭐" },
        { id: "communications", label: "Correspondence Log", icon: "✉️" },
        { id: "specs", label: "Specifications Standard", icon: "📝" },
        { id: "acceptance", label: "Checklists Acceptance", icon: "✓" },
        { id: "rejection", label: "Material Rejection", icon: "🚫" }
      ]
    },
    {
      section: "Inventory Control",
      items: [
        { id: "stock", label: "General Stock Register", icon: "📦" },
        { id: "reagents", label: "Reagents Log", icon: "🧪" },
        { id: "consumables", label: "Consumables Log", icon: "🩹" },
        { id: "outward", label: "Material Outward", icon: "📤" }
      ]
    },
    {
      section: "Calibration & Maintenance",
      items: [{ id: "services", label: "External Services Log", icon: "🔧" }]
    },
    {
      section: "Quality & Compliance",
      items: [
        { id: "incidents", label: "Adverse Events & Recall", icon: "⚠️" },
        { id: "audits", label: "Store Compliance Audits", icon: "🔍" },
        { id: "temperature", label: "Temperature Logger", icon: "🌡️" },
        { id: "sop", label: "SOP Reference Master", icon: "📚" }
      ]
    },
    {
      section: "People & Strategy",
      items: [
        { id: "training", label: "Staff Training Records", icon: "🎓" },
        { id: "competency", label: "Competency Evaluations", icon: "🎖️" },
        { id: "planning", label: "Procurement Planning", icon: "📅" },
        { id: "reports", label: "ISO Performance Reports", icon: "📈" }
      ]
    }
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif", background: "#F8FAFC" }}>
      {/* Tab Selector Sidebar */}
      <div style={{ width: 260, background: "#0F172A", color: "#94A3B8", borderRight: "1px solid #1E293B", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <strong style={{ color: "#FFF", fontSize: 15, display: "block" }}>Purchase & Store</strong>
          <span style={{ fontSize: 11, color: "#64748B" }}>ISO 15189:2022 §6.6 Module</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {menu.map(grp => (
            <div key={grp.section}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px", marginBottom: 6 }}>{grp.section}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {grp.items.map(item => {
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
                        fontSize: 12.5,
                        fontWeight: 500,
                        background: active ? "#0F6E56" : "transparent",
                        color: active ? "#FFF" : "#94A3B8",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.2s"
                      }}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Content Viewport */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}