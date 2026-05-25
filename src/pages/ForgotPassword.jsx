import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function ForgotPassword() {
  const params = new URLSearchParams(window.location.search);
  const prefillEmail = params.get("email") || "";
  const prefillCode = params.get("code") || "";

  const [step, setStep] = useState(prefillCode ? "reset" : "request"); // request | verify | reset | done
  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState(prefillCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Step 1: Send reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    const res = await base44.functions.invoke("sendPasswordResetEmail", {
      target_email: email.trim().toLowerCase(),
    });
    setLoading(false);
    if (res?.data?.error) {
      setError(res.data.error);
      return;
    }
    setInfo(`A 6-digit reset code has been sent to ${email}. Check your inbox (and spam folder).`);
    setStep("verify");
  };

  // Step 2: Enter code → move to reset
  const handleVerifyCode = (e) => {
    e.preventDefault();
    setError("");
    if (code.trim().length !== 6) { setError("Please enter the 6-digit code from your email."); return; }
    setStep("reset");
  };

  // Step 3: Set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    const res = await base44.functions.invoke("verifyPasswordResetCode", {
      target_email: email.trim().toLowerCase(),
      code: code.trim(),
      new_password: newPassword,
    });
    setLoading(false);
    if (res?.data?.error) {
      setError(res.data.error);
      // If code is wrong/expired, send them back to re-enter code
      if (res.data.error.toLowerCase().includes("invalid") || res.data.error.toLowerCase().includes("expired")) {
        setStep("verify");
      }
      return;
    }
    setStep("done");
  };

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={SHIELD_URL} alt="NPS" className="w-16 h-16 mx-auto mb-3" />
          <p className="text-[#c9a84c] font-bold text-sm tracking-widest uppercase">NPS Portal</p>
          <p className="text-slate-400 text-xs">Nationwide Police Services</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1a2b4a] to-[#0b1f3a] px-6 py-5 text-center">
            <h1 className="text-white text-xl font-bold">
              {step === "done" ? "Password Reset!" : "Reset Your Password"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {step === "request" && "Enter your email to receive a reset code"}
              {step === "verify" && "Enter the 6-digit code from your email"}
              {step === "reset" && "Choose a new password"}
              {step === "done" && "You can now sign in with your new password"}
            </p>
          </div>

          <div className="px-6 py-6 space-y-4">
            {/* Success */}
            {step === "done" && (
              <div className="text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
                <p className="text-slate-600 mb-6">Your password has been reset successfully.</p>
                <Button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8922a] text-[#0b1f3a] font-bold h-12"
                >
                  Sign In Now
                </Button>
              </div>
            )}

            {/* Error */}
            {error && step !== "done" && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Info */}
            {info && step === "verify" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                {info}
              </div>
            )}

            {/* Step 1: Request code */}
            {step === "request" && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoFocus
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8922a] text-[#0b1f3a] font-bold h-12"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</> : "Send Reset Code"}
                </Button>
              </form>
            )}

            {/* Step 2: Enter code */}
            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <Label>6-Digit Reset Code</Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="mt-1 text-center text-2xl font-bold tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#c9a84c] hover:bg-[#b8922a] text-[#0b1f3a] font-bold h-12"
                >
                  Verify Code
                </Button>
                <button
                  type="button"
                  onClick={() => { setStep("request"); setError(""); setCode(""); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Resend code / use different email
                </button>
              </form>
            )}

            {/* Step 3: New password */}
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
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
                    <button type="button" onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8922a] text-[#0b1f3a] font-bold h-12"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Set New Password"}
                </Button>
              </form>
            )}

            {/* Back to sign in */}
            {step !== "done" && (
              <div className="text-center pt-2">
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}