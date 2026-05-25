import React, { useMemo } from "react";
import { AlertTriangle, Users, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function PTOConflictDetector({ ptoRequest, employees = [], allPTORequests = [] }) {
  // Detect conflicts: same site, overlapping dates, both pending/approved
  const detectConflicts = useMemo(() => {
    if (!ptoRequest) return [];
    const conflicts = [];
    
    // Get requesting employee's sites
    const reqEmp = employees.find(e => e.id === ptoRequest.employee_id);
    const reqSites = reqEmp?.siteIds || [];
    
    if (reqSites.length === 0) return conflicts;

    // Check all other PTO requests
    allPTORequests.forEach(otherPTO => {
      if (otherPTO.id === ptoRequest.id) return;
      if (otherPTO.status === "rejected" || otherPTO.status === "cancelled") return;

      // Check for overlapping dates
      const datesOverlap = 
        new Date(ptoRequest.start_date) <= new Date(otherPTO.end_date) &&
        new Date(ptoRequest.end_date) >= new Date(otherPTO.start_date);

      if (!datesOverlap) return;

      // Check if other employee shares same site
      const otherEmp = employees.find(e => e.id === otherPTO.employee_id);
      const otherSites = otherEmp?.siteIds || [];

      const sharedSites = reqSites.filter(siteId => otherSites.includes(siteId));
      
      if (sharedSites.length > 0) {
        conflicts.push({
          otherPTO,
          otherEmp,
          sharedSites,
          severity: otherPTO.status === "approved" ? "critical" : "warning",
        });
      }
    });

    return conflicts;
  }, [ptoRequest, employees, allPTORequests]);

  const severityColors = {
    critical: "bg-red-50 border-l-4 border-l-red-500",
    warning: "bg-yellow-50 border-l-4 border-l-yellow-500",
  };

  const severityBadges = {
    critical: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
  };

  if (!ptoRequest || detectConflicts.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="w-5 h-5 text-emerald-600">✓</div>
        <span className="text-sm text-emerald-800">No scheduling conflicts detected</span>
      </div>
    );
  }

  return (
    <Card className="border-red-300 bg-red-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Scheduling Conflicts Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {detectConflicts.map((conflict, idx) => (
          <div key={idx} className={`p-3 rounded-lg ${severityColors[conflict.severity]}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-900">
                  {conflict.otherEmp?.firstName} {conflict.otherEmp?.lastName}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {format(new Date(conflict.otherPTO.start_date), "MMM d")} - {format(new Date(conflict.otherPTO.end_date), "MMM d")}
                </p>
              </div>
              <Badge className={severityBadges[conflict.severity]}>
                {conflict.severity === "critical" ? "Approved" : "Pending"}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-700 mt-2">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span>
                {conflict.sharedSites.length} shared {conflict.sharedSites.length === 1 ? "site" : "sites"}
              </span>
            </div>

            {conflict.otherPTO.reason && (
              <p className="text-xs text-slate-600 mt-2">
                <strong>Reason:</strong> {conflict.otherPTO.reason}
              </p>
            )}
          </div>
        ))}

        <div className="p-3 bg-white rounded-lg border border-red-200 text-xs text-slate-600">
          <strong>Consider:</strong> Ensure site coverage is maintained if approving this request. Review shift schedules for the same dates.
        </div>
      </CardContent>
    </Card>
  );
}