import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Search, CheckCircle2, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import SimulatedClockInButton from "@/components/admin/SimulatedClockInButton";
import { toast } from "sonner";
import { format } from "date-fns";
import GpsStatusIndicator from "@/components/shared/GpsStatusIndicator";

export default function SiteCheckIn() {
  const [search, setSearch] = useState("");
  const [checkingIn, setCheckingIn] = useState(null); // site id being processed
  const queryClient = useQueryClient();
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [gpsLocating, setGpsLocating] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError("Geolocation not supported."); return; }
    setGpsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGpsLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) }); setGpsLocating(false); },
      (err) => { setGpsError(err.code === 1 ? "Location permission denied. Please allow location access." : "Unable to get location."); setGpsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const isAdminUser = ["admin", "super_admin"].includes(user?.role) || ["admin", "super_admin"].includes(user?.role_type);

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-record", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["sites-active"],
    queryFn: () => base44.entities.Site.filter({ status: "active" }),
  });

  // Check if already clocked in today
  const { data: todayTimesheets = [] } = useQuery({
    queryKey: ["my-timesheets-today", myEmployee?.id],
    queryFn: () =>
      base44.entities.Timesheet.filter(
        { employee_id: myEmployee.id, date: format(new Date(), "yyyy-MM-dd") },
        "-created_date",
        10
      ),
    enabled: !!myEmployee?.id,
  });

  const activeTimesheet = todayTimesheets.find((t) => t.clock_in && !t.clock_out);

  const filtered = sites.filter(
    (site) => !search || site.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCheckIn = async (site) => {
    if (!myEmployee) {
      toast.error("Employee profile not found. Contact your administrator.");
      return;
    }
    if (activeTimesheet) {
      toast.error(`You are already clocked in at another location. Clock out first.`);
      return;
    }

    // Geofence enforcement — if site has GPS coordinates, verify employee is within radius
    if (site.latitude && site.longitude) {
      if (!gpsLocation) {
        toast.error("Location required to check in. Please allow location access and try again.");
        return;
      }
      const distanceM = calcDistanceMeters(
        gpsLocation.latitude, gpsLocation.longitude,
        site.latitude, site.longitude
      );
      const radiusM = (site.geofence_radius || 300) * 0.3048; // feet → meters
      if (distanceM > radiusM) {
        const distanceFt = Math.round(distanceM / 0.3048);
        toast.error(`You are outside the ${site.name} geofence (${distanceFt} ft away, limit: ${site.geofence_radius || 300} ft). Clock-in denied.`, { duration: 7000 });
        // Fire alert to supervisors/admins
        base44.functions.invoke("alertAdminClockInOutsideGeofence", {
          employee_id: myEmployee.id,
          site_id: site.id,
          distance_m: Math.round(distanceM),
          radius_m: Math.round(radiusM),
          clock_in_location: gpsLocation,
        }).catch(() => {});
        return;
      }
    }

    setCheckingIn(site.id);
    try {
      const now = new Date();
      await base44.entities.Timesheet.create({
        employee_id: myEmployee.id,
        site_id: site.id,
        date: format(now, "yyyy-MM-dd"),
        clock_in: now.toISOString(),
        clock_in_location: gpsLocation || null,
        status: "pending",
        device_type: window.innerWidth < 768 ? "mobile" : "desktop",
      });

      queryClient.invalidateQueries({ queryKey: ["my-timesheets-today"] });
      queryClient.invalidateQueries({ queryKey: ["my-timesheets-period"] });
      queryClient.invalidateQueries({ queryKey: ["my-timesheets"] });

      toast.success(`✅ Checked in at ${site.name}`, {
        description: `${format(now, "h:mm a")} — Have a safe shift!`,
        duration: 5000,
      });
    } catch (err) {
      toast.error("Check-in failed. Please try again.");
    } finally {
      setCheckingIn(null);
    }
  };

  function calcDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Site Check-In" subtitle="Select a site to check in" />
      <div className="max-w-6xl mx-auto px-4 pt-3">
        <GpsStatusIndicator location={gpsLocation} locationError={gpsError} locating={gpsLocating} />
      </div>

      {activeTimesheet && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">Currently Clocked In</p>
              <p className="text-sm text-emerald-600">
                Since {format(new Date(activeTimesheet.clock_in), "h:mm a")} — clock out from the Timesheet page.
              </p>
            </div>
            <Badge className="ml-auto bg-emerald-500 text-white">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse mr-1.5" />
              Active
            </Badge>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search sites..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((site) => {
              const isProcessing = checkingIn === site.id;
              return (
                <Card key={site.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a2b4a] flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{site.name}</h3>
                        {site.address && (
                          <p className="text-sm text-slate-500 mt-1 truncate">
                            {site.address}{site.city ? `, ${site.city}` : ""}
                          </p>
                        )}
                        <Button
                          className="mt-3 w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
                          onClick={() => handleCheckIn(site)}
                          disabled={isProcessing || !!checkingIn || !!activeTimesheet}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Checking In...
                            </>
                          ) : activeTimesheet ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Already Clocked In
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Check In
                            </>
                          )}
                        </Button>
                        {isAdminUser && myEmployee && !activeTimesheet && (
                          <SimulatedClockInButton
                            site={site}
                            employee={myEmployee}
                            onSimulated={() => {
                              queryClient.invalidateQueries({ queryKey: ["my-timesheets-today"] });
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={MapPin} title="No sites found" />
        )}
      </div>
    </div>
  );
}