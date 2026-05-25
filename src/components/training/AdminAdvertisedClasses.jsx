import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Calendar, Clock, MapPin, Users, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ACUITY_DEFAULT = "https://nationwidepoliceservicesllc.as.me/schedule/549dc3bd";
const emptyForm = { course_name: "", description: "", date: "", time: "", location: "", instructor_name: "", max_seats: "", enrolled_count: 0, registration_link: ACUITY_DEFAULT, cost: "", is_active: true };

export default function AdminAdvertisedClasses() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: classes = [], isLoading } = useQuery({ queryKey: ["advertised-training-classes-admin"], queryFn: () => base44.entities.AdvertisedTrainingClass.list("-date") });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, max_seats: data.max_seats ? parseInt(data.max_seats) : null, enrolled_count: parseInt(data.enrolled_count) || 0 };
      return editing ? base44.entities.AdvertisedTrainingClass.update(editing.id, payload) : base44.entities.AdvertisedTrainingClass.create(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries(["advertised-training-classes-admin"]); queryClient.invalidateQueries(["advertised-training-classes"]); toast.success(editing ? "Class updated!" : "Class added!"); setShowDialog(false); setEditing(null); setForm(emptyForm); },
    onError: () => toast.error("Failed to save class"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AdvertisedTrainingClass.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["advertised-training-classes-admin"]); queryClient.invalidateQueries(["advertised-training-classes"]); toast.success("Class removed."); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.AdvertisedTrainingClass.update(id, { is_active }),
    onSuccess: () => { queryClient.invalidateQueries(["advertised-training-classes-admin"]); queryClient.invalidateQueries(["advertised-training-classes"]); },
  });

  const openEdit = (cls) => { setEditing(cls); setForm({ ...emptyForm, ...cls, max_seats: cls.max_seats ?? "" }); setShowDialog(true); };
  const openNew = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h3 className="font-bold text-[#1a2b4a] text-base">Advertised Training Classes</h3><p className="text-xs text-slate-500">Manage upcoming classes shown to employees</p></div>
        <Button onClick={openNew} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold" size="sm"><Plus className="w-4 h-4 mr-1" />Add Class</Button>
      </div>

      {isLoading ? <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div> : classes.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 text-sm">No advertised classes yet.</p>
          <Button onClick={openNew} variant="outline" size="sm" className="mt-3"><Plus className="w-4 h-4 mr-1" />Add First Class</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map(cls => (
            <Card key={cls.id} className={`border-l-4 ${cls.is_active ? "border-l-emerald-400" : "border-l-slate-300"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-[#1a2b4a]">{cls.course_name}</p>
                      <Badge className={cls.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>{cls.is_active ? "Active" : "Hidden"}</Badge>
                      {cls.cost && <Badge variant="outline">{cls.cost}</Badge>}
                    </div>
                    {cls.description && <p className="text-xs text-slate-500 mb-2 line-clamp-1">{cls.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{cls.date ? format(new Date(cls.date), "MMM d, yyyy") : "No date"}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{cls.time || "—"}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.location || "—"}</span>
                      {cls.max_seats && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.enrolled_count || 0}/{cls.max_seats} seats</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={!!cls.is_active} onCheckedChange={checked => toggleMutation.mutate({ id: cls.id, is_active: checked })} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cls)}><Pencil className="w-3.5 h-3.5 text-slate-500" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-red-600" onClick={() => { if (confirm("Remove this class listing?")) deleteMutation.mutate(cls.id); }}><Trash2 className="w-3.5 h-3.5 text-slate-400" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={open => { if (!open) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Training Class" : "Add Training Class"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Course Name *</Label><Input className="mt-1" value={form.course_name} onChange={e => set("course_name", e.target.value)} placeholder="e.g. Security Guard Entry Level" /></div>
            <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={form.description} onChange={e => set("description", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" className="mt-1" value={form.date} onChange={e => set("date", e.target.value)} /></div>
              <div><Label>Time *</Label><Input className="mt-1" value={form.time} onChange={e => set("time", e.target.value)} placeholder="9:00 AM – 5:00 PM" /></div>
            </div>
            <div><Label>Location *</Label><Input className="mt-1" value={form.location} onChange={e => set("location", e.target.value)} placeholder="Address or Online" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Instructor Name</Label><Input className="mt-1" value={form.instructor_name} onChange={e => set("instructor_name", e.target.value)} /></div>
              <div><Label>Cost</Label><Input className="mt-1" value={form.cost} onChange={e => set("cost", e.target.value)} placeholder="Free / $150" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Seats</Label><Input type="number" className="mt-1" value={form.max_seats} onChange={e => set("max_seats", e.target.value)} /></div>
              <div><Label>Enrolled Count</Label><Input type="number" className="mt-1" value={form.enrolled_count} onChange={e => set("enrolled_count", e.target.value)} /></div>
            </div>
            <div><Label>Registration Link</Label><Input className="mt-1" value={form.registration_link} onChange={e => set("registration_link", e.target.value)} /><p className="text-xs text-slate-400 mt-1">Defaults to the NPS Acuity page.</p></div>
            <div className="flex items-center gap-3"><Switch checked={!!form.is_active} onCheckedChange={v => set("is_active", v)} /><Label>{form.is_active ? "Active — visible to employees" : "Hidden from employees"}</Label></div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDialog(false); setEditing(null); }}>Cancel</Button>
              <Button className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold" onClick={() => saveMutation.mutate(form)} disabled={!form.course_name || !form.date || !form.time || !form.location || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{editing ? "Save Changes" : "Add Class"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}