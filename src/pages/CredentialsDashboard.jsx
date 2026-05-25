import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, AlertTriangle, Mail, Calendar, Users, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format, differenceInDays } from "date-fns";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-700",
  revoked: "bg-red-200 text-red-800",
};

export default function CredentialsDashboard() {
  const [timeframe, setTimeframe] = useState("30");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const queryClient = useQueryClient();

  const { data: credentials = [], isLoading } = useQuery({
    queryKey: ["all-credentials"],
    queryFn: () => base44.entities.Credential.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["all-employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const [stateWebsites, setStateWebsites] = useState({});

  useEffect(() => {
    const licensingSettings = appSettings.find(s => s.setting_key === "state_licensing_websites");
    if (licensingSettings) {
      try {
        setStateWebsites(JSON.parse(licensingSettings.setting_value));
      } catch (e) {
        console.error("Failed to parse state websites:", e);
      }
    }
  }, [appSettings]);

  const sendReminderMutation = useMutation({
    mutationFn: async (employeeIds) => {
      const response = await base44.functions.invoke("sendCredentialReminder", {
        employee_ids: employeeIds,
      });
      return response;
    },
    onSuccess: () => {
      toast.success("Renewal reminders sent successfully");
      setSelectedEmployees([]);
    },
    onError: (error) => {
      toast.error("Failed to send reminders: " + (error.message || "Unknown error"));
    },
  });

  const handleOpenStateWebsite = (state) => {
    const url = stateWebsites[state] || `https://www.google.com/search?q=${encodeURIComponent(state)}+security+license`;
    const browserUrl = `${createPageUrl("InAppBrowser")}?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`${state} Licensing`)}&back=${encodeURIComponent(window.location.pathname)}`;
    window.open(browserUrl, '_blank');
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown Employee";
  };

  const getEmployeeEmail = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.email || "";
  };

  const processCredentials = () => {
    const today = new Date();
    const daysThreshold = parseInt(timeframe);

    const expiring = [];
    const expired = [];
    const active = [];

    credentials.forEach((cred) => {
      const empName = getEmployeeName(cred.employee_id);
      const empEmail = getEmployeeEmail(cred.employee_id);
      
      const credData = {
        ...cred,
        employeeName: empName,
        employeeEmail: empEmail,
      };

      if (!cred.expiry_date) {
        active.push(credData);
        return;
      }

      const expiryDate = new Date(cred.expiry_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      if (daysUntilExpiry < 0) {
        expired.push({ ...credData, daysUntilExpiry });
      } else if (daysUntilExpiry <= daysThreshold) {
        expiring.push({ ...credData, daysUntilExpiry });
      } else {
        active.push(credData);
      }
    });

    return { expiring, expired, active };
  };

  const { expiring, expired, active } = processCredentials();

  const handleSendBulkReminders = () => {
    if (selectedEmployees.length === 0) {
      toast.error("No employees selected");
      return;
    }
    sendReminderMutation.mutate(selectedEmployees);
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllInList = (employeeIds) => {
    const allSelected = employeeIds.every(id => selectedEmployees.includes(id));
    if (allSelected) {
      setSelectedEmployees(prev => prev.filter(id => !employeeIds.includes(id)));
    } else {
      const unique = [...new Set([...selectedEmployees, ...employeeIds])];
      setSelectedEmployees(unique);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Credentials Dashboard" 
        subtitle="Monitor and manage employee licenses and certifications" 
        showBack 
      />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{expiring.length}</p>
                  <p className="text-sm text-slate-500">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Award className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{expired.length}</p>
                  <p className="text-sm text-slate-500">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{active.length}</p>
                  <p className="text-sm text-slate-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Next 30 days</SelectItem>
                    <SelectItem value="60">Next 60 days</SelectItem>
                    <SelectItem value="90">Next 90 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-600">
                  {selectedEmployees.length} employee(s) selected
                </p>
              </div>
              <Button
                onClick={handleSendBulkReminders}
                disabled={selectedEmployees.length === 0 || sendReminderMutation.isPending}
                className="bg-[#1a2b4a]"
              >
                {sendReminderMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Renewal Reminders
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="expiring" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="expiring">Expiring Soon ({expiring.length})</TabsTrigger>
            <TabsTrigger value="expired">Expired ({expired.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="expiring">
            {expiring.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Credentials expiring within {timeframe} days
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllInList(expiring.map(c => c.employee_id))}
                  >
                    {expiring.every(c => selectedEmployees.includes(c.employee_id)) ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                {expiring.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isSelected={selectedEmployees.includes(cred.employee_id)}
                    onToggle={() => toggleEmployeeSelection(cred.employee_id)}
                    onOpenWebsite={handleOpenStateWebsite}
                    stateWebsites={stateWebsites}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="No expiring credentials"
                description="All credentials are up to date"
              />
            )}
          </TabsContent>

          <TabsContent value="expired">
            {expired.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Expired credentials requiring immediate attention
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllInList(expired.map(c => c.employee_id))}
                  >
                    {expired.every(c => selectedEmployees.includes(c.employee_id)) ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                {expired.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isSelected={selectedEmployees.includes(cred.employee_id)}
                    onToggle={() => toggleEmployeeSelection(cred.employee_id)}
                    onOpenWebsite={handleOpenStateWebsite}
                    stateWebsites={stateWebsites}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="No expired credentials"
                description="Great job keeping everything current"
              />
            )}
          </TabsContent>

          <TabsContent value="active">
            {active.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Active credentials
                </h3>
                {active.map((cred) => (
                  <CredentialCard
                    key={cred.id}
                    credential={cred}
                    isSelected={false}
                    onToggle={() => {}}
                    onOpenWebsite={handleOpenStateWebsite}
                    stateWebsites={stateWebsites}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Award}
                title="No active credentials"
                description="No credentials found in the system"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CredentialCard({ credential, isSelected, onToggle, onOpenWebsite, stateWebsites }) {
  const statusColor = STATUS_COLORS[credential.status] || STATUS_COLORS.active;
  const daysUntil = credential.expiry_date ? differenceInDays(new Date(credential.expiry_date), new Date()) : null;

  return (
    <Card className={`border-l-4 ${credential.status === 'expired' ? 'border-l-red-500' : credential.status === 'expiring_soon' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-[#1a2b4a] focus:ring-[#1a2b4a]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold text-slate-900">{credential.credential_name}</h3>
              <Badge className={statusColor}>{credential.status}</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-slate-700">
                <span className="font-medium">Employee:</span> {credential.employeeName}
              </p>
              <p className="text-slate-600">
                <span className="font-medium">Issuing Authority:</span> {credential.issuing_authority}
                {credential.issuing_authority && stateWebsites[credential.issuing_authority] && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 ml-2 text-[#c9a227] hover:text-[#b8922a]"
                    onClick={() => onOpenWebsite(credential.issuing_authority)}
                    title={`Open ${credential.issuing_authority} licensing website`}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </p>
              {credential.expiry_date && (
                <p className={`font-medium ${daysUntil < 0 ? 'text-red-600' : daysUntil <= 30 ? 'text-amber-600' : 'text-slate-600'}`}>
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Expires: {format(new Date(credential.expiry_date), "MMM d, yyyy")}
                  {daysUntil !== null && (
                    <span className="ml-2">
                      ({daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `${daysUntil} days remaining`})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}