import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, CheckCircle2, Clock, Award, FileText } from "lucide-react";

const TERMINATION_REASONS = [
  "Voluntary resignation",
  "Involuntary termination",
  "End of contract",
  "Retirement",
  "Layoff / reduction in force",
  "Job abandonment",
  "Other",
];

export default function EmployeeOffboardingDialog({ open, employee, onClose, onComplete }) {
  const [step, setStep] = useState("review"); // review | confirm | processing | done
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [terminatedDate, setTerminatedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isRehirable, setIsRehirable] = useState(true);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [result, setResult] = useState(null);

  // Load preview data when dialog opens
  useEffect(() => {
    if (open && employee?.id) {
      setStep("review");
      setReason("");
      setNotes("");
      setTerminatedDate(new Date().toISOString().split("T")[0]);
      setIsRehirable(true);
      setPreview(null);
      setResult(null);
      loadPreview();
    }
  }, [open, employee?.id]);

  const loadPreview = async () => {
    if (!employee?.id) return;
    setLoadingPreview(true);
    try {
      const [credentials, timesheets] = await Promise.all([
        base44.entities.Credential.filter({ employee_id: employee.id }),
        base44.entities.Timesheet.filter({ employee_id: employee.id, status: "pending" }),
      ]);
      setPreview({ credentials, pendingTimesheets: timesheets });
    } catch (e) {
      console.error("Preview load failed", e);
      setPreview({ credentials: [], pendingTimesheets: [] });
    }
    setLoadingPreview(false);
  };

  const handleConfirm = async () => {
    if (!reason) return;
    setStep("processing");
    try {
      const res = await base44.functions.invoke("offboardEmployee", {
        employee_id: employee.id,
        reason,
        notes,
        terminated_date: terminatedDate,
        is_rehirable: isRehirable,
      });
      setResult(res.data || {});
      setStep("done");
    } catch (err) {
      setResult({ error: err.message });
      setStep("done");
    }
  };

  const handleDone = () => {
    onComplete();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && step !== "processing") onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Offboard Employee
          </DialogTitle>
        </DialogHeader>

        {/* STEP: REVIEW */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-semibold text-slate-900">{employee?.firstName} {employee?.lastName}</p>
              <p className="text-sm text-slate-500 capitalize">{employee?.role} · {employee?.positionTitle || "No title"}</p>
            </div>

            <p className="text-sm text-slate-600">
              This will mark the employee as terminated, archive all linked credentials, finalize any pending timesheets, and remove them from active site assignments.
            </p>

            {/* Preview */}
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading employee data...
              </div>
            ) : preview && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-800">Pending Timesheets</span>
                  </div>
                  <Badge className={preview.pendingTimesheets.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}>
                    {preview.pendingTimesheets.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Credentials to Archive</span>
                  </div>
                  <Badge className={preview.credentials.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}>
                    {preview.credentials.length}
                  </Badge>
                </div>
              </div>
            )}

            {preview?.pendingTimesheets?.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                {preview.pendingTimesheets.length} pending timesheet(s) will be automatically approved and saved during offboarding.
              </p>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <Label>Termination Reason <span className="text-red-500">*</span></Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TERMINATION_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Termination Date</Label>
                <input
                  type="date"
                  value={terminatedDate}
                  onChange={e => setTerminatedDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-input rounded-md text-sm"
                />
              </div>

              <div>
                <Label>Rehirable?</Label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setIsRehirable(true)}
                    className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${isRehirable ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRehirable(false)}
                    className={`px-4 py-2 rounded text-sm font-medium border transition-colors ${!isRehirable ? "bg-red-100 border-red-300 text-red-700" : "bg-white border-slate-200 text-slate-500"}`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div>
                <Label>Internal Notes (optional)</Label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  placeholder="Reason for termination, final notes, etc. Visible to admins only."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={!reason}
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => setStep("confirm")}
              >
                Continue to Confirm
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: CONFIRM */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <p className="font-semibold text-red-800">Confirm Offboarding</p>
              <p className="text-sm text-red-700">
                You are about to terminate <strong>{employee?.firstName} {employee?.lastName}</strong>. This action will:
              </p>
              <ul className="text-sm text-red-700 space-y-1 list-none">
                <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />Set employment status to "Terminated"</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />Archive all {preview?.credentials?.length || 0} linked credential(s)</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />Finalize {preview?.pendingTimesheets?.length || 0} pending timesheet(s)</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />Remove from all active site assignments</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 mt-2" />Record termination date: {terminatedDate}</li>
              </ul>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><span className="font-medium">Reason:</span> {reason}</p>
              <p><span className="font-medium">Rehirable:</span> {isRehirable ? "Yes" : "No"}</p>
              {notes && <p><span className="font-medium">Notes:</span> {notes}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("review")}>Back</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm}>
                Confirm Offboarding
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === "processing" && (
          <div className="py-8 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
            <p className="font-medium text-slate-700">Processing offboarding...</p>
            <p className="text-sm text-slate-500">Archiving credentials, finalizing timesheets, and updating records.</p>
          </div>
        )}

        {/* STEP: DONE */}
        {step === "done" && (
          <div className="space-y-4">
            {result?.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <p className="font-semibold mb-1">Offboarding encountered an error</p>
                <p>{result.error}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">Offboarding Complete</p>
                    <p className="text-sm text-emerald-700">{employee?.firstName} {employee?.lastName} has been terminated.</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-600">Credentials archived</span>
                    <span className="font-medium">{result?.credentials_archived ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-600">Timesheets finalized</span>
                    <span className="font-medium">{result?.timesheets_finalized ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 rounded">
                    <span className="text-slate-600">Sites unassigned</span>
                    <span className="font-medium">{result?.sites_removed ?? 0}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button className="bg-[#1a2b4a] hover:bg-[#2d4a6f]" onClick={handleDone}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}