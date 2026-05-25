import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import confetti from "canvas-confetti";

// Each step can have a `selector` (CSS selector to highlight) or an `icon` (emoji for illustration)
const ROLE_STEPS = {
  admin: [
    {
      title: "Dashboard Overview",
      description: "Your admin dashboard shows system-wide statistics, pending approvals, and compliance reports at a glance.",
      selector: null,
      icon: "📊",
    },
    {
      title: "Employee Management",
      description: "Tap 'More' → Employee Directory to manage your team, assign roles, track credentials, and handle onboarding.",
      selector: null,
      icon: "👥",
      navHint: "More → Employee Directory",
    },
    {
      title: "Scheduling",
      description: "Use the 'Schedule' tab to create and manage shifts, assign officers to sites, and track coverage.",
      selector: null,
      icon: "📅",
      navHint: "Bottom Nav → Schedule",
    },
    {
      title: "Incident Reports",
      description: "Review and approve incident reports from the More menu → Incident Management.",
      selector: null,
      icon: "🚨",
      navHint: "More → Incident Management",
    },
  ],
  supervisor: [
    {
      title: "Supervisor Dashboard",
      description: "Monitor active patrols, review pending incidents, and oversee daily operations.",
      selector: null,
      icon: "🖥️",
    },
    {
      title: "Live Map Tracking",
      description: "Tap 'Live Map' in the bottom nav to track officers in real-time with GPS.",
      selector: null,
      icon: "🗺️",
      navHint: "Bottom Nav → Live Map",
    },
    {
      title: "Approval Workflow",
      description: "Review and approve timesheets, incident reports, and GPS violations from the More menu.",
      selector: null,
      icon: "✅",
      navHint: "More → Approvals",
    },
  ],
  officer: [
    {
      title: "Officer Dashboard",
      description: "Your dashboard shows active patrols, assigned tasks, and nearby incidents.",
      selector: null,
      icon: "🛡️",
    },
    {
      title: "Start Patrol",
      description: "Tap 'Patrol' in the bottom nav to begin your route, scan QR checkpoints, and track your progress.",
      selector: null,
      icon: "🚶",
      navHint: "Bottom Nav → Patrol",
    },
    {
      title: "Report Incidents",
      description: "Quickly document incidents with photos and detailed reports via the More menu.",
      selector: null,
      icon: "📝",
      navHint: "More → Report Incident",
    },
    {
      title: "Timesheet",
      description: "Clock in/out, track your hours, and submit timesheets for approval.",
      selector: null,
      icon: "⏱️",
      navHint: "Bottom Nav → Timesheet",
    },
  ],
  employee: [
    {
      title: "Your Home Base",
      description: "View your upcoming shifts, training assignments, and company announcements right here.",
      selector: null,
      icon: "🏠",
    },
    {
      title: "Schedule & Shifts",
      description: "Check your work schedule and see upcoming assignments.",
      selector: null,
      icon: "📅",
      navHint: "Bottom Nav → Schedule",
    },
    {
      title: "Training & Development",
      description: "Complete required training courses and earn certifications.",
      selector: null,
      icon: "🎓",
      navHint: "More → My Trainings",
    },
    {
      title: "Time Tracking",
      description: "Clock in and out for shifts and track your hours.",
      selector: null,
      icon: "⏱️",
      navHint: "Bottom Nav → Timesheet",
    },
  ],
  client: [
    {
      title: "Your Client Dashboard",
      description: "Monitor your sites, view summary stats, and access everything from this central hub.",
      selector: null,
      icon: "📊",
    },
    {
      title: "My Sites",
      description: "Scroll down to see all your assigned sites and their current status.",
      selector: null,
      icon: "🏢",
      navHint: "Scroll down → My Sites",
    },
    {
      title: "Incident Reports",
      description: "View and track any incidents reported at your sites.",
      selector: null,
      icon: "🚨",
      navHint: "Quick Links → Reports",
    },
    {
      title: "Contact Us",
      description: "Send messages directly to your NPS account manager through the portal.",
      selector: null,
      icon: "💬",
      navHint: "Quick Links → Contact Us",
    },
  ],
};

const DASHBOARD_MAP = {
  admin: "AdminDashboard",
  manager: "AdminDashboard",
  supervisor: "SupervisorDashboard",
  client: "ClientDashboard",
  officer: "OfficerDashboard",
  employee: "EmployeeHome",
};

export default function AppTour({ userRole }) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const shouldStart = localStorage.getItem("startTour") === "true";
    const hasCompleted = localStorage.getItem("completedTour") === "true";
    const neverShow = localStorage.getItem("neverShowTour") === "true";
    if (shouldStart) { setOpen(true); localStorage.removeItem("startTour"); }
    else if (!hasCompleted && !neverShow) setOpen(true);
  }, []);

  const steps = [
    { title: "Welcome to NPS Portal! 👋", description: "Let's take a quick tour of the key features available to you. This will only take a minute!", icon: "🎉" },
    ...(ROLE_STEPS[userRole] || ROLE_STEPS.employee),
    { title: "You're All Set! 🎊", description: "You can restart this tour anytime from Settings. Enjoy using NPS Portal!", icon: "✨" },
  ];

  const handleNext = () => currentStep < steps.length - 1 ? setCurrentStep(s => s + 1) : handleComplete();
  const handlePrev = () => setCurrentStep(s => s - 1);

  const handleComplete = () => {
    localStorage.setItem("completedTour", "true");
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    setOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem("completedTour", "true");
    localStorage.setItem("neverShowTour", "true");
    setOpen(false);
  };

  if (!open) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(2px)" }}
      />

      {/* Tour card — centered on screen */}
      <div
        className="fixed z-[9999] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm"
        style={{ maxHeight: "85vh" }}
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-[#c9a227] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Icon illustration area */}
          <div className="bg-gradient-to-br from-[#0b1f3a] to-[#1a2b4a] px-6 py-8 text-center">
            <div className="text-6xl mb-3">{step.icon || "📱"}</div>
            {step.navHint && (
              <div className="inline-flex items-center gap-2 bg-[#c9a227]/20 border border-[#c9a227]/40 rounded-full px-4 py-1.5 mt-2">
                <span className="text-[#c9a227] text-xs font-semibold tracking-wide">{step.navHint}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h2>
            <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
          </div>

          {/* Step dots + navigation */}
          <div className="px-6 pb-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? "bg-[#c9a227] w-5" : idx < currentStep ? "bg-[#c9a227]/40 w-1.5" : "bg-slate-200 w-1.5"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="text-slate-500 hover:text-slate-700 px-2">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold px-5"
              >
                {isLast ? "Get Started" : "Next"}
                {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>

          {/* Skip link */}
          {!isLast && (
            <div className="px-6 pb-4 text-center">
              <button onClick={handleSkip} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}