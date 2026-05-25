import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Download, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function TaxForms() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    form_type: "W2",
    year: new Date().getFullYear(),
    file_url: ""
  });

  const { data: taxForms = [], isLoading } = useQuery({
    queryKey: ["tax-forms"],
    queryFn: () => base44.entities.Document.filter({ category: "tax_form" }, "-created_date")
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (url) => {
      setFormData({ ...formData, file_url: url });
      toast.success("File uploaded");
    }
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const emp = employees.find(e => e.id === data.employee_id);
      return base44.entities.Document.create({
        category: "tax_form",
        title: `${data.form_type} - ${emp?.firstName} ${emp?.lastName} - ${data.year}`,
        sub_category: data.form_type,
        file_url: data.file_url,
        metadata: {
          employee_id: data.employee_id,
          year: data.year,
          form_type: data.form_type
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-forms"]);
      setShowDialog(false);
      setFormData({ employee_id: "", form_type: "W2", year: new Date().getFullYear(), file_url: "" });
      toast.success("Tax form saved");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["tax-forms"]);
      toast.success("Tax form deleted");
    }
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) uploadMutation.mutate(file);
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Tax Forms"
        subtitle={`${taxForms.length} forms on file`}
        showBack
        action={() => {
          setFormData({ employee_id: "", form_type: "W2", year: new Date().getFullYear(), file_url: "" });
          setShowDialog(true);
        }}
        actionLabel="Upload Form"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {taxForms.length > 0 ? (
          <div className="space-y-3">
            {taxForms.map((form) => (
              <Card key={form.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{form.title}</h3>
                        <p className="text-sm text-slate-500">
                          {form.sub_category} • {form.metadata?.year}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.open(form.file_url, "_blank")}>
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(form.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No tax forms"
            description="Upload employee tax forms"
            action={() => setShowDialog(true)}
            actionLabel="Upload Form"
          />
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Tax Form</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Employee</Label>
              <Select value={formData.employee_id} onValueChange={(v) => setFormData({ ...formData, employee_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Form Type</Label>
              <Select value={formData.form_type} onValueChange={(v) => setFormData({ ...formData, form_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="W2">W-2</SelectItem>
                  <SelectItem value="1099">1099</SelectItem>
                  <SelectItem value="W4">W-4</SelectItem>
                  <SelectItem value="I9">I-9</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tax Year</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                placeholder="2024"
              />
            </div>
            <div>
              <Label>Upload File</Label>
              <Input type="file" accept=".pdf" onChange={handleFileUpload} />
              {formData.file_url && (
                <p className="text-sm text-green-600 mt-1">File uploaded ✓</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.employee_id || !formData.file_url}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}