import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Edit, UserX, Loader2, UserPlus, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" }, { value: "manager", label: "Manager" }, { value: "supervisor", label: "Supervisor" },
  { value: "officer", label: "Officer" }, { value: "employee", label: "Employee" }, { value: "client", label: "Client" },
  { value: "hr", label: "HR" }, { value: "accounting", label: "Accounting" }, { value: "secretary", label: "Secretary" }, { value: "operations", label: "Operations" },
];

const ROLE_BADGE_COLORS = {
  admin: "bg-red-100 text-red-700", manager: "bg-purple-100 text-purple-700", supervisor: "bg-teal-100 text-teal-700",
  officer: "bg-amber-100 text-amber-700", employee: "bg-emerald-100 text-emerald-700", client: "bg-violet-100 text-violet-700",
  hr: "bg-indigo-100 text-indigo-700", accounting: "bg-green-100 text-green-700", secretary: "bg-cyan-100 text-cyan-700", operations: "bg-orange-100 text-orange-700",
};

export default function UserProfilesTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");

  const { data: users = [] } = useQuery({ queryKey: ["all-users"], queryFn: () => base44.entities.User.list() });
  const { data: workspaces = [] } = useQuery({ queryKey: ["role-workspaces"], queryFn: () => base44.entities.RoleWorkspace.list() });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }) => base44.users.inviteUser(email, role),
    onSuccess: () => { queryClient.invalidateQueries(["all-users"]); setShowInvite(false); setInviteEmail(""); toast.success("Invitation sent!"); }
  });

  const allRoleOptions = [...ROLE_OPTIONS, ...workspaces.filter(w => !ROLE_OPTIONS.find(r => r.value === w.role_type)).map(w => ({ value: w.role_type, label: w.display_name }))];

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role_type === roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (user) => {
    const role = user.role_type || user.role || "employee";
    const colorClass = ROLE_BADGE_COLORS[role] || "bg-slate-100 text-slate-600";
    const label = allRoleOptions.find(r => r.value === role)?.label || role;
    return <Badge className={`${colorClass} text-xs`}>{label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" /></div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Roles</SelectItem>{allRoleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowInvite(true)} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"><UserPlus className="w-4 h-4 mr-2" />Invite User</Button>
      </div>
      <div className="text-sm text-slate-500">{filteredUsers.length} users</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(user => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-12 h-12"><AvatarImage src={user.profile_photo} /><AvatarFallback className="bg-[#1a2b4a] text-white font-semibold">{user.full_name?.charAt(0) || "U"}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{user.full_name || "—"}</p><p className="text-xs text-slate-500 truncate">{user.email}</p><div className="mt-1">{getRoleBadge(user)}</div></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => navigate(createPageUrl(`EmployeeProfile?userId=${user.id}`))}><Eye className="w-3 h-3 mr-1" />Profile</Button>
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => setEditUser(user)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit User Profile</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Avatar className="w-10 h-10"><AvatarFallback className="bg-[#1a2b4a] text-white">{editUser.full_name?.charAt(0)}</AvatarFallback></Avatar>
                <div><p className="font-semibold">{editUser.full_name}</p><p className="text-sm text-slate-500">{editUser.email}</p></div>
              </div>
              <div><Label>Role</Label><Select defaultValue={editUser.role_type || editUser.role || "employee"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allRoleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(createPageUrl(`EmployeeProfile?userId=${editUser.id}`))}><Eye className="w-4 h-4 mr-2" />View Full Profile</Button>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setEditUser(null)}><UserX className="w-4 h-4 mr-2" />Close</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Email Address *</Label><Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" /></div>
            <div><Label>Assign Role *</Label><Select value={inviteRole} onValueChange={setInviteRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allRoleOptions.filter(r => r.value !== "admin").map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })} disabled={!inviteEmail || inviteMutation.isPending} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" />Send Invite</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}