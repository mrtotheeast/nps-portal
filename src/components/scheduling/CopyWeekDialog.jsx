import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format, addDays } from "date-fns";

export default function CopyWeekDialog({ open, onClose, onConfirm, weekStart, shiftCount = 0 }) {
  const weekEnd = addDays(weekStart, 6);
  const nextWeekStart = addDays(weekStart, 7);
  const nextWeekEnd = addDays(weekEnd, 7);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Copy This Week's Shifts</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#c9a227] mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">This Week</p>
              <p className="text-xs text-slate-500">{format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}</p>
              <p className="text-xs text-slate-600 mt-1">{shiftCount} shifts</p>
            </div>
          </div>

          <div className="bg-[#1a2b4a] text-white rounded-lg p-3">
            <p className="text-sm font-medium">↓ Copy to ↓</p>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[#1a2b4a] mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Next Week</p>
              <p className="text-xs text-slate-500">{format(nextWeekStart, "MMM d")} - {format(nextWeekEnd, "MMM d, yyyy")}</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            This will create {shiftCount} new shifts. Existing shifts will not be overwritten.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button onClick={onConfirm} className="flex-1 bg-[#1a2b4a]">Copy Shifts</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}