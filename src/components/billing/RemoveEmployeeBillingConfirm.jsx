import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCompany } from "@/context/CompanyContext";

/**
 * Modal shown before deactivating/removing an employee.
 * Props:
 *   currentCount   — current active employee count
 *   plan           — "single" | "multi"
 *   billingCycle   — "monthly" | "annual"
 *   employeeName   — name of employee being removed
 *   onConfirm()    — async fn — called after Stripe is updated
 *   onCancel()
 */
export default function RemoveEmployeeBillingConfirm({ currentCount, plan, billingCycle = "monthly", employeeName, onConfirm, onCancel }) {
  const { companyId } = useCompany();
  const pricePerUser = plan === "multi" ? 5.00 : 2.50;
  const newCount = Math.max(1, currentCount - 1);
  const currentMonthly = (currentCount * pricePerUser).toFixed(2);
  const newMonthly = (newCount * pricePerUser).toFixed(2);
  const saving = (currentCount * pricePerUser - newCount * pricePerUser).toFixed(2);
  const planLabel = plan === "multi" ? "Multiple Locations — $5.00/user/month" : "Single Location — $2.50/user/month";
  const cycleLabel = billingCycle === "annual" ? "Annual" : "Monthly";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("updateSubscriptionQuantity", {
        companyId,
        action: "remove",
        employeeName: employeeName || "Employee",
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
        <h2 style={titleStyle}>Confirm Employee Removal</h2>
        <p style={subStyle}>
          Removing <strong>{employeeName || "this employee"}</strong> will update your subscription billing.
        </p>

        <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:20 }}>
          <tbody>
            {[
              ["Current Plan", planLabel],
              ["Billing Cycle", cycleLabel],
              ["Current Employee Count", String(currentCount)],
              ["New Employee Count", String(newCount)],
              [`Current ${cycleLabel} Cost`, `$${currentMonthly}`],
              [`New ${cycleLabel} Cost`, `$${newMonthly}`],
              ["Savings Applied To Next Cycle", `$${saving} credit`],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom:"1px solid #f1f5f9" }}>
                <td style={tdLabel}>{label}</td>
                <td style={tdValue}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:6, padding:"10px 14px", marginBottom:20 }}>
          <p style={{ color:"#065f46", fontSize:13, margin:0 }}>
            A credit of <strong>${saving}/month</strong> will be applied to your next billing cycle.
          </p>
        </div>

        {error && (
          <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:6, padding:"10px 14px", marginBottom:16 }}>
            <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{error}</p>
          </div>
        )}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onCancel} style={btnSecondary} disabled={loading}>Cancel</button>
          <button onClick={handleConfirm} style={btnDanger} disabled={loading}>
            {loading ? "Processing..." : "Confirm Removal"}
          </button>
        </div>
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
const btnDanger = { background:"#dc2626", color:"#fff", padding:"12px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" };
const btnSecondary = { background:"#f1f5f9", color:"#5B6E84", padding:"12px 24px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };