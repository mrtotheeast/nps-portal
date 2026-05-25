import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, Trash2, FileText, Image, Shield, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

// userRole: "admin"|"supervisor"|"officer"|"client"
export default function SiteDocumentsTab({ siteId, clientId, userRole = "officer", currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState(null);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const canSeeContracts = ["admin", "supervisor", "client"].includes(userRole);
  const canUpload = ["admin"].includes(userRole);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["site-documents", siteId],
    queryFn: () => base44.entities.SiteDocument.filter({ site_id: siteId }),
    enabled: !!siteId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SiteDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["site-documents", siteId]);
      toast.success("Document deleted");
    },
  });

  const triggerUpload = (type) => {
    setUploadType(type);
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadType) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.SiteDocument.create({
        site_id: siteId,
        client_id: clientId || "",
        document_type: uploadType,
        file_name: file.name,
        file_url,
        uploaded_by: currentUser?.email || "",
        uploaded_by_name: currentUser?.full_name || "",
      });
      queryClient.invalidateQueries(["site-documents", siteId]);
      toast.success(`${file.name} uploaded successfully`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const typeIcon = (type) => {
    if (type === "photo") return <Image className="w-5 h-5 text-blue-500" />;
    if (type === "contract") return <Shield className="w-5 h-5 text-amber-500" />;
    return <FileText className="w-5 h-5 text-slate-500" />;
  };

  const DocRow = ({ doc }) => (
    <div className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-slate-50">
      {typeIcon(doc.document_type)}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.file_name}</p>
        <p className="text-xs text-slate-500">
          Uploaded by {doc.uploaded_by_name || doc.uploaded_by || "Unknown"}
          {doc.created_date ? ` · ${format(new Date(doc.created_date), "MMM d, yyyy")}` : ""}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-800" asChild>
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
            <Eye className="w-4 h-4" />
          </a>
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-600" asChild>
          <a href={doc.file_url} download={doc.file_name}>
            <Download className="w-4 h-4" />
          </a>
        </Button>
        {canUpload && (
          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600" onClick={() => deleteMutation.mutate(doc.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const EmptyDoc = ({ label }) => (
    <div className="text-center py-10 text-slate-400">
      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">No {label} documents yet</p>
    </div>
  );

  const sops = docs.filter(d => d.document_type === "sop");
  const contracts = docs.filter(d => d.document_type === "contract");
  const photos = docs.filter(d => d.document_type === "photo");

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Uploading document...
        </div>
      )}

      <Tabs defaultValue="sop">
        <TabsList>
          <TabsTrigger value="sop">SOPs ({sops.length})</TabsTrigger>
          {canSeeContracts && <TabsTrigger value="contract">Contracts ({contracts.length})</TabsTrigger>}
          <TabsTrigger value="photo">Photos ({photos.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sop" className="space-y-3 mt-4">
          {canUpload && (
            <Button size="sm" variant="outline" onClick={() => triggerUpload("sop")} className="gap-2">
              <Upload className="w-4 h-4" /> Upload SOP
            </Button>
          )}
          {sops.length === 0 ? <EmptyDoc label="SOP" /> : sops.map(doc => <DocRow key={doc.id} doc={doc} />)}
        </TabsContent>

        {canSeeContracts && (
          <TabsContent value="contract" className="space-y-3 mt-4">
            {canUpload && (
              <Button size="sm" variant="outline" onClick={() => triggerUpload("contract")} className="gap-2">
                <Upload className="w-4 h-4" /> Upload Contract
              </Button>
            )}
            {contracts.length === 0 ? <EmptyDoc label="contract" /> : contracts.map(doc => <DocRow key={doc.id} doc={doc} />)}
          </TabsContent>
        )}

        <TabsContent value="photo" className="space-y-3 mt-4">
          {canUpload && (
            <Button size="sm" variant="outline" onClick={() => triggerUpload("photo")} className="gap-2">
              <Upload className="w-4 h-4" /> Upload Photo
            </Button>
          )}
          {photos.length === 0 ? <EmptyDoc label="photo" /> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map(doc => (
                <div key={doc.id} className="border rounded-lg overflow-hidden bg-white">
                  <img src={doc.file_url} alt={doc.file_name} className="w-full h-32 object-cover" onError={e => { e.target.style.display = "none"; }} />
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{doc.file_name}</p>
                    <div className="flex gap-1 mt-1">
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                      {canUpload && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-500" onClick={() => deleteMutation.mutate(doc.id)}>Delete</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}