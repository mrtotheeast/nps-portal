import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Clock, CheckCircle, XCircle, FileText, CheckSquare } from "lucide-react";

const COLUMNS = [
  {
    key: "reported",
    label: "Reported",
    statuses: ["pending", "open"],
    color: "border-amber-400",
    headerColor: "bg-amber-50 border-amber-200",
    labelColor: "text-amber-700",
    icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  },
  {
    key: "under_review",
    label: "Under Review",
    statuses: ["in_progress"],
    color: "border-blue-400",
    headerColor: "bg-blue-50 border-blue-200",
    labelColor: "text-blue-700",
    icon: <Clock className="w-4 h-4 text-blue-500" />,
  },
  {
    key: "resolved",
    label: "Resolved",
    statuses: ["resolved"],
    color: "border-emerald-400",
    headerColor: "bg-emerald-50 border-emerald-200",
    labelColor: "text-emerald-700",
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  {
    key: "closed",
    label: "Closed",
    statuses: ["closed", "rejected"],
    color: "border-slate-400",
    headerColor: "bg-slate-100 border-slate-200",
    labelColor: "text-slate-600",
    icon: <XCircle className="w-4 h-4 text-slate-400" />,
  },
];

const SEVERITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function KanbanCard({ incident, onStatusChange, selected, onToggleSelect }) {
  const navigate = useNavigate();

  return (
    <Card
      className={`mb-2 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${selected ? "border-l-[#c9a227] ring-1 ring-[#c9a227]" : "border-l-transparent hover:border-l-[#c9a227]"}`}
      onClick={() => navigate(createPageUrl(`IncidentForm?id=${incident.id}`))}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <div onClick={e => { e.stopPropagation(); onToggleSelect(incident.id); }}>
            <Checkbox checked={selected} className="mt-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <p className="font-medium text-sm capitalize leading-tight">
                {incident.incident_type?.replace(/_/g, " ") || "Incident"}
              </p>
              <Badge className={`${SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.medium} text-xs flex-shrink-0`}>
                {incident.severity || "medium"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-1">{incident.description}</p>
            {incident.incident_date && (
              <p className="text-xs text-slate-400">
                {format(new Date(incident.incident_date), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </div>
        {/* Quick status move buttons */}
        <div className="flex gap-1 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
          {COLUMNS.filter(c => !c.statuses.includes(incident.status)).map(col => (
            <button
              key={col.key}
              onClick={() => onStatusChange(incident.id, col.statuses[0])}
              className={`text-xs px-2 py-0.5 rounded-full border ${col.headerColor} ${col.labelColor} hover:opacity-80 transition-opacity`}
            >
              → {col.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function IncidentKanban({ incidents, onStatusChange }) {
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkClose = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    for (const id of selected) {
      await onStatusChange(id, "closed");
    }
    setSelected(new Set());
    setBulkLoading(false);
  };

  return (
    <div>
      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[#1a2b4a] text-white rounded-xl">
          <CheckSquare className="w-4 h-4 text-[#c9a227]" />
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <Button
            size="sm"
            className="ml-auto bg-slate-600 hover:bg-slate-500 text-white gap-1"
            onClick={handleBulkClose}
            disabled={bulkLoading}
          >
            {bulkLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-3 h-3" />}
            Mark {selected.size} as Closed
          </Button>
          <Button size="sm" variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colIncidents = incidents.filter(i => col.statuses.includes(i.status));
          const allColSelected = colIncidents.length > 0 && colIncidents.every(i => selected.has(i.id));

          return (
            <div key={col.key} className="min-w-[220px]">
              {/* Column Header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border ${col.headerColor} mb-2`}>
                {colIncidents.length > 0 && (
                  <div onClick={() => {
                    const next = new Set(selected);
                    colIncidents.forEach(i => allColSelected ? next.delete(i.id) : next.add(i.id));
                    setSelected(next);
                  }}>
                    <Checkbox checked={allColSelected} className="w-3.5 h-3.5" />
                  </div>
                )}
                {col.icon}
                <span className={`font-semibold text-sm ${col.labelColor}`}>{col.label}</span>
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/70 ${col.labelColor}`}>
                  {colIncidents.length}
                </span>
              </div>
              {/* Cards */}
              <div className="min-h-[120px]">
                {colIncidents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                    <FileText className="w-8 h-8 mb-1" />
                    <p className="text-xs">No incidents</p>
                  </div>
                ) : (
                  colIncidents.map(incident => (
                    <KanbanCard
                      key={incident.id}
                      incident={incident}
                      onStatusChange={onStatusChange}
                      selected={selected.has(incident.id)}
                      onToggleSelect={toggleSelect}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}