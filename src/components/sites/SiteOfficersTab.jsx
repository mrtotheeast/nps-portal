import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, UserCheck, UserX, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export default function SiteOfficersTab({ site, readOnly = false }) {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
  });

  const assignedIds = site?.assigned_officers || [];
  const assignedOfficers = allEmployees.filter(e => assignedIds.includes(e.id));
  const unassigned = allEmployees.filter(e => !assignedIds.includes(e.id) && ["officer", "supervisor", "employee"].includes(e.role || "employee"));

  const updateSiteMutation = useMutation({
    mutationFn: (newIds) => base44.entities.Site.update(site.id, { assigned_officers: newIds }),
    onSuccess: () => {
      queryClient.invalidateQueries(["site", site.id]);
      queryClient.invalidateQueries(["sites"]);
    },
  });

  const assign = (empId) => {
    const newIds = [...assignedIds, empId];
    updateSiteMutation.mutate(newIds);
    toast.success("Officer assigned");
  };

  const remove = (empId) => {
    const newIds = assignedIds.filter(id => id !== empId);
    updateSiteMutation.mutate(newIds);
    toast.success("Officer removed");
  };

  const address = [site?.address, site?.city, site?.state, site?.zip].filter(Boolean).join(", ");
  const mapsUrl = `https://maps.google.com?q=${encodeURIComponent(address)}`;

  const filtered = unassigned.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q);
  });

  const OfficerCard = ({ emp, assigned }) => (
    <div className={`flex items-center gap-3 p-3 border rounded-lg ${assigned ? "bg-emerald-50 border-emerald-200" : "bg-white hover:bg-slate-50"}`}>
      <Avatar className="w-9 h-9 flex-shrink-0">
        <AvatarImage src={emp.profilePhotoUrl} />
        <AvatarFallback className="bg-[#1a2b4a] text-white text-xs">{emp.firstName?.[0]}{emp.lastName?.[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
        <p className="text-xs text-slate-500 capitalize">{emp.positionTitle || emp.role || "Officer"}</p>
      </div>
      {assigned ? (
        <Badge className="bg-emerald-600 text-white text-xs">Assigned</Badge>
      ) : null}
      {!readOnly && (
        assigned
          ? <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 flex-shrink-0" onClick={() => remove(emp.id)}><UserX className="w-4 h-4" /></Button>
          : <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-800 flex-shrink-0" onClick={() => assign(emp.id)}><UserCheck className="w-4 h-4" /></Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Site Info for officers */}
      {address && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>{address}</span>
          </div>
          <Button size="sm" variant="outline" className="gap-1 flex-shrink-0" asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="w-4 h-4" /> Directions
            </a>
          </Button>
        </div>
      )}

      {/* Assigned Officers */}
      <div>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          Assigned Officers ({assignedOfficers.length})
        </h3>
        {assignedOfficers.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No officers assigned to this site</p>
        ) : (
          <div className="space-y-2">
            {assignedOfficers.map(emp => <OfficerCard key={emp.id} emp={emp} assigned />)}
          </div>
        )}
      </div>

      {/* Unassigned (admin only) */}
      {!readOnly && (
        <div>
          <h3 className="font-semibold text-sm mb-3 text-slate-600">Available Officers</h3>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search officers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtered.map(emp => <OfficerCard key={emp.id} emp={emp} assigned={false} />)}
            {filtered.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No officers available</p>}
          </div>
        </div>
      )}
    </div>
  );
}