import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Sparkles, Save, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function TrainingGeneratorAI() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  const [prompt, setPrompt] = useState({
    topic: "",
    audience: "security_officer",
    duration: 2,
    tone: "academy",
    jurisdiction: "general",
    include_scenarios: true,
    quiz_count: 10,
    slide_count: 15
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const result = await base44.functions.invoke('generateCompleteTraining', prompt);
      return result.data;
    },
    onSuccess: (data) => {
      setGenerated(data);
      setGenerating(false);
      toast.success("Training generated successfully!");
    },
    onError: () => {
      setGenerating(false);
      toast.error("Failed to generate training");
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      const user = await base44.auth.me();
      await base44.entities.TrainingCourse.create({
        ...generated,
        status,
        created_by: user.id,
        generation_method: "ai_generated",
        ai_generation_prompt: prompt.topic
      });
    },
    onSuccess: () => {
      toast.success("Training saved!");
      navigate(createPageUrl("TrainingManagement"));
    }
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI Training Generator"
        subtitle="Generate complete training courses with AI"
        showBack
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {!generated ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c9a227]" />
                Training Generation Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Training Topic / Description *</Label>
                <Textarea
                  value={prompt.topic}
                  onChange={(e) => setPrompt({ ...prompt, topic: e.target.value })}
                  placeholder="e.g., Advanced de-escalation techniques for security officers including verbal judo, body language, and crisis intervention"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Target Audience</Label>
                  <Select value={prompt.audience} onValueChange={(val) => setPrompt({ ...prompt, audience: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="security_officer">Security Officer</SelectItem>
                      <SelectItem value="spo">Special Police Officer</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="civilian">Civilian/Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Class Length (hours)</Label>
                  <Select value={prompt.duration.toString()} onValueChange={(val) => setPrompt({ ...prompt, duration: parseInt(val) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">8 hours (full day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Training Tone</Label>
                  <Select value={prompt.tone} onValueChange={(val) => setPrompt({ ...prompt, tone: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academy">Academy Style (Formal)</SelectItem>
                      <SelectItem value="civilian">Civilian Friendly</SelectItem>
                      <SelectItem value="tactical">Tactical/Operational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Jurisdiction</Label>
                  <Select value={prompt.jurisdiction} onValueChange={(val) => setPrompt({ ...prompt, jurisdiction: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="maryland">Maryland</SelectItem>
                      <SelectItem value="dc">Washington DC</SelectItem>
                      <SelectItem value="virginia">Virginia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quiz Questions</Label>
                  <Input type="number" min="5" max="30" value={prompt.quiz_count} onChange={(e) => setPrompt({ ...prompt, quiz_count: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Presentation Slides</Label>
                  <Input type="number" min="5" max="50" value={prompt.slide_count} onChange={(e) => setPrompt({ ...prompt, slide_count: parseInt(e.target.value) })} />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prompt.include_scenarios}
                    onChange={(e) => setPrompt({ ...prompt, include_scenarios: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Include scenario-based exercises and case studies</span>
                </label>
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={!prompt.topic || generating}
                className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Training... (this may take 1-2 minutes)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Complete Training
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex gap-3">
              <Button onClick={() => setGenerated(null)} variant="outline">Generate New</Button>
              <Button onClick={() => saveMutation.mutate("draft")} disabled={saveMutation.isLoading} variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save as Draft
              </Button>
              <Button onClick={() => saveMutation.mutate("published")} disabled={saveMutation.isLoading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                <Eye className="w-4 h-4 mr-2" />
                Publish Training
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{generated.title}</CardTitle>
                <p className="text-slate-600">{generated.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Badge>{generated.category?.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{generated.estimated_duration} minutes</Badge>
                </div>

                {generated.learning_objectives?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Learning Objectives</h3>
                    <ul className="list-disc ml-6 space-y-1">
                      {generated.learning_objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generated.modules?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Modules ({generated.modules.length})</h3>
                    {generated.modules.map((module, i) => (
                      <div key={i} className="mb-4 p-4 bg-slate-50 rounded-lg">
                        <h4 className="font-semibold">{module.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{module.summary}</p>
                      </div>
                    ))}
                  </div>
                )}

                {generated.media_resources?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Recommended Resources ({generated.media_resources.length})</h3>
                    {generated.media_resources.map((resource, i) => (
                      <div key={i} className="mb-3 p-3 border rounded">
                        <p className="font-semibold">{resource.title}</p>
                        <p className="text-sm text-slate-600">{resource.summary}</p>
                        <a href={resource.url} target="_blank" className="text-xs text-blue-600 hover:underline">{resource.url}</a>
                        <p className="text-xs text-slate-500 mt-1">Source: {resource.source}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Quiz Questions ({generated.quiz?.questions?.length || 0})</h3>
                  <p className="text-sm text-slate-600">{generated.quiz?.questions?.length || 0} questions generated with answer keys</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Slides ({generated.slides?.length || 0})</h3>
                  <p className="text-sm text-slate-600">{generated.slides?.length || 0} PowerPoint-ready slides generated</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}