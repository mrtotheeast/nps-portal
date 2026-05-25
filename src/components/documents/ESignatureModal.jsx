import React, { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ExternalLink, PenLine, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function ESignatureModal({ document, existingAck, onSign, onClose, signing }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signedDate, setSignedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [typedName, setTypedName] = useState("");
  const [signMode, setSignMode] = useState("draw");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a2b4a"; ctx.lineWidth = 2; ctx.lineCap = "round";
  }, [signMode]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = () => {
    let signatureData = null;
    if (signMode === "draw") {
      if (!hasSignature) return;
      signatureData = canvasRef.current.toDataURL("image/png");
    } else {
      if (!typedName.trim()) return;
      const canvas = document.createElement("canvas");
      canvas.width = 400; canvas.height = 100;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 400, 100);
      ctx.font = "italic 36px Georgia, serif"; ctx.fillStyle = "#1a2b4a";
      ctx.fillText(typedName, 20, 65);
      signatureData = canvas.toDataURL("image/png");
    }
    onSign({ signature_data: signatureData, signed_date: signedDate, device_info: navigator.userAgent });
  };

  const isValid = signMode === "draw" ? hasSignature : typedName.trim().length > 0;

  if (existingAck) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600" />Already Signed</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-700 font-medium">{document.title}</p>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
              <p className="text-sm text-green-800"><strong>Signed on:</strong> {format(new Date(existingAck.acknowledged_at), "MMMM d, yyyy 'at' h:mm a")}</p>
              {existingAck.signature_data && (<div><p className="text-xs text-slate-500 mb-1">Signature on file:</p><img src={existingAck.signature_data} alt="Signature" className="border rounded max-h-16 bg-white" /></div>)}
            </div>
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><PenLine className="w-5 h-5 text-[#c9a227]" />Sign Document</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{document.title}</p>
                {document.description && <p className="text-sm text-slate-600 mt-0.5">{document.description}</p>}
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">{document.category}</Badge>
                  <Badge className={`text-xs ${document.priority === 'critical' ? 'bg-red-100 text-red-800' : document.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{document.priority}</Badge>
                </div>
              </div>
            </div>
            {document.document_url && <Button size="sm" variant="outline" onClick={() => window.open(document.document_url, "_blank")}><ExternalLink className="w-4 h-4 mr-1" />View Doc</Button>}
          </div>

          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">By signing, you confirm you have read and agree to this document. Your signature is legally binding.</AlertDescription>
          </Alert>

          <div><Label>Signature Date</Label><Input type="date" value={signedDate} onChange={(e) => setSignedDate(e.target.value)} className="mt-1 max-w-xs" /></div>

          <div>
            <Label className="mb-2 block">Signature Method</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={signMode === "draw" ? "default" : "outline"} onClick={() => setSignMode("draw")}>Draw Signature</Button>
              <Button size="sm" variant={signMode === "type" ? "default" : "outline"} onClick={() => setSignMode("type")}>Type Signature</Button>
            </div>
          </div>

          {signMode === "draw" ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Draw Your Signature</Label>
                <Button size="sm" variant="ghost" onClick={clearSignature}><Trash2 className="w-4 h-4 mr-1" />Clear</Button>
              </div>
              <canvas ref={canvasRef} width={550} height={120} className="border-2 border-dashed border-slate-300 rounded-lg w-full bg-white cursor-crosshair touch-none"
                onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
              <p className="text-xs text-slate-400 mt-1">Sign with mouse or finger</p>
            </div>
          ) : (
            <div><Label>Type Your Full Legal Name</Label><Input className="mt-1 font-serif text-xl italic text-[#1a2b4a]" placeholder="Your full name" value={typedName} onChange={(e) => setTypedName(e.target.value)} /></div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose} disabled={signing}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!isValid || !signedDate || signing} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              <CheckCircle className="w-4 h-4 mr-2" />{signing ? "Saving..." : "Sign & Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}