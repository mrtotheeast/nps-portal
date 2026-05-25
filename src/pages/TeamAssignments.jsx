import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Plus, X, UserCheck, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function TeamAssignments() {
  const queryClient = useQueryClient();
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [search, setSearch] = useState("");
  const [poolSearch, setPoolSearch] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["all-employees-team"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-team"],
    queryFn: () => base44.entities.Site.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-employees-team"] });
    },
    onError: () => toast.error("Failed to save assignment"),
  });

  const supervisors = employees.filter(e =>
    ["supervisor", "manager", "admin"].includes(e.role) && e.status === "active"
  );

  const filteredSupervisors = supervisors.filter(s => {
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  // Employees assigned to selected supervisor
  const assignedEmployees = selectedSupervisor
    ? employees.filter(e => e.supervisor_id === selectedSupervisor.id)
    : [];

  // Unassigned or assignable (not assigned to selected supervisor)
  const pool = employees.filter(e =>
    e.id !== selectedSupervisor?.id &&
    e.supervisor_id !== selectedSupervisor?.id &&
    e.status === "active" &&
    !["supervisor", "manager", "admin"].includes(e.role)
  ).filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    return !poolSearch || name.includes(poolSearch.toLowerCase()) || e.email?.includes(poolSearch.toLowerCase());
  });

  const getTeamCount = (supervisorId) =>
    employees.filter(e => e.supervisor_id === supervisorId).length;

  const getSupervisorSites = (supervisorId) => {
    const sup = employees.find(e => e.id === supervisorId);
    if (!sup?.siteIds?.length) return [];
    return sup.siteIds.map(id => sites.find(s => s.id === id)?.name).filter(Boolean);
  };

  const handleAssign = (employee) => {
    updateMutation.mutate(
      { id: employee.id, data: { supervisor_id: selectedSupervisor.id } },
      { onSuccess: () => toast.success(`${employee.firstName} added to team`) }
    );
  };

  const handleRemove = (employee) => {
    updateMutation.mutate(
      { id: employee.id, data: { supervisor_id: null } },
      { onSuccess: () => toast.success(`${employee.firstName} removed from team`) }
    );
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Team Assignments" subtitle="Assign employees to supervisors and managers" showBack />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Supervisor List */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Supervisors & Managers ({supervisors.length})
                </CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search supervisors..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredSupervisors.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">No supervisors found</p>
                )}
                {filteredSupervisors.map(sup => {
                  const teamCount = getTeamCount(sup.id);
                  const supSites = getSupervisorSites(sup.id);
                  const isSelected = selectedSupervisor?.id === sup.id;
                  return (
                    <button
                      key={sup.id}
                      onClick={() => setSelectedSupervisor(sup)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "border-[#c9a227] bg-[#c9a227]/5 shadow-sm"
                          : "border-transparent bg-slate-50 hover:border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarImage src={sup.profilePhotoUrl} />
                          <AvatarFallback className="bg-[#1a2b4a] text-white text-xs">
                            {sup.firstName?.charAt(0)}{sup.lastName?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">
                            {sup.firstName} {sup.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 capitalize">
                              {sup.role}
                            </Badge>
                            <span className="text-xs text-slate-500">{teamCount} team member{teamCount !== 1 ? "s" : ""}</span>
                          </div>
                          {supSites.length > 0 && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              <MapPin className="w-3 h-3 inline mr-0.5" />
                              {supSites.slice(0, 2).join(", ")}
                            </p>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-colors ${isSelected ? "text-[#c9a227]" : "text-slate-300"}`} />
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Right: Team View */}
          <div className="lg:col-span-2">
            {!selectedSupervisor ? (
              <Card className="shadow-sm">
                <CardContent className="p-12 text-center">
                  <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Select a supervisor to manage their team</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedSupervisor.profilePhotoUrl} />
                      <AvatarFallback className="bg-[#1a2b4a] text-white">
                        {selectedSupervisor.firstName?.charAt(0)}{selectedSupervisor.lastName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-bold text-slate-900">
                        {selectedSupervisor.firstName} {selectedSupervisor.lastName}
                      </h2>
                      <p className="text-sm text-slate-500 capitalize">{selectedSupervisor.role} · {assignedEmployees.length} team members</p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Current Team */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Current Team ({assignedEmployees.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 max-h-[400px] overflow-y-auto">
                      {assignedEmployees.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No team members yet. Add from the pool →</p>
                      )}
                      {assignedEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={emp.profilePhotoUrl} />
                            <AvatarFallback className="text-xs bg-emerald-200 text-emerald-800">
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">{emp.positionTitle || emp.role}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                            onClick={() => handleRemove(emp)}
                            title="Remove from team"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Available Pool */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-500" />
                        Available Employees ({pool.length})
                      </CardTitle>
                      <div className="relative mt-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <Input
                          placeholder="Search employees..."
                          value={poolSearch}
                          onChange={e => setPoolSearch(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2 max-h-[400px] overflow-y-auto">
                      {pool.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-6">No available employees</p>
                      )}
                      {pool.map(emp => (
                        <div key={emp.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage src={emp.profilePhotoUrl} />
                            <AvatarFallback className="text-xs bg-slate-200 text-slate-700">
                              {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {emp.supervisor_id ? "Reassign" : "Unassigned"} · {emp.positionTitle || emp.role}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 px-2 bg-[#1a2b4a] hover:bg-[#2d4a6f] flex-shrink-0"
                            onClick={() => handleAssign(emp)}
                            title="Add to team"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}