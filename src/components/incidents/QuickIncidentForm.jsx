import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const INCIDENT_TYPES = [
  { value: "theft", label: "Theft" }, { value: "assault", label: "Assault" },
  { value: "vandalism", label: "Vandalism" }, { value: "trespassing", label: "Trespassing" },
  { value: "medical", label: "Medical" }, { value: "fire", label: "Fire" },
  { value: "suspicious_activity", label: "Suspicious Activity" }, { value: "other", label: "Other" },
];

const DEFAULT_FORM = (siteId) => ({ site_id: siteId, incident_type: "", severity: "", priority: "medium", description: "" });

export default function QuickIncidentForm({ open, onClose, preselectedSiteId = "" }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM(preselectedSiteId));
  const [submitted, setSubmitted] = useState(false);

  const { data: sites = [] } = useQuery({ queryKey: ["sites"], queryFn: () => base44.entities.Site.list() });
  const { data: user } = useQuery({ queryKey: ["current-user-quick"], queryFn: () => base44.auth.me() });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.create({
      reporter_id: user?.id || "", site_id: data.site_id, incident_type: data.incident_type,
      severity: data.severity, priority: data.priority, description: data.description,
      incident_date: new Date().toISOString().slice(0, 10), incident_time: new Date().toTimeString().slice(0, 5), status: "pending",
    }),
    onSuccess: () => { queryClient.invalidateQueries(["incidents-pending"]); setSubmitted(true); toast.success("Incident reported successfully"); },
    onError: (err) => toast.error(`Failed to submit: ${err.message}`),
  });

  const handleClose = () => { setForm(DEFAULT_FORM(preselectedSiteId)); setSubmitted(false); onClose(); };
  const isValid = form.site_id && form.incident_type && form.severity && form.description.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" />Report Incident</DialogTitle></DialogHeader>
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500" />
            <p className="font-semibold text-lg">Incident Reported</p>
            <p className="text-sm text-slate-500">Your report has been submitted for review.</p>
            <Button onClick={handleClose} className="mt-2 bg-[#1a2b4a] hover:bg-[#2d4a6f]">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label>Site *</Label>
              <Select value={form.site_id} onValueChange={v => setForm(f => ({ ...f, site_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select site..." /></SelectTrigger>
                <SelectContent>{sites.filter(s => s.status === "active").map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Incident Type *</Label>
              <Select value={form.incident_type} onValueChange={v => setForm(f => ({ ...f, incident_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>{INCIDENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Severity *</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger><SelectValue placeholder="Severity..." /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea rows={4} placeholder="Describe what happened..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
              <Button onClick={() => mutation.mutate(form)} disabled={!isValid || mutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}