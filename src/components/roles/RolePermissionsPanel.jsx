import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Info } from "lucide-react";
import { toast } from "sonner";

const PERMISSION_LEVELS = ["hidden", "view", "edit", "full"];
const PERMISSION_COLORS = { hidden: "bg-slate-100 text-slate-500", view: "bg-blue-100 text-blue-700", edit: "bg-amber-100 text-amber-700", full: "bg-green-100 text-green-700" };
const PERMISSION_DESCRIPTIONS = { hidden: "Cannot see or access this module", view: "Read-only access", edit: "Can view and make changes", full: "Complete control including delete" };

const WORKSPACE_PERMISSIONS = [
  { key: "incident_reports", label: "Incident Reports" }, { key: "scheduling", label: "Scheduling" },
  { key: "payroll", label: "Payroll Access" }, { key: "hr_documents", label: "HR Documents" },
  { key: "training", label: "Training Modules" }, { key: "client_portal", label: "Client Portal" },
  { key: "messaging", label: "Messaging" }, { key: "equipment", label: "Equipment Tracking" },
  { key: "licensing", label: "Licensing & Certifications" }, { key: "user_management", label: "User Management" },
  { key: "reports", label: "Reports & Analytics" }, { key: "patrol", label: "Patrol Tracking" },
];

const FEATURE_MODULES = [
  { key: "pto_management", label: "PTO Management" }, { key: "internal_messaging", label: "Internal Messaging" },
  { key: "incident_reporting", label: "Incident Reporting" }, { key: "patrol_tracking", label: "Patrol Tracking" },
  { key: "training_systems", label: "Training Systems" }, { key: "credentials_management", label: "Credentials Management" },
  { key: "scheduling", label: "Scheduling" }, { key: "payroll_access", label: "Payroll Access" },
  { key: "hr_documents", label: "HR Documents" }, { key: "client_portal", label: "Client Portal" },
  { key: "equipment_tracking", label: "Equipment Tracking" }, { key: "licensing_certs", label: "Licensing & Certs" },
];

export default function RolePermissionsPanel() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState("supervisor");

  const { data: rolePermissions = [] } = useQuery({ queryKey: ["role-permissions"], queryFn: () => base44.entities.RolePermission.list() });
  const { data: workspaces = [] } = useQuery({ queryKey: ["role-workspaces"], queryFn: () => base44.entities.RoleWorkspace.list() });

  const savePermMutation = useMutation({
    mutationFn: async (data) => {
      const existing = rolePermissions.find(rp => rp.role_type === data.role_type);
      return existing ? base44.entities.RolePermission.update(existing.id, data) : base44.entities.RolePermission.create(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["role-permissions"] }); toast.success("Permissions saved"); }
  });

  const saveWorkspaceMutation = useMutation({
    mutationFn: ({ id, permissions }) => base44.entities.RoleWorkspace.update(id, { permissions }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["role-workspaces"] }); toast.success("Workspace permissions saved"); }
  });

  const BUILT_IN_ROLES = [
    { value: "supervisor", label: "Supervisor" }, { value: "manager", label: "Manager" },
    { value: "officer", label: "Officer" }, { value: "employee", label: "Employee" }, { value: "client", label: "Client" },
  ];
  const allRoles = [...BUILT_IN_ROLES, ...workspaces.filter(w => !BUILT_IN_ROLES.find(r => r.value === w.role_type)).map(w => ({ value: w.role_type, label: w.display_name }))];

  const roleConfig = rolePermissions.find(rp => rp.role_type === selectedRole) || { role_type: selectedRole, permissions: {}, feature_modules: {} };
  const workspace = workspaces.find(w => w.role_type === selectedRole);
  const currentWorkspacePerms = workspace?.permissions || {};

  const handleFeatureToggle = (key, value) => savePermMutation.mutate({ ...roleConfig, feature_modules: { ...roleConfig.feature_modules, [key]: value } });
  const handleWorkspacePerm = (key, value) => {
    if (!workspace) { toast.error("Generate workspace first to set permissions"); return; }
    saveWorkspaceMutation.mutate({ id: workspace.id, permissions: { ...workspace.permissions, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Select Role</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>{allRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Module Access Levels</CardTitle><p className="text-sm text-slate-500">Set what each role can do per module</p></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {WORKSPACE_PERMISSIONS.map(perm => (
              <div key={perm.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">{perm.label}</span>
                <Select value={currentWorkspacePerms[perm.key] || "hidden"} onValueChange={val => handleWorkspacePerm(perm.key, val)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERMISSION_LEVELS.map(lvl => <SelectItem key={lvl} value={lvl}><Badge className={`${PERMISSION_COLORS[lvl]} text-xs capitalize`}>{lvl}</Badge></SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Feature Module Access</CardTitle><p className="text-sm text-slate-500">Toggle which features are enabled for this role</p></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {FEATURE_MODULES.map(mod => (
              <div key={mod.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <Label htmlFor={`mod-${mod.key}`} className="cursor-pointer text-sm">{mod.label}</Label>
                <Switch id={`mod-${mod.key}`} checked={roleConfig.feature_modules?.[mod.key] !== false} onCheckedChange={val => handleFeatureToggle(mod.key, val)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" />Permission Level Reference</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PERMISSION_LEVELS.map(lvl => (
              <div key={lvl} className={`p-3 rounded-lg ${PERMISSION_COLORS[lvl]}`}>
                <p className="font-semibold capitalize">{lvl}</p>
                <p className="text-xs mt-1">{PERMISSION_DESCRIPTIONS[lvl]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}