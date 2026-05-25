import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, parseISO, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, DollarSign, Users, Clock, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function PayrollExport() {
  const today = new Date();
  const defaultStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
  const defaultEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [exporting, setExporting] = useState(false);

  const { data: timesheets = [], isLoading: loadingTimesheets } = useQuery({
    queryKey: ["payroll-timesheets"],
    queryFn: () => base44.entities.Timesheet.filter({ status: "approved" }),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["payroll-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: employeeRecords = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["payroll-employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const isLoading = loadingTimesheets || loadingUsers || loadingEmployees;

  const payrollRows = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    end.setHours(23, 59, 59);

    const filtered = timesheets.filter((t) => {
      const shiftDate = t.date ? parseISO(t.date) : t.clock_in ? new Date(t.clock_in) : null;
      return shiftDate && isWithinInterval(shiftDate, { start, end });
    });

    const byEmployee = {};
    filtered.forEach((t) => {
      const key = t.employee_id || t.created_by || t.employee_email;
      if (!key) return;
      if (!byEmployee[key]) byEmployee[key] = { key, hours: 0 };

      let hrs = 0;
      if (t.total_hours) {
        hrs = parseFloat(t.total_hours);
      } else if (t.clock_in && t.clock_out) {
        hrs = (new Date(t.clock_out) - new Date(t.clock_in)) / 3600000;
      } else if (t.hours_worked) {
        hrs = parseFloat(t.hours_worked);
      }
      byEmployee[key].hours += isNaN(hrs) ? 0 : hrs;
    });

    return Object.values(byEmployee).map(({ key, hours }) => {
      const user = users.find((u) => u.id === key || u.email === key);
      const emp = employeeRecords.find((e) => e.email === (user?.email || key) || e.user_id === key);

      const name = user?.full_name || emp?.firstName
        ? `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim()
        : key;
      const hourlyRate = emp?.baseHourlyRate || user?.hourly_rate || 0;
      const regularHours = Math.min(hours, 40);
      const overtimeHours = Math.max(0, hours - 40);
      const grossPay = regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;

      return {
        employee_name: name || key,
        employee_id: emp?.employeeId || user?.id || key,
        email: user?.email || emp?.email || key,
        regular_hours: regularHours.toFixed(2),
        overtime_hours: overtimeHours.toFixed(2),
        total_hours: hours.toFixed(2),
        hourly_rate: hourlyRate.toFixed(2),
        gross_pay: grossPay.toFixed(2),
      };
    }).filter((r) => parseFloat(r.total_hours) > 0);
  }, [timesheets, users, employeeRecords, startDate, endDate]);

  const totalHours = payrollRows.reduce((s, r) => s + parseFloat(r.total_hours), 0);
  const totalGross = payrollRows.reduce((s, r) => s + parseFloat(r.gross_pay), 0);

  const handleExport = () => {
    if (payrollRows.length === 0) {
      toast.error("No approved timesheet data found for this period.");
      return;
    }

    setExporting(true);
    setTimeout(() => {
      const headers = ["Employee Name", "Employee ID", "Email", "Regular Hours", "Overtime Hours", "Total Hours Worked", "Hourly Rate", "Gross Pay"];
      const rows = payrollRows.map((r) => [
        `"${r.employee_name}"`,
        `"${r.employee_id}"`,
        `"${r.email}"`,
        r.regular_hours,
        r.overtime_hours,
        r.total_hours,
        r.hourly_rate,
        r.gross_pay,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      toast.success(`Exported ${payrollRows.length} employee records`);
    }, 500);
  };

  if (isLoading) return <LoadingScreen message="Loading payroll data..." />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Payroll Export" subtitle="Aggregate approved timesheets and export to CSV" showBack />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Pay Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setStartDate(defaultStart); setEndDate(defaultEnd); }}>
                Current Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = new Date(today);
                  prev.setDate(today.getDate() - 7);
                  setStartDate(format(startOfWeek(prev, { weekStartsOn: 0 }), "yyyy-MM-dd"));
                  setEndDate(format(endOfWeek(prev, { weekStartsOn: 0 }), "yyyy-MM-dd"));
                }}
              >
                Last Week
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-slate-500">Employees</p>
                <p className="text-2xl font-bold">{payrollRows.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-xs text-slate-500">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-xs text-slate-500">Total Gross Pay</p>
                <p className="text-2xl font-bold">${totalGross.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payroll Preview
            </CardTitle>
            <Button
              onClick={handleExport}
              disabled={payrollRows.length === 0 || exporting}
              className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {payrollRows.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-medium">No approved timesheets found</p>
                <p className="text-sm mt-1">Adjust the date range or ensure timesheets are approved.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-3 px-3 font-semibold text-slate-600">Employee Name</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Reg. Hours</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">OT Hours</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Total Hours</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Hourly Rate</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Gross Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRows.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-medium">{row.employee_name}</td>
                        <td className="py-3 px-3 text-right">{row.regular_hours}</td>
                        <td className="py-3 px-3 text-right">
                          {parseFloat(row.overtime_hours) > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{row.overtime_hours}</Badge>
                          ) : "0.00"}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">{row.total_hours}</td>
                        <td className="py-3 px-3 text-right">${row.hourly_rate}</td>
                        <td className="py-3 px-3 text-right font-bold text-green-700">${row.gross_pay}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-3 px-3">Totals</td>
                      <td className="py-3 px-3 text-right">
                        {payrollRows.reduce((s, r) => s + parseFloat(r.regular_hours), 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {payrollRows.reduce((s, r) => s + parseFloat(r.overtime_hours), 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">{totalHours.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right">—</td>
                      <td className="py-3 px-3 text-right text-green-700">${totalGross.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center">
          Only approved timesheets are included. Overtime calculated at 1.5× for hours over 40/week.
        </p>
      </div>
    </div>
  );
}