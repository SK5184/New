// AuthContext.jsx
// MBL QMS — Central authentication context
// On login: verifies email against Firestore users collection,
// loads department, role, and computes module permissions.
// All components read from useAuth() instead of localStorage.
import { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs, doc, onSnapshot } from "firebase/firestore";
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
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback","biochemistry"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports","biochemistry"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents","biochemistry"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  Haematology: {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","feedback","haematology"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports","haematology"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","documents","haematology"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
  },
  "Clinical Pathology": {
    HOD:        { modules: ["dashboard","kpi","iqc","equipment","documents","ncr","training","samples","reports","clinicalpathology"], canManageNCR:true, canApproveDoc:true, canViewKPI:true },
    Supervisor: { modules: ["dashboard","iqc","equipment","documents","samples","reports","clinicalpathology"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
    Staff:      { modules: ["dashboard","iqc","samples","reports","clinicalpathology"], canManageNCR:false, canApproveDoc:false, canViewKPI:false },
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
      modules: ["dashboard","kpi","documents","ncr","audit","mrm","feedback","complaints","training","amendment","suppliers","reports","iqc","equipment","analytics"],
      canManageNCR:true, canApproveDoc:true, canViewKPI:true, canManageAudit:true,
    },
    "Quality Executive": {
      modules: ["dashboard","kpi","documents","ncr","feedback","complaints","reports","iqc","analytics"],
      canManageNCR:false, canApproveDoc:false, canViewKPI:true,
    },
  },
  "Human Resource": {
    HRM: {
      modules: ["dashboard","hr","training","users","documents","amendment"],
      canManageUsers:true,
    },
    HRE: {
      modules: ["dashboard","hr","training","documents"],
    },
  },
  "Biomedical Engineering": {
    BME: {
      modules: ["dashboard","equipment","documents","ncr","amendment"],
      canManageEquipment:true,
    },
  },
  Purchase: {
    "Purchase Manager": { modules: ["dashboard","suppliers","documents","amendment","purchase"] },
    "Purchase User":    { modules: ["dashboard","suppliers","documents","purchase"] },
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
    Incharge:     { modules: ["dashboard","samples","ncr","documents","feedback","training","phlebotomy","samplecollection"] },
    Phlebotomist: { modules: ["dashboard","samples","documents","phlebotomy","samplecollection"] },
  },
  "Front Office": {
    Incharge: { modules: ["dashboard","samples","feedback","complaints","documents","ncr","reception"] },
    Staff:    { modules: ["dashboard","samples","feedback","complaints","reception"] },
  },
  "Back Office": {
    Incharge: { modules: ["dashboard","samples","documents","amendment","complaints"] },
    Staff:    { modules: ["dashboard","samples","complaints"] },
  },
  "Sample Collection Centre": {
    Incharge: { modules: ["dashboard","samples","ncr","documents","feedback","samplecollection"] },
    Staff:    { modules: ["dashboard","samples","samplecollection"] },
  },
  "Call Centre": {
    Incharge: { modules: ["dashboard","complaints","feedback","documents"] },
    Staff:    { modules: ["dashboard","complaints","feedback"] },
  },

  // ── Control departments ────────────────────────────────────────────
  Accounts: {
    Incharge: { modules: ["dashboard","documents","amendment","accounts"] },
    Staff:    { modules: ["dashboard","documents","accounts"] },
  },
  Administration: {
    "Managing Director": {
      modules: ["dashboard","hr","kpi","mrm","documents","ncr","audit","training","feedback","complaints","reports","equipment","users","amendment","phlebotomy","reception","samplecollection","haematology","clinicalpathology", "testmaster", "iqc", "purchase","analytics","accounts"],
      canViewKPI:true, canManageNCR:true, canApproveDoc:true, canManageAudit:true,
    },
    "Deputy Director": {
      modules: ["dashboard","hr","kpi","mrm","documents","ncr","audit","training","feedback","complaints","reports","phlebotomy","reception","samplecollection","haematology","clinicalpathology", "testmaster", "iqc","analytics","accounts"],
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
      modules: ["dashboard","hr","kpi","equipment","documents","ncr","audit","mrm","samples","iqc",
                "reports","training","feedback","complaints","users","amendment","biosafety",
                "suppliers","masterdata","accesscontrol","phlebotomy","reception","samplecollection","haematology","clinicalpathology", "erpadmin", "testmaster", "purchase","analytics","accounts"],
      isSuperAdmin: true, canManageUsers:true, canApproveDoc:true,
      canManageNCR:true, canManageAudit:true, canViewKPI:true,
      canManageEquipment:true, canManageMasterData:true, canManageAccess:true,
    },
    "Assistant Admin": {
      modules: ["dashboard","hr","kpi","equipment","documents","ncr","training","users","amendment",
                "masterdata","accesscontrol","phlebotomy","reception","samplecollection","haematology","clinicalpathology", "erpadmin", "testmaster","accounts"],
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
  const [featureFlags, setFeatureFlags] = useState({});

  // Listen to global features status from Firestore in real-time
  useEffect(() => {
    const unsubFeatures = onSnapshot(doc(db, "appSettings", "features"), (snap) => {
      if (snap.exists()) {
        setFeatureFlags(snap.data());
      }
    }, (err) => {
      console.warn("Could not load features snapshot in AuthContext:", err);
    });
    return () => unsubFeatures();
  }, []);

  // Lookup Firestore user record by email
  const fetchProfile = async (email) => {
    if (!email) return null;
    const cleanEmail = email.trim();
    try {
      // 1. Try exact match (typically lowercase)
      let snap = await getDocs(
        query(collection(db, "users"), where("email", "==", cleanEmail))
      );
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      // 2. Try lowercase match
      snap = await getDocs(
        query(collection(db, "users"), where("email", "==", cleanEmail.toLowerCase()))
      );
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      // 3. Try capitalized first letter match (e.g. Nisha@mbl.com)
      const capitalized = cleanEmail.charAt(0).toUpperCase() + cleanEmail.slice(1).toLowerCase();
      snap = await getDocs(
        query(collection(db, "users"), where("email", "==", capitalized))
      );
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }

      // 4. Fallback client-side scan for case-insensitive match
      const allSnap = await getDocs(collection(db, "users"));
      const match = allSnap.docs.find(d => {
        const uEmail = d.data().email;
        return uEmail && uEmail.trim().toLowerCase() === cleanEmail.toLowerCase();
      });
      if (match) {
        return { id: match.id, ...match.data() };
      }

      return null;
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
        
        // 1. Try to load from localStorage first for instant startup
        const saved = localStorage.getItem("qms_profile");
        let initialProfileLoaded = false;
        if (saved) {
          try {
            const p = JSON.parse(saved);
            // Verify email matches before using cache
            if (p.email && p.email.trim().toLowerCase() === firebaseUser.email.trim().toLowerCase()) {
              const basePerms = buildPermissions(p.department, p.roleLabel || p.role);
              const perms = {
                ...basePerms,
                modules: p.customModules || basePerms.modules || ["dashboard"]
              };
              setProfile(p);
              setPermissions(perms);
              setLoading(false); // Stop loading spinner immediately
              initialProfileLoaded = true;
            }
          } catch (e) {
            console.error("Error parsing cached profile:", e);
          }
        }

        // 2. Fetch fresh profile from Firestore
        try {
          const firestoreProfile = await fetchProfile(firebaseUser.email);
          if (firestoreProfile) {
            const basePerms = buildPermissions(firestoreProfile.department, firestoreProfile.role);
            const perms = {
              ...basePerms,
              modules: firestoreProfile.customModules || basePerms.modules || ["dashboard"]
            };
            setProfile(firestoreProfile);
            setPermissions(perms);
            localStorage.setItem("qms_profile", JSON.stringify(firestoreProfile));
          } else if (!initialProfileLoaded) {
            // Fallback if no Firestore profile and nothing in localStorage
            setProfile(null);
            setPermissions(null);
          }
        } catch (err) {
          console.error("Firestore profile fetch error:", err);
        }
      } else {
        setUser(null);
        setProfile(null);
        setPermissions(null);
        localStorage.removeItem("qms_profile");
      }
      setLoading(false); // Ensure loading is false under all circumstances
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
    if (featureFlags && featureFlags[`conn_${moduleKey}`] === false) {
      return false;
    }
    try {
      const disabledJSON = localStorage.getItem("mbl_disabled_modules");
      if (disabledJSON) {
        const disabledList = JSON.parse(disabledJSON);
        if (Array.isArray(disabledList) && disabledList.includes(moduleKey)) {
          return false;
        }
      }
    } catch (e) {
      console.warn("Error checking localStorage disabled modules in canAccess:", e);
    }
    if (!permissions) return false;
    if (permissions.isSuperAdmin) return true;
    if (moduleKey === "planning") return true;
    let actualKey = moduleKey;
    if (moduleKey === "capa") actualKey = "ncr";
    if (moduleKey === "eqa") actualKey = "iqc";

    // Allow users to access their own department dashboard (only if no custom modules override is defined)
    if (!profile?.customModules && profile?.department) {
      const d = profile.department.toLowerCase().replace(/[^a-z0-9]/g, "");
      const mapped = d === "histopathologycytopathology" ? "histopathology"
                   : d === "humanresource" ? "hr"
                   : d === "biomedicalengineering" ? "biomedical"
                   : d === "purchasedepartment" ? "purchase"
                   : d === "frontoffice" ? "reception"
                   : d === "samplecollectioncentre" ? "samplecollection"
                   : d === "callcentre" ? "telecalling"
                   : d === "erpadministration" ? "erpadmin"
                   : d;
      if (mapped === actualKey) return true;
    }

    return permissions.modules?.includes(actualKey) || false;
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
