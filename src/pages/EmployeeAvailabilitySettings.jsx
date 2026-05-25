import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Copy, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const DAY_LABELS = { monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday" };
const DEFAULT_DAY = { available: false, all_day: false, start_time: "09:00", end_time: "17:00" };

const buildDefault = () => {
  const s = {};
  DAYS.forEach(d => { s[d] = { ...DEFAULT_DAY, available: !["saturday", "sunday"].includes(d) }; });
  return s;
};

export default function EmployeeAvailabilitySettings() {
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState(buildDefault());
  const queryClient = useQueryClient();

  React.useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: availability, isLoading } = useQuery({
    queryKey: ["availability", user?.id],
    queryFn: async () => {
      const schedules = await base44.entities.EmployeeAvailabilitySchedule.filter({ employee_id: user.id });
      return schedules[0] || null;
    },
    enabled: !!user
  });

  React.useEffect(() => { if (availability?.weekly_schedule) setSchedule(availability.weekly_schedule); }, [availability]);

  const saveMutation = useMutation({
    mutationFn: (data) => availability
      ? base44.entities.EmployeeAvailabilitySchedule.update(availability.id, data)
      : base44.entities.EmployeeAvailabilitySchedule.create({ employee_id: user.id, ...data }),
    onSuccess: () => { queryClient.invalidateQueries(["availability"]); toast.success("Availability saved"); }
  });

  const setDay = (day, field, value) => setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const copyToAll = (sourceDay) => {
    const s = {};
    DAYS.forEach(d => { s[d] = { ...schedule[sourceDay] }; });
    setSchedule(s);
    toast.success("Copied to all days");
  };

  if (!user || isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Availability" subtitle="Set your recurring weekly schedule" showBack />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-[#c9a227]" />Weekly Schedule</CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setSchedule(buildDefault()); toast.success("Reset to defaults"); }}><RotateCcw className="w-4 h-4 mr-2" />Reset</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAYS.map((day) => (
              <div key={day} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">{DAY_LABELS[day]}</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => copyToAll(day)}><Copy className="w-4 h-4 mr-2" />Copy to All</Button>
                    <div className="flex items-center gap-2">
                      <Label>Available</Label>
                      <Switch checked={schedule[day]?.available || false} onCheckedChange={(v) => setDay(day, "available", v)} />
                    </div>
                  </div>
                </div>
                {schedule[day]?.available && (
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={schedule[day]?.all_day || false} onCheckedChange={(v) => setDay(day, "all_day", v)} />
                      <Label>All Day</Label>
                    </div>
                    {!schedule[day]?.all_day && (
                      <div className="flex items-center gap-4">
                        <div className="flex-1"><Label className="text-sm">Start Time</Label><Input type="time" value={schedule[day]?.start_time || "09:00"} onChange={(e) => setDay(day, "start_time", e.target.value)} /></div>
                        <div className="flex-1"><Label className="text-sm">End Time</Label><Input type="time" value={schedule[day]?.end_time || "17:00"} onChange={(e) => setDay(day, "end_time", e.target.value)} /></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate({ weekly_schedule: schedule })} className="bg-[#c9a227] hover:bg-[#b8922a]" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Availability"}
          </Button>
        </div>
      </div>
    </div>
  );
}