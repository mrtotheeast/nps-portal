import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Download, Trash2, Loader2, Plus, RotateCcw, Cloud, Edit } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

const CATEGORY_STYLES = {
  policy: "bg-blue-100 text-blue-700", handbook: "bg-purple-100 text-purple-700",
  form: "bg-emerald-100 text-emerald-700", training: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-700"
};

export default function DocumentAdmin() {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renamingDoc, setRenamingDoc] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [formData, setFormData] = useState({ title: "", category: "policy", description: "", visibility: "all", visible_to_roles: [] });
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: documents = [], isLoading } = useQuery({ queryKey: ["documents"], queryFn: () => base44.entities.Document.list("-created_date") });

  const { data: versions = [] } = useQuery({
    queryKey: ["document-versions", selectedDoc?.id],
    queryFn: () => base44.entities.DocumentVersion.filter({ document_id: selectedDoc.id }, "-created_date"),
    enabled: !!selectedDoc
  });

  const uploadDocument = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
    const newDoc = await base44.entities.Document.create({ ...formData, file_url, file_type: selectedFile.type, file_size: selectedFile.size, version: 1 });
    const user = await base44.auth.me();
    await base44.entities.DocumentVersion.create({ document_id: newDoc.id, version_number: 1, file_url, uploaded_by: user.id, uploaded_by_name: user.full_name, changes_summary: "Initial upload" });
    queryClient.invalidateQueries(["documents"]);
    setShowUploadDialog(false); setUploading(false); setSelectedFile(null);
    setFormData({ title: "", category: "policy", description: "", visibility: "all", visible_to_roles: [] });
    toast.success("Document uploaded");
  };

  const uploadNewVersion = async (docId, file, changesSummary) => {
    const doc = documents.find(d => d.id === docId);
    const newVersion = (doc.version || 1) + 1;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Document.update(docId, { file_url, version: newVersion });
    const user = await base44.auth.me();
    await base44.entities.DocumentVersion.create({ document_id: docId, version_number: newVersion, file_url, uploaded_by: user.id, uploaded_by_name: user.full_name, changes_summary: changesSummary || `Version ${newVersion}` });
    queryClient.invalidateQueries(["documents"]); queryClient.invalidateQueries(["document-versions"]);
  };

  const revertToVersion = useMutation({
    mutationFn: async ({ documentId, versionId }) => { const res = await base44.functions.invoke('revertDocumentVersion', { documentId, versionId }); return res.data; },
    onSuccess: () => { queryClient.invalidateQueries(["documents"]); queryClient.invalidateQueries(["document-versions"]); setShowVersionDialog(false); }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(["documents"]); setDeleteConfirmId(null); toast.success("Document deleted"); },
    onError: () => toast.error("Failed to delete document")
  });

  const renameDocumentMutation = useMutation({
    mutationFn: ({ id, title }) => base44.entities.Document.update(id, { title }),
    onSuccess: () => { queryClient.invalidateQueries(["documents"]); setRenamingDoc(null); toast.success("Document renamed"); },
    onError: () => toast.error("Failed to rename document")
  });

  const saveToDriveMutation = useMutation({
    mutationFn: async (docId) => {
      const doc = documents.find(d => d.id === docId);
      const ext = doc.file_type ? doc.file_type.split('/')[1] : 'pdf';
      const res = await base44.functions.invoke('saveToDrive', { fileUrl: doc.file_url, fileName: `${doc.title}.${ext || 'pdf'}`, folderName: 'NPS Policy Documents' });
      return res.data;
    },
    onSuccess: () => toast.success('Document saved to Google Drive'),
    onError: (e) => toast.error('Failed to save to Google Drive: ' + e.message)
  });

  const renderDocumentList = (list) => list.length > 0 ? (
    <div className="space-y-3">
      {list.map((doc) => (
        <Card key={doc.id} className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{doc.title}</p>
                    <Badge className={CATEGORY_STYLES[doc.category]}>{doc.category}</Badge>
                  </div>
                  {doc.description && <p className="text-sm text-slate-600 mb-2">{doc.description}</p>}
                  <p className="text-xs text-slate-500">{doc.view_count || 0} views</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setSelectedDoc(doc); setShowVersionDialog(true); }}>v{doc.version || 1}</Button>
                <Button variant="outline" size="sm" onClick={() => saveToDriveMutation.mutate(doc.id)} disabled={saveToDriveMutation.isPending}><Cloud className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" asChild><a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a></Button>
                <Button variant="outline" size="sm" onClick={() => { setRenamingDoc(doc); setRenameTitle(doc.title); }}><Edit className="w-4 h-4" /></Button>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirmId(doc.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  ) : <EmptyState icon={FileText} title="No documents" description="No documents in this category" />;

  if (isLoading) return <LoadingScreen />;

  const policies = documents.filter(d => d.category === "policy");
  const handbooks = documents.filter(d => d.category === "handbook");
  const forms = documents.filter(d => d.category === "form");
  const training = documents.filter(d => d.category === "training");

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Document Management" subtitle={`${documents.length} documents`} showBack currentPage="DocumentAdmin" action={() => setShowUploadDialog(true)} actionLabel="Upload Document" actionIcon={Upload} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
            <TabsTrigger value="policy">Policies ({policies.length})</TabsTrigger>
            <TabsTrigger value="handbook">Handbooks ({handbooks.length})</TabsTrigger>
            <TabsTrigger value="form">Forms ({forms.length})</TabsTrigger>
            <TabsTrigger value="training">Training ({training.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderDocumentList(documents)}</TabsContent>
          <TabsContent value="policy">{renderDocumentList(policies)}</TabsContent>
          <TabsContent value="handbook">{renderDocumentList(handbooks)}</TabsContent>
          <TabsContent value="form">{renderDocumentList(forms)}</TabsContent>
          <TabsContent value="training">{renderDocumentList(training)}</TabsContent>
        </Tabs>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-2">Delete Document?</h3>
            <p className="text-slate-600 text-sm mb-6">This will permanently delete this document and all its version history.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteDocumentMutation.mutate(deleteConfirmId)} disabled={deleteDocumentMutation.isPending}>
                {deleteDocumentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {renamingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-4">Rename Document</h3>
            <Input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value)} className="mb-4" />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setRenamingDoc(null)}>Cancel</Button>
              <Button onClick={() => renameDocumentMutation.mutate({ id: renamingDoc.id, title: renameTitle })} disabled={!renameTitle || renameDocumentMutation.isPending}>
                {renameDocumentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Add a new document to the library</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Employee Handbook 2024" /></div>
            <div>
              <Label>Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["policy","handbook","form","training","other"].map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Document description..." /></div>
            <div>
              <Label>Visibility</Label>
              <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="admins_only">Admins Only</SelectItem>
                  <SelectItem value="specific_roles">Specific Roles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.visibility === "specific_roles" && (
              <div>
                <Label>Select Roles</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {["admin","manager","supervisor","officer","employee","client"].map(role => (
                    <label key={role} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={formData.visible_to_roles?.includes(role)} onChange={(e) => {
                        const roles = formData.visible_to_roles || [];
                        setFormData({ ...formData, visible_to_roles: e.target.checked ? [...roles, role] : roles.filter(r => r !== role) });
                      }} />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div><Label>File *</Label><Input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} /></div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
              <Button onClick={uploadDocument} disabled={!formData.title || !selectedFile || uploading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Version History — {selectedDoc?.title}</DialogTitle><DialogDescription>View and manage document versions</DialogDescription></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {versions.map((version) => (
              <div key={version.id} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold">Version {version.version_number}</p>
                  <p className="text-sm text-slate-600">{version.changes_summary}</p>
                  <p className="text-xs text-slate-500 mt-1">By {version.uploaded_by_name} • {format(new Date(version.created_date), "MMM d, yyyy")}</p>
                </div>
                <div className="flex gap-2">
                  {version.version_number !== (selectedDoc?.version || 1) && (
                    <Button variant="outline" size="sm" onClick={() => { if (confirm(`Revert to version ${version.version_number}?`)) revertToVersion.mutate({ documentId: selectedDoc.id, versionId: version.id }); }} disabled={revertToVersion.isPending}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" asChild><a href={version.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t">
            <Label className="mb-2 block">Upload New Version</Label>
            <Input type="file" onChange={async (e) => {
              const file = e.target.files[0];
              if (file) { const summary = prompt("Describe changes in this version:"); await uploadNewVersion(selectedDoc.id, file, summary); setShowVersionDialog(false); }
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}