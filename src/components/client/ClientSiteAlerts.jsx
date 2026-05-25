import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, CheckCheck, AlertTriangle, Bell } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// Shows unacknowledged client messages for sites this officer is assigned to
export default function ClientSiteAlerts({ user, siteIds = [], onCountChange }) {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ["client-site-alerts", siteIds],
    queryFn: async () => {
      if (!siteIds.length) return [];
      const all = await base44.entities.ClientNotification.list("-sent_at", 50);
      return all.filter(
        (n) =>
          siteIds.includes(n.site_id) &&
          !n.acknowledged_by?.includes(user.id)
      );
    },
    enabled: !!user && siteIds.length > 0,
    refetchInterval: 15000,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites-for-alerts"],
    queryFn: () => base44.entities.Site.list(),
    enabled: siteIds.length > 0,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alert) =>
      base44.entities.ClientNotification.update(alert.id, {
        acknowledged_by: [...(alert.acknowledged_by || []), user.id],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-site-alerts"]);
      toast.success("Message acknowledged");
    },
  });

  useEffect(() => {
    if (onCountChange) onCountChange(alerts.length);
  }, [alerts.length]);

  if (!alerts.length) return null;

  const getSiteName = (siteId) =>
    sites.find((s) => s.id === siteId)?.name || "Site";

  const priorityColor = (p) =>
    p === "urgent"
      ? "bg-red-100 border-red-400 text-red-800"
      : p === "high"
      ? "bg-amber-50 border-amber-400 text-amber-800"
      : "bg-blue-50 border-blue-300 text-blue-800";

  return (
    <Card className="mb-4 border-blue-300 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Client Messages</p>
            <p className="text-xs text-slate-500">
              {alerts.length} unacknowledged message{alerts.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border-2 p-3 ${priorityColor(alert.priority)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {alert.priority === "urgent" && (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <Badge
                    className={
                      alert.priority === "urgent"
                        ? "bg-red-600 text-white text-xs"
                        : alert.priority === "high"
                        ? "bg-amber-500 text-white text-xs"
                        : "bg-blue-600 text-white text-xs"
                    }
                  >
                    {getSiteName(alert.site_id)}
                  </Badge>
                  <span className="text-xs opacity-70">
                    from {alert.client_name || "Client"}
                  </span>
                </div>
                <span className="text-xs opacity-60 shrink-0">
                  {alert.sent_at
                    ? format(new Date(alert.sent_at), "h:mm a")
                    : ""}
                </span>
              </div>
              <p className="text-sm font-medium mb-3">{alert.message}</p>
              <Button
                size="sm"
                className="w-full h-9 text-sm gap-2 bg-white text-slate-800 border-2 border-current hover:bg-slate-50 font-semibold"
                onClick={() => acknowledgeMutation.mutate(alert)}
                disabled={acknowledgeMutation.isPending}
              >
                <CheckCheck className="w-4 h-4" />
                {acknowledgeMutation.isPending ? "Marking done..." : "✓ Acknowledge & Dismiss"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}