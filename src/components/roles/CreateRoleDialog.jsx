import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const TEMPLATE_OPTIONS = [
  { value: "blank", label: "Blank Template (Custom)" },
  { value: "hr", label: "Based on HR Template" },
  { value: "accounting", label: "Based on Accounting Template" },
  { value: "operations", label: "Based on Operations Template" },
  { value: "supervisor", label: "Based on Supervisor Template" },
  { value: "employee", label: "Based on Employee Template" },
  { value: "ai_custom", label: "AI-Generated Custom Role" },
];

export default function CreateRoleDialog({ open, onOpenChange, onCreated, existingWorkspaces }) {
  const [roleName, setRoleName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("blank");
  const [aiPrompt, setAiPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!roleName.trim()) { toast.error("Role name is required"); return; }
    const roleType = roleName.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (existingWorkspaces.find(w => w.role_type === roleType)) { toast.error("A role with this name already exists"); return; }
    setLoading(true);
    if (template === "blank") {
      await base44.entities.RoleWorkspace.create({
        role_type: roleType, display_name: roleName, description, department,
        color: "#c9a227", icon: "Briefcase", is_system_role: false, ai_generated: false,
        modules: [], quick_actions: [],
        permissions: { incident_reports: "hidden", scheduling: "hidden", payroll: "hidden", hr_documents: "hidden", training: "view", client_portal: "hidden", messaging: "view", equipment: "hidden", licensing: "hidden", user_management: "hidden", reports: "hidden", patrol: "hidden" }
      });
      toast.success("Blank role created! Add modules manually.");
    } else if (template !== "ai_custom") {
      await base44.functions.invoke("generateRoleWorkspace", { roleType, customPrompt: `Create a workspace similar to ${template} role but named ${roleName}. ${description}` });
      toast.success("Workspace generated!");
    } else {
      toast.success("Generating AI workspace...");
    }
    onCreated && onCreated(roleType);
    setRoleName(""); setDepartment(""); setDescription(""); setTemplate("blank"); setAiPrompt("");
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" />Create New Role</DialogTitle>
          <DialogDescription>Define a new role and generate its workspace</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div><Label>Role Name *</Label><Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="e.g. Field Coordinator" /></div>
          <div><Label>Department</Label><Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Operations" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." rows={2} /></div>
          <div>
            <Label>Workspace Template</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEMPLATE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {template === "ai_custom" && (
            <div><Label>Describe this role's responsibilities</Label><Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. This role manages field operations..." rows={3} /></div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {loading ? "Creating..." : template === "ai_custom" ? <><Sparkles className="w-4 h-4 mr-2" />AI Generate</> : <><Plus className="w-4 h-4 mr-2" />Create Role</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}