import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Phone, Building2, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ClientDeleteAccountSection from "@/components/clients/ClientDeleteAccountSection";
import { toast } from "sonner";

export default function ClientProfile() {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  // Find client record for delete section
  const { data: myContact } = useQuery({
    queryKey: ["myClientContact-profile", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const contacts = await base44.entities.ClientContact.filter({ email: user.email });
      return contacts[0] || null;
    },
    enabled: !!user?.email,
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (user) setFormData({ full_name: user.full_name, email: user.email });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["current-user"]);
      setEditMode(false);
      toast.success("Profile updated");
    },
  });

  if (isLoading) return <LoadingScreen />;

  if (accountDeleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Deleted</h2>
          <p className="text-slate-600 mb-6">
            Your account has been deleted. Thank you for using NPS Portal. Please contact Nationwide
            Police Services if you need assistance.
          </p>
          <div className="text-sm text-slate-500 space-y-1">
            <p>Email: Info@NationwidePolice.com</p>
            <p>Phone: (240) 749-1141</p>
          </div>
          <Button className="mt-6 bg-[#1a2b4a]" onClick={() => base44.auth.logout()}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Profile" subtitle="Manage your account details" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-[#1a2b4a] text-white text-xl font-bold">
                {user?.full_name?.charAt(0) || "C"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{user?.full_name}</h2>
              <p className="text-slate-600">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {myContact?.client_id && (
          <div className="mb-6">
            <ClientDeleteAccountSection
              clientId={myContact.client_id}
              onDeleted={() => {
                setAccountDeleted(true);
                setTimeout(() => base44.auth.logout(), 3000);
              }}
            />
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Account Information</CardTitle>
            {!editMode && (
              <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
            )}
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }}
              className="space-y-4"
            >
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!editMode}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formData.email || ""} disabled />
              </div>
              {editMode && (
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#1a2b4a]" disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}