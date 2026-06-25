// AppRoutes.jsx
// MBL QMS — Complete routing connecting every file in src/
// React Router v6 · AuthContext · ProtectedRoute
// All 30 department dashboards + all module pages connected

import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Sidebar from "../components/Sidebar";
import AIAssistant from "../pages/AIAssistant";
import FloatingAIButton from "../components/ai/FloatingAIButton";
// ── Core pages ────────────────────────────────────────────────────────────────
import LandingPage   from "../pages/LandingPage";
import LoginPage     from "../pages/LoginPage";
import HomePage      from "../pages/HomePage";
import ComingSoon    from "../pages/ComingSoon";
import Dashboard     from "../pages/Dashboard";

// ── Admin pages ───────────────────────────────────────────────────────────────
import MasterControl   from "../pages/MasterControl";
import UserManagement  from "../pages/UserManagement";
import DepartmentMaster from "../pages/DepartmentMaster";
import DirectorReview  from "../pages/DirectorReview";
import TestMaster      from "../pages/TestMaster";


// ── Quality management ────────────────────────────────────────────────────────

import QualityKPIView from "../pages/departments/Quality/QualityKPIView";
import DocumentControl from "../pages/DocumentControl/DocumentList";
import NCR from "../pages/NonConformity/NCRList";
import CAPA from "../pages/CAPA/CAPAList";
import Audit from "../pages/departments/Quality/Audit";
import RiskManagement from "../pages/departments/Quality/RiskManagement";
import RiskRegister from "../pages/departments/Quality/RiskRegister";
import Complaint from "../pages/departments/Quality/Complaint";
import ChangeControl from "../pages/departments/Quality/ChangeControl";
import ManagementReview from "../pages/departments/Quality/ManagementReview";
import CorrectedReports from "../pages/departments/Quality/CorrectedReports";
import Feedback from "../pages/departments/Quality/Feedback";
import IQC from "../pages/departments/Quality/IQC";
import EQA from "../pages/departments/Quality/EQA";
import Training from "../pages/departments/Quality/Training";
import Meetings from "../pages/departments/Quality/Meetings";
import Planning from "../pages/Planning/Planning";
import QualityAnalyticsRoutes from "../modules/qualityAnalytics/routes/QualityAnalyticsRoutes";
// ── Laboratory ────────────────────────────────────────────────────────────────

import Temperature from "../pages/Temperature";
import Inventory   from "../pages/Inventory";

// ── Equipment ─────────────────────────────────────────────────────────────────
import BiomedicalEngineering from "../pages/departments/biomedical/BiomedicalEngineering";
import BreakdownWorkflow     from "../pages/BreakdownWorkflow";
import EquipmentLogPage      from "../pages/EquipmentLog";
// Deprecated KPIDashboard removed
import EquipmentLog          from "../components/EquipmentLog";

// ── People ────────────────────────────────────────────────────────────────────

import Personnel from "../pages/Personnel";
import Vendors   from "../pages/Vendors";
import Biosafety from "../pages/Biosafety";


// ── ISO 27001 ─────────────────────────────────────────────────────────────────
import AccessLog       from "../pages/AccessLog";
import AssetRegister   from "../pages/AssetRegister";
import IncidentResponse from "../pages/IncidentResponse";


