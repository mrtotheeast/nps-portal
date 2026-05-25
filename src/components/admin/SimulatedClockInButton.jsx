/**
 * Admin-only simulated clock-in button.
 * Only renders when the user is an admin or super_admin.
 * Records a timesheet entry flagged with simulated: true.
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

export default function SimulatedClockInButton({ site, employee, onSimulated }) {
  const [simulating, setSimulating] = useState(false);
  const queryClient = useQueryClient();

  if (!site || !employee) return null;

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const now = new Date();
      const entry = await base44.entities.Timesheet.create({
        employee_id: employee.id,
        site_id: site.id,
        date: format(now, "yyyy-MM-dd"),
        clock_in: now.toISOString(),
        status: "pending",
        simulated: true,
        device_type: "admin_simulation",
        notes: "SIMULATED CLOCK-IN — Admin test entry. Excluded from payroll.",
      });

      queryClient.invalidateQueries({ queryKey: ["my-timesheets-today"] });
      queryClient.invalidateQueries({ queryKey: ["my-timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });

      toast.success(`Simulated clock-in recorded at ${site.name}`, {
        description: `${format(now, "h:mm a")} — flagged as test entry, excluded from payroll.`,
        duration: 6000,
      });

      if (onSimulated) onSimulated(entry);
    } catch (err) {
      toast.error("Simulation failed: " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="mt-3 border-2 border-dashed border-amber-400 rounded-lg p-3 bg-amber-50">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          Admin Testing Override
        </span>
        <Badge className="ml-auto bg-amber-200 text-amber-800 text-xs border-0">Simulated</Badge>
      </div>
      <p className="text-xs text-amber-700 mb-2">
        Simulated Session — This clock-in will not affect payroll.
      </p>
      <Button
        size="sm"
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs gap-1"
        onClick={handleSimulate}
        disabled={simulating}
      >
        {simulating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FlaskConical className="w-3 h-3" />
        )}
        Simulate Clock In at {site.name}
      </Button>
    </div>
  );
}