import React, { useState } from "react";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function OnboardingAdminCheck({ onYes }) {
  const [notAdmin, setNotAdmin] = useState(false);

  if (notAdmin) {
    return (
      <div style={centeredWrap}>
        <div style={card}>
          <img src={SHIELD_URL} alt="NPS Portal" style={logoStyle} />
          <h2 style={titleStyle}>Contact Your Administrator</h2>
          <p style={bodyStyle}>
            Please ask your organization's administrator to create your company account.
            You will receive an email invitation once your account has been set up.
          </p>
          <a href="/" style={linkStyle}>Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div style={centeredWrap}>
      <div style={{ ...card, maxWidth:480, textAlign:"center" }}>
        <img src={SHIELD_URL} alt="NPS Portal" style={logoStyle} />
        <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:10 }}>
          Welcome to NPS Portal
        </h1>
        <p style={bodyStyle}>
          Are you the <strong>account administrator</strong> for your organization?
        </p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:28 }}>
          <button onClick={onYes} style={primaryBtn}>Yes, I'm the Administrator</button>
          <button onClick={() => setNotAdmin(true)} style={secondaryBtn}>No, I'm Not</button>
        </div>
      </div>
    </div>
  );
}

const centeredWrap = { minHeight:"calc(100vh - 54px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", background:"#FAFBFC" };
const card = { background:"#fff", border:"1px solid rgba(11,31,58,0.08)", borderRadius:14, padding:"40px 32px", maxWidth:520, width:"100%", textAlign:"center" };
const logoStyle = { width:72, height:72, marginBottom:20, filter:"drop-shadow(0 4px 16px rgba(201,168,76,0.18))", objectFit:"contain" };
const titleStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, color:"#0B1F3A", letterSpacing:".04em", marginBottom:12 };
const bodyStyle = { fontSize:16, color:"#5B6E84", lineHeight:1.7, margin:0 };
const linkStyle = { display:"inline-block", marginTop:20, fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#C9A84C", textDecoration:"none" };
const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"14px 32px", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", border:"none", borderRadius:4, cursor:"pointer", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#f1f5f9", color:"#5B6E84", padding:"14px 28px", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", border:"none", borderRadius:4, cursor:"pointer" };