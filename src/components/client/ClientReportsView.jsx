import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Printer, Shield, AlertCircle, FileText, MapPin, Clock } from "lucide-react";
import { format, subDays } from "date-fns";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";
const SEVERITY_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#7c3aed" };

export default function ClientReportsView({ sites = [] }) {
  const [reportType, setReportType] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const printRef = useRef();

  const { data: incidents = [] } = useQuery({
    queryKey: ["client-incidents-reports", sites.map(s => s.id).join(",")],
    queryFn: async () => {
      if (sites.length === 0) return [];
      const all = await base44.entities.Incident.list("-created_date");
      return all.filter(i => sites.some(s => s.id === i.site_id) && ['resolved', 'closed', 'approved', 'under_review', 'in_progress'].includes(i.status));
    },
    enabled: sites.length > 0,
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["client-patrols-reports", sites.map(s => s.id).join(",")],
    queryFn: async () => {
      if (sites.length === 0) return [];
      const all = await base44.entities.PatrolSession.filter({ status: "completed" });
      return all.filter(p => sites.some(s => s.id === p.site_id));
    },
    enabled: sites.length > 0,
  });

  const { data: users = [] } = useQuery({ queryKey: ["users-reports-view"], queryFn: () => base44.entities.User.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees-reports-view"], queryFn: () => base44.entities.Employee.list() });

  const getName = (id) => {
    const u = users.find(u => u.id === id);
    if (u?.full_name) return u.full_name;
    const e = employees.find(e => e.id === id);
    if (e) return `${e.firstName || ''} ${e.lastName || ''}`.trim();
    return "Unknown Officer";
  };

  const cutoff = subDays(new Date(), parseInt(dateRange));
  const allReports = [
    ...incidents.map(i => ({ ...i, _type: 'incident', _date: new Date(i.incident_date || i.created_date) })),
    ...patrols.map(p => ({ ...p, _type: 'patrol', _date: new Date(p.start_time) })),
  ]
    .filter(r => r._date >= cutoff)
    .filter(r => reportType === 'all' || r._type === reportType)
    .filter(r => siteFilter === 'all' || r.site_id === siteFilter)
    .filter(r => {
      const site = sites.find(s => s.id === r.site_id);
      const officer = getName(r._type === 'incident' ? r.reporter_id : r.officer_id);
      const text = `${site?.name || ''} ${officer} ${r.description || r.incident_type || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    })
    .sort((a, b) => b._date - a._date);

  const doPrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>NPS Report</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#000;}.header{text-align:center;border-bottom:3px double #1a2b4a;padding-bottom:16px;margin-bottom:20px;}.logo{width:80px;height:80px;object-fit:contain;}h1{color:#1a2b4a;margin:8px 0 4px;font-size:18px;}h2{color:#1a2b4a;margin:4px 0;font-size:14px;letter-spacing:1px;}.report-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;padding:12px;background:#f8f9fa;border:1px solid #dee2e6;border-radius:4px;}.meta-item{font-size:12px;}.meta-label{font-weight:bold;color:#555;}.section{margin:16px 0;}.section-title{font-size:13px;font-weight:bold;color:#1a2b4a;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px;text-transform:uppercase;}.field{display:flex;gap:8px;margin:6px 0;font-size:12px;}.field-label{font-weight:bold;min-width:140px;color:#333;}.field-value{flex:1;}.footer{border-top:1px solid #1a2b4a;margin-top:40px;padding-top:8px;display:flex;justify-content:space-between;font-size:10px;color:#666;}@media print{body{padding:10px;}}</style></head><body>${printContents}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative col-span-2 md:col-span-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
            <Select value={reportType} onValueChange={setReportType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Reports</SelectItem><SelectItem value="incident">Incident Reports</SelectItem><SelectItem value="patrol">Patrol Reports</SelectItem></SelectContent></Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}><SelectTrigger><SelectValue placeholder="All Sites" /></SelectTrigger><SelectContent><SelectItem value="all">All Sites</SelectItem>{sites.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            <Select value={dateRange} onValueChange={setDateRange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last year</SelectItem></SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 text-sm text-slate-600">
        <span>{allReports.length} report{allReports.length !== 1 ? 's' : ''} found</span>
        <span>·</span><span>{allReports.filter(r => r._type === 'incident').length} incidents</span>
        <span>·</span><span>{allReports.filter(r => r._type === 'patrol').length} patrols</span>
      </div>

      <div className="space-y-3">
        {allReports.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" /><p>No reports found for the selected filters.</p></CardContent></Card>
        ) : (
          allReports.map(report => {
            const site = sites.find(s => s.id === report.site_id);
            const isIncident = report._type === 'incident';
            const officerName = getName(isIncident ? report.reporter_id : report.officer_id);
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isIncident ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {isIncident ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Shield className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge className={isIncident ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{isIncident ? 'Incident Report' : 'Patrol Report'}</Badge>
                          {isIncident && report.severity && <Badge variant="outline" style={{ borderColor: SEVERITY_COLORS[report.severity], color: SEVERITY_COLORS[report.severity] }}>{report.severity.toUpperCase()}</Badge>}
                          {isIncident && report.incident_type && <span className="text-sm font-medium capitalize">{report.incident_type.replace(/_/g, ' ')}</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{site?.name}</span>
                          <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" />{officerName}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{format(report._date, 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {isIncident && report.description && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{report.description}</p>}
                        {!isIncident && <p className="text-sm text-slate-600 mt-1">{report.scanned_checkpoints || 0}/{report.total_checkpoints || 0} checkpoints · {report.notes?.length || 0} notes</p>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedReport(report); setPrintDialogOpen(true); }} className="flex-shrink-0"><Printer className="w-4 h-4 mr-1" />Print</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Official Report — Preview</DialogTitle></DialogHeader>
          {selectedReport && (
            <>
              <div ref={printRef}><PrintableReport report={selectedReport} sites={sites} getName={getName} /></div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setPrintDialogOpen(false)} className="flex-1">Close</Button>
                <Button onClick={doPrint} className="flex-1 bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white"><Printer className="w-4 h-4 mr-2" />Print Report</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-bold text-[#1a2b4a] border-b border-[#1a2b4a] pb-1 mb-2 text-sm uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

const Field = ({ label, value }) => value ? (
  <div className="flex gap-2 py-1 border-b border-slate-100">
    <span className="font-semibold min-w-[160px] text-slate-700">{label}:</span>
    <span className="flex-1">{value}</span>
  </div>
) : null;

function PrintableReport({ report, sites, getName }) {
  const site = sites.find(s => s.id === report.site_id);
  const isIncident = report._type === 'incident';
  const officerName = getName(isIncident ? report.reporter_id : report.officer_id);
  const reportNum = `NPS-${report.id?.slice(-8).toUpperCase()}`;

  return (
    <div className="bg-white text-black font-sans text-sm p-2">
      <div className="text-center border-b-2 border-[#1a2b4a] pb-4 mb-4">
        <img src={LOGO_URL} alt="NPS Logo" className="w-20 h-20 object-contain mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-[#1a2b4a]">NATIONWIDE POLICE SERVICES LLC</h1>
        <h2 className="text-lg font-semibold text-slate-700 tracking-widest mt-1">{isIncident ? 'INCIDENT REPORT' : 'PATROL REPORT'}</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-slate-50 border rounded p-3 mb-4">
        <div><span className="font-bold text-slate-600">Report #:</span> {reportNum}</div>
        <div><span className="font-bold text-slate-600">Date:</span> {format(report._date, 'MMMM d, yyyy')}</div>
        <div><span className="font-bold text-slate-600">Time:</span> {format(report._date, 'h:mm a')}</div>
        <div><span className="font-bold text-slate-600">Site:</span> {site?.name || '—'}</div>
        <div><span className="font-bold text-slate-600">Address:</span> {site?.address ? `${site.address.street || ''}, ${site.address.city || ''}` : '—'}</div>
        <div><span className="font-bold text-slate-600">Reporting Officer:</span> {officerName}</div>
      </div>
      {isIncident ? (
        <div className="space-y-4">
          <Section title="Incident Details">
            <Field label="Incident Type" value={report.incident_type?.replace(/_/g, ' ').toUpperCase()} />
            <Field label="Severity" value={report.severity?.toUpperCase()} />
            <Field label="Incident Date" value={report.incident_date} />
            <Field label="Status" value={report.status?.replace(/_/g, ' ').toUpperCase()} />
          </Section>
          <Section title="Description"><p className="py-2 whitespace-pre-wrap">{report.description}</p></Section>
          {report.injuries?.has_injuries && (
            <Section title="Injuries">
              <Field label="Who Injured" value={report.injuries.who_injured} />
              <Field label="Nature of Injuries" value={report.injuries.nature_of_injuries} />
            </Section>
          )}
          <Section title="Approval Status"><Field label="Status" value={report.status?.replace(/_/g, ' ').toUpperCase()} /></Section>
        </div>
      ) : (
        <div className="space-y-4">
          <Section title="Patrol Summary">
            <Field label="Start Time" value={report.start_time ? format(new Date(report.start_time), 'h:mm a') : '—'} />
            <Field label="End Time" value={report.end_time ? format(new Date(report.end_time), 'h:mm a') : 'Ongoing'} />
            <Field label="Checkpoints Scanned" value={`${report.scanned_checkpoints || 0} of ${report.total_checkpoints || 0}`} />
          </Section>
          {report.notes?.length > 0 && (
            <Section title="Officer Notes">
              {report.notes.map((note, i) => <div key={i} className="py-1 border-b border-slate-100"><p>{note.text}</p></div>)}
            </Section>
          )}
        </div>
      )}
      <div className="mt-8 border-t border-[#1a2b4a] pt-3 flex justify-between text-xs text-slate-500">
        <span>Confidential — For Authorized Recipients Only</span>
        <span>NATIONWIDE POLICE SERVICES LLC · Page 1</span>
      </div>
    </div>
  );
}