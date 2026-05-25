import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { jsPDF } from "jspdf";
import {
  DollarSign, FileText, AlertCircle, CheckCircle, Clock,
  TrendingUp, Users, Search, Download, Plus, Eye,
  MessageSquare, BarChart3, Filter, Printer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-700",
  pending_approval: "bg-purple-100 text-purple-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-cyan-100 text-cyan-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  disputed: "bg-orange-100 text-orange-700",
  denied: "bg-red-200 text-red-900",
  cancelled: "bg-slate-200 text-slate-600",
  revised: "bg-indigo-100 text-indigo-700",
  payment_plan: "bg-violet-100 text-violet-700",
};

export default function AccountingDashboard() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const handleExportCSV = async () => {
    try {
      const response = await base44.functions.invoke('exportAccountingDataCSV', {});
      const csvContent = response.data;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `accounting-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const today = format(new Date(), "MMM d, yyyy");
    doc.setFontSize(18);
    doc.setTextColor(26, 43, 74);
    doc.text("Accounting & Billing Summary", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${today}`, 14, 28);

    // Summary stats
    doc.setFontSize(12);
    doc.setTextColor(26, 43, 74);
    doc.text("Financial Summary", 14, 40);
    doc.setFontSize(10);
    doc.setTextColor(60);
    const summaryLines = [
      `Total Invoiced: $${stats.totalSent.toLocaleString()} (${stats.sent} invoices)`,
      `Collected: $${stats.totalPaid.toLocaleString()} (${stats.paid} paid)`,
      `Outstanding: $${stats.totalUnpaid.toLocaleString()} (${stats.unpaid} unpaid)`,
      `Overdue: $${stats.totalOverdue.toLocaleString()} (${stats.overdue} overdue)`,
      `Disputed: ${stats.disputed} | Partial: ${stats.partial} | Total Invoices: ${invoices.length}`,
    ];
    summaryLines.forEach((line, i) => doc.text(line, 14, 50 + i * 8));

    // Aging report
    doc.setFontSize(12);
    doc.setTextColor(26, 43, 74);
    doc.text("Accounts Receivable Aging", 14, 100);
    doc.setFontSize(10);
    doc.setTextColor(60);
    aging.forEach((bucket, i) => {
      const label = bucket.label === "current" ? "Current" : `${bucket.label} days`;
      doc.text(`${label}: $${bucket.amount.toLocaleString()}`, 14, 110 + i * 8);
    });

    // Invoice table header
    let y = 155;
    doc.setFontSize(12);
    doc.setTextColor(26, 43, 74);
    doc.text("Invoice List (filtered)", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Invoice #", 14, y); doc.text("Client", 50, y); doc.text("Status", 110, y); doc.text("Total", 145, y); doc.text("Balance", 170, y);
    y += 6;
    doc.setDrawColor(200);
    doc.line(14, y, 196, y);
    y += 4;
    doc.setTextColor(60);
    filtered.slice(0, 30).forEach(inv => {
      if (y > 275) { doc.addPage(); y = 20; }
      const client = clientMap[inv.client_id];
      doc.text(inv.invoice_number || "—", 14, y);
      doc.text((client?.name || inv.client_name || "—").substring(0, 25), 50, y);
      doc.text((inv.status || "—").replace("_", " "), 110, y);
      doc.text(`$${(inv.total || 0).toFixed(2)}`, 145, y);
      doc.text(`$${(inv.balance_due ?? inv.total ?? 0).toFixed(2)}`, 170, y);
      y += 7;
    });

    doc.save(`accounting-summary-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices-all"],
    queryFn: () => base44.entities.Invoice.list("-created_date"),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list(),
  });

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const stats = useMemo(() => {
    const sent = invoices.filter(i => !["draft","cancelled"].includes(i.status));
    const paid = invoices.filter(i => i.status === "paid");
    const unpaid = invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status));
    const overdue = invoices.filter(i => i.status === "overdue");
    const disputed = invoices.filter(i => i.status === "disputed");
    const partial = invoices.filter(i => i.status === "partial");
    const totalSent = sent.reduce((s, i) => s + (i.total || 0), 0);
    const totalPaid = paid.reduce((s, i) => s + (i.total || 0), 0);
    const totalUnpaid = unpaid.reduce((s, i) => s + (i.balance_due || i.total || 0), 0);
    const totalOverdue = overdue.reduce((s, i) => s + (i.balance_due || i.total || 0), 0);
    return { sent: sent.length, paid: paid.length, unpaid: unpaid.length, overdue: overdue.length, disputed: disputed.length, partial: partial.length, totalSent, totalPaid, totalUnpaid, totalOverdue };
  }, [invoices]);

  const monthlyData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthInvoices = invoices.filter(inv => {
        if (!inv.paid_at) return false;
        const d = new Date(inv.paid_at);
        return d >= start && d <= end;
      });
      return {
        month: format(date, "MMM"),
        revenue: monthInvoices.reduce((s, i) => s + (i.total || 0), 0),
        count: monthInvoices.length,
      };
    });
  }, [invoices]);

  const clientBalances = useMemo(() => {
    const map = {};
    invoices.filter(i => !["draft","cancelled","paid"].includes(i.status)).forEach(inv => {
      if (!map[inv.client_id]) map[inv.client_id] = { client_id: inv.client_id, balance: 0, count: 0 };
      map[inv.client_id].balance += (inv.balance_due || inv.total || 0);
      map[inv.client_id].count += 1;
    });
    return Object.values(map).sort((a, b) => b.balance - a.balance).slice(0, 8);
  }, [invoices]);

  const aging = useMemo(() => {
    const now = new Date();
    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    invoices.filter(i => ["sent","viewed","partial","overdue"].includes(i.status)).forEach(inv => {
      const due = new Date(inv.due_date);
      const days = Math.floor((now - due) / (1000 * 60 * 60 * 24));
      const amt = inv.balance_due || inv.total || 0;
      if (days <= 0) buckets.current += amt;
      else if (days <= 30) buckets["1-30"] += amt;
      else if (days <= 60) buckets["31-60"] += amt;
      else if (days <= 90) buckets["61-90"] += amt;
      else buckets["90+"] += amt;
    });
    return Object.entries(buckets).map(([label, amount]) => ({ label, amount }));
  }, [invoices]);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const client = clientMap[inv.client_id];
      const matchSearch = !search ||
        (inv.invoice_number || "").toLowerCase().includes(search.toLowerCase()) ||
        (client?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (inv.client_name || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchClient = clientFilter === "all" || inv.client_id === clientFilter;
      return matchSearch && matchStatus && matchClient;
    });
  }, [invoices, search, statusFilter, clientFilter, clientMap]);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Accounting & Billing"
        subtitle="Accounts receivable and invoice management"
        showBack
        action={() => navigate(createPageUrl("InvoiceCreate"))}
        actionLabel="New Invoice"
        actionIcon={Plus}
      />
      <div className="max-w-7xl mx-auto px-4 pt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" /> Export CSV
        </Button>
        <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
          <Printer className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Invoiced", value: `$${stats.totalSent.toLocaleString()}`, sub: `${stats.sent} invoices`, icon: FileText, color: "text-[#1a2b4a]", bg: "bg-blue-50" },
            { label: "Collected", value: `$${stats.totalPaid.toLocaleString()}`, sub: `${stats.paid} paid`, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Outstanding", value: `$${stats.totalUnpaid.toLocaleString()}`, sub: `${stats.unpaid} unpaid`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Overdue", value: `$${stats.totalOverdue.toLocaleString()}`, sub: `${stats.overdue} overdue`, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className={`p-4 ${item.bg}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
                  </div>
                  <item.icon className={`w-6 h-6 ${item.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Disputed", value: stats.disputed, color: "text-orange-600" },
            { label: "Partial", value: stats.partial, color: "text-amber-600" },
            { label: "Draft", value: invoices.filter(i=>i.status==="draft").length, color: "text-slate-500" },
            { label: "Payment Plans", value: invoices.filter(i=>i.status==="payment_plan").length, color: "text-violet-600" },
            { label: "Cancelled", value: invoices.filter(i=>i.status==="cancelled").length, color: "text-slate-400" },
            { label: "Total Invoices", value: invoices.length, color: "text-[#1a2b4a]" },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">All Invoices</TabsTrigger>
            <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
            <TabsTrigger value="aging">Aging Report</TabsTrigger>
            <TabsTrigger value="clients">Client Balances</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <Input placeholder="Search by invoice # or client..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["draft","pending_approval","sent","viewed","partial","paid","overdue","disputed","cancelled","revised","payment_plan"].map(s => (
                    <SelectItem key={s} value={s}>{s.replace("_"," ").toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-slate-500 font-medium">Invoice #</th>
                        <th className="text-left p-3 text-slate-500 font-medium">Client</th>
                        <th className="text-left p-3 text-slate-500 font-medium">Issued</th>
                        <th className="text-left p-3 text-slate-500 font-medium">Due</th>
                        <th className="text-left p-3 text-slate-500 font-medium">Status</th>
                        <th className="text-right p-3 text-slate-500 font-medium">Total</th>
                        <th className="text-right p-3 text-slate-500 font-medium">Balance</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.slice(0, 50).map(inv => {
                        const client = clientMap[inv.client_id];
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(createPageUrl("InvoiceDetail") + `?id=${inv.id}`)}>
                            <td className="p-3 font-medium text-[#1a2b4a]">{inv.invoice_number || "—"}</td>
                            <td className="p-3">{client?.name || inv.client_name || "—"}</td>
                            <td className="p-3 text-slate-500">{inv.issue_date ? format(new Date(inv.issue_date), "MMM d, yyyy") : "—"}</td>
                            <td className="p-3 text-slate-500">{inv.due_date ? format(new Date(inv.due_date), "MMM d, yyyy") : "—"}</td>
                            <td className="p-3"><Badge className={STATUS_STYLES[inv.status] || "bg-slate-100"}>{(inv.status || "—").replace("_"," ")}</Badge></td>
                            <td className="p-3 text-right font-medium">${(inv.total || 0).toFixed(2)}</td>
                            <td className="p-3 text-right font-bold text-[#1a2b4a]">${(inv.balance_due ?? inv.total ?? 0).toFixed(2)}</td>
                            <td className="p-3"><Eye className="w-4 h-4 text-slate-400" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2" />
                      <p>No invoices found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Monthly Revenue (Collected)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={v => [`$${v.toLocaleString()}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill="#c9a227" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Invoice Volume by Month</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#1a2b4a" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="aging">
            <Card>
              <CardHeader><CardTitle className="text-base">Accounts Receivable Aging</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {aging.map(bucket => (
                    <div key={bucket.label} className="flex items-center gap-4">
                      <div className="w-24 text-sm font-medium text-slate-600 shrink-0">
                        {bucket.label === "current" ? "Current" : `${bucket.label} days`}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bucket.label === "current" ? "bg-emerald-500" : bucket.label === "1-30" ? "bg-amber-400" : bucket.label === "31-60" ? "bg-orange-500" : "bg-red-600"}`}
                          style={{ width: `${Math.min(100, (bucket.amount / (stats.totalUnpaid || 1)) * 100)}%` }}
                        />
                      </div>
                      <div className="w-28 text-right font-bold text-slate-700">${bucket.amount.toLocaleString()}</div>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t pt-3">
                    <span>Total Outstanding</span>
                    <span className="text-[#1a2b4a]">${stats.totalUnpaid.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader><CardTitle className="text-base">Outstanding Client Balances</CardTitle></CardHeader>
              <CardContent>
                {clientBalances.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2" />
                    <p>All clients are up to date</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientBalances.map(cb => {
                      const client = clientMap[cb.client_id];
                      return (
                        <div key={cb.client_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium">{client?.name || "Unknown Client"}</p>
                            <p className="text-xs text-slate-500">{cb.count} open invoice{cb.count !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600">${cb.balance.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}