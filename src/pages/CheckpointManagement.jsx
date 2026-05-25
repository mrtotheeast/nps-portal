import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapPin, Plus, QrCode, Camera, Trash2, Edit, Download, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function CheckpointManagement() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const siteId = searchParams.get("siteId");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState(null);
  const [formData, setFormData] = useState({ name: "", description: "", sequence_order: 1, requires_photo: false });

  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: async () => { const sites = await base44.entities.Site.filter({ id: siteId }); return sites[0]; },
    enabled: !!siteId
  });

  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery({
    queryKey: ["checkpoints", siteId],
    queryFn: () => base44.entities.Checkpoint.filter({ site_id: siteId }),
    enabled: !!siteId
  });

  const createMutation = useMutation({
    mutationFn: async (data) => base44.entities.Checkpoint.create({ ...data, site_id: siteId, qr_code_data: `SITE:${siteId}|CP:${Date.now()}` }),
    onSuccess: () => { queryClient.invalidateQueries(["checkpoints"]); toast.success("Checkpoint created"); resetForm(); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Checkpoint.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(["checkpoints"]); toast.success("Checkpoint updated"); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Checkpoint.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["checkpoints"]); toast.success("Checkpoint deleted"); }
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", sequence_order: checkpoints.length + 1, requires_photo: false });
    setEditingCheckpoint(null);
    setDialogOpen(false);
  };

  const handleSubmit = () => {
    if (editingCheckpoint) { updateMutation.mutate({ id: editingCheckpoint.id, data: formData }); }
    else { createMutation.mutate(formData); }
  };

  const handleEdit = (checkpoint) => {
    setEditingCheckpoint(checkpoint);
    setFormData({ name: checkpoint.name, description: checkpoint.description || "", sequence_order: checkpoint.sequence_order, requires_photo: checkpoint.requires_photo });
    setDialogOpen(true);
  };

  if (!siteId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card><CardContent className="pt-6"><p>No site selected. Please select a site first.</p><Button onClick={() => navigate("/sites")} className="mt-4">Go to Sites</Button></CardContent></Card>
      </div>
    );
  }

  if (siteLoading || checkpointsLoading) return <LoadingScreen />;

  const sortedCheckpoints = [...checkpoints].sort((a, b) => a.sequence_order - b.sequence_order);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Checkpoint Management" subtitle={`${site?.name || "Site"} - ${checkpoints.length} checkpoints`} showBack action={() => setDialogOpen(true)} actionLabel="Add Checkpoint" actionIcon={Plus} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {sortedCheckpoints.map((checkpoint) => (
            <Card key={checkpoint.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#c9a227]/10 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#c9a227]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{checkpoint.name}</CardTitle>
                        <Badge variant="outline">#{checkpoint.sequence_order}</Badge>
                      </div>
                      {checkpoint.description && <p className="text-sm text-slate-600 mt-1">{checkpoint.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(checkpoint)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this checkpoint?")) { deleteMutation.mutate(checkpoint.id); } }}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-sm text-slate-600">
                    {checkpoint.requires_photo && <div className="flex items-center gap-1"><Camera className="w-4 h-4" />Photo required</div>}
                    <div className="flex items-center gap-1"><QrCode className="w-4 h-4" />Scanned {checkpoint.scan_count || 0} times</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm"><QrCode className="w-4 h-4 mr-2" />View QR</Button>
                    <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Download</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {checkpoints.length === 0 && (
            <Card className="p-12 text-center">
              <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No checkpoints yet</h3>
              <p className="text-slate-600 mb-4">Add your first checkpoint to start tracking patrols</p>
              <Button onClick={() => setDialogOpen(true)} className="bg-[#c9a227] hover:bg-[#b8922a]"><Plus className="w-4 h-4 mr-2" />Add Checkpoint</Button>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCheckpoint ? "Edit Checkpoint" : "Add Checkpoint"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Checkpoint Name *</Label><Input placeholder="e.g., Main Entrance" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea placeholder="Location details..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} /></div>
            <div><Label>Sequence Order</Label><Input type="number" min="1" value={formData.sequence_order} onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) })} /></div>
            <div className="flex items-center justify-between"><Label>Require Photo at Scan</Label><Switch checked={formData.requires_photo} onCheckedChange={(checked) => setFormData({ ...formData, requires_photo: checked })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formData.name} className="bg-[#c9a227] hover:bg-[#b8922a]">{editingCheckpoint ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}