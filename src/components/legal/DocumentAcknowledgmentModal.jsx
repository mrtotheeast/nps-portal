import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function DocumentAcknowledgmentModal({ userId, onComplete }) {
  const [hasRead, setHasRead] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const queryClient = useQueryClient();

  const { data: pendingDoc = null } = useQuery({
    queryKey: ["pending-doc", userId],
    queryFn: async () => {
      if (!userId) return null;
      const user = await base44.auth.me();
      const allDocs = await base44.entities.OnboardingDocument.filter({ is_active: true });
      const requiredDocs = allDocs.filter(doc =>
        doc.required_for?.includes(user.role) || doc.required_for?.includes('all')
      );
      const acknowledgments = await base44.entities.DocumentAcknowledgment.filter({ user_id: userId });
      return requiredDocs.find(doc =>
        !acknowledgments.some(ack => ack.document_id === doc.id && ack.document_version === doc.version)
      ) || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes — prevents rapid re-fetching
    refetchOnWindowFocus: false,
  });

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    setIsDrawing(true);
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top); ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearSignature = () => { const canvas = canvasRef.current; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); };

  const getIPAddress = async () => {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  };

  const handleAcknowledge = async () => {
    if (!hasRead) { toast.error("Please confirm you have read the document"); return; }
    setIsSigning(true);
    const signatureData = pendingDoc.requires_signature ? canvasRef.current.toDataURL() : null;
    await base44.entities.DocumentAcknowledgment.create({
      document_id: pendingDoc.id, user_id: userId, acknowledged_at: new Date().toISOString(),
      signature_data: signatureData, document_version: pendingDoc.version,
      ip_address: await getIPAddress(), device_info: navigator.userAgent
    });
    toast.success("Document acknowledged");
    queryClient.invalidateQueries({ queryKey: ["pending-doc", userId] });
    setIsSigning(false);
    setHasRead(false);
  };

  if (!pendingDoc) return null;

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div><DialogTitle className="text-xl">Action Required</DialogTitle><p className="text-sm text-slate-600 mt-1">You must read and acknowledge this document before continuing</p></div>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div><h3 className="font-semibold text-amber-900">{pendingDoc.title}</h3><p className="text-sm text-amber-800 mt-1">{pendingDoc.description}</p><p className="text-xs text-amber-600 mt-2">Version {pendingDoc.version}</p></div>
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
            <iframe src={pendingDoc.document_url} className="w-full h-96 border-0" title="Document" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={hasRead} onCheckedChange={setHasRead} id="confirm-read" />
            <label htmlFor="confirm-read" className="text-sm cursor-pointer">I have read and understand this document</label>
          </div>
          {pendingDoc.requires_signature && (
            <div>
              <label className="text-sm font-medium mb-2 block">Sign Below</label>
              <div className="border-2 border-dashed rounded-lg bg-white">
                <canvas ref={canvasRef} width={600} height={150} className="w-full cursor-crosshair"
                  onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
              </div>
              <Button size="sm" variant="ghost" onClick={clearSignature} className="mt-2">Clear Signature</Button>
            </div>
          )}
          <Button onClick={handleAcknowledge} disabled={!hasRead || isSigning} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]" size="lg">
            {isSigning ? "Processing..." : "Acknowledge & Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}