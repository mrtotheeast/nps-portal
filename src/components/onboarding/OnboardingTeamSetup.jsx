import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";

const ROLES = ["officer", "supervisor", "manager"];

export default function OnboardingTeamSetup({ onComplete, onBack, data }) {
  const [rows, setRows] = useState([{ email:"", role:"officer" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const plan = data?.plan;
  const pricePerUser = plan?.tier === "multi" ? 5.00 : 2.50;
  const baseCount = plan?.userCount || 1;

  const validEmails = useMemo(() => rows.filter(r => r.email.trim().includes("@")), [rows]);
  const newCount = baseCount + validEmails.length;
  const newMonthly = (newCount * pricePerUser).toFixed(2);

  const addRow = () => setRows(r => [...r, { email:"", role:"officer" }]);
  const removeRow = (i) => setRows(r => r.filter((_, n) => n !== i));
  const updateRow = (i, k, v) => setRows(r => r.map((row, n) => n === i ? { ...row, [k]:v } : row));

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/[\n,;]+/).map(l => l.trim()).filter(l => l.includes("@"));
    if (lines.length > 1) {
      e.preventDefault();
      setRows(prev => [...prev.filter(r => r.email), ...lines.map(email => ({ email, role:"officer" }))]);
    }
  };

  const sendNotification = async () => {
    const profile = data.companyProfile || {};
    await base44.functions.invoke("notifyNewCompanySignup", {
      companyName: profile.companyName,
      adminName: (profile.adminFirstName || "") + " " + (profile.adminLastName || ""),
      adminEmail: profile.adminEmail,
      operatingStates: profile.operatingStates,
      plan: plan?.tier,
      pricePerUser,
      userCount: newCount,
      hasAI: data.aiAddon?.purchased === true,
      aiPlan: data.aiAddon?.plan,
      registeredAt: new Date().toISOString(),
    }).catch(e => console.warn("Notify failed:", e.message));
  };

  const sendWelcomeEmail = async () => {
    const profile = data.companyProfile || {};
    await base44.functions.invoke("sendWelcomeEmail", {
      to: profile.adminEmail,
      companyName: profile.companyName,
      adminName: profile.adminFirstName + " " + profile.adminLastName,
      plan: plan?.tier === "multi" ? "Multiple Locations" : "Single Location",
      pricePerUser,
      loginUrl: window.location.origin,
    }).catch(e => console.warn("Welcome email failed:", e.message));
  };

  const handleSend = async () => {
    setSubmitting(true);
    setError("");
    try {
      let sent = 0;
      for (const r of validEmails) {
        try { await base44.users.inviteUser(r.email, "user"); sent++; } catch (e2) { console.warn(e2.message); }
      }
      await sendNotification();
      await sendWelcomeEmail();
      onComplete({ invitesSent: sent });
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  const handleSkip = async () => {
    setSubmitting(true);
    await sendNotification();
    await sendWelcomeEmail();
    setSubmitting(false);
    onComplete({ invitesSent: 0 });
  };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", padding:"48px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <div style={labelStyle}>Step 6 of 7</div>
        <h2 style={titleStyle}>Invite Your Team</h2>
        <p style={subStyle}>Enter employee email addresses below. Each person will receive an invitation to join your company portal.</p>

        <div style={{ background:"#fff", border:"1px solid rgba(11,31,58,0.08)", borderRadius:12, padding:"24px", marginTop:8, marginBottom:14 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 140px 32px", gap:8, marginBottom:8, alignItems:"center" }}>
            <span style={colLabel}>Email Address</span>
            <span style={colLabel}>Role</span>
            <span />
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 140px 32px", gap:8, marginBottom:8, alignItems:"center" }}>
              <input
                style={inputStyle}
                type="email"
                placeholder="officer@company.com"
                value={row.email}
                onChange={e => updateRow(i, "email", e.target.value)}
                onPaste={i === 0 ? handlePaste : undefined}
              />
              <select style={inputStyle} value={row.role} onChange={e => updateRow(i, "role", e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
              <button type="button" onClick={() => removeRow(i)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:0, display:"flex", alignItems:"center", justifyContent:"center", height:36 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={addRow} style={{ width:"100%", background:"none", border:"1px dashed #e2e8f0", borderRadius:6, padding:"9px", color:"#5B6E84", fontSize:13, cursor:"pointer", marginTop:4 }}>
            Add another
          </button>
          <p style={{ fontSize:12, color:"#94a3b8", marginTop:8 }}>Paste a comma-separated list of emails into the first field to add multiple people at once.</p>
        </div>

        {plan && (
          <div style={{ background:"rgba(11,31,58,0.03)", border:"1px solid rgba(11,31,58,0.07)", borderRadius:8, padding:"14px 18px", marginBottom:20 }}>
            <div style={colLabel}>Cost Preview</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 28px", fontSize:14, color:"#374151", marginTop:8 }}>
              <span>Plan: <strong style={{ color:"#0B1F3A" }}>${pricePerUser.toFixed(2)}/user/month</strong></span>
              <span>Users after invites: <strong style={{ color:"#0B1F3A" }}>{newCount}</strong></span>
              <span>Estimated monthly total: <strong style={{ color:"#0B1F3A" }}>${newMonthly}</strong></span>
            </div>
            {validEmails.length > 0 && (
              <p style={{ fontSize:12, color:"#94a3b8", marginTop:6 }}>
                Adding {validEmails.length} invitation{validEmails.length !== 1 ? "s" : ""} increases your estimated monthly cost by ${(validEmails.length * pricePerUser).toFixed(2)}.
              </p>
            )}
          </div>
        )}

        {error && <p style={{ color:"#ef4444", fontSize:13, marginBottom:12 }}>{error}</p>}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", flexWrap:"wrap" }}>
          <button type="button" onClick={onBack} style={secondaryBtn} disabled={submitting}>Back</button>
          <button type="button" onClick={handleSkip} style={secondaryBtn} disabled={submitting}>Skip and Invite Later</button>
          <button type="button" onClick={handleSend} style={primaryBtn} disabled={submitting}>
            {submitting ? "Sending..." : "Send Invitations"}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#C9A84C", marginBottom:6 };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:8 };
const subStyle = { fontSize:15, color:"#5B6E84", lineHeight:1.7 };
const colLabel = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"#94a3b8" };
const inputStyle = { width:"100%", padding:"9px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:13, color:"#0B1F3A", background:"#fff", outline:"none" };
const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"13px 32px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#f1f5f9", color:"#5B6E84", padding:"13px 24px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };