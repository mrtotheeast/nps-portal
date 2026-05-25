import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function SiteCheckInUser() {
  const queryClient = useQueryClient();
  const siteId = new URLSearchParams(window.location.search).get("siteId");
  const [checked, setChecked] = useState(false);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      await base44.entities.SiteCheckIn?.create?.({
        employee_id: user.id,
        site_id: siteId,
        check_in_time: new Date().toISOString(),
        location: { lat: 0, lng: 0 },
      }) || Promise.resolve();
    },
    onSuccess: () => {
      setChecked(true);
      toast.success("Checked in successfully");
      setTimeout(() => window.history.back(), 2000);
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Site Check-In" subtitle="Confirm your arrival" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Confirm Check-In
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {checked ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <p className="text-xl font-semibold text-emerald-600">Check-in Successful!</p>
                <p className="text-slate-600 mt-2">You've been checked in to the site.</p>
              </div>
            ) : (
              <>
                <div className="text-center py-4">
                  <p className="text-lg text-slate-700">
                    Are you ready to check in to this site?
                  </p>
                </div>
                <Button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
                >
                  {checkInMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm Check-In
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}