import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, Trash2, Archive, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function DeleteAccountSection({ company, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1=warning, 2=bookkeeping choice, 3=confirm
  const [keepBookkeeping, setKeepBookkeeping] = useState(null);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmName.trim().toLowerCase() !== company?.name?.trim().toLowerCase()) {
      toast.error("Company name does not match. Please type it exactly.");
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke("deleteCompanyAccount", {
      company_id: company.id,
      keep_bookkeeping: keepBookkeeping,
      confirm_name: confirmName.trim(),
    });
    setLoading(false);
    if (res.data?.success) {
      toast.success("Account cancelled. You will be signed out.");
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
      setOpen(false);
      if (onDeleted) onDeleted();
    } else {
      toast.error(res.data?.error || "Deletion failed. Please try again.");
    }
  };

  const reset = () => {
    setStep(1);
    setKeepBookkeeping(null);
    setConfirmName("");
    setLoading(false);
  };

  return (
    <>
      {/* Danger Zone Card */}
      <div className="border border-red-200 rounded-lg p-5 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 mb-1">Cancel Account & Delete Data</h3>
            <p className="text-sm text-red-700 mb-4">
              Permanently cancel your NPS Portal subscription and delete all company data. This action cannot be undone.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-red-400 text-red-700 hover:bg-red-100"
              onClick={() => { reset(); setOpen(true); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel Account
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!loading) { setOpen(v); if (!v) reset(); } }}>
        <DialogContent className="max-w-md">
          {/* Step 1: Warning */}
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" /> Cancel Account
                </DialogTitle>
                <DialogDescription>
                  You are about to permanently cancel <strong>{company?.name}</strong> from NPS Portal.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 my-2">
                <p className="text-sm text-slate-700 font-medium">The following will be permanently deleted:</p>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  <li>All schedules, shifts, and patrol records</li>
                  <li>All incidents, reports, and documents</li>
                  <li>All client and site information</li>
                  <li>All training records and credentials</li>
                  <li>All chat history and notifications</li>
                  <li>Your Stripe subscription will be cancelled immediately</li>
                </ul>
                <p className="text-sm text-amber-700 font-medium mt-3">
                  On the next step, you may choose to retain employee timesheets and PTO records for bookkeeping (24 months).
                </p>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => setStep(2)}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Bookkeeping choice */}
          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Employee Records</DialogTitle>
                <DialogDescription>
                  What would you like to do with employee timesheets, PTO balances, and personal info?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 my-2">
                {/* Option A: Keep */}
                <button
                  className={`w-full text-left border rounded-lg p-4 transition-all ${keepBookkeeping === true ? 'border-[#1a2b4a] bg-slate-50 ring-2 ring-[#1a2b4a]' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setKeepBookkeeping(true)}
                >
                  <div className="flex items-start gap-3">
                    <Archive className="w-5 h-5 text-[#c9a227] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Keep for 24 months (Recommended)</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Employee names, timesheets, PTO records, and personal info are archived for 24 months for payroll and legal bookkeeping, then automatically deleted.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option B: Delete all */}
                <button
                  className={`w-full text-left border rounded-lg p-4 transition-all ${keepBookkeeping === false ? 'border-red-500 bg-red-50 ring-2 ring-red-400' : 'border-slate-200 hover:border-slate-300'}`}
                  onClick={() => setKeepBookkeeping(false)}
                >
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-red-700">Delete everything immediately</p>
                      <p className="text-xs text-slate-500 mt-1">
                        All employee records, timesheets, and PTO data will be permanently deleted. This cannot be undone.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={keepBookkeeping === null}
                  onClick={() => setStep(3)}
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Final confirmation */}
          {step === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-red-700">Final Confirmation</DialogTitle>
                <DialogDescription>
                  Type your company name exactly to confirm permanent deletion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-2">
                <div className="bg-slate-100 rounded p-3 text-sm">
                  <span className="font-medium">Summary: </span>
                  {keepBookkeeping
                    ? "All operational data deleted. Employee timesheets & personal info archived for 24 months."
                    : "ALL data permanently deleted immediately."}
                </div>
                <div>
                  <Label htmlFor="confirm-name" className="text-sm text-slate-700">
                    Type <strong>{company?.name}</strong> to confirm:
                  </Label>
                  <Input
                    id="confirm-name"
                    className="mt-2"
                    placeholder={company?.name}
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => setStep(2)} disabled={loading}>Back</Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={loading || confirmName.trim().toLowerCase() !== company?.name?.trim().toLowerCase()}
                  onClick={handleDelete}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  {loading ? "Deleting..." : "Delete Account Permanently"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}