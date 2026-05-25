import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Phone, DollarSign, AlertCircle, CheckCircle2, Bell, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const STATUS_COLORS = { active: "bg-green-100 text-green-800", on_leave: "bg-amber-100 text-amber-800", terminated: "bg-red-100 text-red-800" };

export default function EmployeeDashboardCard({ employee, onSendReminder }) {
  const isExpiringSoon = (date) => { if (!date) return false; const days = Math.ceil((new Date(date) - new Date()) / 86400000); return days > 0 && days <= 30; };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg">{employee.firstName} {employee.lastName}</CardTitle>
          <p className="text-sm text-slate-500 mt-1">{employee.position || employee.role}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isExpiringSoon(employee.contractEndDate) && <DropdownMenuItem onClick={() => onSendReminder(employee, "contract")}><Bell className="w-4 h-4 mr-2" />Send Contract Reminder</DropdownMenuItem>}
            {!employee.handbookAcknowledged && <DropdownMenuItem onClick={() => onSendReminder(employee, "handbook")}><Bell className="w-4 h-4 mr-2" />Send Handbook Reminder</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Badge className={STATUS_COLORS[employee.status] || "bg-slate-100 text-slate-800"}>{employee.status?.replace("_", " ").toUpperCase()}</Badge>
          {employee.employmentType && <Badge variant="outline">{employee.employmentType === "W2" ? "W2 Employee" : "1099 Contractor"}</Badge>}
        </div>
        <div className="space-y-2 text-sm">
          {employee.email && <div className="flex items-center gap-2 text-slate-600"><Mail className="w-4 h-4" /><span className="truncate">{employee.email}</span></div>}
          {employee.phoneNumber && <div className="flex items-center gap-2 text-slate-600"><Phone className="w-4 h-4" /><span>{employee.phoneNumber}</span></div>}
          {employee.baseHourlyRate && <div className="flex items-center gap-2 text-slate-600"><DollarSign className="w-4 h-4" /><span>${employee.baseHourlyRate.toFixed(2)}/hr</span></div>}
        </div>
        <div className="border-t pt-3 space-y-2 text-xs">
          {employee.hireDate && <div className="flex items-center justify-between"><span className="text-slate-600">Hired:</span><span className="font-medium">{format(new Date(employee.hireDate), "MMM d, yyyy")}</span></div>}
          {employee.contractEndDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Contract Ends:</span>
              <div className="flex items-center gap-1">
                {isExpiringSoon(employee.contractEndDate) && <AlertCircle className="w-3 h-3 text-red-500" />}
                <span className={isExpiringSoon(employee.contractEndDate) ? "font-medium text-red-600" : "font-medium"}>{format(new Date(employee.contractEndDate), "MMM d, yyyy")}</span>
              </div>
            </div>
          )}
          {employee.ptoBalance !== undefined && <div className="flex items-center justify-between"><span className="text-slate-600">PTO Balance:</span><span className="font-medium">{employee.ptoBalance.toFixed(1)}h</span></div>}
        </div>
        {(employee.handbookAcknowledged !== undefined || employee.onboardingComplete !== undefined) && (
          <div className="border-t pt-3 space-y-1 text-xs">
            <div className="flex items-center gap-2">{employee.onboardingComplete ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}<span>Onboarding: {employee.onboardingComplete ? "Complete" : "Pending"}</span></div>
            <div className="flex items-center gap-2">{employee.handbookAcknowledged ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}<span>Handbook: {employee.handbookAcknowledged ? "Acknowledged" : "Pending"}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}