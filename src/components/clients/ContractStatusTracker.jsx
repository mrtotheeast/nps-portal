import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { differenceInDays, parseISO, isAfter, isBefore, startOfToday } from "date-fns";

export default function ContractStatusTracker({ client }) {
  if (!client?.contract_start_date || !client?.contract_end_date) {
    return null;
  }

  const today = startOfToday();
  const startDate = parseISO(client.contract_start_date);
  const endDate = parseISO(client.contract_end_date);

  const daysUntilEnd = differenceInDays(endDate, today);
  const daysActive = differenceInDays(today, startDate);

  let status = "active";
  let statusColor = "bg-emerald-100 text-emerald-700";
  let statusLabel = "Active";
  let statusIcon = CheckCircle;

  if (isBefore(today, startDate)) {
    status = "pending";
    statusColor = "bg-blue-100 text-blue-700";
    statusLabel = "Pending";
    statusIcon = Calendar;
  } else if (isAfter(today, endDate)) {
    status = "expired";
    statusColor = "bg-red-100 text-red-700";
    statusLabel = "Expired";
    statusIcon = AlertCircle;
  } else if (daysUntilEnd <= 30) {
    status = "expiring";
    statusColor = "bg-amber-100 text-amber-700";
    statusLabel = `Expiring Soon (${daysUntilEnd}d)`;
    statusIcon = AlertCircle;
  }

  const StatusIcon = statusIcon;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          Contract Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Current Status</span>
          <Badge className={statusColor}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusLabel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-0.5">Start Date</p>
            <p className="font-semibold text-sm">{startDate.toLocaleDateString()}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500 mb-0.5">End Date</p>
            <p className="font-semibold text-sm">{endDate.toLocaleDateString()}</p>
          </div>
        </div>

        {status === "active" && (
          <div className="p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs text-emerald-700">
              <strong>{daysActive}</strong> days active | <strong>{daysUntilEnd}</strong> days remaining
            </p>
          </div>
        )}

        {status === "expiring" && (
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              Contract expires in <strong>{daysUntilEnd}</strong> day{daysUntilEnd !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {status === "pending" && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              Contract starts in <strong>{Math.abs(differenceInDays(startDate, today))}</strong> day{Math.abs(differenceInDays(startDate, today)) !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {status === "expired" && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs text-red-700 font-semibold">
              Contract expired {Math.abs(daysUntilEnd)} day{Math.abs(daysUntilEnd) !== 1 ? "s" : ""} ago
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}