import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Send, CheckSquare, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function BulkEmployeeActions() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [action, setAction] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["all-employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      if (action === "send_invite") {
        return base44.functions.invoke("sendBulkNotifications", {
          employee_ids: ids,
          type: "invite",
        });
      } else if (action === "deactivate") {
        return Promise.all(ids.map((id) => base44.entities.Employee.update(id, { status: "inactive" })));
      } else if (action === "activate") {
        return Promise.all(ids.map((id) => base44.entities.Employee.update(id, { status: "active" })));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-employees"]);
      setSelected(new Set());
      toast.success(`Action applied to ${selected.size} employee(s)`);
    },
  });

  const toggleAll = () => {
    if (selected.size === employees.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(employees.map((e) => e.id)));
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Bulk Employee Actions" subtitle="Apply changes to multiple employees at once" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Action Bar */}
        {selected.size > 0 && (
          <Card className="mb-6 border-[#c9a227] bg-amber-50">
            <CardContent className="p-4 flex items-center gap-4">
              <p className="font-medium text-amber-800">{selected.size} selected</p>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-48 bg-white">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_invite">Send Invitations</SelectItem>
                  <SelectItem value="activate">Mark Active</SelectItem>
                  <SelectItem value="deactivate">Mark Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => bulkMutation.mutate()}
                disabled={!action || bulkMutation.isPending}
                className="bg-[#1a2b4a]"
              >
                {bulkMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Employees ({employees.length})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selected.size === employees.length ? <CheckSquare className="w-4 h-4 mr-1" /> : <Square className="w-4 h-4 mr-1" />}
                {selected.size === employees.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {employees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 py-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => toggle(emp.id)}
                >
                  <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggle(emp.id)} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500">{emp.email} · {emp.role}</p>
                  </div>
                  <Badge className={
                    emp.status === "active" ? "bg-emerald-100 text-emerald-700" :
                    emp.status === "inactive" ? "bg-slate-100 text-slate-700" :
                    "bg-amber-100 text-amber-700"
                  }>{emp.status || "active"}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}