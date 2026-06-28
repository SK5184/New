// LoginPage.jsx
// MBL QMS — Firebase email login with department + role selector

import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

const DEPARTMENTS = [
  // Technical
  "Microbiology", "Serology", "Histopathology & Cytopathology",
  "Flow Cytometry", "Cytogenetics", "Biochemistry",
  "Haematology", "Clinical Pathology", "Molecular Biology", "Molecular Genetics",
  // Non-technical
  "Quality", "Human Resource", "Biomedical Engineering",
  "Purchase", "Maintenance", "Housekeeping",
  "Information Technology", "Kitchen", "Security",
  // Customer interactive
  "Collection", "Front Office", "Back Office",
  "Sample Collection Centre", "Call Centre",
  // Control
  "Accounts", "Administration", "Design", "Marketing",
  // Admin
  "ERP Administration",
];

const ROLE_MAP = {
  "Microbiology":                  ["HOD","Supervisor","Staff"],
  "Serology":                      ["HOD","Supervisor","Staff"],
  "Histopathology & Cytopathology":["HOD","Supervisor","Staff"],
  "Flow Cytometry":                ["HOD","Supervisor","Staff"],
  "Cytogenetics":                  ["HOD","Supervisor","Staff"],
  "Biochemistry":                  ["HOD","Supervisor","Staff"],
  "Haematology":                   ["HOD","Supervisor","Staff"],
  "Clinical Pathology":            ["HOD","Supervisor","Staff"],
  "Molecular Biology":             ["HOD","Supervisor","Staff"],
  "Molecular Genetics":            ["HOD","Supervisor","Staff"],
  "Quality":                       ["Quality Manager","Quality Executive"],
  "Human Resource":                ["HRM","HRE"],
  "Biomedical Engineering":        ["BME"],
  "Purchase":                      ["Purchase Manager","Purchase User"],
  "Maintenance":                   ["Manager"],
  "Housekeeping":                  ["HK Incharge","HK Staff"],
  "Information Technology":        ["IT Manager","IT Executive"],
  "Kitchen":                       ["Kitchen Incharge","Kitchen Staff"],
  "Security":                      ["Security Incharge","Staff"],
  "Collection":                    ["Incharge","Phlebotomist"],
  "Front Office":                  ["Incharge","Staff"],
  "Back Office":                   ["Incharge","Staff"],
  "Sample Collection Centre":      ["Incharge","Staff"],
  "Call Centre":                   ["Incharge","Staff"],
  "Accounts":                      ["Incharge"],
  "Administration":                ["Managing Director","Deputy Director"],
  "Design":                        ["Incharge"],
  "Marketing":                     ["Manager","Assistant Manager","Executive"],
  "ERP Administration":            ["Admin","Assistant Admin"],
};

const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "0.5px solid #D3D1C7", borderRadius: 8,
  fontSize: 13, background: "#fff", color: "#2C2C2A",
  outline: "none", boxSizing: "border-box",
};

