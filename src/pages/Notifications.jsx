import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell, Trash2, ChevronRight, AlertTriangle, Clock, GraduationCap, CheckCircle, MessageSquare, FileText, Award, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { formatDistanceToNow } from "date-fns";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

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
  contract_renewal: { icon: FileText, color: "text-amber-500" },
  invoice_overdue: { icon: AlertTriangle, color: "text-red-500" },
  invoice_paid: { icon: CheckCircle, color: "text-green-500" },
  employee_invited: { icon: FileText, color: "text-blue-500" },
  employee_added: { icon: FileText, color: "text-green-500" },
  onboarding_document: { icon: FileText, color: "text-blue-500" },
  ccw_updated: { icon: Shield, color: "text-blue-500" },
  duplicate_detected: { icon: AlertTriangle, color: "text-orange-500" },
  account_deletion_request: { icon: AlertTriangle, color: "text-red-500" },
};

export default function Notifications() {
  const [selectedTab, setSelectedTab] = useState("unread");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!user?.id) return [];
      return await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 100);
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, { is_read: true, read_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter((n) => !n.is_read);
      await Promise.all(unreadNotifs.map((n) => base44.entities.Notification.update(n.id, { is_read: true, read_at: new Date().toISOString() })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }
    // Navigate
    if (notification.destination_page) {
      navigate(createPageUrl(notification.destination_page), {
        state: {
          highlightId: notification.destination_id,
          filter: notification.destination_filter,
        },
      });
    }
  };

  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);
  const displayNotifications = selectedTab === "unread" ? unread : read;

  if (isLoading) return <LoadingScreen />;

  const NotificationItem = ({ notification }) => {
    const iconConfig = ICON_MAP[notification.notification_type] || { icon: Bell, color: "text-slate-500" };
    const Icon = iconConfig.icon;

    return (
      <div
        onClick={() => handleNotificationClick(notification)}
        className={cn(
          "group p-4 rounded-lg border-2 transition-all cursor-pointer",
          "hover:bg-slate-100 hover:border-slate-300 active:scale-95",
          notification.is_read ? "bg-white border-slate-200" : "bg-blue-50 border-blue-300"
        )}
      >
        <div className="flex items-start gap-3">
          {!notification.is_read && <div className="w-2 h-2 rounded-full bg-[#1a2b4a] mt-1.5 shrink-0" />}
          <Icon className={cn(iconConfig.color, "w-5 h-5 mt-0.5 shrink-0")} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900">{notification.title}</h3>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
            <p className="text-xs text-slate-500 mt-2">
              {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteNotificationMutation.mutate(notification.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Notifications" subtitle="Stay updated with important messages" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant={selectedTab === "unread" ? "default" : "outline"}
              onClick={() => setSelectedTab("unread")}
              className={selectedTab === "unread" ? "bg-[#1a2b4a]" : ""}
            >
              Unread ({unread.length})
            </Button>
            <Button
              variant={selectedTab === "read" ? "default" : "outline"}
              onClick={() => setSelectedTab("read")}
              className={selectedTab === "read" ? "bg-[#1a2b4a]" : ""}
            >
              Read ({read.length})
            </Button>
          </div>
          {unread.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>

        {displayNotifications.length > 0 ? (
          <div className="space-y-2">
            {displayNotifications.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">You are all caught up</h3>
            <p className="text-sm text-slate-500">
              {selectedTab === "unread"
                ? "No new notifications. Notifications will appear here for shifts, training, incidents, and more."
                : "No read notifications yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}