// ── Department dashboards — all 30 ───────────────────────────────────────────
import MicrobiologyDashboard           from "../pages/departments/Microbiology/MicrobiologyDashboard";
import SerologyDashboard               from "../pages/departments/serology/SerologyDashboard";
import HistopathologyCytopathologyDashboard from "../pages/departments/histopathology/HistopathologyCytopathologyDashboard";
import FlowCytometryDashboard          from "../pages/departments/flowcytometry/FlowCytometryDashboard";
import CytogeneticsDashboard           from "../pages/departments/cytogenetics/CytogeneticsDashboard";
import BiochemistryDashboard           from "../pages/departments/biochemistry/BiochemistryDashboard";
import HaematologyDashboard            from "../pages/departments/haematology/HaematologyDashboard";
import ClinicalPathologyDashboard      from "../pages/departments/clinicalpathology/ClinicalPathologyDashboard";
import MolecularBiologyDashboard       from "../pages/departments/MolecularBiologyDashboard";
import MolecularGeneticsDashboard      from "../pages/departments/MolecularGeneticsDashboard";
import QualityDashboard                from "../pages/departments/Quality/QualityDashboard";
import HumanResourceDashboard          from "../pages/departments/hr/HumanResourceDashboard";
// BiomedicalDashboard imported from unified module folder below
import PurchaseDashboard               from "../pages/departments/PurchaseDashboard";
import MaintenanceDashboard            from "../pages/departments/maintenance/MaintenanceDashboard";
import HouseKeepingDashboard           from "../pages/departments/housekeeping/HouseKeepingDashboard";
import InformationTechnologyDashboard  from "../pages/departments/it/InformationTechnologyDashboard";
import KitchenDashboard                from "../pages/departments/KitchenDashboard";
import SecurityDashboard               from "../pages/departments/SecurityDashboard";
import PhlebotomyDashboard             from "../pages/departments/phlebotomy/PhlebotomyDashboard";
import ReceptionDashboard              from "../pages/departments/reception/ReceptionDashboard";
import BackOfficeDashboard             from "../pages/departments/backoffice/BackOfficeDashboard";
import SampleCollectionCenterDashboard from "../pages/departments/samplecollection/SampleCollectionCenterDashboard";
import TelecallingDashboard            from "../pages/departments/TelecallingDashboard";
import AccountsDashboard               from "../pages/departments/accounts/AccountsDashboard";
import AdministrationDashboard         from "../pages/departments/administration/AdministrationDashboard";
import DesignDashboard                 from "../pages/departments/DesignDashboard";
import MarketingDashboard              from "../pages/departments/MarketingDashboard";
import ERPDashboard                    from "../pages/departments/ERPDashboard";
import CollectionDashboard             from "../pages/departments/CollectionDashboard";





// ─── App shell ────────────────────────────────────────────────────────────────

