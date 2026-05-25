import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Download, DollarSign, Clock, FileText, AlertCircle, Loader2, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ClientMapView from "@/components/mapping/ClientMapView";
import "leaflet/dist/leaflet.css";

export default function ClientSecureDashboard() {
  const [user, setUser] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["client-invoices", user?.id],
    queryFn: async () => { const allInvoices = await base44.entities.Invoice.list("-issue_date", 100); return allInvoices.filter(inv => inv.client_id === user?.id); },
    enabled: !!user?.id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["client-sites", user?.id],
    queryFn: async () => { const allSites = await base44.entities.Site.list(); return allSites.filter(s => s.client_id === user?.id); },
    enabled: !!user?.id,
  });

  const { data: patrols = [] } = useQuery({
    queryKey: ["client-patrol-hours", user?.id],
    queryFn: async () => {
      const now = new Date();
      if (sites.length === 0) return [];
      const siteIds = sites.map(s => s.id);
      const allPatrols = await base44.entities.PatrolSession.list("-start_time", 500);
      return allPatrols.filter(p => {
        const patrolDate = new Date(p.start_time);
        return siteIds.includes(p.site_id) && patrolDate >= startOfMonth(now) && patrolDate <= endOfMonth(now) && p.status === "completed";
      });
    },
    enabled: !!user?.id && sites.length > 0,
  });

  if (user && user.role_type !== "client") {
    return (
      <div className="min-h-screen bg-red-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive"><Shield className="h-4 w-4" /><AlertDescription>This page is only accessible to clients. You do not have permission to view this dashboard.</AlertDescription></Alert>
        </div>
      </div>
    );
  }

  if (!user || invoicesLoading) return <LoadingScreen />;

  const totalPatrolHours = patrols.reduce((acc, patrol) => {
    if (patrol.start_time && patrol.end_time) {
      const hours = (new Date(patrol.end_time) - new Date(patrol.start_time)) / (1000 * 60 * 60);
      return acc + hours;
    }
    return acc;
  }, 0);

  const thisMonth = new Date();
  const monthInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.issue_date);
    return invDate.getMonth() === thisMonth.getMonth() && invDate.getFullYear() === thisMonth.getFullYear();
  });
  const totalCharges = monthInvoices.reduce((acc, inv) => acc + (inv.total || 0), 0);

  const handleDownloadInvoice = async (invoiceId, invoiceNumber) => {
    setDownloading(invoiceId);
    try {
      const response = await base44.functions.invoke("generateInvoicePDF", { invoiceId });
      if (response.data?.file_url) {
        const link = document.createElement("a"); link.href = response.data.file_url; link.download = `Invoice-${invoiceNumber}.pdf`; link.click();
        toast.success("Invoice downloaded");
      } else { toast.error("Failed to generate PDF"); }
    } catch (error) { toast.error("Download failed: " + error.message); } finally { setDownloading(null); }
  };

  const statusColors = {
    paid: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700",
    overdue: "bg-red-100 text-red-700", partial: "bg-blue-100 text-blue-700", disputed: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Secure Client Dashboard" subtitle="View your service charges, invoices, and patrol hours" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card className="shadow-sm overflow-hidden"><div className="h-96"><ClientMapView clientId={user?.id} /></div></Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500 font-medium flex items-center gap-2"><DollarSign className="w-4 h-4" />This Month's Charges</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-slate-900">${totalCharges.toFixed(2)}</p><p className="text-xs text-slate-500 mt-1">{monthInvoices.length} invoice{monthInvoices.length !== 1 ? "s" : ""}</p></CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500 font-medium flex items-center gap-2"><Clock className="w-4 h-4" />Patrol Hours (This Month)</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-slate-900">{totalPatrolHours.toFixed(1)}<span className="text-sm text-slate-500 ml-1">hrs</span></p><p className="text-xs text-slate-500 mt-1">{patrols.length} patrol{patrols.length !== 1 ? "s" : ""}</p></CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500 font-medium flex items-center gap-2"><FileText className="w-4 h-4" />Account Status</CardTitle></CardHeader>
            <CardContent><Badge className="bg-emerald-100 text-emerald-700">Active</Badge><p className="text-xs text-slate-500 mt-2">Client since {format(new Date(user.created_date), "MMM yyyy")}</p></CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="bg-slate-50 border-b"><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Recent Invoices</CardTitle></CardHeader>
          <CardContent className="p-0">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-slate-500"><p>No invoices available</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-4 font-semibold">Invoice #</th>
                      <th className="text-left p-4 font-semibold">Issue Date</th>
                      <th className="text-left p-4 font-semibold">Due Date</th>
                      <th className="text-right p-4 font-semibold">Amount</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-center p-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-medium">{invoice.invoice_number}</td>
                        <td className="p-4">{format(new Date(invoice.issue_date), "MMM d, yyyy")}</td>
                        <td className="p-4">{format(new Date(invoice.due_date), "MMM d, yyyy")}</td>
                        <td className="p-4 text-right font-semibold">${(invoice.total || 0).toFixed(2)}</td>
                        <td className="p-4"><Badge className={`${statusColors[invoice.status] || "bg-slate-100 text-slate-700"} text-xs`}>{(invoice.status || "draft").replace("_", " ").toUpperCase()}</Badge></td>
                        <td className="p-4 text-center">
                          <Button variant="outline" size="sm" onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)} disabled={downloading === invoice.id}>
                            {downloading === invoice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-1" />Download</>}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {patrols.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="bg-slate-50 border-b"><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Patrol Hours Breakdown ({format(new Date(), "MMMM yyyy")})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-4 font-semibold">Site</th>
                      <th className="text-left p-4 font-semibold">Date</th>
                      <th className="text-left p-4 font-semibold">Start Time</th>
                      <th className="text-left p-4 font-semibold">End Time</th>
                      <th className="text-right p-4 font-semibold">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patrols.map((patrol) => {
                      const site = sites.find(s => s.id === patrol.site_id);
                      const start = new Date(patrol.start_time);
                      const end = new Date(patrol.end_time);
                      const hours = (end - start) / (1000 * 60 * 60);
                      return (
                        <tr key={patrol.id} className="border-b hover:bg-slate-50">
                          <td className="p-4 font-medium">{site?.name || "Unknown"}</td>
                          <td className="p-4">{format(start, "MMM d, yyyy")}</td>
                          <td className="p-4">{format(start, "h:mm a")}</td>
                          <td className="p-4">{format(end, "h:mm a")}</td>
                          <td className="p-4 text-right font-medium">{hours.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-slate-50">
                      <td colSpan="4" className="p-4 text-right font-bold">Total Hours:</td>
                      <td className="p-4 text-right font-bold">{totalPatrolHours.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Alert className="bg-blue-50 border-blue-200">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">This is a secure, client-only dashboard. Your data is encrypted and only accessible with your login credentials. All invoice downloads are logged for security purposes.</AlertDescription>
        </Alert>
      </div>
    </div>
  );
}