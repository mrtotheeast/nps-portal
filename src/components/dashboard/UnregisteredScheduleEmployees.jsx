import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UnregisteredScheduleEmployees() {
  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({ queryKey: ["shifts"], queryFn: () => base44.entities.Shift.list("-start_time", 500), staleTime: 300000, gcTime: 600000 });
  const { data: employeeRecords = [], isLoading } = useQuery({ queryKey: ["all-employees"], queryFn: () => base44.entities.Employee.filter({ status: "active" }, "", 200), staleTime: 300000, gcTime: 600000 });
  const { data: users = [] } = useQuery({ queryKey: ["all-users"], queryFn: () => base44.entities.User.list(), staleTime: 300000, gcTime: 600000 });

  const knownEmployeeIds = new Set(employeeRecords.map(e => e.id));
  const knownUserIds = new Set(users.map(u => u.id));

  const ghostShifts = shifts.filter(s => {
    if (!s.employee_id) return false;
    const isUUID = uuidRegex.test(s.employee_id);
    if (isUUID) return !knownEmployeeIds.has(s.employee_id) && !knownUserIds.has(s.employee_id);
    return true;
  });

  const ghostMap = {};
  ghostShifts.forEach(s => {
    if (!ghostMap[s.employee_id]) ghostMap[s.employee_id] = { employee_id: s.employee_id, count: 0, shifts: [] };
    ghostMap[s.employee_id].count++;
    ghostMap[s.employee_id].shifts.push(s);
  });

  const ghostList = Object.values(ghostMap).sort((a, b) => b.count - a.count);

  const linkShifts = async (shiftList, newEmployeeId) => {
    await Promise.all(shiftList.map(s => base44.entities.Shift.update(s.id, { employee_id: newEmployeeId })));
  };

  const createProfilesMutation = useMutation({
    mutationFn: async () => {
      const results = [];
      for (const ghost of ghostList) {
        const isUUID = uuidRegex.test(ghost.employee_id);
        const nameParts = isUUID ? ["Unknown", ghost.employee_id.slice(0, 8)] : ghost.employee_id.trim().split(/\s+/);
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "";
        const alreadyExists = employeeRecords.find(e => `${e.firstName} ${e.lastName}`.trim().toLowerCase() === `${firstName} ${lastName}`.trim().toLowerCase());
        if (alreadyExists) { await linkShifts(ghost.shifts, alreadyExists.id); results.push({ action: "linked" }); continue; }
        const sampleShift = ghost.shifts[0];
        const newEmployee = await base44.entities.Employee.create({ firstName, lastName, role: "officer", status: "active", invitation_status: "not_invited", ...(sampleShift?.position ? { position: sampleShift.position } : {}) });
        await linkShifts(ghost.shifts, newEmployee.id);
        results.push({ action: "created" });
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries(["all-employees"]);
      queryClient.invalidateQueries(["all-users"]);
      queryClient.invalidateQueries(["shifts"]);
      const created = results.filter(r => r.action === "created").length;
      const linked = results.filter(r => r.action === "linked").length;
      toast.success(`Created ${created} employee profiles, linked ${linked} existing.`);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  if (isLoading || ghostList.length === 0) return null;

  return (
    <Card className="mb-8 shadow-sm border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="w-5 h-5" />Unregistered Schedule Employees
          <Badge className="bg-amber-200 text-amber-900 ml-2">{ghostList.length} found</Badge>
        </CardTitle>
        <p className="text-sm text-amber-700 mt-1">These names appear in schedule entries but have no employee profile. Click <strong>Fix All</strong> to create their profiles automatically.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {ghostList.map((ghost) => (
            <div key={ghost.employee_id} className="flex items-center justify-between bg-white border border-amber-200 rounded-lg px-3 py-2">
              <div><span className="font-medium text-slate-800">{ghost.employee_id}</span><span className="text-xs text-slate-500 ml-2">({ghost.count} schedule {ghost.count === 1 ? "entry" : "entries"})</span></div>
              <Badge variant="outline" className="text-amber-700 border-amber-300">Not Registered</Badge>
            </div>
          ))}
        </div>
        <Button onClick={() => createProfilesMutation.mutate()} disabled={createProfilesMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
          {createProfilesMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating Profiles...</> : <><UserPlus className="w-4 h-4 mr-2" />Fix All — Create Profiles & Link Schedules</>}
        </Button>
      </CardContent>
    </Card>
  );
}