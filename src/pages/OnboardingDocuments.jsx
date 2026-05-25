import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FileText, Upload, Download, Send, CheckCircle, Clock, Search,
  Plus, Edit, Archive, Users, ChevronDown, Pen, BookOpen, X, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { format } from "date-fns";

const DOC_TYPES = ["Policy Document", "Agreement", "Handbook", "Form", "Certificate", "Other"];
const ROLE_OPTIONS = [
  { value: "all", label: "All Employees" },
  { value: "officer", label: "Officers Only" },
  { value: "employee", label: "Office Staff Only" },
  { value: "supervisor", label: "Supervisors Only" },
  { value: "manager", label: "Managers Only" },
  { value: "admin", label: "Admins Only" },
];

function DocTypeBadge({ type, requiresSignature }) {
  if (requiresSignature) return <Badge className="bg-purple-100 text-purple-700"><Pen className="w-3 h-3 mr-1" />Requires Signature</Badge>;
  return <Badge className="bg-blue-100 text-blue-700"><BookOpen className="w-3 h-3 mr-1" />Read Only</Badge>;
}

export default function OnboardingDocuments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const dropRef = useRef(null);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [bulkRoleFilter, setBulkRoleFilter] = useState("all");
  const [assigningBulk, setAssigningBulk] = useState(false);

  const emptyForm = {
    title: "", document_type: "Policy Document", document_url: "",
    requires_signature: false, required_for: [], effective_date: "",
    version: 1, is_active: true,
  };
  const [formData, setFormData] = useState(emptyForm);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => base44.entities.OnboardingDocument.list(),
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-docs"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
    staleTime: 120000,
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ["acknowledgments"],
    queryFn: () => base44.entities.DocumentAcknowledgment.list(),
    staleTime: 60000,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingDoc
      ? base44.entities.OnboardingDocument.update(editingDoc.id, data)
      : base44.entities.OnboardingDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["onboarding-documents"]);
      toast.success(editingDoc ? "Document updated" : "Document added to library");
      setShowDialog(false);
      setEditingDoc(null);
      setFormData(emptyForm);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingDocument.update(id, { is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries(["onboarding-documents"]); toast.success("Document archived"); },
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, document_url: file_url }));
      if (!formData.title) setFormData(prev => ({ ...prev, title: file.name.replace(/\.[^.]+$/, "") }));
      toast.success("File uploaded");
    } catch { toast.error("Failed to upload file"); }
    finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const openAdd = () => { setEditingDoc(null); setFormData(emptyForm); setShowDialog(true); };
  const openEdit = (doc) => {
    setEditingDoc(doc);
    setFormData({
      title: doc.title || "", document_type: doc.document_type || "Policy Document",
      document_url: doc.document_url || "", requires_signature: doc.requires_signature || false,
      required_for: doc.required_for || [], effective_date: doc.effective_date || "",
      version: doc.version || 1, is_active: doc.is_active !== false,
    });
    setShowDialog(true);
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      required_for: prev.required_for.includes(role)
        ? prev.required_for.filter(r => r !== role)
        : [...prev.required_for, role],
    }));
  };

  const handleSave = () => {
    if (!formData.title.trim() || !formData.document_url) {
      toast.error("Document name and file are required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const getAssignedCount = (docId) =>
    acknowledgments.filter(a => a.document_id === docId).length;

  const handleBulkAssign = async () => {
    if (selectedDocIds.length === 0) { toast.error("Select at least one document"); return; }
    setAssigningBulk(true);
    const targetEmployees = bulkRoleFilter === "all"
      ? employees
      : employees.filter(e => e.role === bulkRoleFilter);
    let count = 0;
    for (const emp of targetEmployees) {
      for (const docId of selectedDocIds) {
        const already = acknowledgments.find(a => a.document_id === docId && a.user_id === emp.id);
        if (!already) {
          await base44.entities.DocumentAcknowledgment.create({
            document_id: docId, user_id: emp.id,
            acknowledged_at: null, document_version: 1,
          });
          count++;
        }
      }
    }
    await base44.functions.invoke("sendBulkNotifications", {
      employee_ids: targetEmployees.map(e => e.id),
      title: "New Onboarding Documents Assigned",
      message: `${selectedDocIds.length} new onboarding document(s) have been assigned to you. Please complete them in your portal.`,
    }).catch(() => {});
    queryClient.invalidateQueries(["acknowledgments"]);
    setAssigningBulk(false);
    setShowBulkAssign(false);
    setSelectedDocIds([]);
    toast.success(`Assigned ${selectedDocIds.length} documents to ${targetEmployees.length} employees (${count} new assignments)`);
  };

  const filtered = documents.filter(d =>
    d.is_active !== false &&
    (!search || d.title?.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Onboarding Documents"
        subtitle={`${documents.filter(d => d.is_active !== false).length} active documents`}
        action={openAdd}
        actionLabel="Upload Document"
        actionIcon={Upload}
      />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Search + Bulk Assign */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" onClick={() => setShowBulkAssign(true)} className="gap-2">
            <Users className="w-4 h-4" /> Bulk Assign
          </Button>
        </div>

        <Tabs defaultValue="library">
          <TabsList>
            <TabsTrigger value="library">Document Library</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          </TabsList>

          {/* LIBRARY TAB */}
          <TabsContent value="library" className="mt-4 space-y-3">
            {/* Drop Zone */}
            <div
              ref={dropRef}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={openAdd}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
                ${dragging ? "border-[#c9a227] bg-[#c9a227]/5" : "border-slate-300 hover:border-[#1a2b4a] hover:bg-slate-50"}`}
            >
              <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-600">Drag & drop files here or <span className="text-[#1a2b4a] font-semibold">click to upload</span></p>
              <p className="text-xs text-slate-400 mt-1">PDF, Word, Images supported</p>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No documents in library yet</p>
              </div>
            )}

            {/* Document Table */}
            {filtered.length > 0 && (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Document</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Type</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Signature</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Roles</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Ver.</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Assigned</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="font-medium">{doc.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-slate-600">{doc.document_type || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <DocTypeBadge requiresSignature={doc.requires_signature} />
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(doc.required_for || []).map(r => (
                                <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-slate-500">v{doc.version || 1}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold">{getAssignedCount(doc.id)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {doc.document_url && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(doc.document_url, "_blank")}>
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(doc)}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"
                                onClick={() => archiveMutation.mutate(doc.id)}>
                                <Archive className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* COMPLIANCE TAB */}
          <TabsContent value="compliance" className="mt-4 space-y-4">
            {documents.filter(d => d.is_active !== false).map(doc => {
              const docAcks = acknowledgments.filter(a => a.document_id === doc.id && a.acknowledged_at);
              const assigned = acknowledgments.filter(a => a.document_id === doc.id).length;
              const completed = docAcks.length;
              const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
              return (
                <Card key={doc.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-500" />
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <DocTypeBadge requiresSignature={doc.requires_signature} />
                      </div>
                      <Badge className={pct === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {completed}/{assigned} complete
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                      <div className="bg-[#c9a227] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {acknowledgments.filter(a => a.document_id === doc.id).map(ack => {
                        const emp = employees.find(e => e.id === ack.user_id);
                        const name = emp ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim() : ack.user_id;
                        return (
                          <div key={ack.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-slate-50">
                            <span className="font-medium">{name}</span>
                            {ack.acknowledged_at ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                {format(new Date(ack.acknowledged_at), "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-600">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {assigned === 0 && <p className="text-xs text-slate-400 py-2">Not yet assigned to any employees.</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Edit Document Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingDoc(null); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Document" : "Upload Onboarding Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Document Name *</Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Employee Handbook, Confidentiality Agreement" />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={formData.document_type} onValueChange={v => setFormData(p => ({ ...p, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload File *</Label>
              <div className="mt-1 flex items-center gap-3">
                <label className="cursor-pointer flex-1">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-[#1a2b4a] transition-colors">
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                      </div>
                    ) : formData.document_url ? (
                      <span className="text-emerald-600 text-sm flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> File uploaded
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">Click to select PDF, Word, or image</span>
                    )}
                  </div>
                  <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" className="hidden"
                    onChange={e => handleFileUpload(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={formData.effective_date} onChange={e => setFormData(p => ({ ...p, effective_date: e.target.value }))} />
              </div>
              <div>
                <Label>Version</Label>
                <Input type="number" min="1" value={formData.version} onChange={e => setFormData(p => ({ ...p, version: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Applicable Roles</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ROLE_OPTIONS.map(r => (
                  <div key={r.value} className="flex items-center gap-2">
                    <Checkbox checked={formData.required_for.includes(r.value)} onCheckedChange={() => toggleRole(r.value)} />
                    <label className="text-sm cursor-pointer">{r.label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Signature Requirement</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, requires_signature: false }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${!formData.requires_signature ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <BookOpen className="w-4 h-4" /> Read Only
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, requires_signature: true }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${formData.requires_signature ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  <Pen className="w-4 h-4" /> Requires Signature
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || uploading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
              {saveMutation.isPending ? "Saving…" : editingDoc ? "Save Changes" : "Add to Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={showBulkAssign} onOpenChange={setShowBulkAssign}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bulk Assign Documents</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-2 block">Select Documents</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {documents.filter(d => d.is_active !== false).map(doc => (
                  <div key={doc.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedDocIds.includes(doc.id)}
                      onCheckedChange={checked => setSelectedDocIds(prev =>
                        checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id)
                      )}
                    />
                    <span className="text-sm">{doc.title}</span>
                    <DocTypeBadge requiresSignature={doc.requires_signature} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Filter Employees by Role</Label>
              <Select value={bulkRoleFilter} onValueChange={setBulkRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {bulkRoleFilter === "all" ? employees.length : employees.filter(e => e.role === bulkRoleFilter).length} employees will be assigned
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={assigningBulk || selectedDocIds.length === 0} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {assigningBulk ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Assigning…</> : "Assign Documents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}