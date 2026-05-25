import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission !== "denied") {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
};

export const showPushNotification = (title, options = {}) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const n = new Notification(title, { icon: LOGO, badge: LOGO, vibrate: [200, 100, 200], ...options });
  n.onclick = () => { window.focus(); if (options.url) window.location.href = options.url; n.close(); };
  return n;
};

export default function PushNotificationManager({ userId }) {
  const [permissionGranted, setPermissionGranted] = useState(
    typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
  );

  useEffect(() => {
    requestNotificationPermission().then(setPermissionGranted);
  }, []);

  useEffect(() => {
    if (!userId || !permissionGranted) return;
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type !== "create" || event.data?.user_id !== userId) return;
      const n = event.data;
      showPushNotification(n.title, { body: n.message, tag: n.id, url: n.action_url, requireInteraction: n.priority === "urgent" });
      if (n.priority === "urgent") toast.error(n.title, { description: n.message, duration: 10000 });
      else if (n.priority === "high") toast.warning(n.title, { description: n.message, duration: 5000 });
    });
    return unsubscribe;
  }, [userId, permissionGranted]);

  return null;
}