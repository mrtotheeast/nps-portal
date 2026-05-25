import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PTOApproval() {
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["pending-pto"],
    queryFn: () => base44.entities.PTORequest.filter({ status: "pending" }),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.PTORequest.update(id, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-pto"]);
      toast.success("PTO request approved");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.PTORequest.update(id, { status: "rejected" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-pto"]);
      toast.success("PTO request rejected");
    },
  });

  const getEmployeeName = (empId) => {
    const emp = employees.find((e) => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="PTO Approval" subtitle="Review pending time off requests" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{getEmployeeName(req.employee_id)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {format(new Date(req.start_date), "MMM d")} - {format(new Date(req.end_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{req.hours_requested} hours</p>
                      <Badge className="mt-2 bg-blue-100 text-blue-700 capitalize">{req.pto_type}</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveMutation.mutate(req.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(req.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Calendar} title="No pending PTO requests" />
        )}
      </div>
    </div>
  );
}