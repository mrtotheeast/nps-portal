import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CreditCard, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function ClientCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get("invoice_id");
  const paymentStatus = searchParams.get("payment");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => { const result = await base44.entities.Invoice.filter({ id: invoiceId }); return result[0]; },
    enabled: !!invoiceId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createCheckoutSession', {
        invoice_id: invoiceId,
        success_url: `${window.location.origin}${window.location.pathname}?payment=success`,
        cancel_url: `${window.location.origin}${window.location.pathname}?invoice_id=${invoiceId}&payment=cancelled`
      });
      return response.data;
    },
    onSuccess: (data) => { if (data.url) { window.location.href = data.url; } },
    onError: (error) => { toast.error(`Payment initialization failed: ${error.message}`); }
  });

  useEffect(() => {
    if (paymentStatus === 'success') toast.success('Payment successful! Thank you for your payment.');
    else if (paymentStatus === 'cancelled') toast.error('Payment was cancelled. You can try again.');
  }, [paymentStatus]);

  if (isLoading) return <LoadingScreen />;

  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Payment" showBack />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Invoice Not Found</h2>
          <p className="text-slate-600 mb-6">The invoice you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/invoices')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Invoices</Button>
        </div>
      </div>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Payment" showBack />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Already Paid</h2>
          <p className="text-slate-600 mb-6">This invoice has already been paid.</p>
          <Button onClick={() => navigate('/invoices')}><ArrowLeft className="w-4 h-4 mr-2" />Back to Invoices</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Secure Checkout" showBack />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {paymentStatus === 'success' && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-800">
                <CheckCircle className="w-6 h-6" />
                <div><p className="font-semibold">Payment Successful!</p><p className="text-sm">Your payment has been processed.</p></div>
              </div>
            </CardContent>
          </Card>
        )}
        {paymentStatus === 'cancelled' && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-800">
                <XCircle className="w-6 h-6" />
                <div><p className="font-semibold">Payment Cancelled</p><p className="text-sm">You can try again below.</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice #{invoice.invoice_number || invoice.id.substring(0, 8)}</CardTitle>
                <CardDescription>Service Period: {invoice.service_start_date} to {invoice.service_end_date}</CardDescription>
              </div>
              <Badge className={invoice.status === "paid" ? "bg-green-100 text-green-800" : invoice.status === "overdue" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{invoice.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal</span><span className="font-medium">${invoice.subtotal?.toFixed(2) || invoice.total_amount.toFixed(2)}</span></div>
            {invoice.tax_amount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Tax</span><span className="font-medium">${invoice.tax_amount.toFixed(2)}</span></div>}
            <div className="border-t pt-4 flex justify-between">
              <span className="font-bold text-lg">Total Amount</span>
              <span className="font-bold text-2xl text-[#1a2b4a]">${invoice.total_amount.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Payment Method</CardTitle>
            <CardDescription>Secure payment powered by Stripe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <CreditCard className="w-6 h-6 text-slate-600" />
              <div><p className="font-medium">Credit or Debit Card</p><p className="text-sm text-slate-600">Visa, Mastercard, American Express</p></div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">🔒 Secure Payment</p>
              <p>Your payment information is encrypted and secure. We never store your card details.</p>
            </div>
            <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isLoading || paymentStatus === 'success'} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] py-6 text-lg">
              {checkoutMutation.isLoading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Redirecting to Stripe...</> : <><CreditCard className="w-5 h-5 mr-2" />Pay ${invoice.total_amount.toFixed(2)}</>}
            </Button>
            <p className="text-xs text-center text-slate-500">By proceeding, you agree to our terms of service</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}