import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Clock, AlertTriangle, CheckCircle, GraduationCap, MessageSquare, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const ICON_MAP = {
  shift_assigned: { icon: Clock, color: "text-blue-500" },
  schedule_published: { icon: Clock, color: "text-blue-500" },
  shift_reminder: { icon: Clock, color: "text-blue-500" },
  shift_swap_request: { icon: Clock, color: "text-blue-500" },
  clock_in_missed: { icon: AlertTriangle, color: "text-orange-500" },
  clock_out_missed: { icon: AlertTriangle, color: "text-orange-500" },
  timesheet_approved: { icon: CheckCircle, color: "text-green-500" },
  timesheet_rejected: { icon: AlertTriangle, color: "text-red-500" },
  pto_request_submitted: { icon: Clock, color: "text-blue-500" },
  pto_request_approved: { icon: CheckCircle, color: "text-green-500" },
  pto_request_denied: { icon: AlertTriangle, color: "text-red-500" },
  training_assigned: { icon: GraduationCap, color: "text-amber-500" },
  training_due_soon: { icon: GraduationCap, color: "text-amber-500" },
  training_completed: { icon: CheckCircle, color: "text-green-500" },
  incident_submitted: { icon: AlertTriangle, color: "text-red-500" },
  incident_approved: { icon: CheckCircle, color: "text-green-500" },
  incident_rejected: { icon: AlertTriangle, color: "text-red-500" },
  gps_violation: { icon: Shield, color: "text-red-500" },
  patrol_incomplete: { icon: Shield, color: "text-orange-500" },
  patrol_completed: { icon: CheckCircle, color: "text-green-500" },
  credential_expiring: { icon: AlertTriangle, color: "text-amber-500" },
  credential_expired: { icon: AlertTriangle, color: "text-red-500" },
  announcement: { icon: Bell, color: "text-slate-500" },
  chat_message: { icon: MessageSquare, color: "text-blue-500" },
  client_message: { icon: MessageSquare, color: "text-blue-500" },
  client_deleted: { icon: AlertTriangle, color: "text-red-500" },
  contract_renewal: { icon: Clock, color: "text-amber-500" },
  invoice_overdue: { icon: AlertTriangle, color: "text-red-500" },
  invoice_paid: { icon: CheckCircle, color: "text-green-500" },
  employee_invited: { icon: Clock, color: "text-blue-500" },
  employee_added: { icon: CheckCircle, color: "text-green-500" },
  onboarding_document: { icon: Clock, color: "text-blue-500" },
  ccw_updated: { icon: Shield, color: "text-blue-500" },
  duplicate_detected: { icon: AlertTriangle, color: "text-orange-500" },
  account_deletion_request: { icon: AlertTriangle, color: "text-red-500" },
};

export default function NotificationBell({ user }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = window.innerWidth < 768;

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-bell"],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 100);
    },
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { is_read: true, read_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-bell"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = notifications.filter((n) => !n.is_read);
  const recent = notifications.slice(0, 5);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    if (notification.destination_page) {
      navigate(createPageUrl(notification.destination_page), {
        state: {
          highlightId: notification.destination_id,
          filter: notification.destination_filter,
        },
      });
      setDropdownOpen(false);
    }
  };

  const handleBellClick = () => {
    if (isMobile) {
      navigate(createPageUrl("Notifications"));
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleBellClick}
        className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px]"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full">
            {unread.length > 9 ? "9+" : unread.length}
          </Badge>
        )}
      </Button>

      {!isMobile && dropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unread.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{unread.length} unread</p>
            )}
          </div>

          {recent.length > 0 ? (
            <>
              <div className="max-h-96 overflow-y-auto">
                {recent.map((notif) => {
                  const iconConfig = ICON_MAP[notif.notification_type] || { icon: Bell, color: "text-slate-500" };
                  const Icon = iconConfig.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="p-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Icon className={cn(iconConfig.color, "w-4 h-4 mt-0.5 shrink-0")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{notif.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    navigate(createPageUrl("Notifications"));
                    setDropdownOpen(false);
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}