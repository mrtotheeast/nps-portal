import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Upload, Download, CheckCircle, Clock, Search,
  Plus, Edit, Archive, Users, Pen, BookOpen, X, Loader2,
  BarChart3, User, Circle, AlertCircle
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
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const DOC_TYPES = ["Policy Document", "Agreement", "Handbook", "Form", "Certificate", "Other"];
const ROLE_OPTIONS = [
  { value: "all", label: "All Employees" },
  { value: "officer", label: "Officers Only" },
  { value: "employee", label: "Office Staff Only" },
  { value: "supervisor", label: "Supervisors Only" },
  { value: "manager", label: "Managers Only" },
  { value: "admin", label: "Admins Only" },
];

function DocTypeBadge({ requiresSignature }) {
  if (requiresSignature) return <Badge className="bg-purple-100 text-purple-700"><Pen className="w-3 h-3 mr-1" />Signature</Badge>;
  return <Badge className="bg-blue-100 text-blue-700"><BookOpen className="w-3 h-3 mr-1" />Read Only</Badge>;
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function OverviewTab({ employees, documents, acknowledgments }) {
  const [search, setSearch] = useState("");

  const activeDocIds = new Set(documents.filter(d => d.is_active !== false).map(d => d.id));
  const activeDocs = documents.filter(d => d.is_active !== false);

  const employeeProgress = employees.map(emp => {
    const empAcks = acknowledgments.filter(a => a.user_id === emp.id && activeDocIds.has(a.document_id));
    const completed = empAcks.filter(a => a.acknowledged_at).length;
    const assigned = empAcks.length;
    const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
    return { ...emp, completed, assigned, pct };
  });

  const filtered = employeeProgress.filter(e => {
    if (!search) return true;
    const name = `${e.firstName || ""} ${e.lastName || ""}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const totalComplete = employeeProgress.filter(e => e.assigned > 0 && e.pct === 100).length;
  const totalInProgress = employeeProgress.filter(e => e.assigned > 0 && e.pct > 0 && e.pct < 100).length;
  const totalPending = employeeProgress.filter(e => e.assigned > 0 && e.pct === 0).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{activeDocs.length}</p>
            <p className="text-xs text-slate-500 mt-1">Active Documents</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalComplete}</p>
            <p className="text-xs text-slate-500 mt-1">Fully Compliant</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{totalInProgress}</p>
            <p className="text-xs text-slate-500 mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{totalPending}</p>
            <p className="text-xs text-slate-500 mt-1">Not Started</p>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-slate-100">
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No employees found</p>
            </div>
          )}
          {filtered.map(emp => (
            <div key={emp.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
              <div className="w-9 h-9 rounded-full bg-[#1a2b4a] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(emp.firstName?.[0] || "") + (emp.lastName?.[0] || "")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900">{emp.firstName} {emp.lastName}</p>
                <p className="text-xs text-slate-500">{emp.positionTitle || emp.role || "—"}</p>
              </div>
              <div className="text-right flex-shrink-0 min-w-[100px]">
                {emp.assigned === 0 ? (
                  <span className="text-xs text-slate-400">No docs assigned</span>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={emp.pct} className="h-1.5 w-20" />
                      <span className="text-xs font-medium text-slate-700">{emp.pct}%</span>
                    </div>
                    <p className="text-xs text-slate-500">{emp.completed}/{emp.assigned} complete</p>
                  </>
                )}
              </div>
              <div className="flex-shrink-0">
                {emp.assigned === 0 ? null : emp.pct === 100 ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : emp.pct > 0 ? (
                  <Clock className="w-5 h-5 text-amber-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
function DocumentsTab({ documents, employees, acknowledgments, queryClient }) {
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
  const [activeSubTab, setActiveSubTab] = useState("library");

  const emptyForm = {
    title: "", document_type: "Policy Document", document_url: "",
    requires_signature: false, required_for: [], effective_date: "",
    version: 1, is_active: true,
  };
  const [formData, setFormData] = useState(emptyForm);

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

  const getAssignedCount = (docId) => acknowledgments.filter(a => a.document_id === docId).length;

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
      message: `${selectedDocIds.length} new onboarding document(s) have been assigned to you.`,
    }).catch(() => {});
    queryClient.invalidateQueries(["onboarding-acks"]);
    setAssigningBulk(false);
    setShowBulkAssign(false);
    setSelectedDocIds([]);
    toast.success(`Assigned ${selectedDocIds.length} docs to ${targetEmployees.length} employees (${count} new)`);
  };

  const filtered = documents.filter(d =>
    d.is_active !== false &&
    (!search || d.title?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => setShowBulkAssign(true)} className="gap-2">
          <Users className="w-4 h-4" /> Bulk Assign
        </Button>
        <Button onClick={openAdd} className="gap-2 bg-[#1a2b4a] hover:bg-[#2d4a6f]">
          <Upload className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {["library", "compliance"].map(t => (
          <button key={t} onClick={() => setActiveSubTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeSubTab === t ? "border-[#c9a227] text-[#1a2b4a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "library" ? "Document Library" : "Compliance Status"}
          </button>
        ))}
      </div>

      {activeSubTab === "library" && (
        <>
          <div
            ref={dropRef}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) { openAdd(); } }}
            onClick={openAdd}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
              ${dragging ? "border-[#c9a227] bg-[#c9a227]/5" : "border-slate-300 hover:border-[#1a2b4a] hover:bg-slate-50"}`}
          >
            <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">Drag & drop or <span className="text-[#1a2b4a] font-semibold">click to upload</span></p>
            <p className="text-xs text-slate-400 mt-1">PDF, Word, Images supported</p>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No documents in library yet</p>
            </div>
          ) : (
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
                        <td className="px-4 py-3 hidden md:table-cell text-slate-600">{doc.document_type || "—"}</td>
                        <td className="px-4 py-3"><DocTypeBadge requiresSignature={doc.requires_signature} /></td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {(doc.required_for || []).map(r => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-500">v{doc.version || 1}</td>
                        <td className="px-4 py-3 font-semibold">{getAssignedCount(doc.id)}</td>
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
        </>
      )}

      {activeSubTab === "compliance" && (
        <div className="space-y-4">
          {documents.filter(d => d.is_active !== false).map(doc => {
            const docAcks = acknowledgments.filter(a => a.document_id === doc.id && a.acknowledged_at);
            const assigned = acknowledgments.filter(a => a.document_id === doc.id).length;
            const completed = docAcks.length;
            const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
            return (
              <Card key={doc.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
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
                            <span className="flex items-center gap-1 text-emerald-600 text-xs">
                              <CheckCircle className="w-3 h-3" />{format(new Date(ack.acknowledged_at), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 text-xs">
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
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingDoc(null); setFormData(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Edit Document" : "Upload Onboarding Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Document Name *</Label>
              <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Employee Handbook" />
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={formData.document_type} onValueChange={v => setFormData(p => ({ ...p, document_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload File *</Label>
              <label className="cursor-pointer block mt-1">
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
                <button type="button" onClick={() => setFormData(p => ({ ...p, requires_signature: false }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${!formData.requires_signature ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <BookOpen className="w-4 h-4" /> Read Only
                </button>
                <button type="button" onClick={() => setFormData(p => ({ ...p, requires_signature: true }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-colors
                    ${formData.requires_signature ? "bg-purple-600 text-white border-purple-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
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
                <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
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

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
function TasksTab({ employees, acknowledgments, documents, queryClient }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAssignDialog, setShowAssignDialog] = useState(null); // task object
  const [assignRoleFilter, setAssignRoleFilter] = useState("all");
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch] = useState("");

  const emptyTask = { title: "", description: "", category: "General", required: true };
  const [taskForm, setTaskForm] = useState(emptyTask);

  // We'll use OnboardingDocument with document_type = "Task" as a lightweight task store
  const tasks = documents.filter(d => d.document_type === "Task" && d.is_active !== false);
  const activeDocs = documents.filter(d => d.document_type !== "Task" && d.is_active !== false);

  const TASK_CATEGORIES = ["General", "HR", "IT Setup", "Safety", "Training", "Benefits", "Compliance"];

  const saveMutation = useMutation({
    mutationFn: (data) => editingTask
      ? base44.entities.OnboardingDocument.update(editingTask.id, data)
      : base44.entities.OnboardingDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["onboarding-documents"]);
      toast.success(editingTask ? "Task updated" : "Task created");
      setShowDialog(false);
      setEditingTask(null);
      setTaskForm(emptyTask);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => base44.entities.OnboardingDocument.update(id, { is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries(["onboarding-documents"]); toast.success("Task removed"); },
  });

  const openAdd = () => { setEditingTask(null); setTaskForm(emptyTask); setShowDialog(true); };
  const openEdit = (task) => {
    setEditingTask(task);
    setTaskForm({ title: task.title || "", description: task.description || "", category: task.required_for?.[0] || "General", required: task.requires_signature || false });
    setShowDialog(true);
  };

  const handleSave = () => {
    if (!taskForm.title.trim()) { toast.error("Task title is required"); return; }
    saveMutation.mutate({
      title: taskForm.title,
      description: taskForm.description,
      document_type: "Task",
      document_url: "",
      requires_signature: false,
      required_for: [taskForm.category],
      is_active: true,
      version: 1,
    });
  };

  const handleAssign = async () => {
    if (!showAssignDialog) return;
    setAssigning(true);
    const targetEmployees = assignRoleFilter === "all"
      ? employees
      : employees.filter(e => e.role === assignRoleFilter);
    let count = 0;
    for (const emp of targetEmployees) {
      const already = acknowledgments.find(a => a.document_id === showAssignDialog.id && a.user_id === emp.id);
      if (!already) {
        await base44.entities.DocumentAcknowledgment.create({
          document_id: showAssignDialog.id, user_id: emp.id,
          acknowledged_at: null, document_version: 1,
        });
        count++;
      }
    }
    queryClient.invalidateQueries(["onboarding-acks"]);
    setAssigning(false);
    setShowAssignDialog(null);
    toast.success(`Assigned to ${count} new employees`);
  };

  const getTaskStats = (taskId) => {
    const taskAcks = acknowledgments.filter(a => a.document_id === taskId);
    const completed = taskAcks.filter(a => a.acknowledged_at).length;
    return { assigned: taskAcks.length, completed };
  };

  const filtered = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={openAdd} className="gap-2 bg-[#1a2b4a] hover:bg-[#2d4a6f]">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No tasks created yet</p>
          <p className="text-xs mt-1">Create onboarding tasks for new hires</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const { assigned, completed } = getTaskStats(task.id);
            const pct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
            const category = task.required_for?.[0] || "General";
            return (
              <Card key={task.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1a2b4a]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-[#1a2b4a]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-900">{task.title}</p>
                        <Badge variant="outline" className="text-xs">{category}</Badge>
                      </div>
                      {task.description && <p className="text-sm text-slate-500 mt-0.5">{task.description}</p>}
                      {assigned > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <Progress value={pct} className="h-1.5 w-24" />
                          <span className="text-xs text-slate-500">{completed}/{assigned} complete</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowAssignDialog(task)}>
                        <Users className="w-3 h-3" /> Assign
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(task)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600"
                        onClick={() => archiveMutation.mutate(task.id)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Task Dialog */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditingTask(null); setTaskForm(emptyTask); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Create Onboarding Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Task Title *</Label>
              <Input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Complete I-9 Form" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional instructions or details" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={taskForm.category} onValueChange={v => setTaskForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {saveMutation.isPending ? "Saving…" : editingTask ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Dialog */}
      <Dialog open={!!showAssignDialog} onOpenChange={(o) => { if (!o) setShowAssignDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Task: {showAssignDialog?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Assign to</Label>
              <Select value={assignRoleFilter} onValueChange={setAssignRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {assignRoleFilter === "all" ? employees.length : employees.filter(e => e.role === assignRoleFilter).length} employees will be assigned
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning} className="bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {assigning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Assigning…</> : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function OnboardingManagement() {
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => base44.entities.OnboardingDocument.list(),
    staleTime: 60000,
  });

  const { data: employees = [], isLoading: loadingEmps } = useQuery({
    queryKey: ["employees-onboarding"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }),
    staleTime: 120000,
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ["onboarding-acks"],
    queryFn: () => base44.entities.DocumentAcknowledgment.list(),
    staleTime: 60000,
  });

  if (loadingDocs || loadingEmps) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Onboarding Management"
        subtitle={`${documents.filter(d => d.is_active !== false && d.document_type !== "Task").length} documents · ${employees.length} employees`}
      />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="w-4 h-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" /> Documents
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <CheckCircle className="w-4 h-4" /> Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab employees={employees} documents={documents} acknowledgments={acknowledgments} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab documents={documents} employees={employees} acknowledgments={acknowledgments} queryClient={queryClient} />
          </TabsContent>
          <TabsContent value="tasks">
            <TasksTab employees={employees} documents={documents} acknowledgments={acknowledgments} queryClient={queryClient} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}