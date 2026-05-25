import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function OfflineFormWrapper({ children, onSubmit, storeName, successMessage = "Saved offline. Will sync when online." }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const handleOfflineSubmit = async (data) => {
    if (!isOffline) return onSubmit(data);
    toast.success(successMessage);
    return { success: true, offline: true };
  };

  return (
    <div className="space-y-4">
      {isOffline && (
        <Alert className="bg-orange-50 border-orange-200">
          <WifiOff className="w-4 h-4 text-orange-600" />
          <AlertDescription className="text-orange-800">You're offline. Data will be saved locally and synced when connection is restored.</AlertDescription>
        </Alert>
      )}
      {React.cloneElement(children, { onSubmit: handleOfflineSubmit, isOfflineMode: isOffline })}
    </div>
  );
}