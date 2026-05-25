import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Key, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

/**
 * ChangePasswordModal
 *
 * Two modes:
 * 1. Self-service (employeeEmail = null): user changes their OWN password.
 * 2. Admin reset (employeeEmail + employeeName/employeeRole): admin sets password directly for employee.
 */
export default function ChangePasswordModal({ open, onClose, employeeEmail = null, employeeName = null, employeeRole = null }) {
  const isAdminReset = !!employeeEmail;

  const currentRef = useRef(null);
  const newPassRef = useRef(null);
  const confirmRef = useRef(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminNewPass, setAdminNewPass] = useState("");
  const [adminConfirmPass, setAdminConfirmPass] = useState("");
  const [showAdminNew, setShowAdminNew] = useState(false);
  const [showAdminConfirm, setShowAdminConfirm] = useState(false);
  const [successPassword, setSuccessPassword] = useState(null);
  const [showingSuccess, setShowingSuccess] = useState(false);

  const handleClose = () => {
    if (currentRef.current) currentRef.current.value = "";
    if (newPassRef.current) newPassRef.current.value = "";
    if (confirmRef.current) confirmRef.current.value = "";
    setAdminNewPass("");
    setAdminConfirmPass("");
    setSuccessPassword(null);
    setShowingSuccess(false);
    onClose();
  };

  // Admin mode: set password directly
  const handleAdminReset = async () => {
    if (!adminNewPass || adminNewPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (adminNewPass !== adminConfirmPass) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const resp = await base44.functions.invoke("adminSetUserPassword", {
        target_email: employeeEmail,
        new_password: adminNewPass,
        employee_name: employeeName,
        employee_role: employeeRole,
      });
      if (resp?.data?.error) throw new Error(resp.data.error);
      // Show success modal with the password
      setSuccessPassword(resp?.data?.temp_password || adminNewPass);
      setShowingSuccess(true);
      toast.success(`Password set! Credentials emailed to ${employeeEmail}`);
      // Auto-close after 3 seconds
      setTimeout(() => handleClose(), 3000);
    } catch (err) {
      toast.error(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  // Self-service: change own password using current + new
  const handleSelfChange = async (e) => {
    e.preventDefault();
    const current = currentRef.current?.value || "";
    const newPass = newPassRef.current?.value || "";
    const confirm = confirmRef.current?.value || "";

    if (!current.trim()) {
      toast.error("Current password is required");
      return;
    }
    if (newPass.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPass !== confirm) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const resp = await base44.functions.invoke("changeMyPassword", {
        current_password: current,
        new_password: newPass,
      });
      if (resp?.data?.error) throw new Error(resp.data.error);
      toast.success("Password changed successfully");
      setTimeout(() => handleClose(), 500);
    } catch (err) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-10";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#c9a227]" />
            {isAdminReset ? "Set Employee Password" : "Change My Password"}
          </DialogTitle>
        </DialogHeader>

        {isAdminReset && successPassword ? (
          /* Success confirmation screen */
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-emerald-100 rounded-full">
              <Key className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-slate-900">Password Set Successfully!</h3>
              <p className="text-sm text-slate-600">
                Password for <strong>{employeeName || employeeEmail}</strong> has been set and emailed.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-900 mb-2">Temporary Password:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-300 px-3 py-2 rounded font-mono text-sm font-bold text-slate-900 break-all">
                  {successPassword}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(successPassword);
                    toast.success("Password copied to clipboard");
                  }}
                  className="px-2 py-2 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
              <p className="text-xs text-amber-800 mt-2">
                Employee will be required to change this password on first login.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : isAdminReset ? (
          /* Admin mode: set password directly */
          <div className="py-2 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                Set a new password for <strong>{employeeName || employeeEmail}</strong>. They will be emailed their new credentials.
              </p>
            </div>
            <div>
              <Label className="mb-1 block">New Password</Label>
              <div className="relative">
                <Input
                  type={showAdminNew ? "text" : "password"}
                  value={adminNewPass}
                  onChange={e => setAdminNewPass(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowAdminNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showAdminNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showAdminConfirm ? "text" : "password"}
                  value={adminConfirmPass}
                  onChange={e => setAdminConfirmPass(e.target.value)}
                  placeholder="Repeat password"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowAdminConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showAdminConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                type="button"
                disabled={loading || !adminNewPass}
                onClick={handleAdminReset}
                className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Set Password
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Self-service mode: current + new + confirm */
          <form onSubmit={handleSelfChange} className="space-y-4 py-2">
            <div>
              <Label>Current Password</Label>
              <div className="relative mt-1">
                <input
                  ref={currentRef}
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter current password"
                  className={inputClass}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <input
                  ref={newPassRef}
                  type={showNew ? "text" : "password"}
                  placeholder="At least 6 characters"
                  className={inputClass}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <div className="relative mt-1">
                <input
                  ref={confirmRef}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  className={inputClass}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}