import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, DollarSign, Users } from "lucide-react";

export default function PredictionsPanel({ predictions, workload, costAnalysis }) {
  if (!predictions && !workload && !costAnalysis) return null;
  return (
    <div className="space-y-4">
      {predictions?.staffing_forecast && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" />Staffing Forecast</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-slate-700">{predictions.staffing_forecast}</p></CardContent>
        </Card>
      )}
      {predictions?.potential_shortages?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-red-700"><AlertTriangle className="w-4 h-4" />Predicted Shortages</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {predictions.potential_shortages.map((s, i) => (
              <div key={i} className="p-2 bg-red-50 rounded text-xs">
                <div className="flex items-center justify-between mb-1"><span className="font-medium">{s.site}</span><Badge variant="destructive" className="text-xs">-{s.shortage_hours}h</Badge></div>
                <p className="text-slate-600">{s.date}</p>
                <p className="text-red-700 mt-1">{s.impact}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {predictions?.potential_overages?.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />Overtime Warnings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {predictions.potential_overages.map((o, i) => (
              <div key={i} className="p-2 bg-amber-50 rounded text-xs">
                <div className="flex items-center justify-between mb-1"><span className="font-medium">{o.employee}</span><Badge className="bg-amber-100 text-amber-800 text-xs">{o.projected_hours}h</Badge></div>
                {o.overtime_cost > 0 && <p className="text-amber-700">Overtime cost: ${o.overtime_cost.toFixed(2)}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {workload?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-purple-600" />Workload Balance</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
            {workload.map((emp, i) => {
              const color = emp.balance_status === "Balanced" ? "bg-green-100 text-green-800" : emp.balance_status === "Underutilized" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800";
              return (
                <div key={i} className="p-2 bg-slate-50 rounded text-xs">
                  <div className="flex items-center justify-between mb-1"><span className="font-medium">{emp.employee_name}</span><Badge className={`text-xs ${color}`}>{emp.utilization_percent.toFixed(0)}%</Badge></div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${emp.utilization_percent > 100 ? "bg-red-500" : emp.utilization_percent > 80 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${Math.min(emp.utilization_percent, 100)}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">{emp.assigned_hours.toFixed(1)}h</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      {costAnalysis && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-600" />Cost Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-slate-600">Labor Cost:</span><span className="font-medium">${costAnalysis.total_labor_cost?.toFixed(2)}</span></div>
            {costAnalysis.overtime_cost > 0 && <div className="flex justify-between text-sm"><span className="text-slate-600">Overtime:</span><span className="font-medium text-amber-600">${costAnalysis.overtime_cost?.toFixed(2)}</span></div>}
            {costAnalysis.cost_efficiency_score && <div className="flex justify-between text-sm pt-2 border-t"><span className="text-slate-600">Efficiency Score:</span><Badge className="bg-green-100 text-green-800">{costAnalysis.cost_efficiency_score.toFixed(1)}/10</Badge></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}