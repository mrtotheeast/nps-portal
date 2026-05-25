import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Loader2, Edit, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { format } from "date-fns";

export default function InvoiceDetail() {
  const queryClient = useQueryClient();
  const invoiceId = new URLSearchParams(window.location.search).get("id");
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleEmailInvoice = async () => {
    if (!emailTo) return;
    setSendingEmail(true);
    await base44.functions.invoke("emailInvoicePDF", {
      invoiceId,
      recipientEmail: emailTo,
      recipientName: emailName,
    });
    toast.success(`Invoice emailed to ${emailTo}`);
    setShowEmailDialog(false);
    setSendingEmail(false);
  };

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({ id: invoiceId });
      return invoices[0];
    },
    enabled: !!invoiceId,
  });

  const STATUS_STYLES = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    overdue: "bg-red-100 text-red-700",
  };

  if (isLoading) return <LoadingScreen />;
  if (!invoice) return <div className="text-center py-12">Invoice not found</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Invoice Details" subtitle={invoice.invoice_number} showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{invoice.invoice_number}</CardTitle>
            <Badge className={STATUS_STYLES[invoice.status] || "bg-slate-100"}>
              {invoice.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Client</p>
                <p className="font-medium">{invoice.client_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Amount</p>
                <p className="font-medium text-lg">${invoice.total?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Issue Date</p>
                <p className="font-medium">
                  {invoice.issue_date ? format(new Date(invoice.issue_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Due Date</p>
                <p className="font-medium">
                  {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
            </div>

            {invoice.description && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Description</p>
                <p className="text-slate-700">{invoice.description}</p>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <Button variant="outline"><Download className="w-4 h-4 mr-2" />Download PDF</Button>
              <Button variant="outline" onClick={() => { setEmailTo(invoice.client_email || ""); setEmailName(invoice.client_name || ""); setShowEmailDialog(true); }}>
                <Mail className="w-4 h-4 mr-2" />Email Invoice
              </Button>
              <Button className="bg-[#1a2b4a]"><Edit className="w-4 h-4 mr-2" />Edit</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Email Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recipient Name</Label>
              <Input value={emailName} onChange={e => setEmailName(e.target.value)} placeholder="Client name" />
            </div>
            <div>
              <Label>Recipient Email *</Label>
              <Input type="email" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="client@example.com" required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
            <Button onClick={handleEmailInvoice} disabled={sendingEmail || !emailTo} className="bg-[#1a2b4a]">
              {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}