import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, FileText, Clock, CheckCircle, XCircle, ChevronRight, Loader2, Download, Trash2, Square, CheckSquare, LayoutGrid, List, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import IncidentKanban from "@/components/incidents/IncidentKanban";
import { toast } from "sonner";

const SEVERITY_STYLES = { low: "bg-slate-100 text-slate-700", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700" };
const STATUS_STYLES = { draft: "bg-slate-100 text-slate-700", pending: "bg-amber-100 text-amber-700", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-red-100 text-red-700" };

export default function IncidentReports() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [viewMode, setViewMode] = useState("list"); // "list" | "kanban"

  const deleteMutation = useMutation({
    mutationFn: async (ids) => { for (const id of ids) await base44.entities.Incident.delete(id); },
    onSuccess: () => {
      queryClient.invalidateQueries(["my-incidents"]);
      setSelected(new Set());
      toast.success("Incidents deleted");
    },
  });

  const toggleSelect = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = (list) => {
    setSelected(selected.size === list.length ? new Set() : new Set(list.map((i) => i.id)));
  };

  const exportSummaryPDF = (list, title = "Incident Reports Summary") => {
    if (!list.length) { toast.error("No incidents to export"); return; }
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    const colW = pageW - margin * 2;

    // Header bar
    doc.setFillColor(26, 43, 74); // NPS navy
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(201, 162, 39); // NPS gold
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Nationwide Police Services", margin, 10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin, 17);

    // Generated date
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${format(new Date(), "MMM d, yyyy h:mm a")}  •  Total: ${list.length} incidents`, margin, 28);

    let y = 34;

    const SEVERITY_COLORS = { low: [100, 116, 139], medium: [217, 119, 6], high: [220, 38, 38], critical: [153, 27, 27] };
    const STATUS_COLORS = { draft: [100, 116, 139], pending: [217, 119, 6], approved: [5, 150, 105], rejected: [220, 38, 38], open: [59, 130, 246], in_progress: [99, 102, 241], resolved: [5, 150, 105], closed: [100, 116, 139] };

    list.forEach((inc, idx) => {
      // Auto page break
      if (y > 260) { doc.addPage(); y = 20; }

      // Row background alternating
      doc.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 249 : 255, idx % 2 === 0 ? 250 : 255);
      doc.rect(margin, y - 4, colW, 28, "F");

      // Incident type + number
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const typeName = (inc.incident_type || "Unknown").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      doc.text(`#${idx + 1} — ${typeName}`, margin + 2, y + 2);

      // Severity badge
      const sev = inc.severity || "medium";
      const [sr, sg, sb] = SEVERITY_COLORS[sev] || SEVERITY_COLORS.medium;
      doc.setFillColor(sr, sg, sb);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.roundedRect(margin + 2, y + 5, 20, 5, 1, 1, "F");
      doc.text(sev.toUpperCase(), margin + 4, y + 9);

      // Status badge
      const st = inc.status || "draft";
      const [tr, tg, tb] = STATUS_COLORS[st] || STATUS_COLORS.draft;
      doc.setFillColor(tr, tg, tb);
      doc.roundedRect(margin + 25, y + 5, 22, 5, 1, 1, "F");
      doc.text(st.toUpperCase().replace(/_/g, " "), margin + 27, y + 9);

      // Date
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      const dateStr = inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy") : "—";
      doc.text(dateStr, pageW - margin - 30, y + 2, { align: "right" });

      // Description
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const desc = (inc.description || "No description provided").slice(0, 200);
      const lines = doc.splitTextToSize(desc, colW - 6);
      doc.text(lines.slice(0, 2), margin + 2, y + 16);

      y += 32;
    });

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text(`Page ${p} of ${pageCount}  •  NPS Incident Report Summary  •  CONFIDENTIAL`, pageW / 2, 292, { align: "center" });
    }

    doc.save(`NPS-Incidents-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success(`PDF exported — ${list.length} incident${list.length !== 1 ? "s" : ""}`);
  };

  const handleExportCSV = (list) => {
    const rows = [["Type", "Severity", "Status", "Date", "Description"]];
    list.forEach((inc) => {
      rows.push([inc.incident_type || "", inc.severity || "", inc.status || "",
        inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy") : "",
        (inc.description || "").replace(/"/g, "'")]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "incidents.csv"; a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // Real-time notification when incident status changes
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.Incident.subscribe((event) => {
      if (event.type === "update") {
        const inc = event.data;
        if (inc.reporter_id === user.id || inc.employee_id === user.id) {
          if (inc.status === "resolved" || inc.status === "closed") {
            toast.success(`✅ Incident report status updated to: ${inc.status}`, { duration: 6000 });
          } else if (inc.status === "in_progress") {
            toast(`🔄 Your incident report is now in progress`, { duration: 5000 });
          }
          queryClient.invalidateQueries(["my-incidents"]);
        }
      }
    });
    return unsub;
  }, [user?.id, queryClient]);

  const { data: incidents = [], isLoading, refetch } = useQuery({
    queryKey: ["my-incidents", user?.id],
    queryFn: () => base44.entities.Incident.filter({ reporter_id: user?.id }, "-incident_date"),
    enabled: !!user?.id,
  });

  const handleExportPDF = async (e, incidentId) => {
    e.stopPropagation();
    setExportingId(incidentId);
    try {
      const response = await base44.functions.invoke('exportReportPDF', { type: 'incident', id: incidentId });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `incident-report-${incidentId}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); a.remove();
      toast.success("PDF exported!");
    } catch { toast.error("Failed to export PDF"); } finally { setExportingId(null); }
  };

  const getStatusIcon = (status) => {
    if (status === "approved") return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (status === "rejected") return <XCircle className="w-5 h-5 text-red-600" />;
    if (status === "pending") return <Clock className="w-5 h-5 text-amber-600" />;
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

  if (isLoading) return <LoadingScreen />;

  const handleKanbanStatusChange = async (incidentId, newStatus) => {
    try {
      await base44.entities.Incident.update(incidentId, { status: newStatus });
      queryClient.invalidateQueries(["my-incidents"]);
      toast.success(`Status updated to "${newStatus.replace(/_/g, " ")}"`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const drafts = incidents.filter(i => i.status === "draft");
  const pending = incidents.filter(i => i.status === "pending");
  const completed = incidents.filter(i => ["approved", "rejected"].includes(i.status));

  const IncidentCard = ({ incident }) => (
    <Card className={`shadow-sm hover:shadow-md transition-shadow ${selected.has(incident.id) ? "ring-2 ring-[#c9a227]" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={selected.has(incident.id)} onCheckedChange={() => toggleSelect(incident.id)} className="mt-1" onClick={(e) => e.stopPropagation()} />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(createPageUrl(`IncidentForm?id=${incident.id}`))}>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold capitalize">{incident.incident_type?.replace("_", " ")}</p>
              <Badge className={SEVERITY_STYLES[incident.severity]}>{incident.severity}</Badge>
            </div>
            <p className="text-sm text-slate-500 mb-2">{format(new Date(incident.incident_date), "MMM d, yyyy")} at {incident.incident_time}</p>
            <p className="text-sm text-slate-600 line-clamp-2">{incident.description}</p>
            <div className="flex items-center gap-2 mt-3"><Badge className={STATUS_STYLES[incident.status]}>{incident.status}</Badge></div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {["approved", "rejected"].includes(incident.status) && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#1a2b4a]" onClick={e => handleExportPDF(e, incident.id)} disabled={exportingId === incident.id}>
                {exportingId === incident.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            )}
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Incident Reports" subtitle="File and track incident reports" action={() => navigate(createPageUrl("IncidentForm"))} actionLabel="New Report" />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">{incidents.length} total incidents</p>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm" className="h-8 px-3 gap-1"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" /> List
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm" className="h-8 px-3 gap-1"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </Button>
          </div>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <>
            <div className="flex justify-end mb-3">
              <Button size="sm" variant="outline" onClick={() => exportSummaryPDF(incidents, "Incident Reports — Kanban Summary")} className="gap-2 text-[#1a2b4a] border-[#1a2b4a]">
                <FileDown className="w-4 h-4" /> Export All as PDF
              </Button>
            </div>
            <PullToRefresh onRefresh={refetch}>
              <IncidentKanban incidents={incidents} onStatusChange={handleKanbanStatusChange} />
            </PullToRefresh>
          </>
        )}

        {/* List View */}
        {viewMode === "list" && selected.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-wrap">
            <span className="text-sm font-medium text-amber-800">{selected.size} selected</span>
            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(Array.from(selected))} disabled={deleteMutation.isPending} className="gap-1">
              {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExportCSV(incidents.filter(i => selected.has(i.id)))} className="gap-1">
              <Download className="w-3 h-3" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportSummaryPDF(incidents.filter(i => selected.has(i.id)), "Selected Incidents")} className="gap-1 text-[#1a2b4a] border-[#1a2b4a]">
              <FileDown className="w-3 h-3" /> PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
        {viewMode === "list" && <PullToRefresh onRefresh={refetch}>
          <Tabs defaultValue="all">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="all" className="flex-1">All ({incidents.length})</TabsTrigger>
              <TabsTrigger value="drafts" className="flex-1">Drafts ({drafts.length})</TabsTrigger>
              <TabsTrigger value="pending" className="flex-1">Pending ({pending.length})</TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            {[["all", incidents], ["drafts", drafts], ["pending", pending], ["completed", completed]].map(([tab, list]) => (
              <TabsContent key={tab} value={tab}>
                {list.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <button onClick={() => toggleAll(list)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                        {selected.size === list.length && list.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        Select All
                      </button>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleExportCSV(list)} className="gap-1">
                          <Download className="w-3 h-3" /> CSV
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => exportSummaryPDF(list)} className="gap-1 text-[#1a2b4a] border-[#1a2b4a]">
                          <FileDown className="w-3 h-3" /> PDF
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-3">{list.map(i => <IncidentCard key={i.id} incident={i} />)}</div>
                  </>
                ) : (
                  <EmptyState icon={AlertTriangle} title={tab === "drafts" ? "No drafts" : `No ${tab} reports`} description={tab === "all" ? "File your first incident report" : ""} action={tab === "all" ? () => navigate(createPageUrl("IncidentForm")) : undefined} actionLabel="New Report" />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </PullToRefresh>}
      </div>
    </div>
  );
}