import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const checkPending = () => { const q = JSON.parse(localStorage.getItem("syncQueue") || "[]"); setPendingSync(q.length); };
    checkPending();
    const interval = setInterval(checkPending, 2000);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); clearInterval(interval); };
  }, []);

  if (isOnline && pendingSync === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50">
      <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-2 px-3 py-2 shadow-lg">
        {isOnline ? (<><Wifi className="w-4 h-4" /><span>Syncing {pendingSync} items...</span><Upload className="w-4 h-4 animate-pulse" /></>) : (<><WifiOff className="w-4 h-4" /><span>Offline Mode</span>{pendingSync > 0 && <span className="ml-1">({pendingSync} pending)</span>}</>)}
      </Badge>
    </div>
  );
}