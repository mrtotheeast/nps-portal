import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import RoleCard from "@/components/roles/RoleCard";
import CreateRoleDialog from "@/components/roles/CreateRoleDialog";
import RolePermissionsPanel from "@/components/roles/RolePermissionsPanel";
import UserProfilesTab from "@/components/roles/UserProfilesTab";
import WorkspaceModuleEditor from "@/components/roles/WorkspaceModuleEditor";
import RoleAuditLog from "@/components/roles/RoleAuditLog";
import { Shield, Plus, Sparkles, Users, Lock, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SYSTEM_ROLES = [
  { role_type: "hr", display_name: "HR", color: "#6366f1", icon: "Users", department: "Human Resources" },
  { role_type: "accounting", display_name: "Accounting", color: "#059669", icon: "DollarSign", department: "Finance" },
  { role_type: "secretary", display_name: "Secretary", color: "#0891b2", icon: "Calendar", department: "Administration" },
  { role_type: "operations", display_name: "Operations", color: "#d97706", icon: "Briefcase", department: "Operations" },
  { role_type: "supervisor", display_name: "Supervisor", color: "#0f766e", icon: "Shield", department: "Security" },
  { role_type: "client", display_name: "Client", color: "#7c3aed", icon: "Briefcase", department: "External" },
  { role_type: "employee", display_name: "Employee", color: "#1a2b4a", icon: "User", department: "General" },
];

export default function RoleWorkspaceAdmin() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [generatingRole, setGeneratingRole] = useState(null);
  const [editingModules, setEditingModules] = useState(null);

  useEffect(() => { loadUser(); }, []);
  const loadUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
  };

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["role-workspaces"],
    queryFn: () => base44.entities.RoleWorkspace.list(),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id) => base44.entities.RoleWorkspace.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-workspaces"] });
      toast.success("Role workspace deleted");
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (workspace) => {
      const { id, created_date, updated_date, ...data } = workspace;
      return base44.entities.RoleWorkspace.create({
        ...data,
        role_type: `${workspace.role_type}_copy_${Date.now()}`,
        display_name: `${workspace.display_name} (Copy)`,
        is_system_role: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-workspaces"] });
      toast.success("Role duplicated");
    }
  });

  const handleGenerateWorkspace = async (roleType) => {
    setGeneratingRole(roleType);
    try {
      await base44.functions.invoke('generateRoleWorkspace', { roleType });
      queryClient.invalidateQueries({ queryKey: ["role-workspaces"] });
      toast.success("Workspace generated successfully!");
    } catch {
      toast.error("Failed to generate workspace");
    } finally {
      setGeneratingRole(null);
    }
  };

  if (!user) return <LoadingScreen />;
  const isAdmin = ["admin", "manager"].includes(user.role_type);
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState icon={Lock} title="Admin Access Required" description="Only admins can manage role workspaces." />
      </div>
    );
  }

  const mergedRoles = SYSTEM_ROLES.map(sr => {
    const saved = workspaces.find(w => w.role_type === sr.role_type);
    return saved || { ...sr, _notGenerated: true };
  });
  const customWorkspaces = workspaces.filter(w => !SYSTEM_ROLES.find(sr => sr.role_type === w.role_type));

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Role & Workspace Management"
        subtitle="Create, manage, and configure role-based workspaces"
        showBack
        action={() => setShowCreateDialog(true)}
        actionLabel="New Custom Role"
        actionIcon={Plus}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="roles">
          <TabsList className="mb-6">
            <TabsTrigger value="roles"><Shield className="w-4 h-4 mr-2" />Role Workspaces</TabsTrigger>
            <TabsTrigger value="permissions"><Lock className="w-4 h-4 mr-2" />Permissions</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />User Profiles</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList className="w-4 h-4 mr-2" />Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="roles" className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#1a2b4a]" /> System Roles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mergedRoles.map(role => (
                  <RoleCard
                    key={role.role_type}
                    role={role}
                    isGenerating={generatingRole === role.role_type}
                    onGenerate={() => handleGenerateWorkspace(role.role_type)}
                    onEdit={() => setSelectedRole(role)}
                    onEditModules={!role._notGenerated ? () => setEditingModules(role) : null}
                    onDuplicate={() => duplicateMutation.mutate(role)}
                    onDelete={!role._notGenerated && !role.is_system_role ? () => deleteWorkspaceMutation.mutate(role.id) : null}
                  />
                ))}
              </div>
            </div>

            {customWorkspaces.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#c9a227]" /> Custom Roles
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customWorkspaces.map(role => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      isGenerating={generatingRole === role.role_type}
                      onGenerate={() => handleGenerateWorkspace(role.role_type)}
                      onEdit={() => setSelectedRole(role)}
                      onEditModules={() => setEditingModules(role)}
                      onDuplicate={() => duplicateMutation.mutate(role)}
                      onDelete={() => deleteWorkspaceMutation.mutate(role.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="permissions">
            <RolePermissionsPanel />
          </TabsContent>

          <TabsContent value="users">
            <UserProfilesTab />
          </TabsContent>

          <TabsContent value="audit">
            <RoleAuditLog />
          </TabsContent>
        </Tabs>
      </div>

      {editingModules && (
        <WorkspaceModuleEditor
          workspace={editingModules}
          open={!!editingModules}
          onOpenChange={(open) => { if (!open) setEditingModules(null); }}
        />
      )}

      <CreateRoleDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={(roleType) => {
          setShowCreateDialog(false);
          handleGenerateWorkspace(roleType);
        }}
        existingWorkspaces={workspaces}
      />
    </div>
  );
}