import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { format } from "date-fns";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-700",
};

export default function ClientInvoices() {
  const [search, setSearch] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["client-invoices-all"],
    queryFn: () => base44.entities.Invoice?.list?.("-created_date") || Promise.resolve([]),
  });

  const filtered = invoices.filter(
    (inv) => !search || inv.invoice_number?.toLowerCase().includes(search.toLowerCase())
  );
  const pending = filtered.filter((i) => i.status === "pending" || i.status === "overdue");
  const paid = filtered.filter((i) => i.status === "paid");

  const handleDownload = async (invoiceId) => {
    const res = await base44.functions.invoke("generateInvoicePDF", { invoice_id: invoiceId });
    if (res.data?.url) window.open(res.data.url, "_blank");
  };

  if (isLoading) return <LoadingScreen />;

  const InvoiceCard = ({ inv }) => (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold">{inv.invoice_number || "Invoice"}</p>
          <p className="text-sm text-slate-600 mt-0.5">${(inv.total_amount || 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">
            {inv.created_date ? format(new Date(inv.created_date), "MMM d, yyyy") : "—"}
            {inv.due_date ? ` · Due ${format(new Date(inv.due_date), "MMM d")}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-700"}>{inv.status}</Badge>
          <Button size="icon" variant="ghost" onClick={() => handleDownload(inv.id)}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Invoices" subtitle="Your billing history" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="paid">Paid ({paid.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">
            {pending.length > 0 ? (
              <div className="space-y-3">{pending.map((inv) => <InvoiceCard key={inv.id} inv={inv} />)}</div>
            ) : (
              <EmptyState icon={FileText} title="No pending invoices" />
            )}
          </TabsContent>
          <TabsContent value="paid">
            {paid.length > 0 ? (
              <div className="space-y-3">{paid.map((inv) => <InvoiceCard key={inv.id} inv={inv} />)}</div>
            ) : (
              <EmptyState icon={FileText} title="No paid invoices" />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}