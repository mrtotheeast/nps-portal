import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, Mail, Phone, Key, Loader2, Trash2, Briefcase, MapPin, Award, AlertTriangle, Calendar, DollarSign, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ChangePasswordModal from "@/components/shared/ChangePasswordModal";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({});
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [photoUploadStatus, setPhotoUploadStatus] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setFormData({ full_name: u.full_name, email: u.email });
      setLoading(false);
    });
  }, []);

  const { data: employeeRecord } = useQuery({
    queryKey: ["my-employee-profile", user?.email],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ email: user.email });
      return emps[0] || null;
    },
    enabled: !!user?.email,
  });

  const { data: credentials = [] } = useQuery({
    queryKey: ["my-credentials", employeeRecord?.id],
    queryFn: () => base44.entities.Credential.filter({ employee_id: employeeRecord.id }),
    enabled: !!employeeRecord?.id,
  });

  const { data: ptoRequests = [] } = useQuery({
    queryKey: ["my-pto-profile", employeeRecord?.id],
    queryFn: () => base44.entities.PTORequest.filter({ employee_id: employeeRecord.id }, "-request_date", 5),
    enabled: !!employeeRecord?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Update auth user record (full_name only — email is read-only)
      await base44.auth.updateMe({ full_name: data.full_name });

      // Sync name AND role to the Employee entity record if it exists
      if (employeeRecord?.id) {
        const updates = {};
        if (data.full_name) {
          const nameParts = data.full_name.trim().split(/\s+/);
          updates.firstName = nameParts[0] || "";
          updates.lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
        }
        if (Object.keys(updates).length > 0) {
          await base44.entities.Employee.update(employeeRecord.id, updates);
        }
      }
    },
    onSuccess: () => {
      setUser((u) => ({ ...u, full_name: formData.full_name }));
      toast.success("Profile saved successfully");
    },
    onError: (err) => toast.error(`Failed to save profile: ${err.message || "Please try again."}`),
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!formData.full_name?.trim()) {
      toast.error("Name is required");
      return;
    }
    updateMutation.mutate(formData);
  };

  const deleteAccountMutation = useMutation({
    mutationFn: () => base44.functions.invoke("deleteUserAccount", {}),
    onSuccess: () => {
      toast.success("Account deleted");
      base44.auth.logout();
    },
    onError: () => toast.error("Failed to delete account. Please contact support."),
  });

  const photoUploadMutation = useMutation({
    mutationFn: async (file) => {
      setPhotoUploadStatus("uploading");
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      setPhotoUploadStatus("moderating");
      const moderateRes = await base44.functions.invoke("moderateProfilePhoto", { file_url: uploadRes.file_url });
      return { ...uploadRes, ...moderateRes };
    },
    onSuccess: (data) => {
      if (data.is_safe) {
        toast.success("Photo uploaded and approved!");
        setUser({ ...user, profile_photo: data.file_url });
      } else {
        toast.error(`Photo rejected: ${data.reason || "Inappropriate content detected"}`);
      }
      setPhotoUploadStatus("");
    },
    onError: (err) => {
      toast.error("Failed to upload photo");
      setPhotoUploadStatus("");
      console.error(err);
    }
  });

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    photoUploadMutation.mutate(file);
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="My Profile" subtitle="Manage your personal information" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-6">

        {/* Avatar + Summary + Photo Upload */}
        <Card>
          <CardContent className="p-6 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <Avatar className="w-20 h-20">
                <AvatarImage src={user?.profile_photo} />
                <AvatarFallback className="bg-[#1a2b4a] text-white text-2xl font-bold">
                  {user?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-1.5 bg-[#1a2b4a] text-white rounded-full cursor-pointer hover:bg-[#2d4a6f] transition-colors shadow-lg">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={photoUploadMutation.isPending}
                  className="hidden"
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{user?.full_name}</h2>
              <p className="text-slate-500 text-sm">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge className="bg-[#1a2b4a] text-white capitalize">{user?.role || "employee"}</Badge>
                {employeeRecord?.positionTitle && <Badge variant="outline">{employeeRecord.positionTitle}</Badge>}
                {employeeRecord?.status && (
                  <Badge className={employeeRecord.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                    {employeeRecord.status}
                  </Badge>
                )}
                {employeeRecord?.profilePhotoStatus && (
                  <Badge className={
                    employeeRecord.profilePhotoStatus === "approved" ? "bg-emerald-100 text-emerald-700" :
                    employeeRecord.profilePhotoStatus === "pending" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }>
                    Photo {employeeRecord.profilePhotoStatus}
                  </Badge>
                )}
              </div>
              {photoUploadStatus && (
                <p className="text-xs text-slate-500 mt-2">
                  {photoUploadStatus === "uploading" ? "Uploading..." : "Checking image for appropriateness..."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />Personal Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={formData.full_name || ""} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={formData.email || ""} disabled className="opacity-60" />
                </div>
                {employeeRecord?.phoneNumber && (
                  <div>
                    <Label>Phone</Label>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-700"><Phone className="w-4 h-4 text-slate-400" />{employeeRecord.phoneNumber}</div>
                  </div>
                )}
                {employeeRecord?.address?.city && (
                  <div>
                    <Label>Location</Label>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {[employeeRecord.address.city, employeeRecord.address.state].filter(Boolean).join(", ")}
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="bg-[#1a2b4a]" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Employment Info */}
        {employeeRecord && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" />Employment Details</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {employeeRecord.employeeId && <div><p className="text-slate-500 text-xs">Employee ID</p><p className="font-medium">{employeeRecord.employeeId}</p></div>}
                {employeeRecord.hireDate && <div><p className="text-slate-500 text-xs">Hire Date</p><p className="font-medium">{format(parseISO(employeeRecord.hireDate), "MMM d, yyyy")}</p></div>}
                {employeeRecord.baseHourlyRate && <div><p className="text-slate-500 text-xs">Hourly Rate</p><p className="font-medium text-emerald-700">${employeeRecord.baseHourlyRate}/hr</p></div>}
                {employeeRecord.employmentType && <div><p className="text-slate-500 text-xs">Type</p><p className="font-medium capitalize">{employeeRecord.employmentType}</p></div>}
                {employeeRecord.employmentClassification && <div><p className="text-slate-500 text-xs">Classification</p><p className="font-medium">{employeeRecord.employmentClassification}</p></div>}
                {employeeRecord.ptoBalance !== undefined && <div><p className="text-slate-500 text-xs">PTO Balance</p><p className="font-medium text-blue-700">{employeeRecord.ptoBalance} hrs</p></div>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Contact */}
        {employeeRecord?.emergencyContactName && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />Emergency Contact</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold">{employeeRecord.emergencyContactName}</p>
              {employeeRecord.emergencyContactRelation && <p className="text-slate-500">{employeeRecord.emergencyContactRelation}</p>}
              {employeeRecord.emergencyContactPhone && (
                <div className="flex items-center gap-2 text-slate-700"><Phone className="w-4 h-4 text-slate-400" />{employeeRecord.emergencyContactPhone}</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Credentials */}
        {credentials.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-[#c9a227]" />Credentials & Licenses</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {credentials.map(cred => {
                const daysLeft = cred.expiry_date ? differenceInDays(parseISO(cred.expiry_date), new Date()) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                return (
                  <div key={cred.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{cred.credential_name}</p>
                      <p className="text-xs text-slate-500">{cred.credential_type}{cred.credential_number ? ` · #${cred.credential_number}` : ""}</p>
                    </div>
                    {cred.expiry_date && (
                      <Badge className={isExpired ? "bg-red-100 text-red-700" : isExpiringSoon ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                        {isExpired ? "Expired" : isExpiringSoon ? `${daysLeft}d left` : format(parseISO(cred.expiry_date), "MMM d, yyyy")}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* PTO Requests */}
        {ptoRequests.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-500" />Recent PTO Requests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {ptoRequests.map(pto => (
                <div key={pto.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                  <div>
                    <p className="font-medium capitalize">{pto.pto_type}</p>
                    <p className="text-xs text-slate-500">{pto.start_date} → {pto.end_date} ({pto.hours_requested}h)</p>
                  </div>
                  <Badge className={
                    pto.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    pto.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }>{pto.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Change Password - prominent card */}
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-amber-600" />Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">Update your login password. You'll need your current password to make changes.</p>
            <Button
              onClick={() => setShowChangePwd(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Key className="w-4 h-4" /> Change My Password
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><Trash2 className="w-5 h-5" />Delete Account</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">Permanently delete your account. This action cannot be undone.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteAccountMutation.isPending}>
                  {deleteAccountMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Delete My Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete your account and all your data. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteAccountMutation.mutate()}>
                    Yes, Delete My Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordModal open={showChangePwd} onClose={() => setShowChangePwd(false)} />
    </div>
  );
}