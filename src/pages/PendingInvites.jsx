import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, RefreshCw, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PendingInvites() {
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["invited-employees"],
    queryFn: () => base44.entities.Employee.filter({ invitation_status: "invited" }),
  });

  const resendMutation = useMutation({
    mutationFn: (employee) =>
      base44.functions.invoke("resendInvite", { employee_id: employee.id, email: employee.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(["invited-employees"]);
      toast.success("Invitation resent");
    },
  });

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Pending Invites" subtitle={`${employees.length} invitation(s) awaiting acceptance`} showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {employees.length > 0 ? (
          <div className="space-y-3">
            {employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                      <p className="text-sm text-slate-600">{emp.email}</p>
                      {emp.invitation_sent_at && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Sent {format(new Date(emp.invitation_sent_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendMutation.mutate(emp)}
                      disabled={resendMutation.isPending}
                    >
                      {resendMutation.isPending
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <RefreshCw className="w-3 h-3 mr-1" />
                      }
                      Resend
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Mail} title="No pending invitations" description="All invited users have accepted or no invitations have been sent." />
        )}
      </div>
    </div>
  );
}