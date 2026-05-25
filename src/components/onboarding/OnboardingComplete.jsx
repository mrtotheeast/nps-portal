import React from "react";
import { base44 } from "@/api/base44Client";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function OnboardingComplete({ data }) {
  const profile = data?.companyProfile || {};
  const invitesSent = data?.invitesSent || 0;
  const plan = data?.plan;
  const aiAddon = data?.aiAddon;

  const planLabel = plan?.tier === "multi" ? "Multiple Locations" : "Single Location";
  const pricePerUser = plan?.pricePerUser || (plan?.tier === "multi" ? 5.00 : 2.50);

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" }}>
      <div style={{ maxWidth:520, width:"100%", textAlign:"center" }}>

        <img src={SHIELD_URL} alt="NPS Portal" style={{ width:72, height:72, marginBottom:20, filter:"drop-shadow(0 4px 20px rgba(201,168,76,0.25))", objectFit:"contain" }} />

        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".24em", textTransform:"uppercase", color:"#C9A84C", marginBottom:10 }}>
          Setup Complete
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:46, color:"#0B1F3A", letterSpacing:".03em", lineHeight:1, marginBottom:10 }}>
          Your Company is Ready
        </h1>
        <p style={{ color:"#5B6E84", fontSize:16, lineHeight:1.7, marginBottom:32 }}>
          Welcome to NPS Portal. Your account has been created and your team invitations are on their way.
        </p>

        <div style={{ background:"#fff", border:"1px solid rgba(11,31,58,0.08)", borderRadius:12, padding:"24px", marginBottom:28, textAlign:"left" }}>
          <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", color:"#5B6E84", marginBottom:16 }}>Account Summary</h3>
          <Row label="Company" value={profile.companyName || "Your Company"} />
          <Row label="Login Email" value={profile.adminEmail || ""} />
          <Row label="Administrator" value={`${profile.adminFirstName || ""} ${profile.adminLastName || ""}`.trim()} />
          <Row label="Plan" value={`${planLabel} — $${pricePerUser.toFixed(2)}/user/month`} />
          <Row label="AI Add-on" value={aiAddon?.purchased ? `Purchased (${aiAddon.plan === "annual" ? "Annual $299.99/yr" : "Monthly $29.99/mo"})` : "Not purchased"} />
          <Row label="Invitations Sent" value={`${invitesSent} team member${invitesSent !== 1 ? "s" : ""}`} />
        </div>

        <button
          onClick={() => base44.auth.redirectToLogin()}
          style={{ width:"100%", background:"#0B1F3A", color:"#C9A84C", padding:"16px 32px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", clipPath:"polygon(12px 0%,100% 0%,calc(100% - 12px) 100%,0% 100%)", marginBottom:16 }}
        >
          Enter Your Dashboard
        </button>

        <p style={{ color:"#94a3b8", fontSize:13 }}>
          Need help? Visit{" "}
          <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" style={{ color:"#C9A84C" }}>
            nationwidepolice.com/nps-portal
          </a>{" "}
          for support.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"120px 1fr", gap:12, marginBottom:12, fontSize:14 }}>
      <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, letterSpacing:".06em", textTransform:"uppercase", color:"#94a3b8" }}>{label}</span>
      <span style={{ fontWeight:600, color:"#0B1F3A" }}>{value}</span>
    </div>
  );
}