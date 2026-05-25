import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, Trash2, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TemplateManager({ userId, onApply }) {
  const queryClient = useQueryClient();
  const [showSave, setShowSave] = useState(false);
  const [showPick, setShowPick] = useState(false);
  const [form, setForm] = useState({ name: "", clock_in_time: "08:00", clock_out_time: "16:00", days_of_week: [1, 2, 3, 4, 5] });

  const { data: templates = [] } = useQuery({
    queryKey: ["ts-templates", userId],
    queryFn: () => base44.entities.TimesheetTemplate.filter({ employee_id: userId }),
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.TimesheetTemplate.create({ ...data, employee_id: userId, typical_hours: calcHours(data.clock_in_time, data.clock_out_time) }),
    onSuccess: () => { queryClient.invalidateQueries(["ts-templates"]); setShowSave(false); toast.success("Template saved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimesheetTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["ts-templates"]),
  });

  function calcHours(inT, outT) {
    const [ih, im] = inT.split(":").map(Number);
    const [oh, om] = outT.split(":").map(Number);
    return Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 100) / 100;
  }

  function toggleDay(d) {
    setForm(f => ({ ...f, days_of_week: f.days_of_week.includes(d) ? f.days_of_week.filter(x => x !== d) : [...f.days_of_week, d] }));
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap mb-3">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowPick(true)}>
          <Clock className="w-3.5 h-3.5" /> Load Template
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowSave(true)}>
          <BookmarkPlus className="w-3.5 h-3.5" /> Save as Template
        </Button>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSave} onOpenChange={setShowSave}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Save Schedule Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Weekday 8-4" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Clock-In</Label>
                <Input type="time" value={form.clock_in_time} onChange={e => setForm(f => ({ ...f, clock_in_time: e.target.value }))} />
              </div>
              <div>
                <Label>Clock-Out</Label>
                <Input type="time" value={form.clock_out_time} onChange={e => setForm(f => ({ ...f, clock_out_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Applies to Days</Label>
              <div className="flex gap-1 mt-1 flex-wrap">
                {DAYS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.days_of_week.includes(i) ? "bg-[#1a2b4a] text-white border-[#1a2b4a]" : "bg-white text-slate-600 border-slate-300"}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500">Estimated hours: <strong>{calcHours(form.clock_in_time, form.clock_out_time)} hrs</strong></p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowSave(false)}>Cancel</Button>
              <Button disabled={!form.name.trim() || saveMutation.isPending} onClick={() => saveMutation.mutate(form)} className="bg-[#1a2b4a]">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pick Dialog */}
      <Dialog open={showPick} onOpenChange={setShowPick}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Load a Template</DialogTitle></DialogHeader>
          {templates.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No saved templates yet. Save one first.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {templates.map(t => (
                <Card key={t.id} className="cursor-pointer hover:border-[#c9a227] transition-colors" onClick={() => { onApply(t); setShowPick(false); toast.success(`Loaded "${t.name}"`); }}>
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.clock_in_time} → {t.clock_out_time} · {t.typical_hours} hrs</p>
                      {t.days_of_week?.length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{t.days_of_week.map(d => DAYS[d]).join(", ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-[#c9a227]" />
                      <button type="button" onClick={e => { e.stopPropagation(); deleteMutation.mutate(t.id); }} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}