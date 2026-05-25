import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ClipboardList, Plus, CheckCircle2, AlertTriangle, ChevronRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { format } from "date-fns";

const STATUS_STYLES = {
  submitted: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
};

const TYPE_LABELS = {
  site_inspection: "Site Inspection",
  patrol_verification: "Patrol Verification",
  opening_check: "Opening Check",
  closing_check: "Closing Check",
  custom: "Custom",
};

export default function SiteInspections() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["site_inspections"],
    queryFn: () => base44.entities.SiteInspectionChecklist.list("-created_date", 100),
  });

  const filtered = checklists.filter((c) => {
    if (filterType !== "all" && c.type !== filterType) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Site Inspections"
        subtitle="Digital checklists & patrol verification"
        showBack
        action={() => navigate(createPageUrl("SiteInspectionForm"))}
        actionLabel="New Checklist"
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="site_inspection">Site Inspection</SelectItem>
              <SelectItem value="patrol_verification">Patrol Verification</SelectItem>
              <SelectItem value="opening_check">Opening Check</SelectItem>
              <SelectItem value="closing_check">Closing Check</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12 text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-4 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300" />
              <div>
                <p className="font-medium text-slate-600">No checklists yet</p>
                <p className="text-sm text-slate-400 mt-1">Start a new site inspection or patrol verification</p>
              </div>
              <Button onClick={() => navigate(createPageUrl("SiteInspectionForm"))} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold">
                <Plus className="w-4 h-4 mr-2" /> New Checklist
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const checked = (c.items || []).filter((i) => i.checked).length;
              const total = (c.items || []).length;
              const flagged = (c.items || []).filter((i) => i.flagged).length;
              const pct = total ? Math.round((checked / total) * 100) : 0;

              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-slate-800 truncate">{c.title}</span>
                          <Badge className={STATUS_STYLES[c.status] || "bg-slate-100 text-slate-600"}>{c.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-2">
                          <span>{TYPE_LABELS[c.type] || c.type}</span>
                          {c.site_name && <span>• {c.site_name}</span>}
                          {c.officer_name && <span>• {c.officer_name}</span>}
                          <span>• {c.created_date ? format(new Date(c.created_date), "MMM d, h:mm a") : ""}</span>
                        </div>

                        {total > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                              <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 shrink-0">{checked}/{total}</span>
                          </div>
                        )}

                        <div className="flex gap-3 mt-2">
                          {flagged > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="w-3 h-3" /> {flagged} flagged
                            </span>
                          )}
                          {(c.photos || []).length > 0 && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Camera className="w-3 h-3" /> {c.photos.length} photos
                            </span>
                          )}
                          {c.signature_url && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Signed
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}