import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

export default function OnboardingAIUpsell({ onComplete, onBack, companyProfile }) {
  const [billing, setBilling] = useState("monthly");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createAICheckoutSession", {
        plan: billing,
        successUrl: window.location.origin + "/onboarding?step=6&ai=" + billing,
        cancelUrl: window.location.origin + "/onboarding?step=5",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
    } catch (e) {
      // fall through to skip
    }
    onComplete({ purchased: true, plan: billing });
    setLoading(false);
  };

  const handleSkip = () => onComplete({ purchased: false, plan: null });

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:540, width:"100%", textAlign:"center" }}>

        <div style={labelStyle}>Step 5 of 7 — Optional</div>
        <h2 style={titleStyle}>AI Reporting Add-on</h2>
        <p style={subStyle}>
          Add AI-assisted incident report writing and document generation to your account.
          This is a flat monthly or annual fee per organization, regardless of how many users you have.
        </p>

        <div style={card}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:"#8a6e2e", marginBottom:10 }}>AI Reporting Add-on</div>

          <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:20 }}>
            <button type="button" onClick={() => setBilling("monthly")} style={billBtn(billing === "monthly")}>
              Monthly — $29.99/month
            </button>
            <button type="button" onClick={() => setBilling("annual")} style={billBtn(billing === "annual")}>
              Annual — $299.99/year
              <span style={{ marginLeft:8, background:"#10b981", color:"#fff", fontSize:10, padding:"2px 8px", borderRadius:20, fontWeight:700 }}>Save 17%</span>
            </button>
          </div>

          <ul style={{ listStyle:"none", padding:0, margin:"0 0 20px", textAlign:"left" }}>
            {[
              "AI-assisted incident report drafting",
              "Automated weekly site summary reports",
              "AI-powered training content generation",
              "AI analytics and insights dashboard",
            ].map(f => (
              <li key={f} style={{ display:"flex", alignItems:"center", gap:10, fontSize:14, color:"#374151", marginBottom:10 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#C9A84C", display:"inline-block", flexShrink:0 }} />
                {f}
              </li>
            ))}
          </ul>

          <button onClick={handleAdd} disabled={loading} style={primaryBtn}>
            {loading ? "Please wait..." : `Add AI Reporting — ${billing === "annual" ? "$299.99/year" : "$29.99/month"}`}
          </button>
        </div>

        <button onClick={handleSkip} style={skipBtn}>
          Skip for Now — I can add this from my dashboard later
        </button>
      </div>
    </div>
  );
}

const labelStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#C9A84C", marginBottom:8 };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:8 };
const subStyle = { fontSize:15, color:"#5B6E84", lineHeight:1.7, marginBottom:28 };
const card = { background:"#fff", border:"1.5px solid rgba(201,168,76,0.25)", borderRadius:14, padding:"28px 28px", textAlign:"left" };
const billBtn = (active) => ({ padding:"9px 18px", border:`1.5px solid ${active ? "#C9A84C" : "#e2e8f0"}`, background: active ? "rgba(201,168,76,0.08)" : "#fff", color: active ? "#8a6e2e" : "#5B6E84", borderRadius:6, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight: active ? 700 : 600, letterSpacing:".06em", transition:"all .15s", display:"inline-flex", alignItems:"center" });
const primaryBtn = { width:"100%", background:"#0B1F3A", color:"#C9A84C", padding:"14px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const skipBtn = { background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:13, marginTop:20, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".08em", textDecoration:"underline" };