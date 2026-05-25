import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Loader2, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const INVITE_STATUS_CONFIG = {
  not_invited: { label: "Not Invited", color: "bg-slate-100 text-slate-700" },
  invited: { label: "Invited", color: "bg-amber-100 text-amber-700" },
  active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactive", color: "bg-red-100 text-red-700" },
};

export default function ContactInviteManager({ contacts = [], clientId, clientName }) {
  const [selectedContact, setSelectedContact] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (contactId) => 
      base44.functions.invoke("sendClientInvite", { contact_id: contactId, client_id: clientId }),
    onSuccess: () => {
      toast.success("Invitation sent");
      queryClient.invalidateQueries(["client-contacts", clientId]);
      setShowConfirm(false);
      setSelectedContact(null);
    },
    onError: () => toast.error("Failed to send invitation"),
  });

  const handleInvite = (contact) => {
    setSelectedContact(contact);
    setShowConfirm(true);
  };

  return (
    <>
      <div className="space-y-2">
        {contacts.map((contact) => {
          const status = INVITE_STATUS_CONFIG[contact.invite_status || "not_invited"];
          const isMain = contact.is_main_contact;
          return (
            <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{contact.full_name}</p>
                  {isMain && <Badge className="bg-[#c9a227] text-[#1a2b4a]">Main</Badge>}
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{contact.email}</p>
                {contact.title && <p className="text-xs text-slate-500">{contact.title}</p>}
              </div>
              {contact.invite_status === "not_invited" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 gap-1 text-xs"
                  onClick={() => handleInvite(contact)}
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  Invite
                </Button>
              )}
              {contact.invite_status === "invited" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2 gap-1 text-xs"
                  onClick={() => handleInvite(contact)}
                  disabled={inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Resend
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Portal Invitation</DialogTitle>
            <DialogDescription>
              Send an invitation to {selectedContact?.full_name} to access the NPS Portal for {clientName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-4">
              They'll receive an email at <strong>{selectedContact?.email}</strong> with instructions to set up their portal account.
            </p>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                Once they log in, their status will update to "Active" and they'll have access based on the permissions you've assigned.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#1a2b4a]"
              onClick={() => inviteMutation.mutate(selectedContact.id)}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}