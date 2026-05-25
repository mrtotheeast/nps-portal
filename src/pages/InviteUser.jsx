import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { UserPlus, Copy, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";

function generateTempPassword() {
  const digits = Math.floor(1000 + Math.random() * 9000);
  const letters = String.fromCharCode(
    65 + Math.floor(Math.random() * 26),
    65 + Math.floor(Math.random() * 26)
  );
  return `Nps${digits}${letters}`;
}

export default function InviteUser() {
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    role: "employee",
  });
  const [tempPassword, setTempPassword] = useState(generateTempPassword());
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [customPassword, setCustomPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const finalPassword = useCustomPassword ? customPassword : tempPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.full_name) {
      toast.error("Email and full name are required");
      return;
    }
    if (useCustomPassword && customPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Invite user to the platform
      await base44.users.inviteUser(form.email, form.role === "admin" ? "admin" : "user");

      // Find or create employee record and set must_change_password
      const existing = await base44.entities.Employee.filter({ email: form.email });
      if (existing.length > 0) {
        await base44.entities.Employee.update(existing[0].id, {
          must_change_password: true,
          temp_password: finalPassword,
          invitation_status: "invited",
          invitation_sent_at: new Date().toISOString(),
        });
      } else {
        const nameParts = form.full_name.trim().split(" ");
        await base44.entities.Employee.create({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: form.email,
          must_change_password: true,
          temp_password: finalPassword,
          invitation_status: "invited",
          invitation_sent_at: new Date().toISOString(),
        });
      }

      // Send invitation email with temp password
      await base44.functions.invoke("sendInvitationEmail", {
        email: form.email,
        full_name: form.full_name,
        role: form.role,
        temp_password: finalPassword,
      });

      toast.success(`Invitation sent to ${form.email}`);
      setForm({ email: "", full_name: "", role: "employee" });
      setTempPassword(generateTempPassword());
      setCustomPassword("");
      setUseCustomPassword(false);
    } catch (err) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(finalPassword);
    toast.success("Password copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Invite User" subtitle="Send a portal invitation with temporary credentials" showBack />
      <div className="max-w-xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> New Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Full Name</Label>
                <Input
                  className="mt-1"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <Label>Email Address</Label>
                <Input
                  className="mt-1"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="officer">Officer</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temp Password Section */}
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2 mt-1">
                  {useCustomPassword ? (
                    <Input
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Enter custom password"
                      minLength={6}
                    />
                  ) : (
                    <div className="flex-1 flex items-center gap-2 bg-slate-100 rounded-md px-3 py-2 font-mono text-sm font-semibold text-slate-800">
                      {tempPassword}
                    </div>
                  )}
                  <Button type="button" variant="outline" size="icon" onClick={copyPassword} title="Copy password">
                    <Copy className="w-4 h-4" />
                  </Button>
                  {!useCustomPassword && (
                    <Button type="button" variant="outline" size="icon" onClick={() => setTempPassword(generateTempPassword())} title="Regenerate">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <button
                  type="button"
                  className="text-xs text-blue-600 underline"
                  onClick={() => {
                    setUseCustomPassword(!useCustomPassword);
                    setCustomPassword("");
                  }}
                >
                  {useCustomPassword ? "Use auto-generated password" : "Set custom password"}
                </button>
                <p className="text-xs text-slate-500">
                  This password will be emailed to the user. They'll be required to change it on first login.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f]">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Invitation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}