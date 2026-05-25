import React from "react";
import { usePlatformOwnerCheck } from "@/hooks/usePlatformOwnerCheck";

/**
 * Shows plan limit warnings based on employee count.
 * Props: count (number), plan ("single"|"multi"), onUpgrade()
 * Hidden for platform owner (NPS)
 */
export default function PlanLimitBanner({ count, plan, onUpgrade }) {
  const { isPlatformOwner } = usePlatformOwnerCheck();
  
  // Platform owner (NPS) never sees billing/plan warnings
  if (isPlatformOwner) return null;
  
  if (plan !== "single") return null;
  if (count < 15) return null;

  let bg, border, textColor, message;

  if (count >= 15 && count <= 17) {
    bg = "#fffbeb"; border = "#fde68a"; textColor = "#92400e";
    message = "You are approaching your plan limit. Your current plan supports up to 20 employees, 1 client, and 1 location.";
  } else if (count === 18) {
    bg = "#fff7ed"; border = "#fed7aa"; textColor = "#7c2d12";
    message = "You have 2 employee slots remaining on your current plan. Adding a second client or location will also require an upgrade.";
  } else if (count === 19) {
    bg = "#fef2f2"; border = "#fecaca"; textColor = "#7f1d1d";
    message = "You have 1 employee slot remaining. Your next addition will require a plan upgrade.";
  } else if (count >= 20) {
    bg = "#fef2f2"; border = "#fecaca"; textColor = "#7f1d1d";
    message = "You have reached the maximum team size for the Single Location plan. Upgrade to add more employees.";
  }

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius:8, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:12 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:2 }}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div style={{ flex:1 }}>
        <p style={{ fontSize:14, color:textColor, lineHeight:1.6, margin:0 }}>{message}</p>
        {count >= 18 && onUpgrade && (
          <button
            onClick={onUpgrade}
            style={{ marginTop:8, background:textColor, color:"#fff", padding:"7px 16px", border:"none", borderRadius:4, cursor:"pointer", fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" }}
          >
            Upgrade to Multi-Location
          </button>
        )}
      </div>
    </div>
  );
}