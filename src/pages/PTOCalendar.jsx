import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function PTOCalendar() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const { data: ptoRequests = [], isLoading } = useQuery({
    queryKey: ["pto-requests"],
    queryFn: () => base44.entities.PTORequest.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  if (isLoading) return <LoadingScreen />;

  const approvedPTO = ptoRequests.filter((r) => r.status === "approved");
  const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

  const ptoDaysInMonth = approvedPTO.filter(
    (pto) =>
      new Date(pto.start_date) <= monthEnd && new Date(pto.end_date) >= monthStart
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="PTO Calendar" subtitle="View team time off schedule" />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))
                  }
                  className="px-3 py-1 border rounded hover:bg-slate-50"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedMonth(new Date())}
                  className="px-3 py-1 border rounded hover:bg-slate-50"
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))
                  }
                  className="px-3 py-1 border rounded hover:bg-slate-50"
                >
                  →
                </button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Approved PTO</h3>
                <div className="space-y-2">
                  {ptoDaysInMonth.slice(0, 5).map((pto) => (
                    <div key={pto.id} className="p-2 bg-slate-50 rounded text-sm">
                      <p className="font-medium">{pto.employee_id}</p>
                      <p className="text-slate-600">
                        {new Date(pto.start_date).toLocaleDateString()} -{" "}
                        {new Date(pto.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Statistics</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">Total Approved</p>
                    <p className="text-xl font-bold">{approvedPTO.length}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded">
                    <p className="text-sm text-slate-600">This Month</p>
                    <p className="text-xl font-bold">{ptoDaysInMonth.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}