function AppShell({ children }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { name, dept, role, logout, canAccess } = useAuth();

  // Map URL path to sidebar active key
  const pathKey = () => {
    const p = location.pathname;
    if (p.startsWith("/analytics")) return "analytics";
    const map = {
      "/dashboard":                 "dashboard",
      "/kpi":                       "kpi",
      "/documents":                 "documents",
      "/ncr":                       "ncr",
      "/capa":                      "capa",
      "/audit":                     "audit",
      "/risk":                      "risk",
      "/riskregister":              "risk",
      "/changecontrol":             "changecontrol",
      "/mrm":                       "mrm",
      "/correctedreports":          "correctedreports",
      "/complaints":                "complaints",
      "/iqc":                       "iqc",
      "/eqa":                       "eqa",
      "/samples":                   "samples",
      "/temperature":               "temperature",
      "/inventory":                 "inventory",
      "/collection":                "collection",
      "/reports":                   "reports",
      "/equipment":                 "equipment",
      "/breakdown":                 "breakdown",
      "/equipmentlog":              "equipmentlog",
      "/training":                  "training",
      "/personnel":                 "personnel",
      "/feedback":                  "feedback",
      "/meetings":                  "meetings",
      "/vendors":                   "vendors",
      "/users":                     "users",
      "/amendment":                 "amendment",
      "/biosafety":                 "biosafety",
      "/suppliers":                 "suppliers",
      "/masterdata":                "masterdata",
      "/accesscontrol":             "accesscontrol",
      "/departmentmaster":          "masterdata",
      "/directorview":              "mrm",
      "/qualitykpi":                "kpi",
      "/assets":                    "assets",
      "/infosec":                   "infosec",
      "/secincidents":              "secincidents",
      "/accesslog":                 "accesslog",
      "/help":                      "help",
      "/ai-assistant":              "aiassistant",
      "/test-master":               "testmaster",
    };
    // Department routes
    if (p.startsWith("/dept/")) {
      const key = p.replace("/dept/", "").toLowerCase();
      return key;
    }
    return map[p] || "dashboard";
  };

  // Map sidebar key to URL path
  const keyToPath = (key) => {
    const map = {
      dashboard:        "/dashboard",
      kpi:              "/kpi",
      analytics:        "/analytics",
      documents:        "/documents",
      ncr:              "/ncr",
      capa:             "/capa",
      audit:            "/audit",
      risk:             "/risk",
      changecontrol:    "/changecontrol",
      mrm:              "/mrm",
      correctedreports: "/correctedreports",
      complaints:       "/complaints",
      planning:         "/planning",
      iqc:              "/iqc",
      eqa:              "/eqa",
      samples:          "/samples",
      temperature:      "/temperature",
      inventory:        "/inventory",
      collection:       "/dept/collection",
      reports:          "/reports",
      equipment:        "/equipment",
      breakdown:        "/breakdown",
      equipmentlog:     "/equipmentlog",
      training:         "/training",
      personnel:        "/personnel",
      feedback:         "/feedback",
      meetings:         "/meetings",
      vendors:          "/vendors",
      users:            "/users",
      amendment:        "/amendment",
      biosafety:        "/biosafety",
      suppliers:        "/suppliers",
      masterdata:       "/masterdata",
      accesscontrol:    "/accesscontrol",
      assets:           "/assets",
      infosec:          "/infosec",
      secincidents:     "/secincidents",
      accesslog:        "/accesslog",
      help:             "/help",
      aiassistant:      "/ai-assistant",
      testmaster:       "/test-master",
      // departments
      microbiology:     "/dept/microbiology",
      serology:         "/dept/serology",
      histopathology:   "/dept/histopathology",
      flowcytometry:    "/dept/flowcytometry",
      cytogenetics:     "/dept/cytogenetics",
      biochemistry:     "/dept/biochemistry",
      haematology:      "/dept/haematology",
      clinicalpathology:"/dept/clinicalpathology",
      molecularbiology: "/dept/molecularbiology",
      moleculargenetics:"/dept/moleculargenetics",
      quality:          "/dept/quality",
      hr:               "/dept/hr",
      biomedical:       "/dept/biomedical",
      purchase:         "/dept/purchase",
      maintenance:      "/dept/maintenance",
      housekeeping:     "/dept/housekeeping",
      it:               "/dept/it",
      kitchen:          "/dept/kitchen",
      security:         "/dept/security",
      phlebotomy:       "/dept/phlebotomy",
      reception:        "/dept/reception",
      backoffice:       "/dept/backoffice",
      samplecollection: "/dept/samplecollection",
      telecalling:      "/dept/telecalling",
      accounts:         "/dept/accounts",
      administration:   "/dept/administration",
      design:           "/dept/design",
      marketing:        "/dept/marketing",
      erpadmin:         "/dept/erpadmin",
    };
    return map[key] || "/dashboard";
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        activePage={pathKey()}
        setActivePage={(key) => navigate(keyToPath(key))}
        userRole={role}
        userName={name}
        userDept={dept}
        onSignOut={logout}
      />
      <div style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
      <FloatingAIButton />
    </div>
  );
}

// ─── Protected page wrapper ───────────────────────────────────────────────────

function P({ module, children }) {
  return (
    <ProtectedRoute module={module}>
      {children}
    </ProtectedRoute>
  );
}

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0A0F0D",
      fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "2px solid #1D3D2F", borderTopColor: "#1D9E75",
          animation: "spin 0.8s linear infinite",
          margin: "0 auto 14px",
        }} />
        <div style={{ fontSize: 13, color: "#5DCAA5" }}>Loading MBL QMS…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Department route helper ──────────────────────────────────────────────────

function DeptRoute({ module, element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <P module={module}>{element}</P>
    </AppShell>
  );
}

// ─── Main AppRoutes ───────────────────────────────────────────────────────────

