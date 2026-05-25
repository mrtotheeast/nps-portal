import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail, Phone, MapPin, Calendar, AlertCircle, Briefcase,
  Clock, User, Home, Heart, Edit, Check, X, Loader2, History, Download
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function EmployeeDetailDialog({ open, employee, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        phoneNumber: employee.phoneNumber || "",
        email: employee.email || "",
        hireDate: employee.hireDate || "",
        emergencyContactName: employee.emergencyContactName || "",
        emergencyContactRelation: employee.emergencyContactRelation || "",
        emergencyContactPhone: employee.emergencyContactPhone || "",
        emergencyContactEmail: employee.emergencyContactEmail || "",
        dateOfBirth: employee.dateOfBirth || "",
        address: {
          street: employee.address?.street || "",
          city: employee.address?.city || "",
          state: employee.address?.state || "",
          zip: employee.address?.zip || "",
        },
        baseHourlyRate: employee.baseHourlyRate || "",
        maxHours: employee.maxHours || "",
        ptoBalance: employee.ptoBalance || 0,
      });
    }
  }, [employee]);

  const handleDownloadPDF = async () => {
    if (!employee) return;
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke("exportEmployeeOnboardingPDF", {
        employee_id: employee.id,
      });
      
      if (response.data?.error) throw new Error(response.data.error);
      
      // Get the PDF blob from the response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `OnboardingProfile_${employee.firstName}_${employee.lastName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Onboarding profile downloaded");
    } catch (err) {
      toast.error(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    if (!employee) return;
    setIsSaving(true);
    try {
      const changes = {};
      const logDetails = {};

      // Check each field for changes
      if (formData.firstName !== employee.firstName) {
        changes.firstName = formData.firstName;
        logDetails.firstName = { old: employee.firstName, new: formData.firstName };
      }
      if (formData.lastName !== employee.lastName) {
        changes.lastName = formData.lastName;
        logDetails.lastName = { old: employee.lastName, new: formData.lastName };
      }
      if (formData.phoneNumber !== employee.phoneNumber) {
        changes.phoneNumber = formData.phoneNumber;
        logDetails.phoneNumber = { old: employee.phoneNumber, new: formData.phoneNumber };
      }
      if (formData.email !== employee.email) {
        changes.email = formData.email;
        logDetails.email = { old: employee.email, new: formData.email };
      }
      if (formData.hireDate !== employee.hireDate) {
        changes.hireDate = formData.hireDate;
        logDetails.hireDate = { old: employee.hireDate, new: formData.hireDate };
      }
      if (formData.dateOfBirth !== employee.dateOfBirth) {
        changes.dateOfBirth = formData.dateOfBirth;
        logDetails.dateOfBirth = { old: employee.dateOfBirth, new: formData.dateOfBirth };
      }
      if (formData.emergencyContactName !== employee.emergencyContactName) {
        changes.emergencyContactName = formData.emergencyContactName;
        logDetails.emergencyContactName = { old: employee.emergencyContactName, new: formData.emergencyContactName };
      }
      if (formData.emergencyContactRelation !== employee.emergencyContactRelation) {
        changes.emergencyContactRelation = formData.emergencyContactRelation;
        logDetails.emergencyContactRelation = { old: employee.emergencyContactRelation, new: formData.emergencyContactRelation };
      }
      if (formData.emergencyContactPhone !== employee.emergencyContactPhone) {
        changes.emergencyContactPhone = formData.emergencyContactPhone;
        logDetails.emergencyContactPhone = { old: employee.emergencyContactPhone, new: formData.emergencyContactPhone };
      }
      if (formData.emergencyContactEmail !== employee.emergencyContactEmail) {
        changes.emergencyContactEmail = formData.emergencyContactEmail;
        logDetails.emergencyContactEmail = { old: employee.emergencyContactEmail, new: formData.emergencyContactEmail };
      }
      if (formData.baseHourlyRate !== employee.baseHourlyRate) {
        changes.baseHourlyRate = formData.baseHourlyRate ? parseFloat(formData.baseHourlyRate) : undefined;
        logDetails.baseHourlyRate = { old: employee.baseHourlyRate, new: formData.baseHourlyRate };
      }
      if (formData.maxHours !== employee.maxHours) {
        changes.maxHours = formData.maxHours ? parseInt(formData.maxHours) : undefined;
        logDetails.maxHours = { old: employee.maxHours, new: formData.maxHours };
      }
      if (formData.ptoBalance !== employee.ptoBalance) {
        changes.ptoBalance = parseFloat(formData.ptoBalance) || 0;
        logDetails.ptoBalance = { old: employee.ptoBalance, new: formData.ptoBalance };
      }

      const addressChanged = JSON.stringify(formData.address) !== JSON.stringify(employee.address);
      if (addressChanged) {
        changes.address = formData.address;
        logDetails.address = { old: employee.address, new: formData.address };
      }

      if (Object.keys(changes).length === 0) {
        toast.info("No changes made");
        setIsEditing(false);
        setIsSaving(false);
        return;
      }

      // Update employee
      await base44.entities.Employee.update(employee.id, changes);

      // Log audit trail
      await base44.functions.invoke("logAuditTrail", {
        entity_type: "Employee",
        entity_id: employee.id,
        action: "update",
        details: logDetails,
        timestamp: new Date().toISOString(),
      });

      queryClient.invalidateQueries(["employees"]);
      toast.success("Employee information updated");
      setIsEditing(false);
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-emerald-100 text-emerald-700";
      case "inactive": return "bg-slate-100 text-slate-700";
      case "on_leave": return "bg-amber-100 text-amber-700";
      case "terminated": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700";
      case "supervisor": return "bg-purple-100 text-purple-700";
      case "officer": return "bg-blue-100 text-blue-700";
      case "manager": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center font-bold text-lg">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </div>
              <div>
                <div className="text-xl font-bold">{employee.firstName} {employee.lastName}</div>
                <div className="text-sm text-slate-600">{employee.positionTitle || "No position assigned"}</div>
              </div>
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="text-slate-600 hover:text-slate-900"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status & Role */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <Badge className={getStatusColor(employee.status)}>
                  {employee.status?.replace("_", " ").toUpperCase()}
                </Badge>
                <Badge className={getRoleColor(employee.role)}>
                  {employee.role?.toUpperCase()}
                </Badge>
                {employee.invitation_status === "active" && (
                  <Badge className="bg-green-100 text-green-700">Portal Active</Badge>
                )}
                {employee.invitation_status === "invited" && (
                  <Badge className="bg-blue-100 text-blue-700">Invited</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Street</Label>
                      <Input
                        value={formData.address.street}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value }
                        })}
                        className="mt-1"
                        placeholder="Street address"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={formData.address.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, city: e.target.value }
                        })}
                        className="mt-1"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input
                        value={formData.address.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, state: e.target.value }
                        })}
                        className="mt-1"
                        placeholder="State"
                        maxLength="2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP</Label>
                      <Input
                        value={formData.address.zip}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address, zip: e.target.value }
                        })}
                        className="mt-1"
                        placeholder="ZIP code"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {formData.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 mt-1 text-slate-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500">Email</div>
                        <a href={`mailto:${formData.email}`} className="text-blue-600 hover:underline break-all">
                          {formData.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {formData.phoneNumber && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 mt-1 text-slate-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500">Phone</div>
                        <a href={`tel:${formData.phoneNumber}`} className="text-blue-600 hover:underline">
                          {formData.phoneNumber}
                        </a>
                      </div>
                    </div>
                  )}
                  {(formData.address.street || formData.address.city || formData.address.state || formData.address.zip) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 mt-1 text-slate-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500">Address</div>
                        <div className="text-sm">
                          {formData.address.street && <div>{formData.address.street}</div>}
                          {(formData.address.city || formData.address.state || formData.address.zip) && (
                            <div>
                              {formData.address.city}
                              {formData.address.state && `, ${formData.address.state}`}
                              {formData.address.zip && ` ${formData.address.zip}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Hire Date</Label>
                    <Input
                      type="date"
                      value={formData.hireDate}
                      onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hourly Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.baseHourlyRate}
                      onChange={(e) => setFormData({ ...formData, baseHourlyRate: e.target.value })}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max Hours/Week</Label>
                    <Input
                      type="number"
                      value={formData.maxHours}
                      onChange={(e) => setFormData({ ...formData, maxHours: e.target.value })}
                      className="mt-1"
                      placeholder="40"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {employee.hireDate && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Hire Date</div>
                      <div className="font-medium">{format(new Date(employee.hireDate), "MMM d, yyyy")}</div>
                    </div>
                  )}
                  {employee.baseHourlyRate && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Hourly Rate</div>
                      <div className="font-medium">${employee.baseHourlyRate.toFixed(2)}</div>
                    </div>
                  )}
                  {employee.maxHours && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Max Hours/Week</div>
                      <div className="font-medium">{employee.maxHours}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Off */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time Off & Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditing ? (
                <div>
                  <Label className="text-xs">PTO Balance (hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.ptoBalance}
                    onChange={(e) => setFormData({ ...formData, ptoBalance: e.target.value })}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-slate-500 uppercase">PTO Balance</div>
                    <div className="text-2xl font-bold text-emerald-600">
                      {formData.ptoBalance || 0} hours
                    </div>
                  </div>
                  {employee.isRehirable !== undefined && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 uppercase">Rehirable</div>
                      <Badge className={employee.isRehirable ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                        {employee.isRehirable ? "Yes" : "No"}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="w-4 h-4" /> Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Relationship</Label>
                    <Input
                      value={formData.emergencyContactRelation}
                      onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={formData.emergencyContactEmail}
                      onChange={(e) => setFormData({ ...formData, emergencyContactEmail: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {formData.emergencyContactName && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Name</div>
                      <div className="font-medium">{formData.emergencyContactName}</div>
                    </div>
                  )}
                  {formData.emergencyContactRelation && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Relationship</div>
                      <div className="font-medium">{formData.emergencyContactRelation}</div>
                    </div>
                  )}
                  {formData.emergencyContactPhone && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Phone</div>
                      <a href={`tel:${formData.emergencyContactPhone}`} className="text-blue-600 hover:underline">
                        {formData.emergencyContactPhone}
                      </a>
                    </div>
                  )}
                  {formData.emergencyContactEmail && (
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Email</div>
                      <a href={`mailto:${formData.emergencyContactEmail}`} className="text-blue-600 hover:underline break-all">
                        {formData.emergencyContactEmail}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Date of Birth */}
          <Card>
            <CardContent className="p-4">
              {isEditing ? (
                <div>
                  <Label className="text-xs">Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <div>
                    <div className="text-xs text-slate-500 uppercase">Date of Birth</div>
                    <div className="font-medium">
                      {formData.dateOfBirth ? format(new Date(formData.dateOfBirth), "MMMM d, yyyy") : "Not set"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="border-t pt-4 mt-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/AuditLog?entity_type=Employee&entity_id=${employee.id}`);
              }}
              className="text-slate-600 hover:text-slate-900"
            >
              <History className="w-4 h-4 mr-2" />
              View Audit Log
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="text-slate-600 hover:text-slate-900"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#1a2b4a] hover:bg-[#2d4a6f]"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            )}
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                size="sm"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}