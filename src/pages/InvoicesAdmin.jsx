import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Receipt, FileText, Eye, Plus, Building2, BarChart3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { toast } from "sonner";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700", pending_approval: "bg-purple-100 text-purple-700",
  sent: "bg-blue-100 text-blue-700", viewed: "bg-cyan-100 text-cyan-700",
  partial: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700", disputed: "bg-orange-100 text-orange-700",
  denied: "bg-red-200 text-red-900", cancelled: "bg-slate-200 text-slate-600",
  revised: "bg-indigo-100 text-indigo-700", payment_plan: "bg-violet-100 text-violet-700",
};

const ALL_STATUSES = ["draft","pending_approval","sent","viewed","partial","paid","overdue","disputed","cancelled","revised","payment_plan"];

export default function InvoicesAdmin() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: invoices = [], isLoading, refetch: refetchInvoices } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date") });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => base44.entities.Client.list() });

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c]));

  const filtered = invoices.filter(inv => {
    const client = clientMap[inv.client_id];
    const matchSearch = !search || (inv.invoice_number||"").toLowerCase().includes(search.toLowerCase()) || (client?.name||"").toLowerCase().includes(search.toLowerCase()) || (inv.client_name||"").toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === "all" || inv.status === statusFilter);
  });

  const byStatus = (s) => filtered.filter(i => (Array.isArray(s) ? s.includes(i.status) : i.status === s));

  const handleGeneratePDF = async (e, invoice) => {
    e.stopPropagation();
    try {
      toast.loading("Generating PDF...");
      const response = await base44.functions.invoke("generateInvoicePDF", { invoiceId: invoice.id });
      const blob = new Blob([Uint8Array.from(atob(response.data.pdfBase64), c => c.charCodeAt(0))], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = response.data.fileName; a.click(); window.URL.revokeObjectURL(url);
      toast.dismiss(); toast.success("PDF downloaded");
    } catch { toast.dismiss(); toast.error("Failed to generate PDF"); }
  };

  const InvoiceCard = ({ invoice }) => {
    const client = clientMap[invoice.client_id];
    const balance = invoice.balance_due ?? invoice.total ?? 0;
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(createPageUrl("InvoiceDetail") + `?id=${invoice.id}`)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap"><p className="font-semibold">{invoice.invoice_number || "Draft"}</p><Badge className={STATUS_STYLES[invoice.status] || "bg-slate-100"}>{(invoice.status||"draft").replace("_"," ")}</Badge></div>
              <p className="text-sm text-slate-600">{client?.name || invoice.client_name || "Unknown client"}</p>
              <p className="text-xs text-slate-500 mt-1">Issued: {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "—"}</p>
              <p className="text-xs text-slate-500">Due: {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#1a2b4a]">${balance.toFixed(2)}</p>
              {invoice.amount_paid > 0 && <p className="text-xs text-emerald-600">Paid: ${(invoice.amount_paid||0).toFixed(2)}</p>}
              <div className="flex gap-1 mt-2">
                <Button variant="ghost" size="sm" onClick={e => handleGeneratePDF(e, invoice)} className="h-7 px-2"><FileText className="w-3 h-3 mr-1" />PDF</Button>
                <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); navigate(createPageUrl("InvoiceDetail") + `?id=${invoice.id}`); }} className="h-7 px-2"><Eye className="w-3 h-3 mr-1" />View</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = () => <div className="text-center py-12 text-slate-400"><Receipt className="w-10 h-10 mx-auto mb-2" /><p>No invoices in this category</p></div>;

  const TabList = ({ list }) => <div className="space-y-3">{list.length === 0 ? <EmptyState /> : list.map(inv => <InvoiceCard key={inv.id} invoice={inv} />)}</div>;

  if (isLoading) return <LoadingScreen />;

  const draft = byStatus("draft"), sent = byStatus(["sent","viewed"]), partial = byStatus("partial");
  const overdue = byStatus("overdue"), disputed = byStatus("disputed"), paid = byStatus("paid");

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Invoices" subtitle={`${invoices.length} total invoices`} />
      <PullToRefresh onRefresh={refetchInvoices}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(createPageUrl("AccountingDashboard"))}><BarChart3 className="w-4 h-4 mr-2" />Accounting</Button>
        <Button onClick={() => navigate(createPageUrl("InvoiceCreate"))} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"><Plus className="w-4 h-4 mr-2" />New Invoice</Button>
      </div>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-6">
          {[{ label: "Draft", count: invoices.filter(i=>i.status==="draft").length, color: "text-slate-600" }, { label: "Sent", count: invoices.filter(i=>["sent","viewed"].includes(i.status)).length, color: "text-blue-600" }, { label: "Partial", count: partial.length, color: "text-amber-600" }, { label: "Overdue", count: overdue.length, color: "text-red-600" }, { label: "Disputed", count: disputed.length, color: "text-orange-600" }, { label: "Paid", count: paid.length, color: "text-emerald-600" }].map(item => (
            <Card key={item.label} className="shrink-0 min-w-[90px]"><CardContent className="p-3 text-center"><p className={`text-xl font-bold ${item.color}`}>{item.count}</p><p className="text-xs text-slate-500">{item.label}</p></CardContent></Card>
          ))}
        </div>
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Search by invoice # or client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={() => navigate(createPageUrl("InvoiceSettings"))}><Building2 className="w-4 h-4" /></Button>
        </div>
        <Tabs defaultValue="all">
          <TabsList className="mb-4 flex w-full overflow-x-auto h-auto gap-1 justify-start">
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft ({draft.length})</TabsTrigger>
            <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
            <TabsTrigger value="overdue" className="text-red-600">Overdue ({overdue.length})</TabsTrigger>
            <TabsTrigger value="disputed" className="text-orange-600">Disputed ({disputed.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><TabList list={filtered} /></TabsContent>
          <TabsContent value="draft"><TabList list={draft} /></TabsContent>
          <TabsContent value="sent"><TabList list={sent} /></TabsContent>
          <TabsContent value="overdue"><TabList list={overdue} /></TabsContent>
          <TabsContent value="disputed"><TabList list={disputed} /></TabsContent>
          <TabsContent value="paid"><TabList list={paid} /></TabsContent>
        </Tabs>
        </div>
        </PullToRefresh>
        </div>
        );
        }