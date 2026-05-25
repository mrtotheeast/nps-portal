import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

const statusIcons = {
  active: { icon: CheckCircle, label: "Active", color: "text-emerald-700" },
  inactive: { icon: XCircle, label: "Inactive", color: "text-slate-700" },
  pending: { icon: Clock, label: "Pending", color: "text-amber-700" },
  invited: { icon: Clock, label: "Invited", color: "text-blue-700" },
  expired: { icon: AlertCircle, label: "Expired", color: "text-red-700" },
  "not_invited": { icon: XCircle, label: "Not Invited", color: "text-slate-700" },
};

export default function AccessibleBadge({ status, children }) {
  const config = statusIcons[status] || statusIcons.inactive;
  const Icon = config.icon;

  return (
    <Badge className="inline-flex items-center gap-1" aria-label={`Status: ${config.label}`}>
      <Icon className={`w-3 h-3 ${config.color}`} aria-hidden="true" />
      <span>{children || config.label}</span>
    </Badge>
  );
}