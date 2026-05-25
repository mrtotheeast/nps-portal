import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Check } from "lucide-react";

export default function SignaturePad({ onSave, existingUrl }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saved, setSaved] = useState(!!existingUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1a2b4a"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (existingUrl) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0); img.src = existingUrl; }
  }, [existingUrl]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true); setHasDrawn(true); setSaved(false);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y); ctx.stroke();
  };

  const stopDraw = (e) => { e.preventDefault(); setIsDrawing(false); };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false); setSaved(false);
  };

  const save = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave(dataUrl); setSaved(true);
  };

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas ref={canvasRef} width={600} height={200} className="w-full touch-none cursor-crosshair" style={{ maxHeight: "200px" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
      </div>
      <p className="text-xs text-slate-400 text-center">Sign above using your finger or mouse</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} className="flex-1"><RotateCcw className="w-4 h-4 mr-1" />Clear</Button>
        <Button size="sm" onClick={save} disabled={!hasDrawn || saved} className="flex-1 bg-[#1a2b4a] text-white hover:bg-[#2d4a6f]">
          <Check className="w-4 h-4 mr-1" />{saved ? "Saved" : "Save Signature"}
        </Button>
      </div>
    </div>
  );
}