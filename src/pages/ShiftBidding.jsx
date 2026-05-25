import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ShiftBidding() {
  const queryClient = useQueryClient();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["available-shifts"],
    queryFn: () => base44.entities.Shift?.list?.() || Promise.resolve([]),
  });

  const { data: bids = [] } = useQuery({
    queryKey: ["my-bids"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return Promise.resolve([]);
    },
  });

  const bidMutation = useMutation({
    mutationFn: (shiftId) =>
      base44.entities.ShiftBid?.create?.({
        shift_id: shiftId,
        bid_date: new Date().toISOString(),
        status: "pending",
      }) || Promise.resolve(),
    onSuccess: () => {
      queryClient.invalidateQueries(["my-bids"]);
      toast.success("Bid submitted");
    },
  });

  if (isLoading) return <LoadingScreen />;

  const availableShifts = shifts.filter((s) => !bids.find((b) => b.shift_id === s.id));

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Shift Bidding" subtitle="Bid on available shifts" showBack />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {availableShifts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {availableShifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <h3 className="font-semibold">{shift.site_id}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                        <Calendar className="w-4 h-4" />
                        {shift.date ? format(new Date(shift.date), "MMM d") : "TBA"}
                      </div>
                      {shift.start_time && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          {shift.start_time} - {shift.end_time}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{shift.position || "Security"}</Badge>
                    <Button
                      onClick={() => bidMutation.mutate(shift.id)}
                      disabled={bidMutation.isPending}
                      className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                    >
                      {bidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Place Bid
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Calendar} title="No available shifts" description="Check back later for new opportunities" />
        )}
      </div>
    </div>
  );
}