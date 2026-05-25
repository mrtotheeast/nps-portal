import React, { createContext, useContext, useRef } from "react";

const NavigationHistoryContext = createContext(null);

const initialHistory = {
  Home: [], Timesheet: [], Patrol: [], More: [],
  Dashboard: [], AdminMore: [], SupervisorMore: [], ClientMore: []
};

export function NavigationHistoryProvider({ children }) {
  const historyRef = useRef({ ...initialHistory });

  const pushHistory = (tab, path) => {
    const stack = historyRef.current[tab] || [];
    if (stack[stack.length - 1] !== path) {
      historyRef.current = { ...historyRef.current, [tab]: [...stack, path] };
    }
  };

  const getLastPath = (tab) => {
    const stack = historyRef.current[tab] || [];
    return stack[stack.length - 1] || null;
  };

  const getHistory = () => historyRef.current;

  return (
    <NavigationHistoryContext.Provider value={{ pushHistory, getLastPath, getHistory }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const ctx = useContext(NavigationHistoryContext);
  if (!ctx) return { pushHistory: () => {}, getLastPath: () => null, getHistory: () => ({}) };
  return ctx;
}

export default useNavigationHistory;