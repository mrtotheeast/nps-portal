import React, { useState } from "react";

function Item({ children }) {
  return (
    <li style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10, fontSize:14, color:"#0B1F3A", lineHeight:1.7 }}>
      <span style={{ color:"#C9A84C", fontWeight:700, flexShrink:0, marginTop:2 }}>—</span>
      <span style={{ color:"#e2e8f0" }}>{children}</span>
    </li>
  );
}

function PricingCard({ title, price, period, features, highlight }) {
  return (
    <div style={{
      flex:1, minWidth:0,
      background: highlight ? "#0B1F3A" : "#F0F4F8",
      border: highlight ? "2px solid #C9A84C" : "1.5px solid #d1d5db",
      borderRadius:10, padding:"18px 20px",
      position:"relative"
    }}>
      {highlight && (
        <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:"#C9A84C", color:"#0B1F3A", fontSize:10, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", padding:"3px 10px", borderRadius:20 }}>
          Most Popular
        </div>
      )}
      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color: highlight ? "#C9A84C" : "#5B6E84", marginBottom:6 }}>{title}</div>
      <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
        <span style={{ fontSize:32, fontWeight:800, color: highlight ? "#fff" : "#0B1F3A" }}>{price}</span>
        <span style={{ fontSize:13, color: highlight ? "#94a3b8" : "#6b7280" }}>/ user / mo</span>
      </div>
      <div style={{ fontSize:12, color: highlight ? "#94a3b8" : "#6b7280", marginBottom:12 }}>{period}</div>
      <ul style={{ listStyle:"none", padding:0, margin:0 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, fontSize:13, color: highlight ? "#e2e8f0" : "#374151", marginBottom:6, lineHeight:1.5 }}>
            <span style={{ color:"#C9A84C", fontWeight:700, flexShrink:0 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function OnboardingBillingTerms({ onComplete, onBack }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (!agreed) { setError("You must acknowledge the billing terms before continuing."); return; }
    setError("");
    onComplete();
  };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", padding:"48px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:660, margin:"0 auto" }}>
        <div style={labelStyle}>Step 2 of 7</div>
        <h2 style={titleStyle}>Billing Terms</h2>
        <p style={subStyle}>Read the following pricing and billing terms before selecting your plan. No emoji, no fine print — just plain language.</p>

        {/* Pricing plan cards */}
        <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
          <PricingCard
            title="Single Location"
            price="$2.50"
            period="Billed monthly · save 15% annually"
            features={[
              "Up to 20 employees",
              "1 client portal",
              "1 location / site",
              "Full scheduling, patrol & timekeeping",
              "Incident management & reports",
            ]}
          />
          <PricingCard
            title="Multiple Locations"
            price="$5.00"
            period="Billed monthly · save 15% annually"
            highlight
            features={[
              "Unlimited employees",
              "Unlimited client portals",
              "Unlimited locations / sites",
              "Everything in Single Location",
              "Advanced analytics & AI reporting",
            ]}
          />
        </div>

        <div style={card}>
          <div style={sectionHead}>Pricing Structure</div>
          <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            <Item>NPS Portal charges a flat per-user rate based on your active employee count. You pay only for users who are active.</Item>
            <Item>Single Location plan: $2.50 per user per month. Supports up to 20 employees, 1 client, and 1 location.</Item>
            <Item>Multiple Locations plan: $5.00 per user per month. Supports unlimited employees, clients, and locations.</Item>
            <Item>Annual billing is available at a discount. Annual subscriptions are billed once per year in advance.</Item>
          </ul>

          <div style={{ ...sectionHead, marginTop:20 }}>How Billing Adjusts</div>
          <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            <Item>When you add an employee, your subscription quantity increases by 1 immediately. A prorated charge is applied to your current billing period at that moment.</Item>
            <Item>When you remove or deactivate an employee, your subscription quantity decreases by 1. The resulting credit is applied to your next billing cycle, not as an immediate refund.</Item>
            <Item>You will always be shown the exact cost change before confirming any employee addition or removal.</Item>
          </ul>

          <div style={{ ...sectionHead, marginTop:20 }}>Plan Limits and Upgrades</div>
          <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            <Item>If you attempt to add a 21st employee, add a second client, or add a second location while on the Single Location plan, the system will block the action and prompt you to upgrade.</Item>
            <Item>Upgrading switches your base subscription from the Single Location price ID to the Multiple Locations price ID while keeping the same billing cycle and user count. The difference is billed immediately on a prorated basis.</Item>
          </ul>

          <div style={{ ...sectionHead, marginTop:20 }}>AI Reporting Add-on</div>
          <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            <Item>The AI Reporting add-on costs $29.99 per month or $299.99 per year per organization, regardless of user count.</Item>
            <Item>The AI add-on is optional and is added as a separate line item on your existing subscription. It can be added or removed at any time from your admin dashboard.</Item>
          </ul>

          <div style={{ ...sectionHead, marginTop:20 }}>Payment and Cancellation</div>
          <ul style={{ listStyle:"none", padding:0, margin:0 }}>
            <Item>All payments are processed securely by Stripe. NPS Portal does not store your card details.</Item>
            <Item>You can cancel your subscription at any time. Access continues through the end of your current billing period.</Item>
            <Item>If a payment fails you will be notified by in-app notification and email with instructions to update your payment method.</Item>
          </ul>
        </div>

        {/* Required acknowledgment */}
        <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer", marginTop:20, padding:"16px 20px", background: agreed ? "rgba(11,31,58,0.04)" : "#fff", border:`1.5px solid ${agreed ? "#0B1F3A" : "#e2e8f0"}`, borderRadius:8, transition:"all .15s" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => { setAgreed(e.target.checked); setError(""); }}
            style={{ marginTop:2, width:16, height:16, accentColor:"#0B1F3A", flexShrink:0 }}
          />
          <span style={{ fontSize:14, color:"#0B1F3A", lineHeight:1.6, fontWeight: agreed ? 600 : 400 }}>
            I understand that my subscription cost adjusts automatically as I add or remove employees, and I have read the billing terms above.
          </span>
        </label>

        {error && <p style={{ color:"#ef4444", fontSize:13, marginTop:10 }}>{error}</p>}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:24 }}>
          {onBack && <button onClick={onBack} style={secondaryBtn}>Back</button>}
          <button onClick={handleContinue} style={primaryBtn}>Continue to Plan Selection</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#C9A84C", marginBottom:6 };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:8 };
const subStyle = { fontSize:15, color:"#374151", lineHeight:1.7, marginBottom:24 };
const card = { background:"#0B1F3A", border:"1.5px solid rgba(201,168,76,0.25)", borderRadius:10, padding:"24px 28px" };
const sectionHead = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:"#C9A84C", marginBottom:10 };
const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"13px 36px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#f1f5f9", color:"#5B6E84", padding:"13px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };