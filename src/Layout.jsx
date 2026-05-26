import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { NavigationHistoryProvider, useNavigationHistory } from "@/components/mobile/NavigationHistory";
import { useDualView } from "@/context/DualViewContext";
import SplashScreen from "@/components/shared/SplashScreen";
import { getEffectiveTheme, setManualTheme } from "@/components/shared/ThemeManager";
import {
  Home, Calendar, BarChart3, Menu, Clock, Shield, Users, Building2,
  FileText, MessageSquare, Settings, LogOut, ChevronDown, User,
  MapPin, X, GraduationCap, Receipt, AlertTriangle, ClipboardList,
  Briefcase, Award, Map, DollarSign, ArrowLeft, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import EmergencyAlertModal from "@/components/notifications/EmergencyAlertModal";
import HeaderChatPanel from "@/components/chat/HeaderChatPanel";
import NotificationBell from "@/components/notifications/NotificationBell";
import DocumentAcknowledgmentModal from "@/components/legal/DocumentAcknowledgmentModal";
import AppTour from "@/components/shared/AppTour";
import OfflineIndicator from "@/components/shared/OfflineIndicator";
import PushNotificationManager from "@/components/notifications/PushNotificationManager";
import PageTransition from "@/components/mobile/PageTransition";
import DualViewToggle from "@/components/shared/DualViewToggle";
import SessionManager from "@/components/session/SessionManager";
import ForcePasswordChange from "@/components/shared/ForcePasswordChange";
import LocationPermissionExplanation from "@/components/permissions/LocationPermissionExplanation";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIPurchaseModal from "@/components/ai/AIPurchaseModal";
import { Lock, Sparkles } from "lucide-react";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

const SUBSCRIPTION_GATED_PAGES = new Set([
  // Scheduling
  'Schedule', 'Scheduling',
  // Reports
  'Reports', 'ReportingDashboard', 'ReportAutomation', 'AIReports', 'AIReportsNew',
  'WeeklySiteReports', 'MonthlySiteReport', 'IncidentSummaryReport',
  // Incidents
  'IncidentForm', 'IncidentFormAI', 'IncidentManagement', 'IncidentApproval',
  'IncidentReports', 'IncidentAnalysis', 'AIIncidentAnalysis',
  // AI Features
  'AITrainingBuilder', 'TrainingGeneratorAI', 'TrainingSuggestions',
]);

let splashShown = false;
let swRegistered = false; // prevent repeated SW registrations
let passwordCheckDone = false; // module-level guard — survives re-renders

const ROOT_PAGES = new Set([
  "AdminDashboard", "ManagerDashboard", "SupervisorDashboard", "OfficerDashboard", "EmployeeHome",
  "ClientDashboard", "Scheduling", "Reports", "AdminMore", "SupervisorMore", "ManagerMore",
  "EmployeeMore", "ClientMore", "Timesheet", "Patrol", "LiveMap"
]);

function LayoutInner({ children, currentPageName }) {
  const { user, isLoadingAuth, authChecked } = useAuth();
  const { company, loading: companyLoading } = useCompany();
  const [showSplash, setShowSplash] = useState(() => !splashShown);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => getEffectiveTheme() === "dark");
  const navigate = useNavigate();
  const location = useLocation();
  const { pushHistory } = useNavigationHistory();
  const { showPermissionDialog, handlePermissionAccepted, handlePermissionDenied, resetLocationPermission } = useLocationPermission();
  const { hasAccess: hasSubscription, isLoading: subLoading } = useAIAccess();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const isGatedPage = SUBSCRIPTION_GATED_PAGES.has(currentPageName);
  const showGate = isGatedPage && !subLoading && !hasSubscription;

  // Auto-open modal when navigating to a gated page without access
  React.useEffect(() => {
    if (showGate) setShowUpgradeModal(true);
  }, [showGate]);

  // Sync toggle state when theme changes externally (OS, time, etc.)
  useEffect(() => {
    const sync = () => setIsDark(getEffectiveTheme() === "dark");
    window.addEventListener("nps-theme-changed", sync);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("nps-theme-changed", sync);
      mq.removeEventListener("change", sync);
    };
  }, []);

  const handleThemeToggle = () => {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    setManualTheme(next);
  };

  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Cache username in sessionStorage for offline access
  useEffect(() => {
    if (user?.full_name) {
      sessionStorage.setItem("nps_user_name", user.full_name);
    }
  }, [user?.full_name]);

  // Check must_change_password exactly once per session (module-level guard)
  useEffect(() => {
    if (!user?.email || passwordCheckDone) return;
    passwordCheckDone = true;
    const checkPromise = base44.entities.Employee.filter({ email: user.email });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Password check timeout")), 3000)
    );
    Promise.race([checkPromise, timeoutPromise])
      .then(employees => {
        if (employees.length > 0 && employees[0].must_change_password === true) {
          setMustChangePassword(true);
        }
      })
      .catch(e => console.warn("Could not check must_change_password (failing open):", e.message));
  }, [user?.email]);

  useEffect(() => {
    registerServiceWorker();
    initOfflineCapabilities();
  }, []);

  const initOfflineCapabilities = async () => {
    try {
    } catch (error) {
      console.error('Failed to initialize offline capabilities:', error);
    }
  };

  useEffect(() => {
  }, []);

  const registerServiceWorker = async () => {
    if (swRegistered || !('serviceWorker' in navigator)) return;
    swRegistered = true;
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  };

  const handleLogout = () => { base44.auth.logout(); };

  const userRole = user?.role_type || user?.role || "employee";
  const isAdmin = ["admin", "super_admin"].includes(userRole) || user?.role === "admin";
  const isManager = userRole === "manager";
  const isSupervisor = userRole === "supervisor";
  const isEmployee = ["employee", "officer"].includes(userRole);
  const isClient = userRole === "client";
  const { activeView } = useDualView();

  const getNavItems = () => {
    if (isAdmin) return [
      { name: "Dashboard", icon: Home, page: "AdminDashboard" },
      { name: "Schedule", icon: Calendar, page: "Scheduling" },
      { name: "Reports", icon: BarChart3, page: "Reports" },
      { name: "More", icon: Menu, page: "AdminMore" },
    ];
    if (isManager) return [
      { name: "Dashboard", icon: Home, page: "ManagerDashboard" },
      { name: "Schedule", icon: Calendar, page: "Scheduling" },
      { name: "Reports", icon: BarChart3, page: "Reports" },
      { name: "More", icon: Menu, page: "ManagerMore" },
    ];
    if (isSupervisor) {
      if (activeView === "employee") return [
        { name: "Home", icon: Home, page: "EmployeeHome" },
        { name: "Timesheet", icon: Clock, page: "Timesheet" },
        { name: "Patrol", icon: Shield, page: "Patrol" },
        { name: "More", icon: Menu, page: "EmployeeMore" },
      ];
      return [
        { name: "Dashboard", icon: Home, page: "SupervisorDashboard" },
        { name: "Live Map", icon: Map, page: "LiveMap" },
        { name: "More", icon: Menu, page: "SupervisorMore" },
      ];
    }
    if (isClient) return [
      { name: "Dashboard", icon: Home, page: "ClientDashboard" },
      { name: "More", icon: Menu, page: "ClientMore" },
    ];
    if (userRole === "officer") return [
      { name: "Dashboard", icon: Home, page: "OfficerDashboard" },
      { name: "Timesheet", icon: Clock, page: "Timesheet" },
      { name: "Patrol", icon: Shield, page: "Patrol" },
      { name: "More", icon: Menu, page: "EmployeeMore" },
    ];
    return [
      { name: "Home", icon: Home, page: "EmployeeHome" },
      { name: "Timesheet", icon: Clock, page: "Timesheet" },
      { name: "Patrol", icon: Shield, page: "Patrol" },
      { name: "More", icon: Menu, page: "EmployeeMore" },
    ];
  };

  const navItems = getNavItems();
  const isSubPage = !ROOT_PAGES.has(currentPageName);

  const handleTabClick = (e, item) => {
    // Just record history, don't alter navigation
    const currentPath = location.pathname + location.search;
    pushHistory(item.page, currentPath);
  };

  const handleSplashComplete = useCallback(() => {
    splashShown = true;
    setShowSplash(false);
  }, []);

  const noLayoutPages = ["ForgotPassword"];
  if (noLayoutPages.includes(currentPageName)) return children;

  if (showSplash) return <SplashScreen onComplete={handleSplashComplete} />;

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!authChecked) { return null; }
  if (!user) { window.location.href = "/Login"; return null; }

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  return (
    <div className="h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden">
      <style>{`
        :root { --nps-navy: #1a2b4a; --nps-navy-light: #2d4a6f; --nps-gold: #c9a227; --nps-gold-light: #e6c35c; }
        body { overscroll-behavior: none; }
        main { overflow-y: auto; }
        header, nav { user-select: none; -webkit-user-select: none; }
        @media (max-width: 768px) { button, input, select, textarea, [role="button"] { min-height: 44px; } }
        .safe-area-top    { padding-top:    env(safe-area-inset-top,    0px); }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .safe-area-left   { padding-left:   env(safe-area-inset-left,   0px); }
        .safe-area-right  { padding-right:  env(safe-area-inset-right,  0px); }
        .card-item, .list-item { transition: all 0.15s ease; }
        .card-item:active, .list-item:active { transform: scale(0.98); opacity: 0.9; }
        @media (hover: hover) { .card-item:hover, .list-item:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); } }
        @media (prefers-color-scheme: dark) { :root { color-scheme: dark; } }
      `}</style>

      {mustChangePassword && user && (
        <ForcePasswordChange user={user} onComplete={handlePasswordChanged} />
      )}
      <LocationPermissionExplanation 
        open={showPermissionDialog} 
        onAccept={handlePermissionAccepted}
        onCancel={handlePermissionDenied}
      />
      <OfflineIndicator />
      {user && <PushNotificationManager userId={user.id} />}
      {user && ['officer', 'employee'].includes(userRole) && <EmergencyAlertModal userId={user.id} />}
      {user && <DocumentAcknowledgmentModal userId={user.id} />}
      {user && <AppTour userRole={userRole} />}
      {user && <SessionManager user={user} currentPageName={currentPageName} />}

      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between safe-area-left safe-area-right">
          <Link to={createPageUrl(navItems[0].page)} className="flex items-center gap-2">
            {company?.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            ) : (
              <img src={SHIELD_URL} alt="NPS Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            )}
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{company?.name || "NPS Portal"}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{company ? "Portal" : "NPS Portal"}</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const activeColor = company?.primary_color || "#c9a227";
              const isActive = currentPageName === item.page;
              return (
                <Link key={item.page} to={createPageUrl(item.page)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg transition-all", isActive ? "text-[#1a2b4a] font-semibold" : "text-slate-600 hover:bg-slate-50")} style={isActive ? { backgroundColor: activeColor } : {}}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <DualViewToggle />
            <HeaderChatPanel currentUser={user} />
            <Button
              variant="ghost"
              size="icon"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px]"
              onClick={handleThemeToggle}
            >
              {isDark ? <Sun className="w-5 h-5 text-[#c9a227]" /> : <Moon className="w-5 h-5" />}
            </Button>
            {user && <NotificationBell user={user} />}
            {/* Desktop user dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px]">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.profile_photo} />
                      <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] font-semibold">{user?.full_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{user?.full_name}</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="font-semibold">{user?.full_name}</p>
                    <p className="text-sm text-slate-500">{user?.email}</p>
                    <Badge className={`mt-1 ${userRole === "super_admin" ? "bg-[#c9a227] text-[#1a2b4a]" : "bg-[#1a2b4a]"}`}>
                      {userRole === "super_admin" ? "SUPER ADMIN" : userRole.replace(/_/g, " ").toUpperCase()}
                    </Badge>
                  </div>
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Profile"))}><User className="w-4 h-4 mr-2" />My Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(createPageUrl("Settings"))}><Settings className="w-4 h-4 mr-2" />Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={resetLocationPermission}><MapPin className="w-4 h-4 mr-2" />Preview Location Dialog</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Mobile hamburger menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-slate-600 dark:text-slate-300">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0 flex flex-col">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  {/* User info header */}
                  <div className="bg-[#1a2b4a] p-5 flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user?.profile_photo} />
                      <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] font-bold text-lg">{user?.full_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{user?.full_name}</p>
                      <p className="text-xs text-slate-300 truncate">{user?.email}</p>
                      <Badge className={`mt-1 text-xs ${userRole === "super_admin" ? "bg-[#c9a227] text-[#1a2b4a]" : "bg-white/20 text-white"}`}>
                        {userRole === "super_admin" ? "SUPER ADMIN" : userRole.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  {/* Nav links */}
                  <div className="flex-1 overflow-y-auto py-3">
                    <p className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Navigation</p>
                    {navItems.map((item) => {
                      const activeColor = company?.primary_color || "#c9a227";
                      const isActive = currentPageName === item.page;
                      return (
                        <Link
                          key={item.page}
                          to={createPageUrl(item.page)}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors text-sm font-medium",
                            isActive ? "text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          )}
                          style={isActive ? { backgroundColor: activeColor } : {}}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {item.name}
                        </Link>
                      );
                    })}
                    <div className="border-t my-3 mx-4" />
                    <p className="px-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Account</p>
                    <button
                      onClick={() => { navigate(createPageUrl("Profile")); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg w-full text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <User className="w-5 h-5 flex-shrink-0" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { navigate(createPageUrl("Settings")); setMobileMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg w-full text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg w-full text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      Sign Out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-24 md:pb-6">
        {showGate ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#c9a227]/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-[#c9a227]" />
            </div>
            <h2 className="text-xl font-bold text-[#1a2b4a] dark:text-white mb-2">Subscription Required</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-1">
              This feature requires an active NPS platform subscription.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm max-w-sm mb-6">
              To manage billing, visit <strong>nationwidepolice.com</strong> in a browser.
            </p>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              View Plans
            </Button>
            <AIPurchaseModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
          </div>
        ) : (
          <PageTransition>{children}</PageTransition>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 safe-area-left safe-area-right">
          {navItems.map((item) => {
            const activeColor = company?.primary_color || "#c9a227";
            const isActive = currentPageName === item.page;
            return (
              <Link key={item.page} to={createPageUrl(item.page)} className={cn("flex flex-col items-center justify-center flex-1 h-full transition-all min-h-[44px]", "text-slate-500 dark:text-slate-400")} style={isActive ? { color: activeColor } : {}}>
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                <span className="text-xs mt-1 font-medium select-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// Used as a wrapper component for a single React Router layout route
export function LayoutOutlet() {
  const location = useLocation();
  // Derive currentPageName from the pathname (e.g. "/EmployeeDirectory" → "EmployeeDirectory")
  const currentPageName = location.pathname.replace(/^\//, '') || 'AdminDashboard';
  return (
    <NavigationHistoryProvider>
      <LayoutInner currentPageName={currentPageName}>
        <Outlet />
      </LayoutInner>
    </NavigationHistoryProvider>
  );
}

// Legacy named export kept for any direct usage
export default function Layout({ children, currentPageName }) {
  return (
    <NavigationHistoryProvider>
      <LayoutInner currentPageName={currentPageName}>{children}</LayoutInner>
    </NavigationHistoryProvider>
  );
}