import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Download, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";

export default function PayrollIntegration() {
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => base44.entities.Timesheet.list(),
  });

  if (loadingEmployees) return <LoadingScreen />;

  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const payrollData = employees.map((emp) => {
    const empTimesheets = timesheets.filter(
      (ts) =>
        ts.employee_id === emp.id &&
        ts.status === "approved" &&
        new Date(ts.date) >= monthStart &&
        new Date(ts.date) <= monthEnd
    );
    const totalHours = empTimesheets.reduce((sum, ts) => sum + (ts.total_hours || 0), 0);
    const grossPay = totalHours * (emp.baseHourlyRate || 0);
    return { emp, totalHours, grossPay };
  });

  const totalPayroll = payrollData.reduce((sum, p) => sum + p.grossPay, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Payroll Integration" subtitle="Manage Paychex integration and exports" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Current Period</p>
              <p className="text-2xl font-bold">{format(monthStart, "MMM yyyy")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Total Hours</p>
              <p className="text-2xl font-bold">
                {payrollData.reduce((sum, p) => sum + p.totalHours, 0).toFixed(1)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Gross Payroll</p>
              <p className="text-2xl font-bold">${totalPayroll.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-600">Ready to Export</p>
              <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Export to Paychex</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="bg-[#1a2b4a]">
              <Download className="w-4 h-4 mr-2" />
              Export CSV for Paychex
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-3 text-left">Employee</th>
                    <th className="p-3 text-right">Hours</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Gross Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payrollData.map(({ emp, totalHours, grossPay }) => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-3">{emp.firstName} {emp.lastName}</td>
                      <td className="p-3 text-right">{totalHours.toFixed(1)}</td>
                      <td className="p-3 text-right">${emp.baseHourlyRate?.toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">${grossPay.toFixed(2)}</td>
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