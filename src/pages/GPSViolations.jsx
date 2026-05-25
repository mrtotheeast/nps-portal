import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, AlertTriangle, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GPSViolations() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: violations = [], isLoading } = useQuery({
    queryKey: ["gps-violations"],
    queryFn: () => base44.entities.GPSViolation?.list?.("-created_date") || Promise.resolve([]),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const resolveMutation = useMutation({
    mutationFn: (id) => base44.entities.GPSViolation?.update?.(id, { status: "reviewed" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["gps-violations"]);
      toast.success("Violation marked as reviewed");
    },
  });

  const getOfficerName = (id) => users.find((u) => u.id === id)?.full_name || "Unknown";

  const SEVERITY = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
  };

  const filtered = violations.filter((v) => {
    const officer = getOfficerName(v.employee_id).toLowerCase();
    return !search || officer.includes(search.toLowerCase());
  });

  const pending = filtered.filter((v) => v.status === "pending");
  const reviewed = filtered.filter((v) => v.status !== "pending");

  if (isLoading) return <LoadingScreen />;

  const ViolationCard = ({ v }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold">{getOfficerName(v.employee_id)}</h3>
              <Badge className={SEVERITY[v.severity] || SEVERITY.medium}>{v.severity}</Badge>
            </div>
            <p className="text-sm text-slate-600">{v.violation_type || "Geofence exit"}</p>
            <p className="text-xs text-slate-500 mt-1">
              {v.created_date ? format(new Date(v.created_date), "MMM d, yyyy h:mm a") : "—"}
            </p>
          </div>
          {v.status === "pending" && (
            <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => resolveMutation.mutate(v.id)}>
              <Check className="w-4 h-4 mr-1" /> Resolve
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="GPS Violations" subtitle="Monitor geofence breach alerts" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search by officer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length > 0 ? (
              <div className="space-y-3">{pending.map((v) => <ViolationCard key={v.id} v={v} />)}</div>
            ) : (
              <EmptyState icon={MapPin} title="No pending violations" />
            )}
          </TabsContent>
          <TabsContent value="reviewed">
            {reviewed.length > 0 ? (
              <div className="space-y-3">{reviewed.map((v) => <ViolationCard key={v.id} v={v} />)}</div>
            ) : (
              <EmptyState icon={MapPin} title="No reviewed violations" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}