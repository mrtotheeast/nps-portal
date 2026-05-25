import React from "react";
import { Mail, Phone, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ClientContactsPanel({ client }) {
  if (!client) return null;

  const primary = client.primary_contact || {
    full_name: client.contact_name,
    email: client.contact_email,
    phone: client.contact_phone,
    title: "",
  };

  const additional = client.additional_contacts || [];
  const allContacts = [primary, ...additional].filter(c => c?.full_name || c?.email);

  const emailAllHref = () => {
    const to = primary?.email || "";
    const cc = additional.map(c => c.email).filter(Boolean).join(",");
    const subject = encodeURIComponent(`NPS Portal — ${client.name}`);
    return `mailto:${to}${cc ? `?cc=${cc}&subject=${subject}` : `?subject=${subject}`}`;
  };

  return (
    <div className="space-y-4">
      {/* Email All button */}
      {allContacts.length > 0 && (
        <Button size="sm" variant="outline" className="gap-2" asChild>
          <a href={emailAllHref()}>
            <Send className="w-4 h-4" /> Email All Contacts
          </a>
        </Button>
      )}

      {/* Primary */}
      {primary?.full_name || primary?.email ? (
        <ContactCard contact={primary} isPrimary />
      ) : null}

      {/* Additional */}
      {additional.map((contact, i) => (
        <ContactCard key={i} contact={contact} />
      ))}

      {allContacts.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">No contact information on file</p>
      )}
    </div>
  );
}

function ContactCard({ contact, isPrimary }) {
  if (!contact) return null;
  return (
    <div className="border rounded-lg p-4 space-y-2 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center text-xs font-bold">
            {contact.full_name?.charAt(0) || <User className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{contact.full_name || "Unnamed"}</p>
            {contact.title && <p className="text-xs text-slate-500">{contact.title}</p>}
          </div>
        </div>
        {isPrimary && <Badge className="bg-[#1a2b4a] text-white text-xs">Primary</Badge>}
      </div>
      <div className="space-y-1 ml-10">
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <Mail className="w-4 h-4 flex-shrink-0" /> {contact.email}
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-slate-700">
            <Phone className="w-4 h-4 flex-shrink-0" /> {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}