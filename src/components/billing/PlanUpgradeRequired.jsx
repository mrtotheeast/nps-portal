import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/context/CompanyContext";

/**
 * Full-screen upgrade prompt shown when single-plan limit is hit.
 * Props:
 *   currentCount  — number of current active users
 *   limitReason   — "employees" | "clients" | "locations" (what triggered the limit)
 *   onUpgraded()  — called after successful upgrade
 *   onCancel()
 */
export default function PlanUpgradeRequired({ currentCount, limitReason = "employees", onUpgraded, onCancel }) {
  const { companyId } = useCompany();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const newMonthly = (currentCount * 5).toFixed(2);

  const limitMessages = {
    employees: `You have reached the 20-employee limit on the Single Location plan.`,
    clients: `Adding a second client requires the Multiple Locations plan.`,
    locations: `Adding a second location requires the Multiple Locations plan.`,
  };

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("upgradePlan", { companyId });
      if (res.data?.success) {
        onUpgraded();
      } else {
        setError(res.data?.error || "Upgrade failed. Please try again.");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#dc2626", marginBottom:12 }}>
          Plan Limit Reached
        </div>
        <h2 style={titleStyle}>Upgrade Required</h2>
        <p style={bodyStyle}>{limitMessages[limitReason]}</p>
        <p style={bodyStyle}>
          Upgrade to the Multiple Locations plan at <strong>$5.00 per user per month</strong> to continue. Your billing cycle remains unchanged.
        </p>

        <div style={{ background:"#f8f9fa", border:"1px solid rgba(11,31,58,0.08)", borderRadius:8, padding:"16px", marginBottom:24 }}>
          <table style={{ width:"100%" }}>
            <tbody>
              {[
                ["New Plan", "Multiple Locations — $5.00/user/month"],
                ["Current User Count", String(currentCount)],
                ["Estimated Monthly Total", `$${newMonthly}`],
                ["Limit", "Unlimited employees, clients, and locations"],
              ].map(([l, v]) => (
                <tr key={l}>
                  <td style={{ padding:"6px 0", fontSize:13, color:"#94a3b8", fontFamily:"'Barlow Condensed',sans-serif", textTransform:"uppercase", letterSpacing:".06em", width:"50%" }}>{l}</td>
                  <td style={{ padding:"6px 0", fontSize:14, color:"#0B1F3A", fontWeight:600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p style={{ color:"#dc2626", fontSize:13, marginBottom:12 }}>{error}</p>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={handleUpgrade} style={btnUpgrade} disabled={loading}>
            {loading ? "Upgrading..." : "Upgrade Now"}
          </button>
          <button onClick={onCancel} style={btnCancel} disabled={loading}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

const overlay = { position:"fixed", inset:0, background:"rgba(11,31,58,0.75)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 };
const modal = { background:"#fff", borderRadius:14, padding:"36px", maxWidth:540, width:"100%", boxShadow:"0 24px 64px rgba(0,0,0,0.24)" };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:34, color:"#0B1F3A", letterSpacing:".03em", marginBottom:12 };
const bodyStyle = { fontSize:15, color:"#374151", lineHeight:1.7, marginBottom:12 };
const btnUpgrade = { background:"#0B1F3A", color:"#C9A84C", padding:"14px 36px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const btnCancel = { background:"#f1f5f9", color:"#5B6E84", padding:"14px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };