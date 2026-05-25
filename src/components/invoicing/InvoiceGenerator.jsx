import React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";

export default function InvoiceGenerator({ invoice, companyInfo, onGenerating }) {
  const generatePDF = async () => {
    onGenerating?.(true);
    const element = document.getElementById("invoice-content");
    if (!element) { toast.error("Invoice content not found"); onGenerating?.(false); return; }
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;
    while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight); heightLeft -= 297; }
    pdf.save(`Invoice-${invoice.invoice_number}.pdf`);
    toast.success("Invoice PDF downloaded");
    onGenerating?.(false);
  };

  const subtotal = invoice.line_items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const taxAmount = (subtotal * (invoice.tax_rate || 0)) / 100;
  const total = subtotal + taxAmount;

  return (
    <div className="space-y-4">
      <Button onClick={generatePDF} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] flex items-center gap-2"><Download className="w-4 h-4" />Download PDF</Button>
      <div id="invoice-content" className="bg-white p-12">
        <div className="flex justify-between items-start mb-12">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Logo" className="w-16 h-16" />
            <div><h1 className="text-2xl font-bold text-slate-900">NPS Portal</h1><p className="text-sm text-slate-600">Nationwide Police Services</p></div>
          </div>
          <div className="text-right"><p className="text-sm text-slate-600">{companyInfo?.address?.street}<br />{companyInfo?.address?.city}, {companyInfo?.address?.state} {companyInfo?.address?.zip}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-12 pb-8 border-b">
          <div><p className="text-xs text-slate-500 uppercase mb-2">Invoice From</p><p className="font-semibold text-slate-900">Nationwide Police Services</p><p className="text-sm text-slate-600">{companyInfo?.address?.street}<br />{companyInfo?.address?.city}, {companyInfo?.address?.state} {companyInfo?.address?.zip}</p></div>
          <div className="text-right"><p className="text-xs text-slate-500 uppercase mb-2">Invoice To</p><p className="font-semibold text-slate-900">{invoice.client_id}</p></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div><p className="text-xs text-slate-500 uppercase">Invoice Number</p><p className="font-semibold text-slate-900">{invoice.invoice_number}</p></div>
          <div><p className="text-xs text-slate-500 uppercase">Invoice Date</p><p className="font-semibold text-slate-900">{invoice.issue_date}</p></div>
          <div><p className="text-xs text-slate-500 uppercase">Due Date</p><p className="font-semibold text-slate-900">{invoice.due_date}</p></div>
        </div>
        <table className="w-full mb-12">
          <thead><tr className="border-b-2 border-slate-300"><th className="text-left py-2 text-xs text-slate-600 uppercase">Description</th><th className="text-right py-2 text-xs text-slate-600 uppercase">Quantity</th><th className="text-right py-2 text-xs text-slate-600 uppercase">Rate</th><th className="text-right py-2 text-xs text-slate-600 uppercase">Amount</th></tr></thead>
          <tbody>{invoice.line_items?.map((item, idx) => (<tr key={idx} className="border-b border-slate-200"><td className="py-3 text-slate-900">{item.description}</td><td className="text-right py-3 text-slate-900">{item.quantity}</td><td className="text-right py-3 text-slate-900">${item.rate?.toFixed(2)}</td><td className="text-right py-3 text-slate-900">${item.amount?.toFixed(2)}</td></tr>))}</tbody>
        </table>
        <div className="flex justify-end mb-12">
          <div className="w-64">
            <div className="flex justify-between py-2 border-t border-slate-300"><span className="text-slate-600">Subtotal</span><span className="text-slate-900">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-t border-slate-300"><span className="text-slate-600">Tax ({invoice.tax_rate || 0}%)</span><span className="text-slate-900">${taxAmount.toFixed(2)}</span></div>
            <div className="flex justify-between py-2 border-t-2 border-slate-400 font-bold bg-amber-50"><span className="text-slate-900">Total</span><span className="text-amber-700 text-lg">${total.toFixed(2)}</span></div>
          </div>
        </div>
        {invoice.notes && <div className="mt-8 p-4 bg-slate-50 rounded"><p className="text-xs text-slate-600 uppercase mb-2">Notes</p><p className="text-slate-700 text-sm">{invoice.notes}</p></div>}
      </div>
    </div>
  );
}