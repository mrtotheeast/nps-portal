import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PTOBalanceCard({ userId }) {
  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee-pto", userId],
    queryFn: async () => {
      const user = await base44.entities.User.get(userId);
      const employees = await base44.entities.Employee.filter({ email: user.email });
      return employees[0] || null;
    },
    enabled: !!userId
  });

  const { data: settings } = useQuery({
    queryKey: ["pto-settings"],
    queryFn: async () => {
      const configs = await base44.entities.ReportConfig.filter({ config_type: "pto_settings" });
      return configs[0]?.config_data || { hoursPerWeek: 2.5 };
    }
  });

  if (isLoading) return (
    <Card className="mb-6 shadow-sm"><CardContent className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></CardContent></Card>
  );

  const ptoBalance = employee?.ptoBalance || 0;
  const accrualRate = settings?.hoursPerWeek || 2.5;

  return (
    <Card className="mb-6 shadow-sm">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">Available Balance</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-700">{ptoBalance.toFixed(1)}</p>
            <p className="text-sm text-slate-500">Hours Available</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg text-center">
            <p className="text-3xl font-bold text-purple-700">{accrualRate}</p>
            <p className="text-sm text-slate-500">Hours/Week Accrual</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}