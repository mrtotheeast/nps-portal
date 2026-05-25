import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }

const SINGLE_FEATURES = [
  "Officer scheduling and availability",
  "Geofenced clock-in and clock-out",
  "GPS patrol tracking",
  "Incident reporting and approval",
  "Team messaging",
  "Training records",
  "Client dashboard portal",
  "Payroll data export",
  "Up to 20 employees, 1 client, 1 location",
];
const MULTI_FEATURES = [
  "Everything in Single Location",
  "Unlimited sites, clients, and schedules",
  "Multi-region oversight",
  "Custom role permissions",
  "Advanced reporting suite",
  "Manager and supervisor roles",
  "Data export controls",
  "Priority support",
  "Unlimited employees",
];

export default function OnboardingPlanSelect({ onComplete, onBack, data }) {
  const [tier, setTier] = useState("multi");
  const [cycle, setCycle] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const priceMonthly = tier === "multi" ? 5.00 : 2.50;
  const priceAnnual  = tier === "multi" ? 4.17 : 2.08; // effective monthly when billed annually (approx)

  const handleContinue = async () => {
    setLoading(true);
    setError("");
    try {
      const adminEmail = data?.companyProfile?.adminEmail;
      const companyName = data?.companyProfile?.companyName;

      const res = await base44.functions.invoke("createOnboardingCheckout", {
        plan: tier,
        cycle,
        adminEmail,
        companyName,
        successUrl: window.location.origin + "/onboarding?step=4&plan=" + tier + "&cycle=" + cycle,
        cancelUrl: window.location.origin + "/onboarding?step=3",
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      // fallback if no URL (dev/no stripe configured)
      onComplete({ tier, cycle, pricePerUser: priceMonthly, userCount: 1 });
    } catch (err) {
      // Proceed to profile setup even if Stripe checkout fails in dev
      onComplete({ tier, cycle, pricePerUser: priceMonthly, userCount: 1 });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", padding:"48px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:760, margin:"0 auto" }}>
        <div style={labelStyle}>Step 3 of 7</div>
        <h2 style={titleStyle}>Select Your Plan</h2>
        <p style={subStyle}>Choose the plan that fits your organization. You can upgrade at any time from your admin dashboard.</p>

        {/* Billing cycle toggle */}
        <div style={{ display:"flex", gap:0, marginBottom:24, background:"#f1f5f9", borderRadius:8, padding:4, width:"fit-content" }}>
          {[["monthly","Monthly"],["annual","Annual (save ~17%)"]].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setCycle(val)}
              style={{ padding:"8px 22px", border:"none", borderRadius:6, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", background: cycle === val ? "#0B1F3A" : "transparent", color: cycle === val ? "#C9A84C" : "#5B6E84", transition:"all .15s" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:20 }}>

          {/* Single Location */}
          <div
            onClick={() => setTier("single")}
            style={{ background:"#fff", border:`2px solid ${tier === "single" ? "#0B1F3A" : "rgba(11,31,58,0.1)"}`, borderRadius:12, padding:"28px 24px", cursor:"pointer", transition:"all .2s" }}
          >
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={planLabel}>Single Location</div>
                <div style={priceStyle}>${cycle === "annual" ? "2.08" : "2.50"}</div>
                <div style={perStyle}>per user / per month{cycle === "annual" ? " (billed annually)" : ""}</div>
                {cycle === "annual" && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>$25.00/user/year</div>}
              </div>
              <div style={radioOuter(tier === "single", false)}>
                {tier === "single" && <div style={radioDot(false)} />}
              </div>
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {SINGLE_FEATURES.map(f => (
                <li key={f} style={{ display:"flex", alignItems:"flex-start", gap:9, fontSize:13, color:"#374151", marginBottom:8, lineHeight:1.5 }}>
                  <span style={{ color:"#0B1F3A", flexShrink:0, marginTop:1 }}><CheckIcon /></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Multi Location */}
          <div
            onClick={() => setTier("multi")}
            style={{ background: tier === "multi" ? "rgba(201,168,76,0.03)" : "#fff", border:`2px solid ${tier === "multi" ? "#C9A84C" : "rgba(11,31,58,0.1)"}`, borderRadius:12, padding:"28px 24px", cursor:"pointer", transition:"all .2s", position:"relative" }}
          >
            <div style={{ position:"absolute", top:-12, left:20, background:"#C9A84C", color:"#0B1F3A", fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", padding:"3px 12px", borderRadius:20 }}>
              Recommended
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
              <div>
                <div style={planLabel}>Multiple Locations</div>
                <div style={priceStyle}>${cycle === "annual" ? "4.17" : "5.00"}</div>
                <div style={perStyle}>per user / per month{cycle === "annual" ? " (billed annually)" : ""}</div>
                {cycle === "annual" && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>$50.00/user/year</div>}
              </div>
              <div style={radioOuter(tier === "multi", true)}>
                {tier === "multi" && <div style={radioDot(true)} />}
              </div>
            </div>
            <ul style={{ listStyle:"none", padding:0, margin:0 }}>
              {MULTI_FEATURES.map(f => (
                <li key={f} style={{ display:"flex", alignItems:"flex-start", gap:9, fontSize:13, color:"#374151", marginBottom:8, lineHeight:1.5 }}>
                  <span style={{ color: tier === "multi" ? "#8a6e2e" : "#0B1F3A", flexShrink:0, marginTop:1 }}><CheckIcon /></span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ background:"rgba(11,31,58,0.03)", border:"1px solid rgba(11,31,58,0.07)", borderRadius:8, padding:"14px 18px", marginBottom:24, fontSize:13, color:"#5B6E84", lineHeight:1.7 }}>
          Your subscription scales with your active user count. When you add employees your cost increases by the per-user rate. When you remove employees your cost decreases and the credit applies to your next billing cycle. Payment is processed securely via Stripe.
        </div>

        {error && <p style={{ color:"#ef4444", fontSize:13, marginBottom:12 }}>{error}</p>}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onBack} style={secondaryBtn} disabled={loading}>Back</button>
          <button onClick={handleContinue} style={primaryBtn} disabled={loading}>
            {loading ? "Redirecting to payment..." : "Continue to Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

const radioOuter = (active, gold) => ({ width:22, height:22, borderRadius:"50%", border:`2px solid ${active ? (gold ? "#C9A84C" : "#0B1F3A") : "#cbd5e1"}`, background: active ? (gold ? "#C9A84C" : "#0B1F3A") : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 });
const radioDot = (gold) => ({ width:8, height:8, borderRadius:"50%", background: gold ? "#0B1F3A" : "#C9A84C" });
const labelStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#C9A84C", marginBottom:6 };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:8 };
const subStyle = { fontSize:15, color:"#5B6E84", lineHeight:1.7, marginBottom:24 };
const planLabel = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:"#5B6E84", marginBottom:6 };
const priceStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:46, color:"#0B1F3A", lineHeight:1 };
const perStyle = { fontSize:13, color:"#94a3b8", marginTop:2 };
const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"13px 36px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#f1f5f9", color:"#5B6E84", padding:"13px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };