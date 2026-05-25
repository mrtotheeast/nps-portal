import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Play, Pause, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";

export default function PatrolPlayback() {
  const [selectedPatrolId, setSelectedPatrolId] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);

  const { data: patrols = [], isLoading } = useQuery({
    queryKey: ["completed-patrols"],
    queryFn: async () => {
      const all = await base44.entities.PatrolSession.list("-start_time");
      return all.filter((p) => p.status === "completed");
    },
  });

  const selectedPatrol = patrols.find((p) => p.id === selectedPatrolId);
  const routePoints = selectedPatrol?.route_points || [];

  const handlePlayPause = () => {
    if (!isPlaying && routePoints.length > 0) {
      setIsPlaying(true);
      setCurrentPoint(0);
      const interval = setInterval(() => {
        setCurrentPoint((prev) => {
          if (prev >= routePoints.length - 1) {
            clearInterval(interval);
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    } else {
      setIsPlaying(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Patrol Playback" subtitle="Replay recorded patrol routes" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <Select value={selectedPatrolId} onValueChange={setSelectedPatrolId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a patrol to replay..." />
              </SelectTrigger>
              <SelectContent>
                {patrols.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.site_id} — {p.start_time ? format(new Date(p.start_time), "MMM d, yyyy h:mm a") : "Unknown date"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedPatrol ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Route Map</span>
                    <Button onClick={handlePlayPause} size="sm" className="bg-[#1a2b4a]">
                      {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {isPlaying ? "Pause" : "Play"}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-100 rounded-lg h-64 flex items-center justify-center">
                    {routePoints.length > 0 ? (
                      <div className="text-center">
                        <MapPin className="w-10 h-10 text-[#c9a227] mx-auto mb-2" />
                        <p className="text-slate-600">Point {currentPoint + 1} of {routePoints.length}</p>
                        {routePoints[currentPoint] && (
                          <p className="text-sm text-slate-500 mt-1">
                            Lat: {routePoints[currentPoint].latitude?.toFixed(4)}, Lng: {routePoints[currentPoint].longitude?.toFixed(4)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500">No GPS route data recorded for this patrol</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader><CardTitle>Patrol Details</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><p className="text-slate-500">Status</p><p className="font-medium capitalize">{selectedPatrol.status}</p></div>
                  <div><p className="text-slate-500">Checkpoints</p><p className="font-medium">{selectedPatrol.scanned_checkpoints || 0} / {selectedPatrol.total_checkpoints || 0}</p></div>
                  <div><p className="text-slate-500">Start</p><p className="font-medium">{selectedPatrol.start_time ? format(new Date(selectedPatrol.start_time), "h:mm a") : "—"}</p></div>
                  <div><p className="text-slate-500">End</p><p className="font-medium">{selectedPatrol.end_time ? format(new Date(selectedPatrol.end_time), "h:mm a") : "—"}</p></div>
                  {selectedPatrol.notes && <div><p className="text-slate-500">Notes</p><p className="font-medium">{selectedPatrol.notes}</p></div>}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Select a patrol above to replay its route</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}