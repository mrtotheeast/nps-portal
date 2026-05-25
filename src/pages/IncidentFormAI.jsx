import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";

export default function IncidentFormAI() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [enrichedData, setEnrichedData] = useState(null);
  const { hasAccess, isLoading: accessLoading } = useAIAccess();

  const analyzeMutation = useMutation({
    mutationFn: async (text) => {
      const response = await base44.functions.invoke("suggestIncidentTags", {
        description: text,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setEnrichedData(data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (incidentData) => {
      const user = await base44.auth.me();
      return base44.entities.Incident.create({
        ...incidentData,
        reporter_id: user.id,
        incident_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["incidents"]);
      toast.success("Incident created");
      navigate(createPageUrl("IncidentReports"));
    },
  });

  const handleAnalyze = () => {
    if (description.trim()) {
      analyzeMutation.mutate(description);
    }
  };

  const handleSubmit = () => {
    if (enrichedData && description.trim()) {
      createMutation.mutate({
        incident_type: enrichedData.incident_type || "other",
        severity: enrichedData.severity || "medium",
        description: description,
        tags: enrichedData.tags || [],
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="AI Incident Reporter" subtitle="Describe an incident and get AI insights" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Describe the Incident
              {hasAccess && <AIBadge />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened in detail..."
              className="h-32"
            />

            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending || !description.trim()}
              className="w-full bg-[#1a2b4a]"
            >
              {analyzeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Analyze with AI
            </Button>

            {enrichedData && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-900">AI Suggestions:</p>
                <p className="text-sm text-blue-800">Type: {enrichedData.incident_type}</p>
                <p className="text-sm text-blue-800">Severity: {enrichedData.severity}</p>
                {enrichedData.tags?.length > 0 && (
                  <p className="text-sm text-blue-800">Tags: {enrichedData.tags.join(", ")}</p>
                )}
              </div>
            )}

            {enrichedData && (
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Submit Incident
              </Button>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}