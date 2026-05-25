import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Pen, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function OnboardingTask() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const ackId = params.get("ackId");

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: ack, isLoading: loadingAck } = useQuery({
    queryKey: ["ack", ackId],
    queryFn: () => base44.entities.DocumentAcknowledgment.filter({ id: ackId }).then(r => r[0]),
    enabled: !!ackId,
  });

  const { data: doc, isLoading: loadingDoc } = useQuery({
    queryKey: ["onboarding-doc", ack?.document_id],
    queryFn: () => base44.entities.OnboardingDocument.filter({ id: ack.document_id }).then(r => r[0]),
    enabled: !!ack?.document_id,
  });

  // Canvas setup
  useEffect(() => {
    if (!doc?.requires_signature || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 130);
    ctx.lineTo(canvas.width - 20, 130);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("Sign here →", 20, 148);
  }, [doc]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a2b4a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSig(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#94a3b8";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 130);
    ctx.lineTo(canvas.width - 20, 130);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.fillText("Sign here →", 20, 148);
    setHasSig(false);
  };

  const handleComplete = async () => {
    if (!ackId || !user) return;
    if (doc?.requires_signature && !hasSig) { toast.error("Please sign before submitting"); return; }
    if (!doc?.requires_signature && !confirmed) { toast.error("Please confirm you have read the document"); return; }

    setSubmitting(true);
    try {
      let sigData = null;
      if (doc?.requires_signature && canvasRef.current) {
        sigData = canvasRef.current.toDataURL("image/png");
      }
      await base44.entities.DocumentAcknowledgment.update(ackId, {
        acknowledged_at: new Date().toISOString(),
        signature_data: sigData,
        document_version: doc?.version || 1,
        device_info: navigator.userAgent,
      });
      queryClient.invalidateQueries(["my-onboarding-assignments"]);
      queryClient.invalidateQueries(["acknowledgments"]);
      toast.success(doc?.requires_signature ? "Document signed successfully!" : "Document acknowledged!");
      navigate(-1);
    } catch (err) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAck || loadingDoc) return <LoadingScreen />;
  if (!ack || !doc) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400">Document not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#1a2b4a] text-white px-4 py-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 min-h-[44px]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">{doc.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {doc.requires_signature
              ? <Badge className="bg-purple-200 text-purple-800 text-xs"><Pen className="w-3 h-3 mr-1" />Signature Required</Badge>
              : <Badge className="bg-blue-200 text-blue-800 text-xs"><BookOpen className="w-3 h-3 mr-1" />Read & Acknowledge</Badge>}
          </div>
        </div>
      </div>

      {/* Document Viewer */}
      <div className="flex-1 overflow-y-auto">
        {doc.document_url ? (
          <iframe
            src={doc.document_url}
            className="w-full"
            style={{ minHeight: "60vh" }}
            title={doc.title}
          />
        ) : (
          <div className="p-8 text-center text-slate-400">
            <p>No document file attached.</p>
          </div>
        )}

        {/* Action Zone */}
        <div className="p-4 bg-white border-t space-y-4">
          {doc.requires_signature ? (
            <>
              <p className="text-sm font-semibold text-slate-700">Please sign below to complete this document:</p>
              <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              {hasSig && (
                <Button variant="ghost" size="sm" onClick={clearSig} className="text-slate-400">
                  Clear Signature
                </Button>
              )}
              <Button
                onClick={handleComplete}
                disabled={!hasSig || submitting}
                className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f] h-12 text-base"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Pen className="w-5 h-5 mr-2" />}
                Submit Signature
              </Button>
            </>
          ) : (
            <>
              <div
                onClick={() => setConfirmed(!confirmed)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors
                  ${confirmed ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                  ${confirmed ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                  {confirmed && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-medium">I have read and understood this document</span>
              </div>
              <Button
                onClick={handleComplete}
                disabled={!confirmed || submitting}
                className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f] h-12 text-base"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                I Have Read This Document
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}