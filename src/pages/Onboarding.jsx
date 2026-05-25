import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle, Circle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function Onboarding() {
  const { data: user, isLoading: loadingUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["onboarding-docs"],
    queryFn: () => base44.entities.OnboardingDocument?.list?.() || Promise.resolve([]),
  });

  const { data: acknowledgments = [] } = useQuery({
    queryKey: ["acknowledgments", user?.id],
    queryFn: () =>
      user?.id
        ? base44.entities.DocumentAcknowledgment?.filter?.({ user_id: user.id }) || Promise.resolve([])
        : Promise.resolve([]),
    enabled: !!user?.id,
  });

  if (loadingUser || loadingDocs) return <LoadingScreen />;

  const acknowledgedIds = new Set(acknowledgments.map((a) => a.document_id));
  const required = documents.filter((d) => d.is_active);
  const completed = required.filter((d) => acknowledgedIds.has(d.id));
  const progress = required.length > 0 ? Math.round((completed.length / required.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Onboarding" subtitle="Complete your setup to get started" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">Onboarding Progress</p>
                <p className="text-sm text-slate-600">{completed.length} of {required.length} documents completed</p>
              </div>
              <Badge className={progress === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                {progress}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {progress === 100 && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Onboarding Complete!</p>
                <p className="text-sm text-emerald-600">You have completed all required documents.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {required.map((doc) => {
            const isComplete = acknowledgedIds.has(doc.id);
            return (
              <Card key={doc.id} className={isComplete ? "border-emerald-200" : ""}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {isComplete
                      ? <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      : <Circle className="w-5 h-5 text-slate-300 mt-0.5 flex-shrink-0" />
                    }
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      {doc.description && <p className="text-sm text-slate-600 mt-0.5">{doc.description}</p>}
                      {doc.requires_signature && (
                        <Badge variant="outline" className="mt-1 text-xs">Signature Required</Badge>
                      )}
                    </div>
                  </div>
                  {doc.document_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(doc.document_url, "_blank")}>
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}