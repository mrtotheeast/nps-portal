import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const EXCLUDED_PAGES = ["Login", "ForgotPassword"];
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const LAST_PAGE_KEY = "nps_last_page";
const LAST_ACTIVE_KEY = "nps_last_active";
const LOCK_KEY = "nps_session_locked";
const TIMEOUT_KEY = "nps_session_timeout";

export function getDashboardForRole(user) {
  const role = user?.role_type || user?.role || "employee";
  if (["admin", "manager", "super_admin"].includes(role)) return "AdminDashboard";
  if (role === "supervisor") return "SupervisorDashboard";
  if (role === "client") return "ClientDashboard";
  if (role === "officer") return "OfficerDashboard";
  return "EmployeeHome";
}

export function getSessionTimeout() { const v = localStorage.getItem(TIMEOUT_KEY); return v ? parseInt(v) : DEFAULT_TIMEOUT_MS; }
export function setSessionTimeout(ms) { localStorage.setItem(TIMEOUT_KEY, String(ms)); }
export function saveLastPage(pageName) { if (!EXCLUDED_PAGES.includes(pageName)) sessionStorage.setItem(LAST_PAGE_KEY, pageName); }
export function getLastPage() { return sessionStorage.getItem(LAST_PAGE_KEY); }
export function lockSession() { sessionStorage.setItem(LOCK_KEY, "1"); }
export function unlockSession() { sessionStorage.removeItem(LOCK_KEY); sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); }
export function isSessionLocked() { return sessionStorage.getItem(LOCK_KEY) === "1"; }

function updateLastActive() { sessionStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString()); }
function getLastActive() { const v = sessionStorage.getItem(LAST_ACTIVE_KEY); return v ? parseInt(v) : Date.now(); }

export default function SessionManager({ user, currentPageName }) {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const hasRedirectedRef = useRef(false);
  const timeout = getSessionTimeout();

  useEffect(() => {
    if (!user || hasRedirectedRef.current) return;
    if (EXCLUDED_PAGES.includes(currentPageName)) return;
    hasRedirectedRef.current = true;
    if (isSessionLocked()) { unlockSession(); } // clear stale lock instead of looping
    const dashboard = getDashboardForRole(user);
    const onHomePage = currentPageName === "Home" || window.location.pathname === "/";
    const dashboardPages = ["AdminDashboard", "SupervisorDashboard", "ClientDashboard", "OfficerDashboard", "EmployeeHome"];
    const isOnWrongDashboard = dashboardPages.includes(currentPageName) && currentPageName !== dashboard;
    if (onHomePage || isOnWrongDashboard) navigate(createPageUrl(dashboard), { replace: true });
    updateLastActive();
  }, [user]);

  useEffect(() => { if (!EXCLUDED_PAGES.includes(currentPageName)) saveLastPage(currentPageName); }, [currentPageName]);

  const resetTimer = useCallback(() => {
    updateLastActive();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { unlockSession(); navigate("/", { replace: true }); }, timeout);
  }, [timeout, navigate]);

  useEffect(() => {
    if (!user || EXCLUDED_PAGES.includes(currentPageName)) return;
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click", "pointerdown"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => { events.forEach(e => window.removeEventListener(e, resetTimer)); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [user, currentPageName, resetTimer]);

  useEffect(() => {
    if (!user) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - getLastActive() > timeout) { unlockSession(); navigate("/", { replace: true }); }
        else resetTimer();
      } else { updateLastActive(); if (timeoutRef.current) clearTimeout(timeoutRef.current); }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, timeout, navigate, resetTimer]);

  return null;
}