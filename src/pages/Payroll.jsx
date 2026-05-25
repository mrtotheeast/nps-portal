import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Calendar, Download, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Payroll() {
  const tenantFilter = useTenantFilter();

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees", tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter),
    enabled: !!tenantFilter.company_id,
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets", tenantFilter],
    queryFn: () => base44.entities.Timesheet.filter(tenantFilter, "-date"),
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", tenantFilter],
    queryFn: () => base44.entities.Site.filter(tenantFilter),
    enabled: !!tenantFilter.company_id,
  });

  if (loadingEmployees) return <LoadingScreen />;

  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const employeePayroll = employees.map((emp) => {
    const empTimesheets = timesheets.filter(
      (ts) => ts.employee_id === emp.id &&
        new Date(ts.date) >= monthStart &&
        new Date(ts.date) <= monthEnd
    );
    const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
    const regularHours = Math.min(totalHours, 40);
    const overtimeHours = Math.max(0, totalHours - 40);
    const grossPay = (regularHours * (emp.baseHourlyRate || 0)) + (overtimeHours * (emp.baseHourlyRate || 0) * 1.5);
    return { emp, totalHours, regularHours, overtimeHours, grossPay, empTimesheets };
  });

  const totalPayroll = employeePayroll.reduce((sum, p) => sum + p.grossPay, 0);

  const handleExportCSV = () => {
    const periodTimesheets = timesheets.filter(
      (ts) => new Date(ts.date) >= monthStart && new Date(ts.date) <= monthEnd
    );

    if (periodTimesheets.length === 0) {
      toast.error("No timesheet records found for this pay period");
      return;
    }

    const rows = [
      ["Employee Name", "Employee ID", "Date", "Clock In", "Clock Out", "Total Hours", "Site", "Position", "Base Rate", "Total Pay", "Overtime Hours"]
    ];

    periodTimesheets.forEach((ts) => {
      const emp = employees.find(e => e.id === ts.employee_id);
      const site = sites.find(s => s.id === ts.site_id);
      const empName = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : "Unknown";
      const empId = emp?.employeeId || emp?.id || "";
      const baseRate = emp?.baseHourlyRate || 0;
      const hours = ts.total_hours || 0;
      const overtime = Math.max(0, hours - 8); // daily OT
      const pay = hours * baseRate;

      rows.push([
        empName,
        empId,
        ts.date || "",
        ts.clock_in ? format(new Date(ts.clock_in), "HH:mm") : "",
        ts.clock_out ? format(new Date(ts.clock_out), "HH:mm") : "",
        hours.toFixed(2),
        site?.name || "",
        emp?.positionTitle || "",
        baseRate.toFixed(2),
        pay.toFixed(2),
        overtime.toFixed(2),
      ]);
    });

    const csvContent = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NPS-Payroll-Export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Payroll"
        subtitle={`${format(monthStart, "MMMM yyyy")} payroll`}
      />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total Payroll</p>
              <p className="text-2xl font-bold text-[#1a2b4a]">${totalPayroll.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Processed</p>
              <p className="text-2xl font-bold text-emerald-600">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{employees.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Payroll Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-left">Hours</th>
                    <th className="p-3 text-left">OT Hours</th>
                    <th className="p-3 text-left">Rate</th>
                    <th className="p-3 text-right">Gross Pay</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employeePayroll.length === 0 && (
                    <tr><td colSpan={6} className="py-8"><EmptyState icon={Users} title="No employees found" description="Add employees to see payroll data" /></td></tr>
                  )}
                  {employeePayroll.map(({ emp, totalHours, overtimeHours, grossPay }) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-3">{emp.firstName} {emp.lastName}</td>
                      <td className="p-3">{totalHours.toFixed(1)}</td>
                      <td className="p-3 text-amber-600">{overtimeHours.toFixed(1)}</td>
                      <td className="p-3">${emp.baseHourlyRate?.toFixed(2) || "0.00"}</td>
                      <td className="p-3 text-right font-semibold">${grossPay.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline">Pending</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}