import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Search, Edit, Trash2, Download, Loader2, CheckSquare, Square, FileText, Calendar, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";
import { format } from "date-fns";

export default function IncidentManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [showPdfDialog, setShowPdfDialog] = useState(false);
  const [pdfFilters, setPdfFilters] = useState({ site_id: "", start_date: "", end_date: "" });
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [editForm, setEditForm] = useState({});
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["incidents", tenantFilter],
    queryFn: () => base44.entities.Incident.filter(tenantFilter, "-created_date"),
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: () => base44.entities.Site.filter(tenantFilter),
    enabled: !!tenantFilter.company_id,
  });

  const handleGeneratePDF = async () => {
    if (!pdfFilters.start_date || !pdfFilters.end_date) {
      toast.error("Please select both start and end dates");
      return;
    }

    setGeneratingPdf(true);
    try {
      const response = await base44.functions.invoke("generateIncidentReportPDF", {
        site_id: pdfFilters.site_id || null,
        start_date: pdfFilters.start_date,
        end_date: pdfFilters.end_date,
      });

      // Create blob and download
      const blob = new Blob([response], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `incident_report_${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF report generated successfully");
      setShowPdfDialog(false);
    } catch (error) {
      toast.error("Failed to generate PDF: " + (error.message || "Unknown error"));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Incident.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["incidents"]);
      toast.success("Incident updated");
      setEditingIncident(null);
    },
  });

  const openEdit = (inc) => { setEditingIncident(inc); setEditForm({ status: inc.status, severity: inc.severity, notes: inc.notes || "" }); };

  const deleteMutation = useMutation({
    mutationFn: async (ids) => {
      for (const id of ids) await base44.entities.Incident.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["incidents"]);
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
    if (selected.size === list.length) setSelected(new Set());
    else setSelected(new Set(list.map((i) => i.id)));
  };

  const handleExportCSV = (list) => {
    const rows = [["Type", "Severity", "Status", "Date", "Description"]];
    list.forEach((inc) => {
      rows.push([
        inc.incident_type || "",
        inc.severity || "",
        inc.status || "",
        inc.incident_date ? format(new Date(inc.incident_date), "MMM d, yyyy") : "",
        (inc.description || "").replace(/"/g, "'"),
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "incidents.csv";
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const filtered = incidents.filter((inc) => {
    const matchSearch = !search || 
      inc.incident_type?.toLowerCase().includes(search.toLowerCase()) ||
      inc.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || inc.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const SEVERITY_STYLES = {
    low: "bg-slate-100 text-slate-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-red-100 text-red-700",
    critical: "bg-purple-100 text-purple-700",
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Incident Management" subtitle="Track and resolve incidents" currentPage="IncidentManagement" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search incidents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExportCSV(filtered)} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <FileText className="w-4 h-4" /> Generate PDF Report
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Generate Incident Report PDF
                    </DialogTitle>
                    <DialogDescription>
                      Create a PDF summary of incidents filtered by site and date range.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Site (Optional)</Label>
                      <Select value={pdfFilters.site_id} onValueChange={(val) => setPdfFilters({ ...pdfFilters, site_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Sites" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>All Sites</SelectItem>
                          {sites.map(site => (
                            <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={pdfFilters.start_date}
                        onChange={(e) => setPdfFilters({ ...pdfFilters, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={pdfFilters.end_date}
                        onChange={(e) => setPdfFilters({ ...pdfFilters, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPdfDialog(false)}>Cancel</Button>
                    <Button onClick={handleGeneratePDF} disabled={generatingPdf} className="gap-2">
                      {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Generate PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <span className="text-sm text-slate-500">{selected.size} selected</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(Array.from(selected))}
                  disabled={deleteMutation.isPending}
                  className="gap-2"
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {filtered.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => toggleAll(filtered)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                {selected.size === filtered.length && filtered.length > 0
                  ? <CheckSquare className="w-4 h-4" />
                  : <Square className="w-4 h-4" />}
                Select All
              </button>
            </div>
            <div className="space-y-3">
              {filtered.map((inc) => (
                <Card key={inc.id} className={`hover:shadow-md transition-shadow ${selected.has(inc.id) ? "ring-2 ring-[#c9a227]" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(inc.id)}
                        onCheckedChange={() => toggleSelect(inc.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold capitalize">{inc.incident_type?.replace(/_/g, " ")}</h3>
                          <Badge className={SEVERITY_STYLES[inc.severity] || SEVERITY_STYLES.low}>{inc.severity}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{inc.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{inc.description?.substring(0, 120)}{inc.description?.length > 120 ? "..." : ""}</p>
                        {inc.incident_date && (
                          <p className="text-xs text-slate-500">{format(new Date(inc.incident_date), "MMM d, yyyy h:mm a")}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-700 shrink-0" onClick={() => openEdit(inc)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <EmptyState icon={AlertTriangle} title="No incidents found" />
        )}
      </div>

      {/* Edit Incident Dialog */}
      <Dialog open={!!editingIncident} onOpenChange={() => setEditingIncident(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Incident</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({...p, status: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={editForm.severity} onValueChange={v => setEditForm(p => ({...p, severity: v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(p => ({...p, notes: e.target.value}))} placeholder="Additional notes..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditingIncident(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: editingIncident.id, data: editForm })} disabled={updateMutation.isPending} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}