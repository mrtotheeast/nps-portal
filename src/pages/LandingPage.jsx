import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

const FEATURES = [
  { icon: <CalIcon />, name: "Officer Scheduling", desc: "Build and publish shift schedules. Manage availability, swap requests, and coverage across all sites." },
  { icon: <MapPinIcon />, name: "GPS Patrol Tracking", desc: "Real-time patrol route mapping, checkpoint scanning, and live officer location monitoring." },
  { icon: <ClockIcon />, name: "Geofenced Timekeeping", desc: "Clock in and out is automatically verified against your assigned site's geofence. No buddy punching." },
  { icon: <FileIcon />, name: "Incident Reporting", desc: "Officers submit detailed incident reports from the field. Supervisors review, comment, and approve." },
  { icon: <SparkIcon />, name: "AI Report Writing Add-on", desc: "AI-assisted drafting of professional incident reports. Available as an optional add-on for $29.99/month." },
  { icon: <BuildingIcon />, name: "Client Dashboard", desc: "Give your clients secure portal access to view schedules, incidents, patrol reports, and officer rosters." },
  { icon: <GradIcon />, name: "Training Records", desc: "Assign training modules, track completion, manage certifications, and issue digital badges." },
  { icon: <RadarIcon />, name: "Live Operations Map", desc: "See every active officer, patrol session, and site check-in on a unified live map in real time." },
  { icon: <ChatIcon />, name: "Team Messaging", desc: "Secure in-app messaging with direct and group channels. No personal phone numbers required." },
  { icon: <DollarIcon />, name: "Payroll Integration", desc: "Export timesheet data for payroll. Supports Paychex and standard CSV formats." },
];

const FAQ = [
  { q: "How does pricing work?", a: "NPS Portal charges per active user per month. The Single Location plan is $2.50 per user. The Multiple Locations plan is $5.00 per user. You are billed only for active team members." },
  { q: "Can I cancel at any time?", a: "Yes. There are no setup fees and no long-term contracts. Cancel from your admin dashboard at any time. Your subscription ends at the close of your current billing period." },
  { q: "What is the AI Reporting Add-on?", a: "The AI Reporting Add-on provides AI-assisted incident report writing and document generation. It is an optional add-on at $29.99 per month or $299.99 per year per organization, regardless of user count." },
  { q: "Is there a free trial?", a: "The landing page and public resources are free to browse. All app functionality requires a paid subscription. Company creation requires selecting and completing payment for a plan before access is granted." },
  { q: "How is our data secured?", a: "All data is encrypted in transit and at rest. Each company is assigned a unique identifier and all records are strictly isolated. No company ever sees another company's data." },
  { q: "What happens when I add more employees?", a: "Your subscription quantity updates automatically when you add active employees. The cost increase is calculated at your plan rate per user and reflects on your next billing statement." },
  { q: "Do you support multiple locations?", a: "Yes. The Multiple Locations plan supports unlimited sites, schedules, and regions with advanced reporting and role-based access controls across your entire organization." },
];

function CalIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function MapPinIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>; }
function ClockIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function FileIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>; }
function SparkIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function BuildingIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>; }
function GradIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>; }
function RadarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>; }
function ChatIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function DollarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function ChevronDownIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>; }

