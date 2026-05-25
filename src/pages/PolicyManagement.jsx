import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Edit, Trash2, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function PolicyManagement() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "general",
    description: "",
    document_url: "",
    status: "active"
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: () => base44.entities.Document.filter({ category: "policy" }, "-created_date")
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (url) => {
      setFormData({ ...formData, document_url: url });
      toast.success("File uploaded");
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (selectedPolicy) {
        return base44.entities.Document.update(selectedPolicy.id, data);
      }
      return base44.entities.Document.create({ ...data, category: "policy" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["policies"]);
      setShowDialog(false);
      setSelectedPolicy(null);
      setFormData({ title: "", category: "general", description: "", document_url: "", status: "active" });
      toast.success("Policy saved");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["policies"]);
      toast.success("Policy deleted");
    }
  });

  const handleEdit = (policy) => {
    setSelectedPolicy(policy);
    setFormData({
      title: policy.title,
      category: policy.sub_category || "general",
      description: policy.description || "",
      document_url: policy.file_url,
      status: policy.status || "active"
    });
    setShowDialog(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadMutation.mutate(file);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Policy Management"
        subtitle={`${policies.length} company policies`}
        showBack
        action={() => {
          setSelectedPolicy(null);
          setFormData({ title: "", category: "general", description: "", document_url: "", status: "active" });
          setShowDialog(true);
        }}
        actionLabel="Add Policy"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {policies.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <Card key={policy.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold mb-1">{policy.title}</h3>
                      <p className="text-sm text-slate-500">{policy.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(policy.file_url, "_blank")}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(policy)}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(policy.id)}>
                      <Trash2 className="w-4 h-4 mr-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No policies yet"
            description="Add your first company policy"
            action={() => setShowDialog(true)}
            actionLabel="Add Policy"
          />
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedPolicy ? "Edit Policy" : "Add Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Policy Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Workplace Safety Policy"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="conduct">Code of Conduct</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the policy"
              />
            </div>
            <div>
              <Label>Upload Document</Label>
              <Input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} />
              {formData.document_url && (
                <p className="text-sm text-green-600 mt-1">Document uploaded ✓</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.title || !formData.document_url}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
              >
                Save Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}