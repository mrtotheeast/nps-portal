import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { useCompany } from "@/context/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, MoreVertical, Eye, Lock, Trash2, Power, PowerOff, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import SuperAdminBillingOverview from "@/components/billing/SuperAdminBillingOverview";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { startImpersonating } = useCompany();
  const [search, setSearch] = useState("");

  // Double-lock: must be super_admin role AND the exact email
  const SUPER_ADMIN_EMAIL = 'justin.ashe@nationwidepolice.com';

  // All hooks must be called unconditionally
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["all-companies"],
    queryFn: () => base44.entities.Company.list("-created_date", 1000)
  });

  const { data: userCounts = {} } = useQuery({
    queryKey: ["company-user-counts"],
    queryFn: async () => {
      const counts = {};
      for (const company of companies) {
        const users = await base44.entities.Employee.filter({ company_id: company.id });
        counts[company.id] = users.length;
      }
      return counts;
    },
    enabled: companies.length > 0
  });

  const deleteMutation = useMutation({
    mutationFn: async (companyId) => {
      await base44.entities.Company.update(companyId, { status: "cancelled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-companies"]);
      toast.success("Company cancelled");
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ companyId, currentStatus }) => {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await base44.entities.Company.update(companyId, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-companies"]);
      toast.success("Company status updated");
    }
  });

  const impersonateMutation = useMutation({
    mutationFn: async (companyId) => {
      startImpersonating(companyId);
    }
  });

  // Double-lock guard: must be super_admin role AND the exact email
  if (user?.role !== 'super_admin' || user?.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Access denied. Super admin only.</p>
          <Button onClick={() => navigate("/")} className="mt-4">Go Home</Button>
        </div>
      </div>
    );
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle={`Managing ${companies.length} companies`}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <Tabs defaultValue="companies" className="mb-6">
          <TabsList>
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="billing">Billing Overview</TabsTrigger>
          </TabsList>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/AuditReport")} className="gap-2 border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10">
              <ClipboardList className="w-4 h-4" /> View QA Audit Report
            </Button>
          </div>

          <TabsContent value="companies" className="space-y-6">
            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <Button onClick={() => navigate("/NewCompany")} className="gap-2 bg-[#1a2b4a] hover:bg-[#2d4a6f]">
                <Plus className="w-4 h-4" /> Create Company
              </Button>
            </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search companies by name, email, or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Grid */}
        <div className="grid gap-4">
          {filtered.map(company => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {company.logo_url && (
                      <img src={company.logo_url} alt={company.name} className="h-12 w-12 object-contain rounded" />
                    )}
                    {!company.logo_url && (
                      <div className="h-12 w-12 bg-slate-200 rounded flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-slate-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{company.name}</h3>
                        <Badge className={
                          company.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          company.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {company.status}
                        </Badge>
                      </div>

                      <div className="text-sm text-slate-600 space-y-1">
                        <p><span className="font-medium">Slug:</span> {company.slug}</p>
                        <p><span className="font-medium">Owner:</span> {company.owner_email}</p>
                        <p><span className="font-medium">Plan:</span> {company.subscription_plan}</p>
                        <p><span className="font-medium">Users:</span> {userCounts[company.id] || 0} / {company.max_users || 100}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-2">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => impersonateMutation.mutate(company.id)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" /> Impersonate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/CompanySettings?id=${company.id}`)}
                        className="gap-2"
                      >
                        <Lock className="w-4 h-4" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleStatusMutation.mutate({ companyId: company.id, currentStatus: company.status })}
                        className="gap-2"
                      >
                        {company.status === 'active'
                          ? <><PowerOff className="w-4 h-4 text-amber-600" /> Suspend</>
                          : <><Power className="w-4 h-4 text-emerald-600" /> Activate</>
                        }
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (window.confirm(`Cancel company "${company.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(company.id);
                          }
                        }}
                        className="gap-2 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" /> Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-600">No companies found</p>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="billing">
            <SuperAdminBillingOverview />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}