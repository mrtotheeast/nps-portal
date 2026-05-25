import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Award, Search, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function ClientCredentials() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  React.useEffect(() => { loadUser(); }, []);
  const loadUser = async () => { const currentUser = await base44.auth.me(); setUser(currentUser); };

  const { data: sites = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["client-sites", user?.client_id],
    queryFn: async () => { if (!user?.client_id) return []; return base44.entities.Site.filter({ client_id: user.client_id }); },
    enabled: !!user?.client_id,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["client-shifts", sites],
    queryFn: async () => { if (sites.length === 0) return []; const allShifts = await base44.entities.Shift.list(); return allShifts.filter(shift => sites.some(s => s.id === shift.site_id)); },
    enabled: sites.length > 0,
  });

  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });
  const { data: credentials = [] } = useQuery({ queryKey: ["credentials"], queryFn: () => base44.entities.Credential.list() });

  if (sitesLoading || !user) return <LoadingScreen />;

  const assignedEmployeeIds = [...new Set(shifts.map(s => s.employee_id))];
  const relevantCredentials = credentials.filter(c => assignedEmployeeIds.includes(c.employee_id));

  const getCredentialStatus = (expDate) => {
    if (!expDate) return 'unknown';
    const exp = new Date(expDate);
    const today = new Date();
    const thirtyDays = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (exp < today) return 'expired';
    if (exp <= thirtyDays) return 'expiring';
    return 'active';
  };

  const credentialsWithStatus = relevantCredentials.map(cred => ({ ...cred, status: getCredentialStatus(cred.expiration_date) }));

  const filteredCredentials = credentialsWithStatus.filter(cred => {
    const emp = employees.find(e => e.id === cred.employee_id);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    const matchesSearch = empName.toLowerCase().includes(searchQuery.toLowerCase()) || cred.credential_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cred.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const expiredCount = credentialsWithStatus.filter(c => c.status === 'expired').length;
  const expiringCount = credentialsWithStatus.filter(c => c.status === 'expiring').length;

  const statusConfig = {
    active: { color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400", label: "Active" },
    expiring: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400", label: "Expiring Soon" },
    expired: { color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400", label: "Expired" },
    unknown: { color: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400", label: "No Expiration" },
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader title="Officer Credentials" subtitle="Track certification and credential status" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {(expiredCount > 0 || expiringCount > 0) && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-400">
              {expiredCount > 0 && `${expiredCount} credential(s) expired. `}
              {expiringCount > 0 && `${expiringCount} credential(s) expiring within 30 days.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Total Credentials", value: relevantCredentials.length, icon: <Award className="w-8 h-8 text-blue-500" />, color: "" },
            { label: "Active", value: credentialsWithStatus.filter(c => c.status === 'active').length, icon: <div className="w-3 h-3 rounded-full bg-green-500" />, color: "text-green-600 dark:text-green-400" },
            { label: "Expiring Soon", value: expiringCount, icon: <div className="w-3 h-3 rounded-full bg-amber-500" />, color: "text-amber-600 dark:text-amber-400" },
            { label: "Expired", value: expiredCount, icon: <div className="w-3 h-3 rounded-full bg-red-500" />, color: "text-red-600 dark:text-red-400" },
          ].map(({ label, value, icon, color }) => (
            <Card key={label} className="dark:border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div><p className={`text-sm ${color || 'text-slate-500 dark:text-slate-400'}`}>{label}</p><p className="text-2xl font-bold">{value}</p></div>
                  {icon}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by officer name or credential..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 dark:bg-slate-800 dark:border-slate-600" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48 dark:bg-slate-800 dark:border-slate-600"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {filteredCredentials.map((cred) => {
            const emp = employees.find(e => e.id === cred.employee_id);
            const config = statusConfig[cred.status];
            return (
              <Card key={cred.id} className="dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Officer'}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{cred.credential_name}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400 ml-13">
                        {cred.issuing_authority && <p>Issued by: {cred.issuing_authority}</p>}
                        {cred.credential_number && <p>Number: {cred.credential_number}</p>}
                        {cred.expiration_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>Expires: {format(new Date(cred.expiration_date), 'MMM d, yyyy')}</span></div>}
                      </div>
                    </div>
                    <Badge className={config.color}>{config.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredCredentials.length === 0 && (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No credentials found</p>
          </div>
        )}
      </div>
    </div>
  );
}