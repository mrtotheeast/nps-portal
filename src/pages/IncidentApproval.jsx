import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function IncidentApproval() {
  const queryClient = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["pending-incidents"],
    queryFn: () => base44.entities.Incident.filter({ status: "pending" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Incident.update(id, { status: "approved" });
      await base44.functions.invoke("notifyIncidentStatusChange", { incidentId: id, newStatus: "approved" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-incidents"]);
      toast.success("Incident approved — reporter notified");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Incident.update(id, { status: "rejected" });
      await base44.functions.invoke("notifyIncidentStatusChange", { incidentId: id, newStatus: "rejected" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-incidents"]);
      toast.success("Incident rejected — reporter notified");
    },
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Incident Approval" subtitle="Review and approve pending incidents" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {incidents.length > 0 ? (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <Card key={inc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold capitalize">{inc.incident_type?.replace("_", " ")}</h3>
                        <Badge className="bg-amber-100 text-amber-700">{inc.severity}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{inc.description?.substring(0, 150)}...</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => approveMutation.mutate(inc.id)}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(inc.id)}
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
          <EmptyState icon={AlertTriangle} title="No pending incidents" description="All incidents have been approved or rejected" />
        )}
      </div>
    </div>
  );
}