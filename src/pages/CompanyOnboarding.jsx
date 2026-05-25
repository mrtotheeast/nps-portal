import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import OnboardingAdminCheck from "@/components/onboarding/OnboardingAdminCheck";
import OnboardingFeatureTour from "@/components/onboarding/OnboardingFeatureTour";
import OnboardingBillingTerms from "@/components/onboarding/OnboardingBillingTerms";
import OnboardingPlanSelect from "@/components/onboarding/OnboardingPlanSelect.jsx";
import OnboardingCompanyProfile from "@/components/onboarding/OnboardingCompanyProfile";
import OnboardingAIUpsell from "@/components/onboarding/OnboardingAIUpsell";
import OnboardingTeamSetup from "@/components/onboarding/OnboardingTeamSetup";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

// Step labels for the progress bar (steps 1-6 visible)
const STEP_LABELS = ["Overview", "Billing Terms", "Select Plan", "Company Profile", "AI Add-on", "Invite Team"];

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const { user, isLoadingAuth, getRoleDashboard } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ plan: null, companyProfile: null, aiAddon: null, invitesSent: 0 });

  // Guard: authenticated users must never enter the onboarding flow
  useEffect(() => {
    if (!isLoadingAuth && user) {
      navigate(getRoleDashboard(), { replace: true });
    }
  }, [user, isLoadingAuth]);

  // Support returning from Stripe checkout via query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    const planParam = params.get("plan");
    const aiParam = params.get("ai");
    if (stepParam) {
      const s = parseInt(stepParam, 10);
      if (!isNaN(s)) setStep(s);
      const cycleParam = params.get("cycle") || "monthly";
      if (planParam) setData(d => ({ ...d, plan: { tier: planParam, cycle: cycleParam, pricePerUser: planParam === "multi" ? 5.00 : 2.50, userCount: 1 } }));
      if (aiParam) setData(d => ({ ...d, aiAddon: { purchased: true, plan: aiParam } }));
    }
  }, []);

  const goNext = () => setStep(s => s + 1);
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const handlePlanSelected = (plan) => { setData(d => ({ ...d, plan })); goNext(); };
  const handleProfileDone = (profile) => { setData(d => ({ ...d, companyProfile: profile })); goNext(); };
  const handleAIDone = (aiAddon) => { setData(d => ({ ...d, aiAddon })); goNext(); };
  const handleTeamDone = (result) => { setData(d => ({ ...d, ...result })); goNext(); };

  const showProgress = step >= 1 && step <= 6;

  // Don't render onboarding while auth is still loading or if user is already logged in
  if (isLoadingAuth || user) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <img src={SHIELD_URL} alt="Loading" style={{ width:48, height:48, opacity:.4 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#fff", fontFamily:"'Barlow',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@300;400;500;600;700&family=Barlow:wght@300;400;500;600&display=swap');
        .ob-nav { position:sticky; top:0; z-index:100; background:rgba(255,255,255,0.97); backdrop-filter:blur(14px); border-bottom:1px solid rgba(11,31,58,0.09); height:54px; display:flex; align-items:center; justify-content:space-between; padding:0 28px; box-shadow:0 1px 12px rgba(11,31,58,0.04); }
        .ob-brand { display:flex; align-items:center; gap:8px; text-decoration:none; }
        .ob-brand-name { font-family:'Barlow Condensed',sans-serif; font-size:15px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#0B1F3A; }
        .ob-brand-name em { color:#C9A84C; font-style:normal; }
        .ob-steps { display:flex; align-items:center; }
        .ob-step { display:flex; align-items:center; gap:6px; padding:0 8px; font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#cbd5e1; }
        .ob-step.active { color:#0B1F3A; }
        .ob-step.done { color:#C9A84C; }
        .ob-step-num { width:20px; height:20px; border-radius:50%; border:1.5px solid currentColor; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; }
        .ob-sep { width:18px; height:1px; background:#e2e8f0; }
        @media(max-width:600px) { .ob-steps { display:none; } }
      `}</style>

      <nav className="ob-nav">
        <Link to="/" className="ob-brand">
          <img src={SHIELD_URL} alt="NPS Portal" style={{ width:26, height:26, objectFit:"contain" }} />
          <span className="ob-brand-name">NPS <em>Portal</em></span>
        </Link>
        {showProgress && (
          <div className="ob-steps">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const cls = step === stepNum ? "ob-step active" : step > stepNum ? "ob-step done" : "ob-step";
              return (
                <React.Fragment key={stepNum}>
                  {i > 0 && <div className="ob-sep" />}
                  <div className={cls}>
                    <div className="ob-step-num">
                      {step > stepNum
                        ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : stepNum}
                    </div>
                    <span>{label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
        <div style={{ width:80 }} />
      </nav>

      {step === 0 && <OnboardingAdminCheck onYes={goNext} />}
      {step === 1 && <OnboardingFeatureTour onComplete={goNext} onBack={goBack} />}
      {step === 2 && <OnboardingBillingTerms onComplete={goNext} onBack={goBack} />}
      {step === 3 && <OnboardingPlanSelect onComplete={handlePlanSelected} onBack={goBack} data={data} />}
      {step === 4 && <OnboardingCompanyProfile onComplete={handleProfileDone} onBack={goBack} plan={data.plan} />}
      {step === 5 && <OnboardingAIUpsell onComplete={handleAIDone} onBack={goBack} companyProfile={data.companyProfile} />}
      {step === 6 && <OnboardingTeamSetup onComplete={handleTeamDone} onBack={goBack} data={data} />}
      {step === 7 && <OnboardingComplete data={data} />}
    </div>
  );
}