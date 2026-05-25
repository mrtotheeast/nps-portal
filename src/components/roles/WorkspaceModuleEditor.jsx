import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Lock, Unlock, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

const MODULE_TYPES = ["dashboard", "module", "ai_tool", "document", "report", "quick_action"];
const MODULE_TYPE_COLORS = { dashboard: "bg-blue-100 text-blue-700", module: "bg-slate-100 text-slate-600", ai_tool: "bg-purple-100 text-purple-700", document: "bg-amber-100 text-amber-700", report: "bg-green-100 text-green-700", quick_action: "bg-teal-100 text-teal-700" };
const AVAILABLE_PAGES = ["AdminDashboard","Scheduling","Reports","IncidentReports","TrainingManagement","TimesheetsManagement","EmployeeDirectory","SiteManagement","ClientManagement","LiveMap","Chat","Announcements","Documents","Payroll","Credentials","PTOApproval","PatrolReview","PerformanceReviewList","InvoicesAdmin","PayrollExport","PolicyManagement","OnboardingDocuments","DocumentAdmin","MyTrainings","Schedule","Timesheet","PTORequest","CredentialsManagement"];

export default function WorkspaceModuleEditor({ workspace, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [modules, setModules] = useState([...(workspace?.modules || [])].sort((a, b) => (a.position || 0) - (b.position || 0)));
  const [showAddForm, setShowAddForm] = useState(false);
  const [newModule, setNewModule] = useState({ title: "", type: "module", description: "", page_link: "", icon: "FileText" });

  const saveMutation = useMutation({
    mutationFn: (mods) => base44.entities.RoleWorkspace.update(workspace.id, { modules: mods }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["role-workspaces"] }); toast.success("Modules saved"); onOpenChange(false); }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(modules);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setModules(items.map((m, i) => ({ ...m, position: i + 1 })));
  };

  const addModule = () => {
    if (!newModule.title.trim()) { toast.error("Title is required"); return; }
    setModules(prev => [...prev, { ...newModule, id: `custom_${Date.now()}`, position: prev.length + 1, is_locked: false }]);
    setNewModule({ title: "", type: "module", description: "", page_link: "", icon: "FileText" });
    setShowAddForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit Modules — {workspace?.display_name}</DialogTitle></DialogHeader>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="modules">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {modules.map((mod, index) => (
                  <Draggable key={mod.id} draggableId={mod.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className={`flex items-center gap-3 p-3 rounded-lg border bg-white ${snapshot.isDragging ? "shadow-lg" : ""}`}>
                        <div {...provided.dragHandleProps} className="cursor-grab text-slate-300 hover:text-slate-500"><GripVertical className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{mod.title}</span>
                            <Badge className={`text-xs ${MODULE_TYPE_COLORS[mod.type] || "bg-slate-100"}`}>{mod.type?.replace("_", " ")}</Badge>
                            {mod.is_locked && <Badge className="bg-red-100 text-red-600 text-xs">Locked</Badge>}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{mod.description}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-slate-400" onClick={() => setModules(mods => mods.map(m => m.id === mod.id ? { ...m, is_locked: !m.is_locked } : m))}>
                            {mod.is_locked ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Unlock className="w-3.5 h-3.5" />}
                          </Button>
                          {!mod.is_locked && <Button size="icon" variant="ghost" className="w-7 h-7 text-slate-400 hover:text-red-500" onClick={() => setModules(mods => mods.filter(m => m.id !== mod.id))}><Trash2 className="w-3.5 h-3.5" /></Button>}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {showAddForm ? (
          <div className="border rounded-lg p-4 space-y-3 mt-3 bg-slate-50">
            <p className="font-medium text-sm">New Module</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Title *</Label><Input value={newModule.title} onChange={e => setNewModule(p => ({ ...p, title: e.target.value }))} placeholder="Module name" className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Type</Label><Select value={newModule.type} onValueChange={v => setNewModule(p => ({ ...p, type: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{MODULE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2"><Label className="text-xs">Description</Label><Input value={newModule.description} onChange={e => setNewModule(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Page Link</Label><Select value={newModule.page_link} onValueChange={v => setNewModule(p => ({ ...p, page_link: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select page" /></SelectTrigger><SelectContent>{AVAILABLE_PAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs">Icon (lucide name)</Label><Input value={newModule.icon} onChange={e => setNewModule(p => ({ ...p, icon: e.target.value }))} placeholder="e.g. FileText" className="h-8 text-sm" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addModule} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"><Plus className="w-3.5 h-3.5 mr-1" />Add</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}><X className="w-3.5 h-3.5 mr-1" />Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowAddForm(true)}><Plus className="w-4 h-4 mr-2" />Add Module</Button>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate(modules)} disabled={saveMutation.isPending} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white">
            <Save className="w-4 h-4 mr-2" />{saveMutation.isPending ? "Saving..." : "Save Modules"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}