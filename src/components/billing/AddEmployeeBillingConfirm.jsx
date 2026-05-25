import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/context/CompanyContext";

/**
 * Modal shown before creating a new employee.
 * Props:
 *   currentCount   — number of current active employees
 *   plan           — "single" | "multi"
 *   billingCycle   — "monthly" | "annual"
 *   onConfirm()    — async fn — called after Stripe is updated
 *   onCancel()     — abort
 *   employeeName   — name of new employee (optional, for notification)
 */
export default function AddEmployeeBillingConfirm({ currentCount, plan, billingCycle = "monthly", onConfirm, onCancel, employeeName }) {
  const { companyId } = useCompany();
  const pricePerUser = plan === "multi" ? 5.00 : 2.50;
  const newCount = currentCount + 1;
  const currentMonthly = (currentCount * pricePerUser).toFixed(2);
  const newMonthly = (newCount * pricePerUser).toFixed(2);
  const increaseAmt = pricePerUser.toFixed(2);
  const planLabel = plan === "multi" ? "Multiple Locations — $5.00/user/month" : "Single Location — $2.50/user/month";
  const cycleLabel = billingCycle === "annual" ? "annual" : "monthly";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      // Update Stripe subscription quantity first
      const res = await base44.functions.invoke("updateSubscriptionQuantity", {
        companyId,
        action: "add",
        employeeName: employeeName || "New employee",
      });
      if (res.data?.error) throw new Error(res.data.error);
      await onConfirm();
    } catch (err) {
      setError(err.message || "Failed to update subscription. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={titleStyle}>Confirm Employee Addition</h2>
        <p style={subStyle}>Adding this employee will update your subscription billing immediately.</p>

        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:24 }}>
          <tbody>
            {[
              ["Current Plan", planLabel],
              ["Billing Cycle", cycleLabel.charAt(0).toUpperCase() + cycleLabel.slice(1)],
              ["Current Employee Count", String(currentCount)],
              ["New Employee Count", String(newCount)],
              [`Current ${cycleLabel === "annual" ? "Annual" : "Monthly"} Cost`, `$${currentMonthly}`],
              [`New ${cycleLabel === "annual" ? "Annual" : "Monthly"} Cost`, `$${newMonthly}`],
              ["Immediate Prorated Charge", `$${increaseAmt} prorated for current billing period`],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={tdLabel}>{label}</td>
                <td style={tdValue}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6, padding:"10px 14px", marginBottom:16 }}>
            <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{error}</p>
            <button onClick={handleConfirm} style={{ ...btnPrimary, marginTop:8, fontSize:12, padding:"8px 16px" }}>
              Retry
            </button>
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={btnSecondary} disabled={loading}>Cancel</button>
          <button onClick={handleConfirm} style={btnPrimary} disabled={loading}>
            {loading ? "Processing..." : "Confirm and Add Employee"}
          </button>
        </div>

        <p style={{ fontSize:12, color:"#94a3b8", marginTop:16, lineHeight:1.6 }}>
          Your Stripe subscription will be updated and a prorated charge applied immediately. The credit card on file will be charged.
        </p>
      </div>
    </div>
  );
}

const overlay = { position:"fixed", inset:0, background:"rgba(11,31,58,0.6)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 };
const modal = { background:"#fff", borderRadius:14, padding:"32px", maxWidth:520, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.2)" };
const titleStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:22, fontWeight:700, letterSpacing:".06em", color:"#0B1F3A", marginBottom:8, textTransform:"uppercase" };
const subStyle = { fontSize:14, color:"#5B6E84", marginBottom:20, lineHeight:1.6 };
const tdLabel = { padding:"10px 0", fontSize:13, color:"#94a3b8", fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".06em", textTransform:"uppercase", width:"55%", verticalAlign:"top" };
const tdValue = { padding:"10px 0 10px 12px", fontSize:14, color:"#0B1F3A", fontWeight:600 };
const btnPrimary = { background:"#0B1F3A", color:"#C9A84C", padding:"12px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" };
const btnSecondary = { background:"#f1f5f9", color:"#5B6E84", padding:"12px 24px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };