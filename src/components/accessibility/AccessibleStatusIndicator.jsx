import React from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

const statusConfig = {
  active: { icon: CheckCircle2, bgColor: "bg-emerald-100", textColor: "text-emerald-700", label: "Active" },
  inactive: { icon: Circle, bgColor: "bg-slate-100", textColor: "text-slate-700", label: "Inactive" },
  pending: { icon: AlertCircle, bgColor: "bg-amber-100", textColor: "text-amber-700", label: "Pending" },
  expired: { icon: AlertCircle, bgColor: "bg-red-100", textColor: "text-red-700", label: "Expired" },
};

export default function AccessibleStatusIndicator({ status, size = "md" }) {
  const config = statusConfig[status] || statusConfig.inactive;
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-md ${config.bgColor}`}
      role="img"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={`${sizeClass} ${config.textColor}`} aria-hidden="true" />
      <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  );
}