export default function AppRoutes() {
  const { user, loading, name, dept, role } = useAuth();
  const navigate = useNavigate();
  const authProps = { role, userName: name, dept };

  if (loading) return <LoadingScreen />;

  // Guard — redirect to login if not authenticated
  function Guard({ module, element }) {
    if (!user) return <Navigate to="/login" replace />;
    return (
      <AppShell>
        <P module={module}>
          {element}
        </P>
      </AppShell>
    );
  }

  return (
    <Routes>

      {/* ── Public ──────────────────────────────────────── */}
      <Route path="/"
        element={user
          ? <Navigate to="/dashboard" replace />
          : <LandingPage onEnter={() => window.location.href = "/login"} />}
      />
      <Route path="/login"
        element={user
          ? <Navigate to="/dashboard" replace />
          : <LoginPage
              onSuccess={() => window.location.href = "/dashboard"}
              onBack={() => window.location.href = "/"}
            />}
      />

      {/* ── Dashboard ───────────────────────────────────── */}
      <Route path="/dashboard"
        element={<Guard module="dashboard" element={<HomePage {...authProps} setActivePage={(k) => navigate(`/${k}`)} />} />}
      />
      <Route path="/ai-assistant"
        element={<Guard module="dashboard"
        element={<AIAssistant {...authProps} />} />}
/>

      {/* ── Quality management ──────────────────────────── */}
      <Route path="/kpi"           element={<Guard module="kpi"           element={<QualityKPIView {...authProps} />} />} />
      <Route path="/analytics/*"   element={<Guard module="analytics"     element={<QualityAnalyticsRoutes {...authProps} />} />} />
      <Route path="/documents"     element={<Guard module="documents"     element={<DocumentControl {...authProps} />} />} />
      <Route path="/ncr"           element={<Guard module="ncr"           element={<NCR {...authProps} />} />} />
      <Route path="/capa"          element={<Guard module="capa"          element={<CAPA {...authProps} />} />} />
      <Route path="/audit"         element={<Guard module="audit"         element={<Audit {...authProps} />} />} />
      <Route path="/risk"          element={<Guard module="risk"          element={<RiskManagement {...authProps} />} />} />
      <Route path="/riskregister"  element={<Guard module="risk"          element={<RiskRegister {...authProps} />} />} />
      <Route path="/changecontrol" element={<Guard module="changecontrol" element={<ChangeControl {...authProps} />} />} />
      <Route path="/mrm"           element={<Guard module="mrm"           element={<ManagementReview {...authProps} />} />} />
      <Route path="/correctedreports" element={<Guard module="correctedreports" element={<CorrectedReports {...authProps} />} />} />
      <Route path="/complaints"    element={<Guard module="complaints"    element={<Complaint {...authProps} />} />} />
      <Route path="/qualitykpi"    element={<Guard module="kpi"           element={<QualityKPIView {...authProps} />} />} />
      <Route path="/directorview"  element={<Guard module="mrm"           element={<DirectorReview {...authProps} />} />} />
      <Route path="/planning"      element={<Guard module="planning"      element={<Planning {...authProps} />} />} />
          
           
      {/* ── Laboratory ──────────────────────────────────── */}
      <Route path="/iqc"         element={<Guard module="iqc"         element={<IQC {...authProps} />} />} />
      <Route path="/eqa"         element={<Guard module="eqa"         element={<EQA {...authProps} />} />} />
      <Route path="/samples"     element={<Guard module="samples"     element={<ComingSoon pageName="Sample Management" icon="🧪" clause="ISO 15189:2022 §7.2" />} />} />
      <Route path="/temperature" element={<Guard module="temperature" element={<Temperature {...authProps} />} />} />
      <Route path="/inventory"   element={<Guard module="inventory"   element={<Inventory {...authProps} />} />} />
      <Route path="/collection"  element={<Guard module="collection"  element={<ComingSoon pageName="Collection Centres" icon="🏥" clause="ISO 15189:2022 §7.2" />} />} />
      <Route path="/reports"     element={<Guard module="reports"     element={<ComingSoon pageName="Report Errors" icon="📝" clause="KPI 7.5.8" />} />} />

      {/* ── Equipment ───────────────────────────────────── */}
      <Route path="/equipment"   element={<Guard module="equipment"   element={<BiomedicalEngineering {...authProps} />} />} />
      <Route path="/breakdown"   element={<Guard module="breakdown"   element={<BreakdownWorkflow {...authProps} />} />} />
      <Route path="/equipmentlog"element={<Guard module="equipmentlog"element={<EquipmentLog {...authProps} />} />} />

      {/* ── Test Master ────────────────────────────────── */}
      <Route path="/test-master"     element={<Guard module="testmaster"      element={<TestMaster {...authProps} />} />} />

      {/* ── People ──────────────────────────────────────── */}
      <Route path="/training"    element={<Guard module="training"    element={<Training {...authProps} />} />} />
      <Route path="/personnel"   element={<Guard module="personnel"   element={<Personnel {...authProps} />} />} />
      <Route path="/feedback"    element={<Guard module="feedback"    element={<Feedback {...authProps} />} />} />
      <Route path="/meetings"    element={<Guard module="meetings"    element={<Meetings {...authProps} />} />} />
      <Route path="/vendors"     element={<Guard module="vendors"     element={<Vendors {...authProps} />} />} />

      {/* ── Administration ──────────────────────────────── */}
      <Route path="/users"           element={<Guard module="users"           element={<UserManagement {...authProps} />} />} />
      <Route path="/masterdata"      element={<Guard module="masterdata"      element={<MasterControl {...authProps} />} />} />
      <Route path="/accesscontrol"   element={<Guard module="accesscontrol"   element={<MasterControl {...authProps} />} />} />
      <Route path="/departmentmaster"element={<Guard module="masterdata"      element={<DepartmentMaster {...authProps} />} />} />
      <Route path="/amendment"       element={<Guard module="amendment"       element={<ComingSoon pageName="Record Amendments" icon="✏" clause="ISO 15189:2022 §8.4.2" />} />} />
      <Route path="/biosafety"       element={<Guard module="biosafety"       element={<Biosafety {...authProps} />} />} />
      <Route path="/suppliers"       element={<Guard module="suppliers"       element={<ComingSoon pageName="Supplier Register" icon="🚚" clause="ISO 15189:2022 §5.5" />} />} />

      {/* ── ISO 27001 ────────────────────────────────────── */}
      <Route path="/assets"      element={<Guard module="assets"      element={<AssetRegister {...authProps} />} />} />
      <Route path="/infosec"     element={<Guard module="infosec"     element={<ComingSoon pageName="Info Sec Policy" icon="🔒" clause="ISO 27001 A.5" />} />} />
      <Route path="/secincidents"element={<Guard module="secincidents"element={<IncidentResponse {...authProps} />} />} />
      <Route path="/accesslog"   element={<Guard module="accesslog"   element={<AccessLog {...authProps} />} />} />
      <Route path="/dataretention"element={<Guard module="dataretention"element={<ComingSoon pageName="Data Retention" icon="🗃" clause="ISO 27001 A.18.1" />} />} />
      <Route path="/help"        element={<Guard module="help"        element={<ComingSoon pageName="Help & Documentation" icon="❓" clause="MBL QMS user guide" />} />} />

      {/* ── Department dashboards — all 30 ─────────────── */}
      <Route path="/dept/microbiology"        element={<DeptRoute module="microbiology"        element={<MicrobiologyDashboard {...authProps} />} />} />
      <Route path="/dept/serology"            element={<DeptRoute module="serology"            element={<SerologyDashboard {...authProps} />} />} />
      <Route path="/dept/histopathology"      element={<DeptRoute module="histopathology"      element={<HistopathologyCytopathologyDashboard {...authProps} />} />} />
      <Route path="/dept/flowcytometry"       element={<DeptRoute module="flowcytometry"       element={<FlowCytometryDashboard {...authProps} />} />} />
      <Route path="/dept/cytogenetics"        element={<DeptRoute module="cytogenetics"        element={<CytogeneticsDashboard {...authProps} />} />} />
      <Route path="/dept/biochemistry"        element={<DeptRoute module="biochemistry"        element={<BiochemistryDashboard {...authProps} />} />} />
      <Route path="/dept/haematology"         element={<DeptRoute module="haematology"         element={<HaematologyDashboard {...authProps} />} />} />
      <Route path="/dept/clinicalpathology"   element={<DeptRoute module="clinicalpathology"   element={<ClinicalPathologyDashboard {...authProps} />} />} />
      <Route path="/dept/molecularbiology"    element={<DeptRoute module="molecularbiology"    element={<MolecularBiologyDashboard {...authProps} />} />} />
      <Route path="/dept/moleculargenetics"   element={<DeptRoute module="moleculargenetics"   element={<MolecularGeneticsDashboard {...authProps} />} />} />
      <Route path="/dept/quality"             element={<DeptRoute module="quality"             element={<QualityDashboard {...authProps} />} />} />
      <Route path="/dept/hr"                  element={<DeptRoute module="hr"                  element={<HumanResourceDashboard {...authProps} />} />} />
      <Route path="/dept/biomedical"          element={<DeptRoute module="biomedical"          element={<BiomedicalEngineering {...authProps} />} />} />
      <Route path="/dept/purchase"            element={<DeptRoute module="purchase"            element={<PurchaseDashboard {...authProps} />} />} />
      <Route path="/dept/maintenance"         element={<DeptRoute module="maintenance"         element={<MaintenanceDashboard {...authProps} />} />} />
      <Route path="/dept/housekeeping"        element={<DeptRoute module="housekeeping"        element={<HouseKeepingDashboard {...authProps} />} />} />
      <Route path="/dept/it"                  element={<DeptRoute module="it"                  element={<InformationTechnologyDashboard {...authProps} />} />} />
      <Route path="/dept/kitchen"             element={<DeptRoute module="kitchen"             element={<KitchenDashboard {...authProps} />} />} />
      <Route path="/dept/security"            element={<DeptRoute module="security"            element={<SecurityDashboard {...authProps} />} />} />
      <Route path="/dept/phlebotomy"          element={<DeptRoute module="phlebotomy"          element={<PhlebotomyDashboard {...authProps} />} />} />
      <Route path="/dept/reception"           element={<DeptRoute module="reception"           element={<ReceptionDashboard {...authProps} />} />} />
      <Route path="/dept/backoffice"          element={<DeptRoute module="backoffice"          element={<BackOfficeDashboard {...authProps} />} />} />
      <Route path="/dept/samplecollection"    element={<DeptRoute module="samplecollection"    element={<SampleCollectionCenterDashboard {...authProps} />} />} />
      <Route path="/dept/telecalling"         element={<DeptRoute module="telecalling"         element={<TelecallingDashboard {...authProps} />} />} />
      <Route path="/dept/accounts"            element={<DeptRoute module="accounts"            element={<AccountsDashboard {...authProps} />} />} />
      <Route path="/dept/administration"      element={<DeptRoute module="administration"      element={<AdministrationDashboard {...authProps} />} />} />
      <Route path="/dept/design"              element={<DeptRoute module="design"              element={<DesignDashboard {...authProps} />} />} />
      <Route path="/dept/marketing"           element={<DeptRoute module="marketing"           element={<MarketingDashboard {...authProps} />} />} />
      <Route path="/dept/erpadmin"            element={<DeptRoute module="erpadmin"            element={<ERPDashboard {...authProps} />} />} />
      <Route path="/dept/collection"          element={<DeptRoute module="collection"          element={<CollectionDashboard {...authProps} />} />} />

      {/* ── 404 ─────────────────────────────────────────── */}
      <Route path="*"
        element={
          user ? (
            <AppShell>
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"center",
                minHeight:"80vh", fontFamily:"'Inter',system-ui,sans-serif",
              }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ fontSize:48, fontWeight:600, color:"#D3D1C7" }}>404</div>
                  <div style={{ fontSize:16, fontWeight:500, color:"#2C2C2A", marginTop:8 }}>
                    Page not found
                  </div>
                  <div style={{ fontSize:13, color:"#888780", marginTop:6 }}>
                    This route does not exist in MBL QMS.
                  </div>
                  <button onClick={() => window.location.href = "/dashboard"}
                    style={{
                      marginTop:20, padding:"8px 20px",
                      background:"#0F6E56", color:"#fff",
                      border:"none", borderRadius:8,
                      fontSize:13, cursor:"pointer",
                    }}>
                    Go to dashboard
                  </button>
                </div>
              </div>
            </AppShell>
          ) : <Navigate to="/login" replace />
        }
      />

    </Routes>
  );
}
