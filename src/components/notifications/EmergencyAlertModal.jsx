import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EmergencyAlertModal({ userId }) {
  const queryClient = useQueryClient();
  const [activeAlert, setActiveAlert] = useState(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["emergency-notifications", userId],
    queryFn: async () => {
      const all = await base44.entities.Notification.list();
      return all.filter(n => n.user_id === userId && n.priority === "urgent" && !n.read);
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId) => base44.functions.invoke("acknowledgeEmergencyAlert", { alertId }),
    onSuccess: () => queryClient.invalidateQueries(["emergency-notifications"])
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => { queryClient.invalidateQueries(["emergency-notifications"]); setActiveAlert(null); }
  });

  useEffect(() => {
    if (notifications.length > 0 && !activeAlert) {
      setActiveAlert(notifications[0]);
      new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUKXh8LVkHQU5k9jxy3krBSF1xe/fkUM").play().catch(() => {});
    }
  }, [notifications]);

  const handleAcknowledge = () => {
    if (activeAlert?.related_entity?.entity_id) acknowledgeAlertMutation.mutate(activeAlert.related_entity.entity_id);
    markAsReadMutation.mutate(activeAlert.id);
  };

  return (
    <AnimatePresence>
      {activeAlert && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl mx-4 bg-red-600 text-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 opacity-10"><div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-transparent animate-pulse" /></div>
            <div className="relative p-8 text-center">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-16 h-16 text-white drop-shadow-lg" />
                </div>
              </motion.div>
              <motion.h1 animate={{ opacity: [1, 0.8, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl font-bold mb-4">🚨 EMERGENCY ALERT</motion.h1>
              <div className="bg-white/10 rounded-xl p-6 mb-6">
                <p className="text-2xl font-semibold mb-2">{activeAlert.title}</p>
                <p className="text-xl">{activeAlert.message}</p>
              </div>
              <div className="bg-yellow-400 text-red-900 rounded-lg p-4 mb-6">
                <p className="font-bold text-lg">⚠️ Immediate Action Required</p>
                <p className="text-sm mt-1">Respond to this emergency immediately and follow your protocol</p>
              </div>
              <Button onClick={handleAcknowledge} disabled={acknowledgeAlertMutation.isPending}
                className="w-full py-6 text-xl font-bold bg-white text-red-600 hover:bg-slate-100 rounded-xl shadow-xl">
                {acknowledgeAlertMutation.isPending ? "Acknowledging..." : "ACKNOWLEDGE ALERT"}
              </Button>
              <p className="text-sm mt-4 text-white/80">This alert will remain visible until acknowledged</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}