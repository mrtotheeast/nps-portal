import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "nps_theme_override";

/**
 * Applies dark/light mode based on priority:
 * 1. Manual user override (stored in localStorage) — highest priority
 * 2. Device OS preference (prefers-color-scheme)
 * 3. Time of day — dark between 7pm–6am, light otherwise
 *
 * Exposes a global event "nps-theme-changed" so the header toggle can sync.
 */
function computeAutoTheme() {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const devicePrefersDark = mq.matches;
  const hour = new Date().getHours();
  const timeIsDark = hour >= 19 || hour < 6;
  return devicePrefersDark || timeIsDark ? "dark" : "light";
}

export function applyTheme(mode) {
  if (mode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function getEffectiveTheme() {
  const override = localStorage.getItem(STORAGE_KEY);
  if (override === "dark" || override === "light") return override;
  return computeAutoTheme();
}

export function setManualTheme(mode) {
  if (mode === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  applyTheme(getEffectiveTheme());
  window.dispatchEvent(new CustomEvent("nps-theme-changed"));
}

const MOTION_KEY = "nps_reduce_motion_override";

export function getEffectiveReduceMotion() {
  const override = localStorage.getItem(MOTION_KEY);
  if (override === "true") return true;
  if (override === "false") return false;
  // Fall back to system setting
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setManualReduceMotion(value) {
  if (value === null) {
    localStorage.removeItem(MOTION_KEY);
  } else {
    localStorage.setItem(MOTION_KEY, String(value));
  }
  applyReduceMotion(getEffectiveReduceMotion());
  window.dispatchEvent(new CustomEvent("nps-motion-changed"));
}

export function applyReduceMotion(reduce) {
  document.documentElement.classList.toggle("reduce-motion", reduce);
}

export default function ThemeManager() {
  useEffect(() => {
    // --- Theme ---
    const updateTheme = () => applyTheme(getEffectiveTheme());
    updateTheme();
    const mqDark = window.matchMedia("(prefers-color-scheme: dark)");
    mqDark.addEventListener("change", updateTheme);
    const interval = setInterval(updateTheme, 60_000);
    window.addEventListener("nps-theme-changed", updateTheme);

    // --- Motion ---
    const updateMotion = () => applyReduceMotion(getEffectiveReduceMotion());
    updateMotion();
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    mqMotion.addEventListener("change", updateMotion);
    window.addEventListener("nps-motion-changed", updateMotion);

    return () => {
      mqDark.removeEventListener("change", updateTheme);
      clearInterval(interval);
      window.removeEventListener("nps-theme-changed", updateTheme);
      mqMotion.removeEventListener("change", updateMotion);
      window.removeEventListener("nps-motion-changed", updateMotion);
    };
  }, []);

  return null;
}