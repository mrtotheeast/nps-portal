import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Check, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Super Admin Billing Overview
 * Shows subscription status, plan, and billing information for every company
 * NPS (platform owner) shows no subscription cost
 */
export default function SuperAdminBillingOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["all-companies-billing"],
    queryFn: async () => {
      const all = await base44.entities.Company.filter({});
      return all;
    },
    enabled: user?.role === "super_admin",
  });

  const { data: aiSubscriptions = [] } = useQuery({
    queryKey: ["all-ai-subscriptions"],
    queryFn: async () => {
      return await base44.entities.AISubscription.filter({});
    },
    enabled: user?.role === "super_admin",
  });

  if (!user || user.role !== "super_admin") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#c9a227]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-6 h-6 text-[#c9a227]" />
        <h2 className="text-xl font-bold">Platform Billing Overview</h2>
      </div>

      <div className="grid gap-4">
        {companies.map((company) => {
          const isNPS = company.is_platform_owner === true;
          const aiSub = aiSubscriptions.find(s => s.company_id === company.id);
          const hasActiveAI = aiSub?.status === "active" && aiSub.expiry_date && new Date(aiSub.expiry_date) > new Date();

          return (
            <Card key={company.id} className={isNPS ? "border-[#c9a227] bg-[#fdf8ee]" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-5 h-5 ${isNPS ? "text-[#c9a227]" : "text-slate-600"}`} />
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <p className="text-sm text-slate-500">{company.owner_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isNPS && (
                      <Badge className="bg-[#c9a227] text-[#1a2b4a]">Platform Owner</Badge>
                    )}
                    <Badge className={company.subscription_plan === "enterprise" ? "bg-purple-100 text-purple-700" : company.subscription_plan === "professional" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"}>
                      {company.subscription_plan}
                    </Badge>
                    <Badge className={company.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {company.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Plan</p>
                    <p className="font-semibold capitalize">{company.subscription_plan}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Max Users</p>
                    <p className="font-semibold">{company.max_users || "Unlimited"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">AI Reporting</p>
                    <div className="flex items-center gap-1">
                      {isNPS ? (
                        <span className="font-semibold text-[#c9a227]">Free (Platform Owner)</span>
                      ) : hasActiveAI ? (
                        <>
                          <Check className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-700">Active</span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-500">Not Subscribed</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500">Features</p>
                    <p className="font-semibold text-xs">{company.features?.join(", ") || "Core"}</p>
                  </div>
                </div>
                
                {isNPS && (
                  <div className="mt-3 p-3 bg-[#c9a227]/10 rounded-lg border border-[#c9a227]/20">
                    <p className="text-sm text-[#c9a227] font-medium">
                      ⚡ Platform Owner - Exempt from all subscription charges and billing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Building2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p>No companies found</p>
        </div>
      )}
    </div>
  );
}