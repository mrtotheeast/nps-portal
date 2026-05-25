import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeftRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ShiftSwapRequestForm({ open, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ shift_id: "", target_employee_id: "", reason: "" });
  const [submitted, setSubmitted] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const { data: myShifts = [] } = useQuery({
    queryKey: ["my-shifts-swap", currentUser?.id],
    queryFn: () => base44.entities.Shift.filter({ employee_id: currentUser?.id }),
    enabled: !!currentUser?.id,
    select: (shifts) => shifts.filter(s => s.date >= today && s.status !== "cancelled").sort((a, b) => a.date.localeCompare(b.date)),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users-swap"],
    queryFn: () => base44.entities.User.list(),
    select: (users) => users.filter(u => u.id !== currentUser?.id && ["officer", "employee"].includes(u.role_type)),
  });

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list() });
  const siteMap = Object.fromEntries(sites.map(s => [s.id, s]));

  const mutation = useMutation({
    mutationFn: async (data) => {
      const swapRequest = await base44.entities.ShiftSwapRequest.create({ shift_id: data.shift_id, requesting_employee_id: currentUser.id, target_employee_id: data.target_employee_id, reason: data.reason, status: "pending" });
      await base44.functions.invoke("notifyShiftSwapRequest", { swap_request_id: swapRequest.id, requester_name: currentUser.full_name, shift_id: data.shift_id, target_employee_id: data.target_employee_id, reason: data.reason });
      return swapRequest;
    },
    onSuccess: () => { queryClient.invalidateQueries(["shift-swap-requests"]); setSubmitted(true); toast.success("Swap request submitted — admin will review shortly."); },
    onError: (err) => toast.error(`Failed to submit: ${err.message}`),
  });

  const handleClose = () => { setForm({ shift_id: "", target_employee_id: "", reason: "" }); setSubmitted(false); onClose(); };
  const selectedShift = myShifts.find(s => s.id === form.shift_id);
  const isValid = form.shift_id && form.target_employee_id && form.reason.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-[#1a2b4a]"><ArrowLeftRight className="w-5 h-5" />Request Shift Swap</DialogTitle></DialogHeader>
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <p className="font-semibold text-lg">Request Submitted</p>
            <p className="text-sm text-slate-500">Admin has been notified and will review your request.</p>
            <Button onClick={handleClose} className="mt-2 bg-[#1a2b4a] hover:bg-[#2d4a6f]">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label>Your Shift to Swap *</Label>
              <Select value={form.shift_id} onValueChange={v => setForm(f => ({ ...f, shift_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a shift..." /></SelectTrigger>
                <SelectContent>
                  {myShifts.length === 0 && <SelectItem value="_none" disabled>No upcoming shifts</SelectItem>}
                  {myShifts.map(s => <SelectItem key={s.id} value={s.id}>{format(parseISO(s.date), "EEE MMM d")} · {s.start_time}–{s.end_time}{siteMap[s.site_id] ? ` · ${siteMap[s.site_id].name}` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedShift && (
                <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs flex gap-2 flex-wrap">
                  <Badge variant="outline">{format(parseISO(selectedShift.date), "EEEE, MMMM d")}</Badge>
                  <Badge variant="outline">{selectedShift.start_time} – {selectedShift.end_time}</Badge>
                  {siteMap[selectedShift.site_id] && <Badge variant="outline">{siteMap[selectedShift.site_id].name}</Badge>}
                </div>
              )}
            </div>
            <div>
              <Label>Swap With *</Label>
              <Select value={form.target_employee_id} onValueChange={v => setForm(f => ({ ...f, target_employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select officer/employee..." /></SelectTrigger>
                <SelectContent className="max-h-52">{allUsers.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason *</Label>
              <Textarea rows={3} placeholder="Briefly explain why you need this swap..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button onClick={() => mutation.mutate(form)} disabled={!isValid || mutation.isPending} className="flex-1 bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white">
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit Request"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}