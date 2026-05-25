import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FileText, ExternalLink, Pen, BookOpen } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function OnboardingDocsSection({ assignedDocIds, onChange }) {
  const navigate = useNavigate();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => base44.entities.OnboardingDocument.list(),
    staleTime: 60000,
  });

  const activeDocs = documents.filter(d => d.is_active !== false);

  const toggle = (docId) => {
    if (assignedDocIds.includes(docId)) {
      onChange(assignedDocIds.filter(id => id !== docId));
    } else {
      onChange([...assignedDocIds, docId]);
    }
  };

  return (
    <section className="mb-12">
      <div className="sticky top-16 bg-slate-50 py-2 z-30">
        <h2 className="text-lg font-semibold">Onboarding Documents</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Select the documents this employee must review or sign as part of their onboarding.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-400 py-4">Loading documents…</div>
      ) : activeDocs.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No onboarding documents uploaded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeDocs.map(doc => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${assignedDocIds.includes(doc.id) ? "border-[#1a2b4a] bg-[#1a2b4a]/5" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              onClick={() => toggle(doc.id)}
            >
              <Checkbox
                checked={assignedDocIds.includes(doc.id)}
                onCheckedChange={() => toggle(doc.id)}
                onClick={e => e.stopPropagation()}
              />
              <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{doc.title}</p>
                {doc.document_type && <p className="text-xs text-slate-400">{doc.document_type}</p>}
              </div>
              {doc.requires_signature ? (
                <Badge className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">
                  <Pen className="w-3 h-3 mr-1" />Requires Signature
                </Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 text-xs flex-shrink-0">
                  <BookOpen className="w-3 h-3 mr-1" />Read Only
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => navigate("/OnboardingDocuments")}
        className="mt-3 text-sm text-[#1a2b4a] underline flex items-center gap-1 hover:opacity-70"
      >
        <ExternalLink className="w-3 h-3" /> Manage Onboarding Documents Library
      </button>
    </section>
  );
}