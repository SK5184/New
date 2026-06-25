// ProtectedRoute.jsx
// MBL QMS — Wraps any module to enforce role-based access
// Usage: <ProtectedRoute module="kpi"><KPIDashboard /></ProtectedRoute>

import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ module, children }) {
  const { canAccess, loading, profile, dept, role } = useAuth();

  if (loading) {
    return (
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"center",
        minHeight:"60vh", fontFamily:"'Inter',system-ui,sans-serif",
      }}>
        <div style={{ textAlign:"center" }}>
          <div style={{
            width:32, height:32, borderRadius:"50%",
            border:"2px solid #E0DDD6", borderTopColor:"#1D9E75",
            animation:"spin 0.8s linear infinite",
            margin:"0 auto 12px",
          }}/>
          <div style={{ fontSize:13, color:"#888780" }}>Checking access…</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!canAccess(module)) {
    return (
      <div style={{
        fontFamily:"'Inter',system-ui,sans-serif",
        background:"#F7F6F2", minHeight:"100vh",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:40,
      }}>
        <div style={{
          background:"#fff", border:"0.5px solid #E0DDD6",
          borderRadius:14, padding:"36px 40px",
          maxWidth:440, width:"100%", textAlign:"center",
        }}>
          <div style={{
            width:52, height:52, borderRadius:14,
            background:"#FCEBEB", display:"flex",
            alignItems:"center", justifyContent:"center",
            fontSize:24, margin:"0 auto 16px",
          }}>🔒</div>

          <div style={{
            fontSize:18, fontWeight:600, color:"#2C2C2A",
            letterSpacing:"-0.02em", marginBottom:8,
          }}>
            Access restricted
          </div>

          <div style={{
            fontSize:13, color:"#888780", lineHeight:1.7, marginBottom:20,
          }}>
            Your current role does not have permission to view this module.
          </div>

          {/* User info */}
          <div style={{
            background:"#F7F6F2", borderRadius:8,
            padding:"10px 14px", marginBottom:20, textAlign:"left",
          }}>
            <div style={{ fontSize:11, color:"#888780", marginBottom:4 }}>Logged in as</div>
            <div style={{ fontSize:13, fontWeight:500, color:"#2C2C2A" }}>
              {profile?.fullName || profile?.name || "User"}
            </div>
            <div style={{ fontSize:11, color:"#888780", marginTop:2 }}>
              {dept} · {role}
            </div>
          </div>

          <div style={{ fontSize:11, color:"#B4B2A9" }}>
            Contact your ERP Administrator to request access.
          </div>
        </div>
      </div>
    );
  }

  return children;
}