const SINGLE_FEATURES = [
  "Officer scheduling and availability",
  "Geofenced clock-in and clock-out",
  "GPS patrol tracking",
  "Incident reporting and approval",
  "Team messaging",
  "Training records management",
  "Client dashboard portal",
  "Payroll data export",
  "Single site or schedule",
];
const MULTI_FEATURES = [
  "Everything in Single Location",
  "Unlimited sites and schedules",
  "Multi-region oversight",
  "Custom role permissions",
  "Advanced reporting suite",
  "Manager and supervisor roles",
  "Data export controls",
  "Priority support",
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:"1px solid rgba(11,31,58,0.07)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 0", background:"none", border:"none", cursor:"pointer", textAlign:"left", gap:16 }}
      >
        <span style={{ fontFamily:"'Barlow',sans-serif", fontSize:15, fontWeight:600, color:"#0B1F3A" }}>{q}</span>
        <span style={{ color:"#C9A84C", flexShrink:0, transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }}><ChevronDownIcon /></span>
      </button>
      {open && <p style={{ fontSize:14, color:"#5B6E84", lineHeight:1.75, paddingBottom:16, margin:0 }}>{a}</p>}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, getRoleDashboard } = useAuth();

  const handleDashboard = () => {
    navigate(getRoleDashboard());
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&family=Barlow:wght@300;400;500;600&display=swap');
        .lp { font-family:'Barlow',sans-serif; color:#0B1F3A; overflow-x:hidden; }
        .lp *,
        .lp *::before,
        .lp *::after { box-sizing:border-box; }

        /* NAV */
        .lp-nav { position:sticky; top:0; z-index:100; height:56px; background:rgba(255,255,255,0.96); backdrop-filter:blur(14px); border-bottom:1px solid rgba(11,31,58,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 40px; }
        .lp-brand { display:flex; align-items:center; gap:8px; text-decoration:none; }
        .lp-brand-name { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:#0B1F3A; }
        .lp-brand-name em { color:#C9A84C; font-style:normal; }
        .lp-nav-links { display:flex; align-items:center; gap:24px; }
        .lp-nav-link { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:#5B6E84; text-decoration:none; transition:color .2s; background:none; border:none; cursor:pointer; padding:0; }
        .lp-nav-link:hover { color:#0B1F3A; }
        .lp-nav-cta { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; background:#0B1F3A; color:#C9A84C; padding:9px 22px; border:none; cursor:pointer; transition:all .2s; clip-path:polygon(6px 0%,100% 0%,calc(100% - 6px) 100%,0% 100%); }
        .lp-nav-cta:hover { background:#122847; }
        @media(max-width:640px) { .lp-nav { padding:0 20px; } .lp-nav-links { gap:12px; } .lp-nav-link { display:none; } }

        /* HERO */
        .lp-hero { position:relative; min-height:calc(100vh - 56px); display:flex; align-items:center; padding:80px 40px 80px; overflow:hidden; background:#fff; }
        .lp-hero::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse 80% 60% at 60% -10%, rgba(201,168,76,0.06) 0%, transparent 65%); pointer-events:none; }
        .lp-hero-grid { position:absolute; inset:0; background-image:linear-gradient(rgba(201,168,76,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.02) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; }
        .lp-hero-inner { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:1fr 480px; gap:64px; align-items:center; position:relative; z-index:1; }
        .lp-hero-eyebrow { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.28em; text-transform:uppercase; color:#C9A84C; margin-bottom:16px; }
        .lp-hero-h1 { font-family:'Bebas Neue',sans-serif; font-size:clamp(52px,7vw,84px); line-height:.92; letter-spacing:.03em; color:#0B1F3A; margin:0 0 20px; }
        .lp-hero-h1 em { color:#C9A84C; font-style:normal; display:block; }
        .lp-hero-sub { font-size:17px; color:#5B6E84; line-height:1.75; max-width:480px; margin:0 0 36px; }
        .lp-hero-btns { display:flex; gap:12px; flex-wrap:wrap; }
        .lp-btn-primary { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; background:#0B1F3A; color:#C9A84C; padding:15px 36px; border:none; cursor:pointer; transition:all .2s; clip-path:polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%); }
        .lp-btn-primary:hover { background:#122847; transform:translateY(-2px); box-shadow:0 12px 32px rgba(11,31,58,0.15); }
        .lp-btn-secondary { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; background:#fff; color:#0B1F3A; padding:14px 36px; border:1.5px solid rgba(11,31,58,0.18); cursor:pointer; transition:all .2s; }
        .lp-btn-secondary:hover { border-color:#0B1F3A; }
        .lp-hero-visual { display:flex; flex-direction:column; gap:12px; }
        .lp-stat-card { background:#fff; border:1px solid rgba(11,31,58,0.08); border-radius:10px; padding:18px 20px; box-shadow:0 2px 16px rgba(11,31,58,0.05); }
        .lp-stat-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#94a3b8; margin-bottom:4px; }
        .lp-stat-value { font-family:'Bebas Neue',sans-serif; font-size:36px; color:#0B1F3A; line-height:1; }
        .lp-stat-sub { font-size:12px; color:#5B6E84; margin-top:4px; }
        @media(max-width:900px) { .lp-hero-inner { grid-template-columns:1fr; gap:40px; } .lp-hero-visual { display:none; } .lp-hero { padding:60px 24px; min-height:auto; } }

        /* SECTION LAYOUT */
        .lp-section { padding:80px 40px; }
        .lp-section-alt { background:#F7F8FA; }
        .lp-container { max-width:1100px; margin:0 auto; }
        .lp-section-label { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.28em; text-transform:uppercase; color:#C9A84C; margin-bottom:10px; }
        .lp-section-title { font-family:'Bebas Neue',sans-serif; font-size:clamp(34px,5vw,50px); color:#0B1F3A; letter-spacing:.03em; margin:0 0 10px; }
        .lp-section-sub { font-size:16px; color:#5B6E84; line-height:1.7; max-width:560px; margin:0 0 48px; }
        @media(max-width:640px) { .lp-section { padding:56px 20px; } }

        /* FEATURES */
        .lp-features-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .lp-feat-card { background:#fff; border:1px solid rgba(11,31,58,0.07); border-radius:10px; padding:24px; }
        .lp-feat-icon { width:40px; height:40px; background:rgba(201,168,76,0.08); border-radius:8px; display:flex; align-items:center; justify-content:center; color:#C9A84C; margin-bottom:14px; }
        .lp-feat-name { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#0B1F3A; margin-bottom:8px; }
        .lp-feat-desc { font-size:14px; color:#5B6E84; line-height:1.7; }
        @media(max-width:900px) { .lp-features-grid { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:560px) { .lp-features-grid { grid-template-columns:1fr; } }

        /* PRICING */
        .lp-pricing-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:780px; }
        .lp-plan { background:#fff; border:1.5px solid rgba(11,31,58,0.1); border-radius:12px; padding:32px; position:relative; }
        .lp-plan-recommended { border-color:#C9A84C; }
        .lp-plan-badge { position:absolute; top:-12px; left:50%; transform:translateX(-50%); background:#C9A84C; color:#0B1F3A; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding:3px 14px; border-radius:20px; white-space:nowrap; }
        .lp-plan-name { font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:#5B6E84; margin-bottom:8px; }
        .lp-plan-price { font-family:'Bebas Neue',sans-serif; font-size:52px; color:#0B1F3A; line-height:1; }
        .lp-plan-per { font-family:'Barlow',sans-serif; font-size:14px; color:#94a3b8; margin:4px 0 20px; }
        .lp-plan-features { list-style:none; padding:0; margin:0 0 24px; }
        .lp-plan-features li { display:flex; align-items:flex-start; gap:10px; font-size:14px; color:#374151; margin-bottom:10px; line-height:1.5; }
        .lp-plan-features li span:first-child { color:#0B1F3A; flex-shrink:0; margin-top:1px; }
        .lp-ai-addon { background:rgba(201,168,76,0.04); border:1.5px solid rgba(201,168,76,0.25); border-radius:12px; padding:28px 32px; max-width:780px; margin-top:20px; }
        .lp-ai-addon-title { font-family:'Barlow Condensed',sans-serif; font-size:16px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0B1F3A; margin-bottom:6px; }
        .lp-ai-addon-price { font-family:'Bebas Neue',sans-serif; font-size:36px; color:#8a6e2e; }
        .lp-ai-addon-desc { font-size:14px; color:#5B6E84; line-height:1.7; margin-top:8px; }
        @media(max-width:640px) { .lp-pricing-grid { grid-template-columns:1fr; } }

        /* WHO WE SERVE */
        .lp-serve-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .lp-serve-card { background:#fff; border:1px solid rgba(11,31,58,0.07); border-radius:10px; padding:24px 20px; }
        .lp-serve-title { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:#0B1F3A; margin-bottom:10px; }
        .lp-serve-desc { font-size:14px; color:#5B6E84; line-height:1.7; }
        @media(max-width:640px) { .lp-serve-grid { grid-template-columns:1fr; } }

        /* GPS DISCLOSURE */
        .lp-gps-box { background:#fff; border:1px solid rgba(11,31,58,0.08); border-radius:10px; padding:28px 32px; max-width:720px; }
        .lp-gps-title { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#0B1F3A; margin-bottom:10px; }
        .lp-gps-text { font-size:14px; color:#5B6E84; line-height:1.75; }

        /* FAQ */
        .lp-faq-list { max-width:720px; }

        /* FOOTER */
        .lp-footer { background:#0B1F3A; color:#8ca3c0; padding:40px 40px 32px; }
        .lp-footer-inner { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr 1fr; gap:32px; margin-bottom:32px; }
        .lp-footer-col-title { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; color:#C9A84C; margin-bottom:14px; }
        .lp-footer-link { display:block; font-size:13px; color:#8ca3c0; text-decoration:none; margin-bottom:8px; transition:color .2s; }
        .lp-footer-link:hover { color:#C9A84C; }
        .lp-footer-bottom { max-width:1100px; margin:0 auto; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
        .lp-footer-copy { font-size:12px; color:rgba(255,255,255,0.25); }
        @media(max-width:640px) { .lp-footer-inner { grid-template-columns:1fr; } .lp-footer { padding:32px 20px 24px; } }
      `}</style>

      <div className="lp">
        {/* NAV */}
        <nav className="lp-nav">
          <a href="/" className="lp-brand">
            <img src={SHIELD_URL} alt="NPS Portal" style={{ width:26, height:26, objectFit:"contain" }} />
            <span className="lp-brand-name">NPS <em>Portal</em></span>
          </a>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <button onClick={() => base44.auth.redirectToLogin()} className="lp-nav-link">Sign In</button>
            <button onClick={() => window.location.href = "/onboarding"} className="lp-nav-cta">Get Started</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-grid" />
          <div className="lp-hero-inner">
            <div>
              <div className="lp-hero-eyebrow">Security Workforce Management</div>
              <h1 className="lp-hero-h1">Run Your Security<em>Operation</em></h1>
              <p className="lp-hero-sub">
                NPS Portal is a complete workforce management platform for security companies.
                Schedule officers, track patrols, report incidents, and oversee your entire operation from a single secure dashboard.
              </p>
              {user && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={handleDashboard}
                    style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", background:"#C9A84C", color:"#0B1F3A", padding:"16px 40px", border:"none", cursor:"pointer", transition:"all .2s", clipPath:"polygon(10px 0%,100% 0%,calc(100% - 10px) 100%,0% 100%)", display:"inline-block" }}
                    onMouseEnter={e => { e.currentTarget.style.background="#b8922a"; e.currentTarget.style.transform="translateY(-2px)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background="#C9A84C"; e.currentTarget.style.transform="none"; }}
                  >
                    ⚡ Go to My Dashboard
                  </button>
                </div>
              )}
              <div className="lp-hero-btns">
                <button onClick={() => base44.auth.redirectToLogin()} className="lp-btn-primary">Sign In</button>
                <button onClick={() => window.location.href = "/onboarding"} className="lp-btn-secondary">Register Your Company</button>
              </div>
              <p style={{ fontSize:13, color:"#94a3b8", marginTop:16 }}>
                From $2.50 per user per month. No setup fees. Cancel anytime.
              </p>
            </div>
            <div className="lp-hero-visual">
              <div className="lp-stat-card">
                <div className="lp-stat-label">Pricing Model</div>
                <div className="lp-stat-value">$2.50</div>
                <div className="lp-stat-sub">per user per month — Single Location</div>
              </div>
              <div className="lp-stat-card">
                <div className="lp-stat-label">Multi-Location Plan</div>
                <div className="lp-stat-value">$5.00</div>
                <div className="lp-stat-sub">per user per month — Unlimited sites</div>
              </div>
              <div className="lp-stat-card">
                <div className="lp-stat-label">AI Reporting Add-on</div>
                <div className="lp-stat-value">$29.99</div>
                <div className="lp-stat-sub">per month per organization — optional</div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-label">Platform Features</div>
            <h2 className="lp-section-title">Everything You Need to Run Your Team</h2>
            <p className="lp-section-sub">Built specifically for armed and unarmed security operations. Every feature in one platform, accessible on any device.</p>
            <div className="lp-features-grid">
              {FEATURES.map(f => (
                <div key={f.name} className="lp-feat-card">
                  <div className="lp-feat-icon">{f.icon}</div>
                  <div className="lp-feat-name">{f.name}</div>
                  <div className="lp-feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHO WE SERVE */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section-label">Who We Serve</div>
            <h2 className="lp-section-title">Built for Security Operations</h2>
            <p className="lp-section-sub">NPS Portal serves security companies of all sizes, from small local agencies to multi-state contract security organizations.</p>
            <div className="lp-serve-grid">
              <div className="lp-serve-card">
                <div className="lp-serve-title">Contract Security Companies</div>
                <div className="lp-serve-desc">Manage officers across multiple client sites, generate client-facing reports, track patrol routes, and handle billing and invoicing from a single dashboard.</div>
              </div>
              <div className="lp-serve-card">
                <div className="lp-serve-title">Staffing Agencies</div>
                <div className="lp-serve-desc">Place armed and unarmed officers at client locations, manage W2 and 1099 workers, track credentials and certifications, and handle payroll export.</div>
              </div>
              <div className="lp-serve-card">
                <div className="lp-serve-title">In-House Security Departments</div>
                <div className="lp-serve-desc">Run a professional internal security team with scheduling, incident documentation, training compliance, and supervisor oversight tools built in from day one.</div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-label">Pricing</div>
            <h2 className="lp-section-title">Simple Per-User Pricing</h2>
            <p className="lp-section-sub">Pay only for active users. Scale up or down as your team changes. No contracts, no setup fees, no surprises.</p>
            <div className="lp-pricing-grid">
              <div className="lp-plan">
                <div className="lp-plan-name">Single Location</div>
                <div className="lp-plan-price">$2.50</div>
                <div className="lp-plan-per">per user / per month</div>
                <ul className="lp-plan-features">
                  {SINGLE_FEATURES.map(f => (
                    <li key={f}><span><CheckIcon /></span><span>{f}</span></li>
                  ))}
                </ul>
                <button onClick={() => window.location.href="/onboarding"} className="lp-btn-primary" style={{ width:"100%", textAlign:"center" }}>Get Started</button>
              </div>
              <div className="lp-plan lp-plan-recommended">
                <div className="lp-plan-badge">Recommended</div>
                <div className="lp-plan-name">Multiple Locations</div>
                <div className="lp-plan-price">$5.00</div>
                <div className="lp-plan-per">per user / per month</div>
                <ul className="lp-plan-features">
                  {MULTI_FEATURES.map(f => (
                    <li key={f}><span><CheckIcon /></span><span>{f}</span></li>
                  ))}
                </ul>
                <button onClick={() => window.location.href="/onboarding"} className="lp-btn-primary" style={{ width:"100%", textAlign:"center" }}>Get Started</button>
              </div>
            </div>
            <div className="lp-ai-addon">
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div className="lp-ai-addon-title">AI Reporting Add-on — Optional</div>
                  <div className="lp-ai-addon-price">$29.99<span style={{ fontSize:18, fontWeight:400, color:"#94a3b8" }}>/month</span></div>
                  <div style={{ fontSize:13, color:"#94a3b8", marginTop:4 }}>or $299.99/year per organization</div>
                  <div className="lp-ai-addon-desc">AI-assisted incident report drafting, automated weekly site summaries, and AI-powered training content generation. Flat rate per organization regardless of user count. Add or remove at any time from your admin dashboard.</div>
                </div>
              </div>
            </div>
            <p style={{ fontSize:13, color:"#94a3b8", marginTop:20 }}>Month-to-month or annual billing. Cancel anytime. Payments processed securely via Stripe.</p>
          </div>
        </section>

        {/* GPS DISCLOSURE */}
        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-section-label">Location Services</div>
            <h2 className="lp-section-title">How We Use GPS</h2>
            <p className="lp-section-sub">NPS Portal uses device location services for operational purposes only. Here is exactly how your location data is used.</p>
            <div className="lp-gps-box">
              <div className="lp-gps-title">GPS and Location Services Disclosure</div>
              <p className="lp-gps-text" style={{ marginBottom:16 }}>
                NPS Portal uses your device location for three specific operational purposes. Location is only active during your shift and is never collected in the background.
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ color:"#C9A84C", fontWeight:700, flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:16 }}>1.</span>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:"#0B1F3A", marginBottom:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".04em", textTransform:"uppercase" }}>Geofenced Clock-In and Clock-Out</p>
                    <p className="lp-gps-text">When you tap Clock In or Clock Out, your GPS coordinates are captured and compared against the geofence boundary of your assigned work site. For example: an officer assigned to Riverside Corporate Park must be within 300 feet of that address before the system allows them to clock in. This prevents buddy punching and confirms on-site presence.</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ color:"#C9A84C", fontWeight:700, flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:16 }}>2.</span>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:"#0B1F3A", marginBottom:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".04em", textTransform:"uppercase" }}>Patrol Route Tracking</p>
                    <p className="lp-gps-text">During an active patrol session, the officer's GPS coordinates are recorded at each checkpoint scan to build a verified route log. For example: an officer patrolling a parking structure has their location recorded at Checkpoint A (Level 1), Checkpoint B (Level 3), and Checkpoint C (Rooftop) in sequence. Supervisors can review the full route and confirm every checkpoint was physically visited in the correct order.</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:12 }}>
                  <span style={{ color:"#C9A84C", fontWeight:700, flexShrink:0, fontFamily:"'Barlow Condensed',sans-serif", fontSize:16 }}>3.</span>
                  <div>
                    <p style={{ fontSize:14, fontWeight:700, color:"#0B1F3A", marginBottom:4, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".04em", textTransform:"uppercase" }}>Site Check-In Verification</p>
                    <p className="lp-gps-text">When an officer performs a manual site check-in, their GPS coordinates are saved alongside the timestamp in the timesheet record. For example: an officer checking in to a hospital campus at 10:04 PM has their latitude/longitude logged so a supervisor reviewing the record can confirm they were physically present at that location at that time.</p>
                  </div>
                </div>
              </div>
              <p className="lp-gps-text" style={{ marginTop:18, fontSize:13, color:"#94a3b8" }}>
                Location data is never tracked outside of active shift or patrol sessions. It is never sold, never shared with third parties, and is encrypted in transit and at rest in compliance with applicable data protection requirements.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-section lp-section-alt">
          <div className="lp-container">
            <div className="lp-section-label">Frequently Asked Questions</div>
            <h2 className="lp-section-title">Common Questions</h2>
            <div className="lp-faq-list">
              {FAQ.map(item => <FAQItem key={item.q} {...item} />)}
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section style={{ background:"#0B1F3A", padding:"64px 40px", textAlign:"center" }}>
          <div style={{ maxWidth:600, margin:"0 auto" }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".28em", textTransform:"uppercase", color:"#C9A84C", marginBottom:14 }}>Get Started Today</div>
            <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#fff", letterSpacing:".03em", margin:"0 0 16px" }}>Ready to Run a Better Operation?</h2>
            <p style={{ fontSize:16, color:"#8ca3c0", lineHeight:1.7, marginBottom:32 }}>Create your company account in minutes. Select a plan, set up your profile, and invite your team — all before your first shift.</p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => base44.auth.redirectToLogin()} style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:".14em", textTransform:"uppercase", background:"transparent", color:"#C9A84C", padding:"14px 32px", border:"1.5px solid rgba(201,168,76,0.4)", cursor:"pointer" }}>
                Sign In to My Company
              </button>
              <button onClick={() => window.location.href="/onboarding"} className="lp-btn-primary">
                Create Your Company Account
              </button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <div>
              <div className="lp-footer-col-title">NPS Portal</div>
              <p style={{ fontSize:13, color:"#8ca3c0", lineHeight:1.7 }}>Security workforce management for armed and unarmed officer operations.</p>
            </div>
            <div>
              <div className="lp-footer-col-title">Platform</div>
              <a href="#features" className="lp-footer-link">Features</a>
              <a href="#pricing" className="lp-footer-link">Pricing</a>
              <a href="#faq" className="lp-footer-link">FAQ</a>
              <a href="/onboarding" className="lp-footer-link">Get Started</a>
            </div>
            <div>
              <div className="lp-footer-col-title">Support</div>
              <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" className="lp-footer-link">Help and Support</a>
              <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" className="lp-footer-link">Terms of Service</a>
              <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" className="lp-footer-link">Privacy Policy</a>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span className="lp-footer-copy">NPS Portal. All rights reserved.</span>
            <div style={{ display:"flex", gap:16 }}>
              <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" className="lp-footer-link" style={{ marginBottom:0 }}>Terms of Service</a>
              <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" className="lp-footer-link" style={{ marginBottom:0 }}>Privacy Policy</a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}