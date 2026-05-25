import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Play, Square, MapPin, Loader2 } from "lucide-react";
import GpsStatusIndicator from "@/components/shared/GpsStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function Patrol() {
  const queryClient = useQueryClient();
  const [isPatrolling, setIsPatrolling] = useState(false);
  const [currentPatrol, setCurrentPatrol] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLocating, setGpsLocating] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return; }
    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setGpsLocating(false); },
      (err) => { setGpsError(err.code === 1 ? "Location permission denied. Please allow location access." : "Unable to get location."); setGpsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const startPatrolMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      const patrol = await base44.entities.PatrolSession.create({
        employee_id: user.id,
        site_id: "",
        start_time: new Date().toISOString(),
        start_location: gpsLocation || null,
        status: "active",
        scanned_checkpoints: 0,
        total_checkpoints: 0,
      });
      return patrol;
    },
    onSuccess: (patrol) => {
      setCurrentPatrol(patrol);
      setIsPatrolling(true);
      toast.success("Patrol started");
    },
  });

  const endPatrolMutation = useMutation({
    mutationFn: () =>
      base44.entities.PatrolSession.update(currentPatrol.id, {
        end_time: new Date().toISOString(),
        status: "completed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["patrols"]);
      setIsPatrolling(false);
      setCurrentPatrol(null);
      toast.success("Patrol ended");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Patrol" subtitle="Conduct site patrols and check in" />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {isPatrolling ? "Active Patrol" : "Start New Patrol"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GpsStatusIndicator location={gpsLocation} locationError={gpsError} locating={gpsLocating} className="mb-2" />
            {isPatrolling && currentPatrol ? (
              <>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#c9a227] mb-2">
                    {currentPatrol.scanned_checkpoints || 0} / {currentPatrol.total_checkpoints || 0}
                  </div>
                  <p className="text-slate-600">Checkpoints Completed</p>
                </div>
                <Button
                  onClick={() => endPatrolMutation.mutate()}
                  disabled={endPatrolMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 h-12"
                >
                  {endPatrolMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Square className="w-5 h-5 mr-2" />
                  End Patrol
                </Button>
              </>
            ) : (
              <Button
                onClick={() => startPatrolMutation.mutate()}
                disabled={startPatrolMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12"
              >
                {startPatrolMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Play className="w-5 h-5 mr-2" />
                Start Patrol
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patrol Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>• Tap Start Patrol when you begin your shift</p>
            <p>• Visit each checkpoint location during your patrol</p>
            <p>• Scan or verify each checkpoint to mark complete</p>
            <p>• End your patrol when the shift is complete</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}