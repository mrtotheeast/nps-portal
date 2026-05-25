import React, { useState } from "react";

export default function OnboardingSubscription({ onComplete, onBack, companyProfile }) {
  const [selected, setSelected] = useState("base");
  const [aiPlan, setAiPlan] = useState("monthly");

  const handleContinue = () => {
    onComplete({ plan: selected, aiPlan: selected === "ai" ? aiPlan : null });
  };

  return (
    <div style={{ minHeight:"calc(100vh - 52px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:600, width:"100%", textAlign:"center" }}>
        <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#0B1F3A", marginBottom:8, letterSpacing:".03em" }}>
          Choose Your Plan
        </h2>
        <p style={{ color:"#5B6E84", fontSize:15, marginBottom:32 }}>
          You can always add or change your plan later from the admin dashboard.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:32 }}>
          {/* Base Plan */}
          <div
            onClick={() => setSelected("base")}
            style={{ background:"#fff", border:`2px solid ${selected === "base" ? "#0B1F3A" : "#e2e8f0"}`, borderRadius:12, padding:"24px", cursor:"pointer", textAlign:"left", transition:"all .2s", position:"relative" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, letterSpacing:".18em", textTransform:"uppercase", color:"#5B6E84", marginBottom:4 }}>Base Platform</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#0B1F3A" }}>Included</div>
              </div>
              <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${selected === "base" ? "#0B1F3A" : "#cbd5e1"}`, background: selected === "base" ? "#0B1F3A" : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {selected === "base" && <div style={{ width:8, height:8, borderRadius:"50%", background:"#C9A84C" }} />}
              </div>
            </div>
            <p style={{ color:"#5B6E84", fontSize:13, lineHeight:1.6, margin:0 }}>
              Full access to scheduling, patrol tracking, incident reporting, timekeeping, client dashboard, training records, and live operations map.
            </p>
          </div>

          {/* AI Add-on */}
          <div
            onClick={() => setSelected("ai")}
            style={{ background:"rgba(201,168,76,0.04)", border:`2px solid ${selected === "ai" ? "#C9A84C" : "#e2e8f0"}`, borderRadius:12, padding:"24px", cursor:"pointer", textAlign:"left", transition:"all .2s" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, letterSpacing:".18em", textTransform:"uppercase", color:"#8a6e2e" }}>AI Reporting Add-on</div>
                  <span style={{ background:"#C9A84C", color:"#0B1F3A", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, letterSpacing:".1em", textTransform:"uppercase" }}>Popular</span>
                </div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#0B1F3A" }}>
                  {aiPlan === "monthly" ? "$29.99/mo" : "$299.99/yr"}
                </div>
              </div>
              <div style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${selected === "ai" ? "#C9A84C" : "#cbd5e1"}`, background: selected === "ai" ? "#C9A84C" : "transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {selected === "ai" && <div style={{ width:8, height:8, borderRadius:"50%", background:"#0B1F3A" }} />}
              </div>
            </div>
            <p style={{ color:"#5B6E84", fontSize:13, lineHeight:1.6, margin:"0 0 12px" }}>
              AI-assisted incident report writing, AI analytics reports, training content generation, and automated weekly site summaries.
            </p>
            {selected === "ai" && (
              <div style={{ display:"flex", gap:8 }}>
                <button type="button" onClick={(e) => { e.stopPropagation(); setAiPlan("monthly"); }} style={{ padding:"6px 16px", border:`1px solid ${aiPlan === "monthly" ? "#C9A84C" : "#e2e8f0"}`, background: aiPlan === "monthly" ? "rgba(201,168,76,0.12)" : "#fff", borderRadius:20, fontSize:12, cursor:"pointer", color: aiPlan === "monthly" ? "#8a6e2e" : "#5B6E84", fontWeight: aiPlan === "monthly" ? 600 : 400 }}>Monthly — $29.99</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setAiPlan("annual"); }} style={{ padding:"6px 16px", border:`1px solid ${aiPlan === "annual" ? "#C9A84C" : "#e2e8f0"}`, background: aiPlan === "annual" ? "rgba(201,168,76,0.12)" : "#fff", borderRadius:20, fontSize:12, cursor:"pointer", color: aiPlan === "annual" ? "#8a6e2e" : "#5B6E84", fontWeight: aiPlan === "annual" ? 600 : 400 }}>Annual — $299.99 <span style={{ color:"#10b981" }}>Save 17%</span></button>
              </div>
            )}
          </div>
        </div>

        <div style={{ background:"#f8f9fa", border:"1px solid rgba(11,31,58,0.08)", borderRadius:8, padding:"14px 18px", marginBottom:28, textAlign:"left" }}>
          <p style={{ color:"#5B6E84", fontSize:12, lineHeight:1.6, margin:0 }}>
            <strong style={{ color:"#0B1F3A" }}>Subscription Terms:</strong> Plans auto-renew. You may cancel at any time from your admin dashboard. Payments processed securely via Stripe. AI Add-on provides enhanced report writing capabilities and does not include base platform features separately. By continuing you agree to NPS Portal subscription terms at <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" style={{ color:"#C9A84C" }}>nationwidepolice.com/nps-portal</a>.
          </p>
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button type="button" onClick={onBack} style={{ background:"#f1f5f9", color:"#0B1F3A", padding:"14px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" }}>← Back</button>
          <button type="button" onClick={handleContinue} style={{ background:"#0B1F3A", color:"#C9A84C", padding:"14px 40px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)" }}>
            {selected === "ai" ? "Continue to Payment →" : "Continue →"}
          </button>
        </div>
        <p style={{ color:"#94a3b8", fontSize:12, marginTop:14, cursor:"pointer" }} onClick={() => onComplete({ plan: "base", aiPlan: null })}>
          Skip for now — add AI features later
        </p>
      </div>
    </div>
  );
}