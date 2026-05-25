import React, { useState, useEffect } from "react";
import { WifiOff, Loader2, CheckCircle2, Upload } from "lucide-react";

export default function OfflineSyncBanner({ pendingCount = 0 }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true); setSyncing(true);
      setTimeout(() => { setSyncing(false); if (pendingCount > 0) { setJustSynced(true); setTimeout(() => setJustSynced(false), 3000); } }, 2000);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
  }, [pendingCount]);

  if (online && !syncing && !justSynced && pendingCount === 0) return null;

  if (justSynced) return (
    <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
      <CheckCircle2 className="w-4 h-4 shrink-0" /><span>Report synced to dashboard successfully.</span>
    </div>
  );

  if (syncing && pendingCount > 0) return (
    <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
      <Loader2 className="w-4 h-4 animate-spin shrink-0" /><span>Back online — syncing {pendingCount} pending report{pendingCount > 1 ? "s" : ""}…</span>
    </div>
  );

  if (!online) return (
    <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span><strong>Offline mode.</strong> Your report will be saved locally and uploaded automatically when you reconnect.{pendingCount > 0 && <> ({pendingCount} pending)</>}</span>
    </div>
  );

  if (pendingCount > 0) return (
    <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
      <Upload className="w-4 h-4 shrink-0" /><span>{pendingCount} report{pendingCount > 1 ? "s" : ""} pending sync to dashboard.</span>
    </div>
  );

  return null;
}