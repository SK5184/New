// AuthContext.jsx
// MBL QMS — Central authentication context
// On login: verifies email against Firestore users collection,
// loads department, role, and computes module permissions.
// All components read from useAuth() instead of localStorage.

import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

// ─── Permission map ───────────────────────────────────────────────────────────
// Defines which modules each role can access.
// "view" = read only, "edit" = read + write, "manage" = full control
// ERP Admin always gets everything regardless of this map.

const DEPT_PERMISSIONS = {
  // ── Technical departments ──────────────────────────────────────────
  Microbiology: {
    HOD: {
      modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback"],
      canManageNCR: true, canApproveDoc: true, canViewKPI: true,
    },
    Supervisor: {
      modules: ["dashboard","iqc","equipment","documents","ncr","training","samples","reports"],
      canManageNCR: false, canApproveDoc: false, canViewKPI: false,
    },
    Staff: {
      modules: ["dashboard","iqc","samples","reports","documents"],
      canManageNCR: false, canApproveDoc: false, canViewKPI: false,
    },
  },
  Serology: {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","ncr","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Histopathology & Cytopathology": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Flow Cytometry": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  Cytogenetics: {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  Biochemistry: {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  Haematology: {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Clinical Pathology": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Molecular Biology": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Molecular Genetics": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },

  // ── Non-technical departments ──────────────────────────────────────
  Quality: {
    "Quality Manager": {
      modules: ["dashboard","kpi","documents","ncr","audit","risk","mrm","feedback","complaints","training","amendment","suppliers","reports","iqc","equipment"],
      canManageNCR:true, canApproveDoc:true, canViewKPI:true, canManageAudit:true,
    },
    "Quality Executive": {
      modules: ["dashboard","kpi","documents","ncr","feedback","complaints","reports","iqc"],
      canManageNCR:false, canApproveDoc:false, canViewKPI:true,
    },
  },
  "Human Resource": {
    HRM: {
      modules: ["dashboard","training","users","documents","amendment"],
      canManageUsers:true,
    },
    HRE: {
      modules: ["dashboard","training","documents"],
    },
  },
  "Biomedical Engineering": {
    BME: {
      modules: ["dashboard","equipment","documents","ncr","amendment"],
      canManageEquipment:true,
    },
  },
  Purchase: {
    "Purchase Manager": { modules: ["dashboard","suppliers","documents","amendment"] },
    "Purchase User":    { modules: ["dashboard","suppliers","documents"] },
  },
  Maintenance: {
    Manager: { modules: ["dashboard","equipment","documents","ncr"] },
  },
  Housekeeping: {
    "HK Incharge": { modules: ["dashboard","documents","ncr","biosafety"] },
    "HK Staff":    { modules: ["dashboard","documents","biosafety"] },
  },
  "Information Technology": {
    "IT Manager":    { modules: ["dashboard","users","documents","amendment","audit"], canManageUsers:true },
    "IT Executive":  { modules: ["dashboard","documents"] },
  },
  Kitchen: {
    "Kitchen Incharge": { modules: ["dashboard","documents","ncr"] },
    "Kitchen Staff":    { modules: ["dashboard","documents"] },
  },
  Security: {
    "Security Incharge": { modules: ["dashboard","documents","ncr"] },
    Staff:               { modules: ["dashboard","documents"] },
  },

  // ── Customer interactive ───────────────────────────────────────────
  Collection: {
    Incharge:     { modules: ["dashboard","samples","ncr","documents","feedback","training"] },
    Phlebotomist: { modules: ["dashboard","samples","documents"] },
  },
  "Front Office": {
    Incharge: { modules: ["dashboard","samples","feedback","complaints","documents","ncr"] },
    Staff:    { modules: ["dashboard","samples","feedback","complaints"] },
  },
  "Back Office": {
    Incharge: { modules: ["dashboard","samples","documents","amendment","complaints"] },
    Staff:    { modules: ["dashboard","samples","complaints"] },
  },
  "Sample Collection Centre": {
    Incharge: { modules: ["dashboard","samples","ncr","documents","feedback"] },
    Staff:    { modules: ["dashboard","samples"] },
  },
  "Call Centre": {
    Incharge: { modules: ["dashboard","complaints","feedback","documents"] },
    Staff:    { modules: ["dashboard","complaints","feedback"] },
  },

  // ── Control departments ────────────────────────────────────────────
  Accounts: {
    Incharge: { modules: ["dashboard","documents","amendment"] },
  },
  Administration: {
    "Managing Director": {
      modules: ["dashboard","kpi","mrm","documents","ncr","audit","training","feedback","complaints","reports","equipment","users","amendment"],
      canViewKPI:true, canManageNCR:true, canApproveDoc:true, canManageAudit:true,
    },
    "Deputy Director": {
      modules: ["dashboard","kpi","mrm","documents","ncr","audit","training","feedback","complaints","reports"],
      canViewKPI:true,
    },
  },
  Design: {
    Incharge: { modules: ["dashboard","documents"] },
  },
  Marketing: {
    Manager:           { modules: ["dashboard","feedback","complaints","documents","amendment"] },
    "Assistant Manager": { modules: ["dashboard","feedback","complaints","documents"] },
    Executive:         { modules: ["dashboard","feedback","complaints"] },
  },

  // ── ERP Administration — MASTER CONTROL ───────────────────────────
  "ERP Administration": {
    Admin: {
      modules: ["dashboard","kpi","equipment","documents","ncr","audit","mrm","samples","iqc",
                "reports","training","feedback","complaints","users","amendment","biosafety",
                "suppliers","masterdata","accesscontrol","aiassistant"  ],
      isSuperAdmin: true, canManageUsers:true, canApproveDoc:true,
      canManageNCR:true, canManageAudit:true, canViewKPI:true,
      canManageEquipment:true, canManageMasterData:true, canManageAccess:true,
    },
    "Assistant Admin": {
      modules: ["dashboard","kpi","equipment","documents","ncr","training","users","amendment",
                "masterdata","accesscontrol",  "aiassistant"],
      canManageUsers:true, canManageMasterData:true, canManageAccess:false,
    },
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [authError, setAuthError]     = useState("");

  // Lookup Firestore user record by email
  const fetchProfile = async (email) => {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("email", "==", email))
      );
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      console.error("Profile fetch error:", e);
      return null;
    }
  };

  // Build permissions from dept + role
  const buildPermissions = (dept, role) => {
    // ERP Admin always gets master control
    if (dept === "ERP Administration") {
      return DEPT_PERMISSIONS["ERP Administration"][role] ||
             DEPT_PERMISSIONS["ERP Administration"]["Admin"];
    }
    const deptPerms = DEPT_PERMISSIONS[dept];
    if (!deptPerms) return { modules: ["dashboard"] };
    return deptPerms[role] || { modules: ["dashboard"] };
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Try Firestore first
        const firestoreProfile = await fetchProfile(firebaseUser.email);
        if (firestoreProfile) {
          const perms = buildPermissions(firestoreProfile.department, firestoreProfile.role);
          setProfile(firestoreProfile);
          setPermissions(perms);
        } else {
          // Fall back to localStorage (set during login)
          const saved = localStorage.getItem("qms_profile");
          if (saved) {
            const p = JSON.parse(saved);
            const perms = buildPermissions(p.department, p.roleLabel || p.role);
            setProfile(p);
            setPermissions(perms);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
        setPermissions(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("qms_profile");
    setUser(null);
    setProfile(null);
    setPermissions(null);
  };

  const canAccess = (moduleKey) => {
    if (moduleKey === "aiassistant") return true;
    if (moduleKey === "workhandover" || moduleKey === "reagentcalibration") return true;
    if (moduleKey === "eqa" && canAccess("iqc")) return true;
    if (!permissions) return false;
    if (permissions.isSuperAdmin) return true;
    return permissions.modules?.includes(moduleKey) || false;
  };

  const hasPermission = (perm) => {
    if (!permissions) return false;
    if (permissions.isSuperAdmin) return true;
    return permissions[perm] === true;
  };

  return (
    <AuthContext.Provider value={{
      user, profile, permissions,
      loading, authError, setAuthError,
      logout, canAccess, hasPermission,
      isERPAdmin: profile?.department === "ERP Administration",
      isSuperAdmin: permissions?.isSuperAdmin === true,
      dept: profile?.department || "",
      role: profile?.role || profile?.roleLabel || "",
      name: profile?.fullName || profile?.name || user?.email || "",
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export { DEPT_PERMISSIONS };
