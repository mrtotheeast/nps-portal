import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { AlertTriangle, Clock, GraduationCap, FileText, Filter, RefreshCw, Activity, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_CONFIG = {
  incident: {
    icon: AlertTriangle,
    color: "bg-red-100 text-red-700",
    dotColor: "bg-red-500",
    label: "Incident Report",
  },
  timesheet: {
    icon: Clock,
    color: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
    label: "Timesheet",
  },
  training: {
    icon: GraduationCap,
    color: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
    label: "Training",
  },
};

function FeedItem({ item, onClick }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.timesheet;
  const Icon = cfg.icon;

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors group"
    >
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
          <Badge className={`text-xs px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
          {item.severity && (
            <Badge className={`text-xs px-1.5 py-0 ${item.severity === "high" || item.severity === "critical" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
              {item.severity}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{item.subtitle}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400">{item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : ""}</span>
          {item.site && <span className="text-xs text-slate-400">· {item.site}</span>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-2 transition-colors" />
    </button>
  );
}

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");

  // Real-time subscriptions
  const [liveItems, setLiveItems] = useState([]);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-list"],
    queryFn: () => base44.entities.Site.list(),
    staleTime: 600000,
    gcTime: 900000,
  });

  const { data: recentIncidents = [], refetch: refetchIncidents } = useQuery({
    queryKey: ["feed-incidents"],
    queryFn: () => base44.entities.Incident.list("-created_date", 20),
    staleTime: 300000,
    gcTime: 600000,
  });

  const { data: recentTimesheets = [], refetch: refetchTimesheets } = useQuery({
    queryKey: ["feed-timesheets"],
    queryFn: () => base44.entities.Timesheet.list("-created_date", 20),
    staleTime: 300000,
    gcTime: 600000,
  });

  const { data: recentTraining = [], refetch: refetchTraining } = useQuery({
    queryKey: ["feed-training"],
    queryFn: () => base44.entities.TrainingAssignment.filter({ status: "completed" }, "-updated_date", 20),
    staleTime: 300000,
    gcTime: 600000,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubIncident = base44.entities.Incident.subscribe((event) => {
      if (event.type === "create" || event.type === "update") refetchIncidents();
    });
    const unsubTimesheet = base44.entities.Timesheet.subscribe((event) => {
      if (event.type === "create" || event.type === "update") refetchTimesheets();
    });
    const unsubTraining = base44.entities.TrainingAssignment.subscribe((event) => {
      if (event.type === "update") refetchTraining();
    });
    return () => { unsubIncident(); unsubTimesheet(); unsubTraining(); };
  }, []);

  const siteMap = Object.fromEntries(sites.map(s => [s.id, s.name]));

  // Build unified feed
  const feedItems = [
    ...recentIncidents.map(i => ({
      id: `inc-${i.id}`,
      recordId: i.id,
      type: "incident",
      title: i.incident_type ? i.incident_type.replace(/_/g, " ") : "Incident Report",
      subtitle: i.description ? i.description.substring(0, 80) + (i.description.length > 80 ? "…" : "") : "No description",
      timestamp: i.created_date,
      severity: i.severity,
      site: i.site_id ? siteMap[i.site_id] : null,
      site_id: i.site_id,
    })),
    ...recentTimesheets.map(t => ({
      id: `ts-${t.id}`,
      recordId: t.id,
      type: "timesheet",
      title: t.clock_in && t.clock_out ? "Timesheet Submitted" : t.clock_in ? "Clocked In" : "Timesheet Entry",
      subtitle: t.clock_in ? `${format(new Date(t.clock_in), "h:mm a")}${t.clock_out ? " → " + format(new Date(t.clock_out), "h:mm a") : " (active)"}${t.total_hours ? " · " + t.total_hours.toFixed(2) + " hrs" : ""}` : "Entry logged",
      timestamp: t.created_date,
      site: t.site_id ? siteMap[t.site_id] : null,
      site_id: t.site_id,
    })),
    ...recentTraining.map(tr => ({
      id: `tr-${tr.id}`,
      recordId: tr.id,
      type: "training",
      title: "Training Completed",
      subtitle: tr.notes ? tr.notes.substring(0, 80) : `Progress: ${tr.progress_percentage || 100}%${tr.quiz_score != null ? " · Score: " + tr.quiz_score + "%" : ""}`,
      timestamp: tr.completion_date || tr.updated_date,
      site: null,
      site_id: null,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50);

  const filtered = feedItems.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (siteFilter !== "all" && item.site_id !== siteFilter) return false;
    return true;
  });

  const handleRefresh = () => { refetchIncidents(); refetchTimesheets(); refetchTraining(); };

  const handleItemClick = (item) => {
    if (item.type === "incident") navigate(`/IncidentManagement?id=${item.recordId}`);
    else if (item.type === "timesheet") navigate(`/TimesheetsManagement?id=${item.recordId}`);
    else if (item.type === "training") navigate(`/TrainingAssignments?id=${item.recordId}`);
  };

  return (
    <Card className="shadow-sm border-slate-200 mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-[#c9a227]" />
            Activity Feed
            <span className="ml-1 text-xs font-normal text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-slate-500 hover:text-slate-900 gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
        {/* Filters */}
        <div className="flex gap-2 flex-wrap mt-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <Filter className="w-3 h-3 mr-1 text-slate-400" />
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="incident">Incidents</SelectItem>
              <SelectItem value="timesheet">Timesheets</SelectItem>
              <SelectItem value="training">Training</SelectItem>
            </SelectContent>
          </Select>

          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 px-6 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recent activity matching filters</p>
          </div>
        ) : (
          <div className="max-h-[480px] overflow-y-auto pr-1">
            {filtered.map(item => <FeedItem key={item.id} item={item} onClick={() => handleItemClick(item)} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}