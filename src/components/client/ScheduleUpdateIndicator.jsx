import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ScheduleUpdateIndicator({ siteId, onRefresh }) {
  const [showIndicator, setShowIndicator] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setCurrentUser); }, []);

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ["schedule-notifications", currentUser?.id, siteId],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.Notification.filter({ user_id: currentUser.id, type: "schedule_updated", read: false, related_id: siteId });
    },
    enabled: !!currentUser,
    refetchInterval: 5000
  });

  useEffect(() => { setShowIndicator(unreadNotifications.length > 0); }, [unreadNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh?.();
    for (const notif of unreadNotifications) { await base44.entities.Notification.update(notif.id, { read: true }); }
    setShowIndicator(false);
    toast.success("Schedule refreshed");
    setIsRefreshing(false);
  };

  if (!showIndicator) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 flex items-center justify-between">
      <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-blue-800">Schedule Updated — Tap to Refresh</span></div>
      <div className="flex gap-2">
        <Button onClick={handleRefresh} disabled={isRefreshing} className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">{isRefreshing ? "Refreshing..." : "Refresh"}</Button>
        <Button onClick={() => setShowIndicator(false)} variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700"><X className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}