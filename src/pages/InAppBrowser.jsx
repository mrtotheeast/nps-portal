import React, { useState } from "react";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";

export default function InAppBrowser() {
  const params = new URLSearchParams(window.location.search);
  const url = params.get("url") || "https://www.nationwidepolice.com/training";
  const title = params.get("title") || "NPS Training";
  const backTo = params.get("back") || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleBack = () => { if (backTo) window.location.href = backTo; else window.history.back(); };
  const handleOpenExternal = () => window.open(url, "_blank");

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-50">
      <div className="flex items-center gap-3 px-3 py-2 bg-[#1a2b4a] shadow-md shrink-0" style={{ minHeight: 56 }}>
        <Button variant="ghost" size="sm" onClick={handleBack} className="text-white hover:bg-white/10 flex items-center gap-1.5 px-2">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Back to NPS Portal</span>
          <span className="text-sm font-medium sm:hidden">Back</span>
        </Button>
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <img src={LOGO_URL} alt="NPS" className="w-6 h-6 object-contain rounded-full" />
          <span className="text-white text-sm font-semibold truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8" onClick={() => { setLoading(true); setError(false); document.getElementById("nps-iframe")?.contentWindow?.location?.reload(); }}><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 w-8 h-8" onClick={handleOpenExternal} title="Open in browser"><ExternalLink className="w-4 h-4" /></Button>
        </div>
      </div>

      {loading && !error && (
        <div className="h-1 bg-slate-200 shrink-0"><div className="h-full bg-[#c9a227] animate-pulse w-1/2 rounded-full" /></div>
      )}

      {!error ? (
        <iframe id="nps-iframe" src={url} className="flex-1 w-full border-0" title={title} onLoad={() => setLoading(false)} onError={() => { setError(true); setLoading(false); }} allow="payment *; camera *; microphone *; geolocation *" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-modals" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-slate-50">
          <img src={LOGO_URL} alt="NPS" className="w-16 h-16 object-contain" />
          <h2 className="text-lg font-semibold text-slate-800">Unable to load page</h2>
          <p className="text-sm text-slate-500 text-center max-w-sm">This page may have security restrictions that prevent it from loading inside the app.</p>
          <Button onClick={handleOpenExternal} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"><ExternalLink className="w-4 h-4 mr-2" />Open in Browser</Button>
          <Button variant="outline" onClick={handleBack}><ArrowLeft className="w-4 h-4 mr-2" />Go Back</Button>
        </div>
      )}
    </div>
  );
}