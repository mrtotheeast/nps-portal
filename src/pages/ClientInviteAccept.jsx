import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Lock, Mail, Check, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

export default function ClientInviteAccept() {
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [contact, setContact] = useState(null);
  const [clientName, setClientName] = useState("");
  const [step, setStep] = useState("loading"); // loading, setup, success, invalid

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const inviteEmail = params.get("email");

  useEffect(() => {
    if (!token || !inviteEmail) {
      setStep("invalid");
      setLoading(false);
      return;
    }

    const verifyInvite = async () => {
      try {
        const contacts = await base44.entities.ClientContact.filter({
          email: inviteEmail,
          invite_status: "invited"
        });

        if (contacts.length === 0) {
          setStep("invalid");
          setLoading(false);
          return;
        }

        const c = contacts[0];
        setContact(c);
        setFullName(c.full_name || "");

        // Load client name for personalization
        try {
          const client = await base44.entities.Client.get(c.client_id);
          setClientName(client?.name || "");
        } catch {}

        setLoading(false);
        setStep("setup");
      } catch (err) {
        setError("Failed to verify invite. Please try again.");
        setStep("invalid");
        setLoading(false);
      }
    };

    verifyInvite();
  }, [token, inviteEmail]);

  const handleSetupAccount = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) { setError("Please enter your full name"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }

    setSubmitting(true);
    setError("");

    try {
      const result = await base44.functions.invoke("createClientContactAccount", {
        contact_id: contact.id,
        email: contact.email,
        full_name: fullName,
        password: password,
        client_id: contact.client_id
      });

      if (!result.data?.success) {
        setError(result.data?.error || "Failed to create account");
        setSubmitting(false);
        return;
      }

      await base44.entities.ClientContact.update(contact.id, { invite_status: "active" });

      setStep("success");

      // Set tour flag so it shows on first login, then redirect
      localStorage.setItem("startTour", "true");
      setTimeout(() => {
        base44.auth.redirectToLogin("/ClientDashboard");
      }, 2500);
    } catch (err) {
      setError(err.message || "Failed to create account");
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <div className="text-center">
          <img src={SHIELD_URL} alt="NPS" className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-300 text-sm">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid link
  if (step === "invalid") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <img src={SHIELD_URL} alt="NPS" className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-white text-xl font-bold mb-3">Invalid Invite Link</h2>
          <p className="text-slate-400 text-sm mb-6">
            {error || "This invitation link is invalid or has already been used. Please contact your NPS account manager for a new invite."}
          </p>
          <p className="text-slate-500 text-xs">Nationwide Police Services LLC</p>
        </div>
      </div>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-3">You're all set, {fullName.split(' ')[0]}!</h2>
          <p className="text-slate-400 text-sm mb-2">Your NPS Portal account has been created.</p>
          <p className="text-slate-500 text-xs">Redirecting you to sign in...</p>
          <div className="mt-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Setup form
  const firstName = contact?.full_name?.split(' ')[0] || "there";

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 py-8 px-4">
        <img src={SHIELD_URL} alt="NPS" className="w-10 h-10" />
        <div>
          <p className="text-[#c9a84c] font-bold text-sm tracking-widest uppercase">NPS Portal</p>
          <p className="text-slate-400 text-xs">Nationwide Police Services</p>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-[#1a2b4a] to-[#0b1f3a] px-6 py-6 text-center">
            <p className="text-[#c9a84c] text-xs font-semibold tracking-widest uppercase mb-1">
              {clientName ? `${clientName} · NPS Portal` : "NPS Portal"}
            </p>
            <h1 className="text-white text-xl font-bold">Welcome, {firstName}!</h1>
            <p className="text-slate-400 text-sm mt-1">Create your secure portal account below</p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSetupAccount} className="space-y-4">
              {/* Email (read-only) */}
              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-1.5">
                  <Mail className="w-4 h-4" /> Email Address
                </Label>
                <Input value={inviteEmail || ""} disabled className="bg-slate-50 text-slate-500" />
              </div>

              {/* Full Name */}
              <div>
                <Label className="text-slate-700 mb-1.5 block">Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label className="text-slate-700 flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4" /> Create Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">Use a mix of letters, numbers, and symbols</p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#c9a84c] hover:bg-[#b8922a] text-[#0b1f3a] font-bold h-12 text-base mt-2"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating account...</>
                ) : "Create My Account →"}
              </Button>

              <p className="text-xs text-slate-400 text-center">
                By creating an account, you agree to the NPS Portal Terms of Service
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}