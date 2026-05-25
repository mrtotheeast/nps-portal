import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function ForcePasswordChange({ user, onComplete }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempPasswordInput, setTempPasswordInput] = useState("");
  const [needsTempInput, setNeedsTempInput] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Fetch the employee record to get the stored temp password
      let currentPassword = tempPasswordInput;
      if (!currentPassword) {
        try {
          const employees = await base44.entities.Employee.filter({ email: user.email });
          if (employees.length > 0 && employees[0].temp_password) {
            currentPassword = employees[0].temp_password;
          }
        } catch (e) {
          console.warn("Could not fetch temp password:", e);
        }
      }

      if (!currentPassword) {
        setError("Please enter your current (temporary) password.");
        setNeedsTempInput(true);
        setLoading(false);
        return;
      }

      const res = await base44.functions.invoke("changeMyPassword", {
        current_password: currentPassword,
        new_password: newPassword,
      });

      if (res.data?.error) throw new Error(res.data.error);

      // Update Employee record to clear must_change_password
      try {
        const employees = await base44.entities.Employee.filter({ email: user.email });
        if (employees.length > 0) {
          await base44.entities.Employee.update(employees[0].id, {
            must_change_password: false,
            temp_password: null,
          });
        }
      } catch (empErr) {
        console.warn("Could not update employee record:", empErr);
      }

      toast.success("Password updated successfully! Welcome to NPS Portal.");
      onComplete();
    } catch (err) {
      // If changeMyPassword fails (wrong temp password), ask user to enter it manually
      if (err.message?.includes("incorrect") || err.message?.includes("wrong") || err.message?.includes("invalid")) {
        setNeedsTempInput(true);
        setError("Your temporary password didn't match. Please enter it manually below.");
      } else {
        setError(err.message || "Failed to update password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#1a2b4a] to-[#2d4a6f] px-6 py-6 text-center">
          <img src={SHIELD_URL} alt="NPS" className="w-14 h-14 mx-auto mb-3" />
          <h2 className="text-white text-xl font-bold">Welcome to NPS Portal!</h2>
          <p className="text-slate-300 text-sm mt-1">Please set your new password to continue.</p>
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <Lock className="w-4 h-4 inline-block mr-1 mb-0.5" />
            Your account was set up with a temporary password. You must create a new password before continuing.
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {needsTempInput && (
              <div>
                <Label>Current (Temporary) Password</Label>
                <Input
                  type="password"
                  value={tempPasswordInput}
                  onChange={(e) => setTempPasswordInput(e.target.value)}
                  placeholder="Enter the temp password from your invite email"
                  className="mt-1"
                  autoFocus
                />
              </div>
            )}

            <div>
              <Label>New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label>Confirm New Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold h-12"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</>
              ) : (
                "Set My Password & Continue →"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}