export default function LoginPage({ onSuccess, onBack }) {
  const [dept, setDept]         = useState("");
  const [role, setRole]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  // Forgot password states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotTab, setForgotTab] = useState("phone"); // "phone" | "question"
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotStep, setForgotStep] = useState("input"); // "input" | "otp" | "question_answer" | "success"
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userOtp, setUserOtp] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleOpenForgotModal = () => {
    setForgotOpen(true);
    setForgotTab("phone");
    setForgotEmail("");
    setForgotPhone("");
    setForgotQuestion("");
    setForgotAnswer("");
    setForgotStep("input");
    setGeneratedOtp("");
    setUserOtp("");
    setForgotError("");
    setForgotSuccess("");
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotPhone) { setForgotError("Please enter email and phone number."); return; }
    setForgotLoading(true);
    setForgotError("");
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", forgotEmail.trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setForgotError("No user account found with this email.");
        setForgotLoading(false);
        return;
      }
      const userDoc = snap.docs[0].data();
      const cleanDbPhone = (userDoc.phone || "").replace(/[^0-9]/g, "");
      const cleanInputPhone = forgotPhone.replace(/[^0-9]/g, "");
      if (!cleanDbPhone || cleanDbPhone !== cleanInputPhone) {
        setForgotError("Phone number does not match our records.");
        setForgotLoading(false);
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setForgotStep("otp");
      alert(`[SMS Gateway Simulator]\nTo: ${forgotPhone}\nOTP Code: ${otp}\n(Verification code valid for 10 minutes)`);
    } catch (err) {
      console.error(err);
      setForgotError("Verification failed. Please try again.");
    }
    setForgotLoading(false);
  };

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    if (!userOtp) { setForgotError("Please enter the OTP."); return; }
    if (userOtp !== generatedOtp) {
      setForgotError("Invalid OTP code. Please check the SMS Simulator alert.");
      return;
    }
    
    setForgotLoading(true);
    setForgotError("");
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSuccess("Identity verified successfully! We have sent a secure password reset link to your email.");
      setForgotStep("success");
    } catch (err) {
      console.error(err);
      setForgotError("Failed to trigger password reset email. " + err.message);
    }
    setForgotLoading(false);
  };

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setForgotError("Please enter your email."); return; }
    setForgotLoading(true);
    setForgotError("");
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", forgotEmail.trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setForgotError("No user account found with this email.");
        setForgotLoading(false);
        return;
      }
      const userDoc = snap.docs[0].data();
      if (!userDoc.securityQuestion) {
        setForgotError("You have not configured a security question. Please contact IT or use the Phone verification option.");
        setForgotLoading(false);
        return;
      }
      setForgotQuestion(userDoc.securityQuestion);
      setForgotStep("question_answer");
    } catch (err) {
      console.error(err);
      setForgotError("Failed to fetch security question.");
    }
    setForgotLoading(false);
  };

  const handleVerifyAnswer = async (e) => {
    e.preventDefault();
    if (!forgotAnswer) { setForgotError("Please enter your answer."); return; }
    setForgotLoading(true);
    setForgotError("");
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", forgotEmail.trim())
      );
      const snap = await getDocs(q);
      const userDoc = snap.docs[0].data();
      
      const cleanDbAns = (userDoc.securityAnswer || "").trim().toLowerCase();
      const cleanInputAns = forgotAnswer.trim().toLowerCase();
      if (cleanDbAns !== cleanInputAns) {
        setForgotError("Incorrect answer. Please try again.");
        setForgotLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setForgotSuccess("Security question verified! A secure password reset link has been sent to your email.");
      setForgotStep("success");
    } catch (err) {
      console.error(err);
      setForgotError("Verification failed.");
    }
    setForgotLoading(false);
  };

  const roles = dept ? (ROLE_MAP[dept] || []) : [];

  const handleDeptChange = (e) => {
    setDept(e.target.value);
    setRole("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!dept || !role) { setError("Please select department and role."); return; }
    if (!email || !password) { setError("Please enter email and password."); return; }

    setLoading(true);
    setError("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const profileData = {
        name: result.user.displayName || email.split("@")[0],
        email: result.user.email,
        department: dept,
        role: role.toLowerCase().replace(/ /g, "_"),
        roleLabel: role,
      };
      localStorage.setItem("qms_profile", JSON.stringify(profileData));
      onSuccess(result.user, profileData);
    } catch (err) {
      const msgs = {
        "auth/user-not-found":    "No account found with this email.",
        "auth/wrong-password":    "Incorrect password.",
        "auth/invalid-email":     "Invalid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/invalid-credential":"Invalid email or password.",
      };
      setError(msgs[err.code] || "Login failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      fontFamily: "'Inter',system-ui,sans-serif",
      minHeight: "100vh",
      background: "#0A0F0D",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: "#1D9E75",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 700, color: "#fff",
            margin: "0 auto 14px",
          }}>M</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#F0EEE8", letterSpacing: "-0.02em" }}>
            Sign in to MBL QMS
          </div>
          <div style={{ fontSize: 12, color: "#5A6E65", marginTop: 4 }}>
            ISO 15189 : 2022 · Quality Management System
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: 28,
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}>
          <form onSubmit={handleLogin}>

            {/* Department */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Department <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <select style={inputStyle} value={dept} onChange={handleDeptChange} required>
                <option value="">Select your department</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Role */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Role <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <select style={inputStyle} value={role}
                onChange={e => setRole(e.target.value)} required disabled={!dept}>
                <option value="">Select your role</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 5 }}>
                Email / Employee ID <span style={{ color: "#E24B4A" }}>*</span>
              </label>
              <input
                style={inputStyle} type="email"
                placeholder="you@mbl.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A" }}>
                  Password <span style={{ color: "#E24B4A" }}>*</span>
                </label>
                <button type="button" onClick={handleOpenForgotModal}
                  style={{
                    background: "none", border: "none", color: "#1D9E75",
                    fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 500,
                  }}>
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  style={inputStyle}
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 14, color: "#888780",
                  }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: "#FCEBEB", border: "0.5px solid #E24B4A",
                borderRadius: 8, padding: "9px 12px",
                fontSize: 12, color: "#791F1F", marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "11px",
              background: loading ? "#88C4AF" : "#0F6E56",
              color: "#fff", border: "none", borderRadius: 9,
              fontSize: 14, fontWeight: 500, cursor: loading ? "default" : "pointer",
              transition: "background 0.15s",
            }}>
              {loading ? "Signing in…" : "Sign in →"}
            </button>

          </form>
        </div>

        {/* Back */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", color: "#5A6E65",
            fontSize: 12, cursor: "pointer",
          }}>
            ← Back to home
          </button>
        </div>

      </div>

      {/* ── FORGOT PASSWORD MODAL ────────────────────── */}
      {forgotOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(10, 15, 13, 0.8)",
          backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460,
            boxShadow: "0 12px 60px rgba(0,0,0,0.5)", overflow: "hidden",
            color: "#2C2C2A"
          }}>
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "0.5px solid #E0DDD6", background: "#F7F6F2"
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0F0D" }}>Password Recovery Console</div>
              <button onClick={() => setForgotOpen(false)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888780"
              }}>✕</button>
            </div>

            {/* Body */}
            <div style={{ padding: 20 }}>
              {forgotStep !== "success" && (
                <div style={{ display: "flex", borderBottom: "1px solid #E0DDD6", marginBottom: 16 }}>
                  <button type="button" onClick={() => { setForgotTab("phone"); setForgotStep("input"); setForgotError(""); }}
                    style={{
                      flex: 1, padding: "10px", fontSize: 12, fontWeight: 500, background: "none", border: "none",
                      color: forgotTab === "phone" ? "#0F6E56" : "#888780", cursor: "pointer",
                      borderBottom: forgotTab === "phone" ? "2px solid #0F6E56" : "2px solid transparent",
                    }}>
                    📞 Option 1: Email & Phone
                  </button>
                  <button type="button" onClick={() => { setForgotTab("question"); setForgotStep("input"); setForgotError(""); }}
                    style={{
                      flex: 1, padding: "10px", fontSize: 12, fontWeight: 500, background: "none", border: "none",
                      color: forgotTab === "question" ? "#0F6E56" : "#888780", cursor: "pointer",
                      borderBottom: forgotTab === "question" ? "2px solid #0F6E56" : "2px solid transparent",
                    }}>
                    ❓ Option 2: Security Question
                  </button>
                </div>
              )}

              {forgotError && (
                <div style={{
                  background: "#FCEBEB", border: "0.5px solid #E24B4A", borderRadius: 8,
                  padding: "9px 12px", fontSize: 12, color: "#791F1F", marginBottom: 14
                }}>{forgotError}</div>
              )}

              {/* Step 1: Input forms */}
              {forgotStep === "input" && (
                <form onSubmit={forgotTab === "phone" ? handleVerifyPhone : handleFetchQuestion}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Registered Email Address</label>
                    <input style={inputStyle} type="email" placeholder="you@mbl.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required />
                  </div>

                  {forgotTab === "phone" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Registered Phone Number</label>
                      <input style={inputStyle} type="tel" placeholder="e.g. 9876543210" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} required />
                    </div>
                  )}

                  <button type="submit" disabled={forgotLoading} style={{
                    width: "100%", padding: "10px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}>
                    {forgotLoading ? "Verifying..." : forgotTab === "phone" ? "Verify & Send OTP" : "Fetch Security Question"}
                  </button>
                </form>
              )}

              {/* Step 2 (Phone flow): OTP verification */}
              {forgotStep === "otp" && (
                <form onSubmit={handleConfirmOtp}>
                  <div style={{
                    background: "#E6FDF5", border: "0.5px solid #88C4AF", borderRadius: 8,
                    padding: "10px 12px", fontSize: 11.5, color: "#065F46", marginBottom: 14, lineHeight: 1.6
                  }}>
                    ℹ️ A simulated 6-digit OTP code has been broadcasted. Please check your SMS alert notification and enter it below to complete authorization.
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Enter 6-digit OTP code</label>
                    <input style={{ ...inputStyle, letterSpacing: 4, textAlign: "center", fontSize: 18 }} type="text" maxLength={6} placeholder="000000" value={userOtp} onChange={e => setUserOtp(e.target.value.replace(/[^0-9]/g, ""))} required />
                  </div>
                  <button type="submit" disabled={forgotLoading} style={{
                    width: "100%", padding: "10px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}>
                    {forgotLoading ? "Authorizing..." : "Verify OTP & Send Email"}
                  </button>
                </form>
              )}

              {/* Step 2 (Question flow): Security Question challenge */}
              {forgotStep === "question_answer" && (
                <form onSubmit={handleVerifyAnswer}>
                  <div style={{
                    background: "#F7F6F2", border: "0.5px solid #CBD5E1", borderRadius: 8,
                    padding: "12px 14px", fontSize: 12, color: "#2C2C2A", marginBottom: 14, fontWeight: 500
                  }}>
                    🛡️ Security Challenge: <br/>
                    <span style={{ fontSize: 13, color: "#0F6E56", display: "inline-block", marginTop: 4 }}>{forgotQuestion}</span>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 500, color: "#5F5E5A", display: "block", marginBottom: 4 }}>Your Answer</label>
                    <input style={inputStyle} type="text" placeholder="Type your answer here" value={forgotAnswer} onChange={e => setForgotAnswer(e.target.value)} required />
                  </div>
                  <button type="submit" disabled={forgotLoading} style={{
                    width: "100%", padding: "10px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}>
                    {forgotLoading ? "Verifying..." : "Verify Answer & Send Email"}
                  </button>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {forgotStep === "success" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0F6E56", marginBottom: 8 }}>Verification Complete</div>
                  <div style={{ fontSize: 12.5, color: "#5F5E5A", lineHeight: 1.6, marginBottom: 20 }}>
                    {forgotSuccess}
                  </div>
                  <button onClick={() => setForgotOpen(false)} style={{
                    padding: "8px 24px", background: "#0F6E56", color: "#fff", border: "none", borderRadius: 8,
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}>
                    Got it, Close
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
