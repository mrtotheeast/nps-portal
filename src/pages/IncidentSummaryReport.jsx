import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Download, FileText, Share2, Printer, Calendar, MapPin, AlertTriangle, Loader2, Search, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function IncidentSummaryReport() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSite, setSelectedSite] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [viewingPdf, setViewingPdf] = useState(null);
  const pdfRef = useRef(null);

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn: () => base44.entities.Incident.list("-incident_date", 500),
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const filtered = incidents.filter((inc) => {
        const incDate = inc.incident_date ? parseISO(inc.incident_date).toISOString().split("T")[0] : null;
        const dateMatch = incDate && incDate >= startDate && incDate <= endDate;
        const siteMatch = selectedSite === "all" || inc.site_id === selectedSite;
        const sevMatch = severity === "all" || inc.severity === severity;
        return dateMatch && siteMatch && sevMatch;
      });

      if (filtered.length === 0) {
        toast.error("No incidents match filters");
        return null;
      }

      const response = await base44.functions.invoke("generateIncidentSummaryPDF", {
        incidents: filtered,
        start_date: startDate,
        end_date: endDate,
        site_id: selectedSite === "all" ? null : selectedSite,
        site_name: selectedSite === "all" ? null : sites.find(s => s.id === selectedSite)?.name,
      });

      return response.data?.pdf_url;
    },
    onSuccess: (pdfUrl) => {
      if (pdfUrl) {
        toast.success("Report generated");
        setViewingPdf(pdfUrl);
      }
    },
    onError: () => toast.error("Failed to generate report"),
  });

  const handleDownload = (url) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `incident-summary-${startDate}-to-${endDate}.pdf`;
    a.click();
    toast.success("Downloading PDF");
  };

  const handlePrint = () => {
    if (pdfRef.current) {
      window.print();
    }
  };

  const handleShare = async () => {
    if (!viewingPdf) return;
    if (navigator.share) {
      await navigator.share({ title: "Incident Summary Report", url: viewingPdf });
    } else {
      await navigator.clipboard.writeText(viewingPdf);
      toast.success("PDF link copied to clipboard");
    }
  };

  const filtered = incidents.filter((inc) => {
    const incDate = inc.incident_date ? parseISO(inc.incident_date).toISOString().split("T")[0] : null;
    const dateMatch = incDate && incDate >= startDate && incDate <= endDate;
    const siteMatch = selectedSite === "all" || inc.site_id === selectedSite;
    const sevMatch = severity === "all" || inc.severity === severity;
    return dateMatch && siteMatch && sevMatch;
  });

  const severityStyles = {
    low: "bg-blue-100 text-blue-700",
    medium: "bg-amber-100 text-amber-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Incident Summary Report"
        subtitle="Generate and download filtered incident reports"
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Site</label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1 block">Severity</label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="flex-1 md:flex-none bg-[#1a2b4a] hover:bg-[#2d4a6f] gap-2"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Generate Report
              </Button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              {filtered.length} incident{filtered.length !== 1 ? "s" : ""} match filters
            </p>
          </CardContent>
        </Card>

        {/* Quick View */}
        {filtered.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Incidents to Include ({filtered.length})
              </h3>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {filtered.map((inc) => (
                  <div key={inc.id} className="flex items-start justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{inc.incident_type}</p>
                      <p className="text-xs text-slate-500 truncate">{inc.description}</p>
                    </div>
                    <Badge className={severityStyles[inc.severity]} variant="default">
                      {inc.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Viewer */}
        {viewingPdf && (
          <Card className="shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Report Preview
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleShare}
                    className="gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(viewingPdf)}
                    className="bg-[#1a2b4a] hover:bg-[#2d4a6f] gap-2"
                  >
                    <Download className="w-4 h-4" /> Download
                  </Button>
                </div>
              </div>
              <iframe
                ref={pdfRef}
                src={viewingPdf}
                className="w-full h-[600px] rounded-lg border border-slate-200"
                title="Incident Report"
              />
            </CardContent>
          </Card>
        )}

        {filtered.length === 0 && !viewingPdf && (
          <EmptyState
            icon={AlertTriangle}
            title="No incidents found"
            description="Adjust your filters to view incidents"
          />
        )}
      </div>
    </div>
  );
}