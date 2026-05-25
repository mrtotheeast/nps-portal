import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function BadgeManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState(null);
  const queryClient = useQueryClient();
  const [badgeForm, setBadgeForm] = useState({
    name: "", description: "", icon: "🏆", criteria: { type: "module_completion", threshold: 5 }, points_value: 100
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['training-badges'],
    queryFn: () => base44.entities.TrainingBadge.list()
  });

  const saveBadgeMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      if (editingBadge) return base44.entities.TrainingBadge.update(editingBadge.id, badgeForm);
      return base44.entities.TrainingBadge.create({ ...badgeForm, created_by: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-badges']);
      toast.success("Badge saved!");
      setDialogOpen(false);
      setEditingBadge(null);
      setBadgeForm({ name: "", description: "", icon: "🏆", criteria: { type: "module_completion", threshold: 5 }, points_value: 100 });
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Badge Management" subtitle="Create and manage training badges" showBack />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"><Plus className="w-4 h-4 mr-2" />Create Badge</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Training Badge</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Badge Name</Label>
                  <Input value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} placeholder="Perfect Score Champion" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input value={badgeForm.icon} onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })} placeholder="🏆" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Criteria Type</Label>
                    <Select value={badgeForm.criteria.type} onValueChange={(val) => setBadgeForm({ ...badgeForm, criteria: { ...badgeForm.criteria, type: val } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="module_completion">Module Completion</SelectItem>
                        <SelectItem value="high_score">High Score</SelectItem>
                        <SelectItem value="perfect_score">Perfect Score</SelectItem>
                        <SelectItem value="early_completion">Early Completion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Threshold</Label>
                    <Input type="number" value={badgeForm.criteria.threshold} onChange={(e) => setBadgeForm({ ...badgeForm, criteria: { ...badgeForm.criteria, threshold: parseInt(e.target.value) } })} />
                  </div>
                </div>
                <div>
                  <Label>Points Value</Label>
                  <Input type="number" value={badgeForm.points_value} onChange={(e) => setBadgeForm({ ...badgeForm, points_value: parseInt(e.target.value) })} />
                </div>
                <Button onClick={() => saveBadgeMutation.mutate()} disabled={!badgeForm.name || saveBadgeMutation.isLoading} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">Save Badge</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {badges.map(badge => (
            <Card key={badge.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{badge.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg">{badge.name}</h3>
                    <p className="text-sm text-slate-600">{badge.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{badge.criteria.type.replace(/_/g, ' ')}</Badge>
                      <Badge className="bg-[#c9a227]">{badge.points_value} points</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}