import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardList, CheckCircle, ChevronRight, Pen, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OnboardingTasksCard({ employeeId }) {
  const navigate = useNavigate();

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-onboarding-assignments", employeeId],
    queryFn: () => base44.entities.DocumentAcknowledgment.filter({ user_id: employeeId }),
    enabled: !!employeeId,
    staleTime: 30000,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["onboarding-documents"],
    queryFn: () => base44.entities.OnboardingDocument.list(),
    staleTime: 120000,
  });

  if (!assignments.length) return null;

  const incomplete = assignments.filter(a => !a.acknowledged_at);
  const total = assignments.length;
  const completed = total - incomplete.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (pct === 100) return null; // All done — card disappears

  return (
    <Card className="border-[#c9a227] shadow-sm mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-[#c9a227]" />
          Onboarding Tasks
          <Badge className="bg-[#c9a227]/20 text-[#c9a227] ml-auto">{completed}/{total} complete</Badge>
        </CardTitle>
        <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
          <div className="bg-[#c9a227] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {incomplete.slice(0, 4).map(a => {
          const doc = documents.find(d => d.id === a.document_id);
          if (!doc) return null;
          return (
            <button
              key={a.id}
              onClick={() => navigate(`/OnboardingTask?ackId=${a.id}`)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left border border-slate-100 transition-colors"
            >
              {doc.requires_signature
                ? <Pen className="w-4 h-4 text-purple-500 flex-shrink-0" />
                : <BookOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />}
              <span className="flex-1 text-sm font-medium">{doc.title}</span>
              <span className="text-xs text-slate-400">
                {doc.requires_signature ? "Sign required" : "Read & acknowledge"}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
            </button>
          );
        })}
        {incomplete.length > 4 && (
          <p className="text-xs text-slate-400 text-center">+{incomplete.length - 4} more tasks</p>
        )}
      </CardContent>
    </Card>
  );
}