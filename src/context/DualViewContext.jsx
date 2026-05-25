import React, { createContext, useContext, useState, useCallback } from "react";

// Stores which "view" a supervisor or manager is currently using:
//   "management" — see their supervisor/manager dashboard and tools
//   "employee"   — see the personal employee More tab / pages
const DualViewContext = createContext(null);

export function DualViewProvider({ children }) {
  const [activeView, setActiveViewState] = useState(() => {
    try {
      const stored = sessionStorage.getItem("nps_dual_view") || localStorage.getItem("nps_dual_view") || "management";
      return stored;
    } catch {
      return "management";
    }
  });

  // Call this with the resolved user role on auth load — ensures admins always start in management view
  const syncViewForRole = useCallback((role) => {
    if (role === "admin" || role === "super_admin") {
      setActiveViewState("management");
      try {
        sessionStorage.setItem("nps_dual_view", "management");
        localStorage.setItem("nps_dual_view", "management");
      } catch {}
    }
  }, []);

  const setActiveView = useCallback((view) => {
    setActiveViewState(view);
    try {
      sessionStorage.setItem("nps_dual_view", view);
      localStorage.setItem("nps_dual_view", view);
    } catch {}
  }, []);

  return (
    <DualViewContext.Provider value={{ activeView, setActiveView, syncViewForRole }}>
      {children}
    </DualViewContext.Provider>
  );
}

export function useDualView() {
  const ctx = useContext(DualViewContext);
  // Graceful fallback if used outside provider (e.g. plain employee pages)
  if (!ctx) return { activeView: "management", setActiveView: () => {} };
  return ctx;
}