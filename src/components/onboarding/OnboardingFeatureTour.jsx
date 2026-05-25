import React, { useState } from "react";

function CalIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function MapPinIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function FileIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>; }
function DollarIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function CheckIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }

const SLIDES = [
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    title: "What is NPS Portal?",
    body: "NPS Portal is a complete security workforce management platform built for security companies. Manage officers, schedule shifts, track patrols, report incidents, and oversee operations from a single secure dashboard.",
    sub: "Designed for security directors, operations managers, and field supervisors of armed and unarmed officer teams.",
  },
  {
    icon: <MapPinIcon />,
    title: "Location and GPS Services",
    body: "NPS Portal uses your location to track officer patrol routes, verify site check-ins, and display your position on the live operations map for your supervisor. Location is only active during your shift.",
    sub: "Location data is never stored beyond your shift and is never shared with third parties.",
  },
  {
    icon: <CalIcon />,
    title: "Scheduling and Timekeeping",
    body: "Build shift schedules, manage availability, track time with geofenced clock-in and clock-out, approve timesheets, and export payroll data from a single dashboard.",
    sub: "Supports W2 and 1099 officers with configurable pay rates and PTO accrual.",
  },
  {
    icon: <FileIcon />,
    title: "Incident Reporting and AI Writing",
    body: "Officers submit incident reports from the field. Supervisors review and approve. The optional AI Writing Add-on helps draft professional, compliant reports automatically.",
    sub: "AI Reporting Add-on is $29.99 per month or $299.99 per year per organization.",
  },
  {
    icon: <DollarIcon />,
    title: "Transparent Pricing",
    body: "NPS Portal charges per active user. Select the plan that fits your operation. Scale up or down at any time.",
    pricing: true,
  },
  {
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    title: "Billing and Cancellation Terms",
    body: "Your subscription cost adjusts automatically as you add or remove employees. You will be shown the exact cost change before any employee is added. You may cancel at any time from your admin dashboard. There are no setup fees and no long-term contracts.",
    sub: "Credits for removed employees are applied to your next billing cycle.",
  },
  {
    icon: <CheckIcon />,
    title: "Ready to Get Started",
    body: "Set up your company profile, select your plan, and be operational in minutes. No hardware required. Works on any phone or computer.",
    sub: "Questions? Visit nationwidepolice.com/nps-portal for support.",
    isLast: true,
  },
];

const SINGLE = [
  "Officer scheduling & availability",
  "Geofenced clock-in / clock-out",
  "GPS patrol tracking",
  "Incident reporting & approval",
  "Team messaging",
  "Training records & certifications",
  "Client portal access",
  "Payroll data export",
  "1 site or schedule",
];
const MULTI = [
  "Everything in Single Location",
  "Unlimited sites & schedules",
  "Multi-region oversight",
  "Manager & supervisor roles",
  "Custom role permissions",
  "Advanced reporting suite",
  "Data export controls",
  "Priority support",
];

export default function OnboardingFeatureTour({ onComplete, onBack }) {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", background:"#F4F6F9" }}>
      <div style={{ maxWidth: current.pricing ? 680 : 560, width:"100%", textAlign:"center" }}>

        <div style={{ background:"#fff", borderRadius:16, border:"1px solid rgba(11,31,58,0.1)", padding: current.pricing ? "36px 32px" : "44px 36px", boxShadow:"0 6px 32px rgba(11,31,58,0.08)", minHeight:340, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          {current.icon && (
            <div style={{ width:54, height:54, background:"#0B1F3A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", color:"#C9A84C", marginBottom:22 }}>
              {current.icon}
            </div>
          )}
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#0B1F3A", letterSpacing:".03em", marginBottom:14 }}>
            {current.title}
          </h2>
          <p style={{ color:"#1e293b", fontSize:16, lineHeight:1.8, marginBottom:14, maxWidth:480 }}>
            {current.body}
          </p>
          {current.pricing && (
            <div style={{ width:"100%", marginTop:8 }}>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", justifyContent:"center", marginBottom:16 }}>
                {/* Single Location Card */}
                <div style={{ background:"#F8FAFC", border:"2px solid #0B1F3A", borderRadius:12, padding:"22px 20px", flex:1, minWidth:220, textAlign:"left" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", color:"#64748b", marginBottom:6 }}>Single Location</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:"#0B1F3A", lineHeight:1 }}>$2.50</span>
                    <span style={{ fontSize:13, color:"#64748b", fontFamily:"'Barlow',sans-serif" }}>/user/month</span>
                  </div>
                  <p style={{ fontSize:13, color:"#374151", lineHeight:1.6, margin:"0 0 14px" }}>
                    Best for single-site security teams managing one location with one active schedule.
                  </p>
                  <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                    {SINGLE.map(f => (
                      <li key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#1e293b", marginBottom:6 }}>
                        <span style={{ width:16, height:16, borderRadius:"50%", background:"#0B1F3A", display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <CheckIcon />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Multiple Locations Card */}
                <div style={{ background:"#0B1F3A", border:"2px solid #C9A84C", borderRadius:12, padding:"22px 20px", flex:1, minWidth:220, textAlign:"left", position:"relative" }}>
                  <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"#C9A84C", color:"#0B1F3A", fontSize:10, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", padding:"3px 12px", borderRadius:20, whiteSpace:"nowrap" }}>Most Popular</div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".18em", textTransform:"uppercase", color:"#C9A84C", marginBottom:6 }}>Multiple Locations</div>
                  <div style={{ display:"flex", alignItems:"baseline", gap:4, marginBottom:4 }}>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:38, color:"#fff", lineHeight:1 }}>$5.00</span>
                    <span style={{ fontSize:13, color:"#94a3b8", fontFamily:"'Barlow',sans-serif" }}>/user/month</span>
                  </div>
                  <p style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.6, margin:"0 0 14px" }}>
                    For companies operating across multiple client sites, regions, or schedules with manager and supervisor roles.
                  </p>
                  <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                    {MULTI.map(f => (
                      <li key={f} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:"#e2e8f0", marginBottom:6 }}>
                        <span style={{ width:16, height:16, borderRadius:"50%", background:"#C9A84C", display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                          <CheckIcon />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:10, padding:"14px 18px", textAlign:"left" }}>
                <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#8a6e2e" }}>AI Reporting Add-on — Optional</span>
                <span style={{ fontSize:13, color:"#374151", marginLeft:12 }}>$29.99/month or $299.99/year per organization. AI-assisted incident drafting and automated site summaries.</span>
              </div>
            </div>
          )}
          {current.sub && <p style={{ color:"#475569", fontSize:14, marginTop:10, maxWidth:440, lineHeight:1.7 }}>{current.sub}</p>}
        </div>

        {/* Dot indicators */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", margin:"22px 0" }}>
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)} style={{ width:8, height:8, borderRadius:"50%", border:"none", cursor:"pointer", padding:0, background: i === slide ? "#C9A84C" : i < slide ? "#0B1F3A" : "#e2e8f0", transition:"all .2s" }} />
          ))}
        </div>

        <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
          <button onClick={slide === 0 ? onBack : () => setSlide(s => s - 1)} style={secondaryBtn}>
            Back
          </button>
          <button onClick={current.isLast ? onComplete : () => setSlide(s => s + 1)} style={primaryBtn}>
            {current.isLast ? "Choose Your Plan" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"13px 36px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#e2e8f0", color:"#1e293b", padding:"13px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };