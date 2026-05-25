import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ClientDeletedBanner({ client, clientId, userRole }) {
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = ["admin", "manager", "super_admin"].includes(userRole);
  const deletionDate = client?.deletion_date
    ? new Date(client.deletion_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Unknown date";

  const handleReactivate = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke("clientReactivate", { client_id: clientId });
      queryClient.invalidateQueries(["client", clientId]);
      queryClient.invalidateQueries(["clients"]);
      setShowConfirm(false);
      toast.success(`Client account reactivated. Reactivation email sent to ${result?.data?.client_email || "client"}.`);
    } catch (e) {
      toast.error("Failed to reactivate account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clientEmail = client?.primary_contact?.email || client?.contact_email || "client";

  return (
    <>
      <div className="bg-red-50 border border-red-300 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-bold text-red-800 text-base mb-1">Account Deleted</h3>
            <p className="text-sm text-red-700 leading-relaxed">
              This client initiated account deletion on <strong>{deletionDate}</strong>. Their portal
              access has been revoked. All records are retained per legal requirements. You can
              reactivate this account at any time.
            </p>
            {isAdmin && (
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={() => setShowConfirm(true)}
              >
                <RotateCcw className="w-4 h-4" />
                Reactivate Client Account
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <RotateCcw className="w-5 h-5" />
              Reactivate {client?.name}?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-700">
              This will restore their portal access and allow them to log in again. A reactivation
              email will be sent to <strong>{clientEmail}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleReactivate}
              disabled={loading}
            >
              {loading ? "Reactivating..." : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}