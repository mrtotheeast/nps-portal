import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function ProfilePhotoApproval() {
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["pending-photos"],
    queryFn: async () => {
      const all = await base44.entities.Employee.list();
      return all.filter(e => e.profilePhotoStatus === "pending" && e.profilePhotoUrl);
    }
  });

  const approveMutation = useMutation({
    mutationFn: (employeeId) =>
      base44.entities.Employee.update(employeeId, { profilePhotoStatus: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-photos"]);
      toast.success("Photo approved");
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (employeeId) =>
      base44.entities.Employee.update(employeeId, {
        profilePhotoStatus: "denied",
        profilePhotoUrl: null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pending-photos"]);
      toast.success("Photo rejected");
    }
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Profile Photo Approval"
        subtitle={`${employees.length} pending approval`}
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {employees.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
            {employees.map((emp) => (
              <Card key={emp.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="aspect-square bg-slate-100 rounded-lg mb-3 overflow-hidden">
                    <img
                      src={emp.profilePhotoUrl}
                      alt={`${emp.firstName} ${emp.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-semibold text-center mb-1">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="text-sm text-slate-500 text-center mb-3">{emp.employeeId}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate(emp.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => rejectMutation.mutate(emp.id)}
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={User}
            title="No pending photo approvals"
            description="All profile photos have been reviewed"
          />
        )}
      </div>
    </div>
  );
}