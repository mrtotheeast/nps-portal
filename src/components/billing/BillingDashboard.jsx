import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useAuth } from "@/lib/AuthContext";
import { usePlatformOwnerCheck } from "@/hooks/usePlatformOwnerCheck";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PlanUpgradeRequired from "./PlanUpgradeRequired";

export default function BillingDashboard() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { isPlatformOwner } = usePlatformOwnerCheck();
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Query data first (hooks must be called unconditionally)
  const { data: company, isLoading: loadingCompany, refetch: refetchCompany } = useQuery({
    queryKey: ["company-billing", companyId],
    queryFn: async () => {
      const r = await base44.entities.Company.filter({ id: companyId });
      return r[0] || null;
    },
    enabled: !!companyId && companyId !== "super_admin",
  });

  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ["employees-active-billing", companyId],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
    enabled: !!companyId,
  });

  const { data: aiSub } = useQuery({
    queryKey: ["ai-subscription-billing", companyId],
    queryFn: () => base44.entities.AISubscription.filter({ company_id: companyId }),
    enabled: !!companyId,
    select: d => d[0] || null,
  });

  // Hide billing UI for native iOS/Android apps (after all hooks)
  const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  if (isNativeApp) {
    return null;
  }

  // Platform owner (NPS) never sees billing dashboard
  if (isPlatformOwner) {
    return null;
  }

  // Only admins can see billing information
  if (!user || !["admin", "super_admin"].includes(user.role)) {
    return null;
  }

  const isLoading = loadingCompany || loadingEmp;
  if (isLoading) return (
    <div style={{ padding:24, display:"flex", gap:8, alignItems:"center", color:"#94a3b8", fontSize:14 }}>
      <Loader2 style={{ width:16, height:16, animation:"spin 1s linear infinite" }} /> Loading billing details...
    </div>
  );
  if (!company) return null;

  const planTier = company.plan_tier || "single";
  const billingCycle = company.billing_cycle || "monthly";
  const pricePerUser = planTier === "multi" ? 5.00 : 2.50;
  const userCount = employees.length;
  const monthlyTotal = (userCount * pricePerUser).toFixed(2);
  const planLabel = planTier === "multi" ? "Multiple Locations" : "Single Location";
  const maxUsers = planTier === "single" ? 20 : null;
  const nextBilling = company.billing_next_date
    ? new Date(company.billing_next_date).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })
    : "—";

  const handleManageSub = async () => {
    setPortalLoading(true);
    try {
      const res = await base44.functions.invoke("createBillingPortalSession", {
        company_id: companyId,
        return_url: window.location.href,
      });
      if (res.data?.url) window.location.href = res.data.url;
      else toast.error("Could not open billing portal.");
    } catch(err) { toast.error(err.message); }
    setPortalLoading(false);
  };

  return (
    <div>
      {upgradeOpen && (
        <PlanUpgradeRequired
          currentCount={userCount}
          limitReason="employees"
          onUpgraded={() => {
            setUpgradeOpen(false);
            refetchCompany();
            queryClient.invalidateQueries(["employees-active-billing"]);
            toast.success("Plan upgraded to Multiple Locations.");
          }}
          onCancel={() => setUpgradeOpen(false)}
        />
      )}

      <div style={section}>
        <div style={sectionTitle}>Current Plan</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16, marginTop:16 }}>
          {[
            ["Plan", planLabel],
            ["Billing Cycle", billingCycle === "annual" ? "Annual" : "Monthly"],
            ["Per-User Rate", `$${pricePerUser.toFixed(2)}/user/month`],
            ["Active Users", String(userCount)],
            [billingCycle === "annual" ? "Annual Total" : "Monthly Total", `$${billingCycle === "annual" ? (userCount * pricePerUser * 12).toFixed(2) : monthlyTotal}`],
            ["Next Billing Date", nextBilling],
            ...(maxUsers ? [["Plan User Limit", `${userCount} of ${maxUsers}`]] : [["User Limit", "Unlimited"]]),
          ].map(([label, value]) => (
            <div key={label} style={statCard}>
              <div style={statLabel}>{label}</div>
              <div style={statValue}>{value}</div>
            </div>
          ))}
        </div>

        {/* Cost breakdown */}
        <div style={{ marginTop:20, background:"#f8f9fa", border:"1px solid rgba(11,31,58,0.07)", borderRadius:8, padding:"14px 18px" }}>
          <div style={{ fontSize:13, color:"#5B6E84", lineHeight:1.8 }}>
            <strong style={{ color:"#0B1F3A" }}>Cost Breakdown:</strong>{" "}
            {userCount} users x ${pricePerUser.toFixed(2)}/user/month = <strong style={{ color:"#0B1F3A" }}>${monthlyTotal}/month</strong>
            {billingCycle === "annual" && (
              <span> = <strong style={{ color:"#0B1F3A" }}>${(userCount * pricePerUser * 12).toFixed(2)}/year</strong></span>
            )}
            {aiSub?.status === "active" && (
              <span> + AI Reporting Add-on ({aiSub.plan === "annual" ? "$299.99/year" : "$29.99/month"})</span>
            )}
          </div>
        </div>

        {/* Plan limit bar */}
        {planTier === "single" && (
          <div style={{ marginTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#5B6E84", marginBottom:4 }}>
              <span>Team Size</span>
              <span>{userCount} of {maxUsers} employees</span>
            </div>
            <div style={{ background:"#e2e8f0", borderRadius:4, height:6, overflow:"hidden" }}>
              <div style={{
                width:`${Math.min(100, (userCount / maxUsers) * 100)}%`,
                height:"100%",
                background: userCount >= 19 ? "#ef4444" : userCount >= 18 ? "#f97316" : userCount >= 15 ? "#f59e0b" : "#0B1F3A",
                borderRadius:4,
                transition:"width .3s",
              }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ ...section, marginTop:14, display:"flex", gap:10, flexWrap:"wrap" }}>
        {planTier === "single" && (
          <button onClick={() => setUpgradeOpen(true)} style={btnPrimary}>
            Upgrade to Multi-Location Plan
          </button>
        )}
        <button onClick={handleManageSub} style={btnOutline} disabled={portalLoading}>
          {portalLoading ? "Loading..." : "Manage Subscription"}
        </button>
      </div>

      {/* AI Add-on */}
      <div style={{ ...section, marginTop:14 }}>
        <div style={sectionTitle}>AI Reporting Add-on</div>
        {aiSub?.status === "active" ? (
          <div style={{ marginTop:12, fontSize:14, color:"#374151" }}>
            Status: <strong style={{ color:"#059669" }}>Active</strong> — {aiSub.plan === "annual" ? "$299.99/year" : "$29.99/month"}
          </div>
        ) : (
          <p style={{ marginTop:12, fontSize:14, color:"#5B6E84" }}>
            Not subscribed. Add AI report writing for $29.99/month or $299.99/year per organization from the AI Reporting section above.
          </p>
        )}
      </div>
    </div>
  );
}

const section = { background:"#fff", border:"1px solid rgba(11,31,58,0.08)", borderRadius:10, padding:"20px 24px" };
const sectionTitle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:12, fontWeight:700, letterSpacing:".16em", textTransform:"uppercase", color:"#5B6E84" };
const statCard = { background:"#FAFBFC", border:"1px solid rgba(11,31,58,0.06)", borderRadius:8, padding:"12px 16px" };
const statLabel = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#94a3b8", marginBottom:4 };
const statValue = { fontSize:15, fontWeight:600, color:"#0B1F3A" };
const btnPrimary = { background:"#0B1F3A", color:"#C9A84C", padding:"10px 24px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase" };
const btnOutline = { background:"transparent", color:"#0B1F3A", padding:"10px 24px", border:"1.5px solid rgba(11,31,58,0.2)", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:13, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };