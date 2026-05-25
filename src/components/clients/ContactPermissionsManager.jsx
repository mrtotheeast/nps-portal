import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PERMISSION_CONFIG = {
  view_schedule: "View Schedule",
  view_officers: "View Assigned Officers",
  view_incidents: "View Incident Reports",
  comment_incidents: "Comment on Incident Reports",
  print_incidents: "Print Incident Reports",
  view_patrol: "View Patrol Activity",
  view_invoices: "View Invoices",
  view_documents: "View Site Documents/SOPs",
  request_services: "Request Additional Services",
  view_portal_fee: "View Portal Access Fee Info",
};

export default function ContactPermissionsManager({ contact, clientId, isMainContact }) {
  const queryClient = useQueryClient();

  const updatePermissionMutation = useMutation({
    mutationFn: (permissionData) =>
      base44.entities.ClientContact.update(contact.id, permissionData),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-contacts", clientId]);
      toast.success("Permission updated");
    },
  });

  const handlePermissionChange = (key, value) => {
    const newPermissions = { ...contact.permissions, [key]: value };
    updatePermissionMutation.mutate({ permissions: newPermissions });
  };

  if (contact.is_main_contact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portal Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            As the main contact, you have full access to all portal features. Only an NPS Admin can change the main contact.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{contact.full_name} — Portal Permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(PERMISSION_CONFIG).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
            <Label className="text-sm font-medium cursor-pointer">{label}</Label>
            <Switch
              checked={contact.permissions?.[key] ?? true}
              onCheckedChange={(value) => handlePermissionChange(key, value)}
              disabled={updatePermissionMutation.isPending}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}