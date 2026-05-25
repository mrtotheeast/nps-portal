import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, Clock, ExternalLink, PenLine } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ESignatureModal from "./ESignatureModal";

export default function EmployeeDocumentSigner({ userId, userRole }) {
  const queryClient = useQueryClient();
  const [signingDoc, setSigningDoc] = useState(null);

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => base44.entities.OnboardingDocument.filter({ is_active: true }),
  });

  const { data: acknowledgments = [], isLoading: loadingAcks } = useQuery({
    queryKey: ["my-acknowledgments", userId],
    queryFn: () => base44.entities.DocumentAcknowledgment.filter({ user_id: userId }),
    enabled: !!userId,
  });

  const signMutation = useMutation({
    mutationFn: ({ docId, signatureData, signedDate, deviceInfo }) =>
      base44.entities.DocumentAcknowledgment.create({
        document_id: docId, user_id: userId,
        acknowledged_at: new Date(signedDate).toISOString(),
        signature_data: signatureData, device_info: deviceInfo,
        document_version: documents.find(d => d.id === docId)?.version || "1.0",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["my-acknowledgments", userId]);
      queryClient.invalidateQueries(["acknowledgments"]);
      setSigningDoc(null);
      toast.success("Document signed successfully");
    },
  });

  const myDocs = documents.filter(d => d.required_for?.includes("all") || d.required_for?.includes(userRole));
  const getAck = (docId) => acknowledgments.find(a => a.document_id === docId);
  const signed = myDocs.filter(d => getAck(d.id));
  const pending = myDocs.filter(d => !getAck(d.id));

  if (loadingDocs || loadingAcks) return <div className="text-sm text-slate-500 py-4">Loading documents...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-lg text-center"><p className="text-xl font-bold">{myDocs.length}</p><p className="text-xs text-slate-500">Total Required</p></div>
        <div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-xl font-bold text-green-700">{signed.length}</p><p className="text-xs text-slate-500">Signed</p></div>
        <div className="p-3 bg-amber-50 rounded-lg text-center"><p className="text-xl font-bold text-amber-700">{pending.length}</p><p className="text-xs text-slate-500">Pending</p></div>
      </div>

      {pending.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" />Requires Your Signature</h4>
          <div className="space-y-2">
            {pending.map((doc) => (
              <div key={doc.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{doc.description}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      <Badge className={`text-xs ${doc.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>{doc.priority}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {doc.document_url && <Button size="sm" variant="outline" onClick={() => window.open(doc.document_url, "_blank")}><ExternalLink className="w-4 h-4" /></Button>}
                  <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]" onClick={() => setSigningDoc(doc)}><PenLine className="w-4 h-4 mr-1" />Sign</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {signed.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Signed Documents</h4>
          <div className="space-y-2">
            {signed.map((doc) => {
              const ack = getAck(doc.id);
              return (
                <div key={doc.id} className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-green-700">Signed {ack?.acknowledged_at ? format(new Date(ack.acknowledged_at), "MMM d, yyyy") : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ack?.signature_data && <img src={ack.signature_data} alt="sig" className="h-8 bg-white border rounded px-1" />}
                    <Button size="sm" variant="ghost" onClick={() => setSigningDoc({ ...doc, _viewOnly: true })}>View</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myDocs.length === 0 && (
        <div className="text-center py-8 text-slate-500"><FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" /><p>No documents required for your role.</p></div>
      )}

      {signingDoc && (
        <ESignatureModal
          document={signingDoc}
          existingAck={signingDoc._viewOnly ? getAck(signingDoc.id) : null}
          signing={signMutation.isPending}
          onSign={({ signature_data, signed_date, device_info }) => signMutation.mutate({ docId: signingDoc.id, signatureData: signature_data, signedDate: signed_date, deviceInfo: device_info })}
          onClose={() => setSigningDoc(null)}
        />
      )}
    </div>
  );
}