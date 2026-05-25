import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ClientDeleteAccountSection({ clientId, onDeleted }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await base44.functions.invoke("clientSelfDelete", { client_id: clientId });
      setShowConfirm(false);
      if (onDeleted) onDeleted();
    } catch (e) {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5" />
            Account Settings &amp; Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            You can request deletion of your NPS Portal account. Your service history and records
            will be retained by Nationwide Police Services as required by law.
          </p>
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-700 font-medium">
              Are you sure you want to delete your account?
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              You will lose access to the NPS Portal client dashboard immediately. Your service
              history and records will be retained by Nationwide Police Services as required by law.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}