import React, { useState } from "react";
import { supabase } from "@/api/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Get role and redirect
    const { data: profile } = await supabase
      .from("user_profile")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role;
    if (role === "super_admin" || role === "admin") {
      window.location.href = "/AdminDashboard";
    } else if (role === "supervisor" || role === "manager") {
      window.location.href = "/SupervisorDashboard";
    } else if (role === "client") {
      window.location.href = "/ClientDashboard";
    } else {
      window.location.href = "/EmployeeDashboard";
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0d1321 0%,#1a2b4a 60%,#0d1321 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',sans-serif", padding:"20px" }}>
      <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(200,168,75,0.25)", borderRadius:"16px", padding:"48px 40px", width:"100%", maxWidth:"420px", boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:"36px" }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"64px", height:"64px", background:"linear-gradient(135deg,#c8a84b,#e8c96a)", borderRadius:"14px", marginBottom:"16px" }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M16 3L4 9v7c0 7 5.3 13.5 12 15 6.7-1.5 12-8 12-15V9L16 3z" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/><circle cx="16" cy="15" r="3.5" fill="white"/></svg>
          </div>
          <h1 style={{ color:"#ffffff", fontSize:"22px", fontWeight:"700", margin:"0 0 4px 0" }}>NPS Portal</h1>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:"13px", margin:0, letterSpacing:"0.08em", textTransform:"uppercase" }}>Nationwide Police Services</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:"20px" }}>
            <label style={{ display:"block", color:"rgba(255,255,255,0.6)", fontSize:"12px", fontWeight:"600", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@nationwidepolice.com"
              style={{ width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", color:"#ffffff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
          </div>
          <div style={{ marginBottom:"24px" }}>
            <label style={{ display:"block", color:"rgba(255,255,255,0.6)", fontSize:"12px", fontWeight:"600", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"8px" }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:"100%", padding:"12px 16px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:"8px", color:"#ffffff", fontSize:"14px", outline:"none", boxSizing:"border-box" }} />
          </div>
          {error && <div style={{ background:"rgba(176,48,48,0.2)", border:"1px solid rgba(176,48,48,0.4)", borderRadius:"8px", padding:"12px 16px", color:"#ff8080", fontSize:"13px", marginBottom:"20px" }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width:"100%", padding:"13px", background:loading?"rgba(200,168,75,0.4)":"linear-gradient(135deg,#c8a84b,#e8c96a)", border:"none", borderRadius:"8px", color:loading?"rgba(255,255,255,0.5)":"#0d1321", fontSize:"14px", fontWeight:"700", letterSpacing:"0.06em", textTransform:"uppercase", cursor:loading?"not-allowed":"pointer" }}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <div style={{ textAlign:"center", marginTop:"24px" }}>
          <a href="/ForgotPassword" style={{ color:"rgba(200,168,75,0.7)", fontSize:"13px", textDecoration:"none" }}>Forgot your password?</a>
        </div>
      </div>
    </div>
  );
}
