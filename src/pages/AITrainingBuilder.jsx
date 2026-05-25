import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";
import { Sparkles, Search, FileText, Clock, CheckCircle, Loader2, Download, BookOpen, Brain, X, AlertTriangle, TrendingUp, BarChart2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function AITrainingBuilder() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("8");
  const [audience, setAudience] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [detailLevel, setDetailLevel] = useState("intermediate");
  const [contentTypes, setContentTypes] = useState({
    case_studies: true,
    role_playing: false,
    practical_exercises: true,
    real_world_examples: true,
    discussions: false,
    hands_on_demos: false
  });
  const [quizSettings, setQuizSettings] = useState({
    difficulty_distribution: {
      easy: 30,
      medium: 50,
      hard: 20
    },
    question_types: {
      multiple_choice: true,
      true_false: true,
      short_answer: false
    },
    questions_per_module: 5,
    passing_score: 70
  });
  const [existingDocs, setExistingDocs] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [generatedTraining, setGeneratedTraining] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [useIncidentData, setUseIncidentData] = useState(false);
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState([]);

  const { hasAccess, isLoading: accessLoading } = useAIAccess();

  const { data: recentIncidents = [] } = useQuery({
    queryKey: ["recent-incidents-for-training"],
    queryFn: async () => {
      const all = await base44.entities.Incident.list("-incident_date", 100);
      return all;
    },
  });

  const incidentTypeSummary = useMemo(() => {
    const counts = {};
    recentIncidents.forEach(inc => {
      counts[inc.incident_type] = (counts[inc.incident_type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [recentIncidents]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      setCurrentStep(1);
      toast.loading("Researching topic on the web...", { id: "training-gen" });

      let existingDocsContext = "";
      if (existingDocs.length > 0) {
        existingDocsContext = "\n\nReference Materials:\n";
        for (const doc of existingDocs) {
          try {
            const response = await fetch(doc.url);
            const content = await response.text();
            existingDocsContext += `\n--- ${doc.name} ---\n${content.substring(0, 5000)}\n`;
          } catch (error) {
            console.error("Error reading doc:", error);
          }
        }
      }

      let incidentContext = "";
      if (useIncidentData && selectedIncidentTypes.length > 0) {
        const relevantIncidents = recentIncidents.filter(inc =>
          selectedIncidentTypes.includes(inc.incident_type)
        ).slice(0, 20);

        const incidentStats = selectedIncidentTypes.map(type => {
          const typeIncidents = recentIncidents.filter(i => i.incident_type === type);
          const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };
          typeIncidents.forEach(i => { severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1; });
          return `- ${type.replace(/_/g, ' ').toUpperCase()}: ${typeIncidents.length} incidents (${JSON.stringify(severityCounts)})`;
        }).join('\n');

        const recentDescriptions = relevantIncidents.slice(0, 5).map(i =>
          `[${i.incident_type}/${i.severity}]: ${i.description?.substring(0, 200)}`
        ).join('\n');

        incidentContext = `\n\nREAL INCIDENT DATA FROM OUR ORGANIZATION (use to make training relevant):
Incident Statistics:\n${incidentStats}
Sample Recent Incidents:\n${recentDescriptions}
Use this data to create realistic scenarios, identify patterns, and tailor training content to address actual issues faced by our officers.`;
      }

      const researchPrompt = `Research the topic "${topic}" for creating a comprehensive training program. 
      Target audience: ${audience || "security officers and staff"}
      Duration: ${duration} hours
      Detail Level: ${detailLevel}
      Additional requirements: ${additionalNotes || "None"}
      ${existingDocsContext}
      ${incidentContext}
      
      Provide a detailed summary of key concepts, best practices, regulations, and practical applications for this topic. If reference materials were provided, incorporate their key points and build upon them. If incident data was provided, highlight patterns and lessons from real incidents.`;

      const research = await base44.integrations.Core.InvokeLLM({
        prompt: researchPrompt,
        add_context_from_internet: true
      });

      setCurrentStep(2);
      toast.loading("Generating training outline and schedule...", { id: "training-gen" });

      const enabledContentTypes = Object.keys(contentTypes).filter(key => contentTypes[key]);
      const contentTypeInstructions = enabledContentTypes.length > 0
        ? `\n\nINCLUDE THESE CONTENT TYPES in appropriate modules:\n${enabledContentTypes.map(type =>
            `- ${type.replace(/_/g, ' ').toUpperCase()}: ${getContentTypeDescription(type)}`
          ).join('\n')}`
        : '';

      const detailInstructions = {
        basic: "Keep content concise and focus on essential concepts only. Use simple language.",
        intermediate: "Provide moderate detail with practical examples. Balance theory and practice.",
        advanced: "Include in-depth analysis, technical details, and complex scenarios. Assume prior knowledge.",
        comprehensive: "Provide exhaustive coverage with extensive examples, edge cases, regulatory details, and advanced applications."
      };

      const enabledQuestionTypes = Object.keys(quizSettings.question_types).filter(
        key => quizSettings.question_types[key]
      );
      const quizInstructions = `

QUIZ REQUIREMENTS:
- Generate ${quizSettings.questions_per_module} questions per module
- Question types: ${enabledQuestionTypes.join(', ')}
- Difficulty distribution: ${quizSettings.difficulty_distribution.easy}% easy, ${quizSettings.difficulty_distribution.medium}% medium, ${quizSettings.difficulty_distribution.hard}% hard
- For multiple choice: Create 4 options with plausible distractors that test common misconceptions
- Provide detailed explanations for why the correct answer is right AND why wrong answers are incorrect
- Mark each question with its difficulty level and type`;

      const incidentDataNote = useIncidentData && selectedIncidentTypes.length > 0
        ? `\n6. PERFORMANCE METRICS: Based on the incident data provided, generate specific KPIs and performance metrics to track whether this training is effective. Include baseline metrics from incident data, target improvement percentages, and measurement methods.`
        : "";

      const trainingPrompt = `Based on this research: ${research}

Create a ${detailLevel} training program for "${topic}" with the following components:

DETAIL LEVEL GUIDANCE: ${detailInstructions[detailLevel]}
${contentTypeInstructions}
${quizInstructions}

1. SYLLABUS: Include learning objectives, prerequisites, and outcomes
2. SCHEDULE: Break down ${duration} hours into modules with specific timing (hour:minute format)
3. MODULE CONTENT: Detailed content for each module with key points. Integrate the requested content types naturally within modules.
4. QUIZ QUESTIONS: Generate questions following the quiz requirements above
5. FINAL EXAM: 20 comprehensive questions with varied difficulty covering all material
${incidentDataNote}

Format the output as a structured training program.`;

      const trainingStructure = await base44.integrations.Core.InvokeLLM({
        prompt: trainingPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            syllabus: {
              type: "object",
              properties: {
                overview: { type: "string" },
                objectives: { type: "array", items: { type: "string" } },
                prerequisites: { type: "array", items: { type: "string" } },
                outcomes: { type: "array", items: { type: "string" } }
              }
            },
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module_number: { type: "number" },
                  title: { type: "string" },
                  start_time: { type: "string" },
                  end_time: { type: "string" },
                  duration_minutes: { type: "number" }
                }
              }
            },
            modules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module_number: { type: "number" },
                  title: { type: "string" },
                  content: { type: "string" },
                  key_points: { type: "array", items: { type: "string" } },
                  content_elements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        title: { type: "string" },
                        content: { type: "string" }
                      }
                    }
                  },
                  quiz_questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        type: { type: "string", enum: ["multiple_choice", "true_false", "short_answer"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        options: { type: "array", items: { type: "string" } },
                        correct_answer: { type: "number" },
                        correct_answer_text: { type: "string" },
                        explanation: { type: "string" },
                        distractor_explanations: { type: "array", items: { type: "string" } }
                      }
                    }
                  }
                }
              }
            },
            final_exam: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  type: { type: "string", enum: ["multiple_choice", "true_false", "short_answer"] },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" },
                  correct_answer_text: { type: "string" },
                  explanation: { type: "string" },
                  distractor_explanations: { type: "array", items: { type: "string" } }
                }
              }
            },
            performance_metrics: {
              type: "object",
              properties: {
                kpis: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      description: { type: "string" },
                      baseline: { type: "string" },
                      target: { type: "string" },
                      measurement_method: { type: "string" },
                      timeframe: { type: "string" }
                    }
                  }
                },
                incident_reduction_targets: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      incident_type: { type: "string" },
                      current_count: { type: "number" },
                      target_reduction_pct: { type: "number" },
                      timeframe: { type: "string" }
                    }
                  }
                },
                evaluation_schedule: { type: "string" }
              }
            }
          }
        }
      });

      setCurrentStep(3);
      toast.loading("Creating presentation slides...", { id: "training-gen" });

      const slidesUrl = await base44.functions.invoke('generateTrainingSlides', {
        training: trainingStructure,
        topic: topic
      });

      toast.success("Training program generated successfully!", { id: "training-gen" });

      return {
        ...trainingStructure,
        slides_url: slidesUrl.data?.presentation_url,
        research_summary: research
      };
    },
    onSuccess: (data) => {
      setGeneratedTraining(data);
      setCurrentStep(4);
    },
    onError: (error) => {
      toast.error("Failed to generate training: " + error.message, { id: "training-gen" });
      setCurrentStep(1);
    }
  });

  const [completionCriteria, setCompletionCriteria] = useState({
    minimum_score: 70,
    minimum_time_minutes: 0,
    require_all_modules: true,
    allow_retakes: true,
    max_attempts: 3
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const currentUser = await base44.auth.me();
      await base44.entities.TrainingCourse.create({
        title: generatedTraining.title,
        description: generatedTraining.syllabus.overview,
        category: "ai_generated",
        duration_hours: parseFloat(duration),
        difficulty: detailLevel,
        content: {
          syllabus: generatedTraining.syllabus,
          schedule: generatedTraining.schedule,
          modules: generatedTraining.modules,
          final_exam: generatedTraining.final_exam,
          research_summary: generatedTraining.research_summary
        },
        slides_url: generatedTraining.slides_url,
        completion_criteria: completionCriteria,
        created_by: currentUser.id,
        status: "published",
        multimedia_enabled: true
      });
    },
    onSuccess: () => {
      toast.success("Training program saved successfully!");
      setTopic("");
      setDuration("8");
      setAudience("");
      setAdditionalNotes("");
      setGeneratedTraining(null);
      setCurrentStep(1);
    }
  });

  const getContentTypeDescription = (type) => {
    const descriptions = {
      case_studies: "Real-world scenarios with analysis and lessons learned",
      role_playing: "Interactive scenarios for participants to practice responses",
      practical_exercises: "Hands-on activities to apply learned concepts",
      real_world_examples: "Actual incidents and situations from the field",
      discussions: "Group discussion topics and debate points",
      hands_on_demos: "Step-by-step demonstrations and practice sessions"
    };
    return descriptions[type] || "";
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingDocs(true);
    try {
      const uploadedDocs = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedDocs.push({ name: file.name, url: file_url });
      }
      setExistingDocs([...existingDocs, ...uploadedDocs]);
      toast.success(`${files.length} document(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload documents");
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a training topic");
      return;
    }
    generateMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="AI Training Builder"
        subtitle="Generate comprehensive training programs powered by AI"
        badge={hasAccess ? <AIBadge /> : undefined}
        showBack
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : !generatedTraining ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#c9a227]" />
                Create Training Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <Label htmlFor="topic">Training Topic *</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Active Shooter Response, De-escalation Techniques, CPR & First Aid"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    AI will search the web for the latest information on this topic
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Training Duration (hours) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="40"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience">Target Audience</Label>
                    <Input
                      id="audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      placeholder="e.g., Security Officers, New Hires, Supervisors"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="detailLevel">Content Detail Level *</Label>
                  <select
                    id="detailLevel"
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-slate-300"
                  >
                    <option value="basic">Basic - Essential concepts only</option>
                    <option value="intermediate">Intermediate - Balanced detail</option>
                    <option value="advanced">Advanced - In-depth technical content</option>
                    <option value="comprehensive">Comprehensive - Exhaustive coverage</option>
                  </select>
                </div>

                <div>
                  <Label>Content Types to Include</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.keys(contentTypes).map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contentTypes[type]}
                          onChange={(e) => setContentTypes({ ...contentTypes, [type]: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">
                          {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {recentIncidents.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Use Incident Data to Personalize Training</Label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useIncidentData}
                          onChange={(e) => setUseIncidentData(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">Enable</span>
                      </label>
                    </div>
                    {useIncidentData && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-amber-800">
                            AI will use real incident patterns from your organization to create relevant scenarios and performance metrics.
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Select incident types to include ({recentIncidents.length} total incidents):</p>
                          <div className="grid grid-cols-2 gap-2">
                            {incidentTypeSummary.map(([type, count]) => (
                              <label key={type} className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border">
                                <input
                                  type="checkbox"
                                  checked={selectedIncidentTypes.includes(type)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIncidentTypes([...selectedIncidentTypes, type]);
                                    } else {
                                      setSelectedIncidentTypes(selectedIncidentTypes.filter(t => t !== type));
                                    }
                                  }}
                                  className="w-4 h-4"
                                />
                                <span className="text-sm flex-1">{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                <Badge variant="outline" className="text-xs">{count}</Badge>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="docs">Existing Documentation (Optional)</Label>
                  <div className="space-y-2">
                    <Input
                      id="docs"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={uploadingDocs}
                    />
                    <p className="text-xs text-slate-500">
                      Upload existing policies, SOPs, or training materials to enrich content
                    </p>
                    {existingDocs.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {existingDocs.map((doc, idx) => (
                          <Badge key={idx} variant="outline" className="flex items-center gap-1">
                            {doc.name}
                            <button onClick={() => setExistingDocs(existingDocs.filter((_, i) => i !== idx))} className="ml-1 hover:text-red-600">×</button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Quiz Configuration</Label>
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg mt-2">
                    <div>
                      <Label className="text-sm">Questions per Module</Label>
                      <Input
                        type="number" min="3" max="10"
                        value={quizSettings.questions_per_module}
                        onChange={(e) => setQuizSettings({ ...quizSettings, questions_per_module: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Difficulty Distribution (%)</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {["easy", "medium", "hard"].map(level => (
                          <div key={level}>
                            <label className="text-xs text-slate-600 capitalize">{level}</label>
                            <Input
                              type="number" min="0" max="100"
                              value={quizSettings.difficulty_distribution[level]}
                              onChange={(e) => setQuizSettings({
                                ...quizSettings,
                                difficulty_distribution: { ...quizSettings.difficulty_distribution, [level]: parseInt(e.target.value) }
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Question Types</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {Object.keys(quizSettings.question_types).map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={quizSettings.question_types[type]}
                              onChange={(e) => setQuizSettings({
                                ...quizSettings,
                                question_types: { ...quizSettings.question_types, [type]: e.target.checked }
                              })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Completion Criteria</Label>
                  <div className="space-y-3 p-4 bg-slate-50 rounded-lg mt-2">
                    <div>
                      <Label className="text-sm">Minimum Passing Score (%)</Label>
                      <Input
                        type="number" min="0" max="100"
                        value={completionCriteria.minimum_score}
                        onChange={(e) => setCompletionCriteria({ ...completionCriteria, minimum_score: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Minimum Time Required (minutes)</Label>
                      <Input
                        type="number" min="0"
                        value={completionCriteria.minimum_time_minutes}
                        onChange={(e) => setCompletionCriteria({ ...completionCriteria, minimum_time_minutes: parseInt(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={completionCriteria.require_all_modules}
                          onChange={(e) => setCompletionCriteria({ ...completionCriteria, require_all_modules: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm">Require all modules to be completed</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={completionCriteria.allow_retakes}
                          onChange={(e) => setCompletionCriteria({ ...completionCriteria, allow_retakes: e.target.checked })} className="w-4 h-4" />
                        <span className="text-sm">Allow retakes</span>
                      </label>
                    </div>
                    {completionCriteria.allow_retakes && (
                      <div>
                        <Label className="text-sm">Maximum Attempts</Label>
                        <Input
                          type="number" min="1" max="10"
                          value={completionCriteria.max_attempts}
                          onChange={(e) => setCompletionCriteria({ ...completionCriteria, max_attempts: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional Requirements</Label>
                  <Textarea
                    id="notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Any specific topics, regulations, or focus areas to include..."
                    rows={4}
                  />
                </div>

                {generateMutation.isLoading && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <div>
                        <div className="font-semibold">
                          {currentStep === 1 && "Step 1/3: Researching topic on the web..."}
                          {currentStep === 2 && "Step 2/3: Generating training program..."}
                          {currentStep === 3 && "Step 3/3: Creating presentation slides..."}
                        </div>
                        <div className="text-xs text-slate-600">This may take 30-60 seconds</div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold h-12"
                  disabled={generateMutation.isLoading}
                >
                  {generateMutation.isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Training Program
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Training program generated successfully! Review the content below and save to your training library.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"
              >
                {saveMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save to Training Library
              </Button>
              {generatedTraining.slides_url && (
                <Button variant="outline" onClick={() => window.open(generatedTraining.slides_url, '_blank')}>
                  <Download className="w-4 h-4 mr-2" />
                  View Presentation
                </Button>
              )}
              <Button variant="outline" onClick={() => { setGeneratedTraining(null); setCurrentStep(1); }}>
                Create New Training
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{generatedTraining.title}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge>{duration} hours</Badge>
                      <Badge variant="outline">{generatedTraining.modules?.length || 0} modules</Badge>
                      <Badge variant="outline">AI Generated</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="syllabus">
                  <TabsList className={`grid w-full ${generatedTraining.performance_metrics ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="modules">Modules</TabsTrigger>
                    <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
                    <TabsTrigger value="exam">Final Exam</TabsTrigger>
                    {generatedTraining.performance_metrics && (
                      <TabsTrigger value="metrics">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Metrics
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="syllabus" className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Overview</h3>
                      <p className="text-slate-700">{generatedTraining.syllabus.overview}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Learning Objectives</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {generatedTraining.syllabus.objectives?.map((obj, idx) => <li key={idx} className="text-slate-700">{obj}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Prerequisites</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {generatedTraining.syllabus.prerequisites?.map((pre, idx) => <li key={idx} className="text-slate-700">{pre}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Expected Outcomes</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {generatedTraining.syllabus.outcomes?.map((out, idx) => <li key={idx} className="text-slate-700">{out}</li>)}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule">
                    <div className="space-y-3">
                      {generatedTraining.schedule?.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-center w-12 h-12 bg-[#c9a227] text-[#1a2b4a] rounded-full font-bold">
                            {item.module_number}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{item.title}</div>
                            <div className="text-sm text-slate-600">{item.start_time} - {item.end_time} ({item.duration_minutes} min)</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="modules">
                    <div className="space-y-6">
                      {generatedTraining.modules?.map((module, idx) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5 text-[#c9a227]" />
                              Module {module.module_number}: {module.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Content</h4>
                              <p className="text-slate-700 whitespace-pre-wrap">{module.content}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-2">Key Points</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {module.key_points?.map((point, pidx) => <li key={pidx} className="text-slate-700">{point}</li>)}
                              </ul>
                            </div>
                            {module.content_elements && module.content_elements.length > 0 && (
                              <div className="space-y-3 mt-4">
                                <h4 className="font-semibold">Interactive Elements</h4>
                                {module.content_elements.map((element, eidx) => (
                                  <div key={eidx} className="bg-slate-50 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className="bg-[#c9a227] text-[#1a2b4a]">{element.type?.replace(/_/g, ' ').toUpperCase()}</Badge>
                                      <span className="font-semibold">{element.title}</span>
                                    </div>
                                    <p className="text-slate-700 whitespace-pre-wrap">{element.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="quizzes">
                    <div className="space-y-6">
                      {generatedTraining.modules?.map((module, idx) => (
                        <Card key={idx}>
                          <CardHeader>
                            <CardTitle className="text-lg">Module {module.module_number} Quiz: {module.title}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {module.quiz_questions?.map((q, qidx) => (
                              <div key={qidx} className="border-l-4 border-[#c9a227] pl-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">{q.type?.replace(/_/g, ' ')}</Badge>
                                  <Badge className={q.difficulty === 'easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{q.difficulty}</Badge>
                                </div>
                                <div className="font-semibold mb-2">{qidx + 1}. {q.question}</div>
                                {q.type !== 'short_answer' && (
                                  <div className="space-y-1 ml-4">
                                    {q.options?.map((opt, oidx) => (
                                      <div key={oidx}>
                                        <div className={oidx === q.correct_answer ? "text-green-600 font-semibold" : "text-slate-600"}>
                                          {String.fromCharCode(65 + oidx)}. {opt}{oidx === q.correct_answer && " ✓"}
                                        </div>
                                        {q.distractor_explanations && oidx !== q.correct_answer && (
                                          <div className="text-xs text-red-600 ml-4 italic">Why incorrect: {q.distractor_explanations[oidx]}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {q.type === 'short_answer' && q.correct_answer_text && (
                                  <div className="text-green-600 font-semibold ml-4">Expected answer: {q.correct_answer_text}</div>
                                )}
                                <div className="text-sm text-green-700 mt-2 bg-green-50 p-2 rounded">
                                  <strong>Explanation:</strong> {q.explanation}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {generatedTraining.performance_metrics && (
                    <TabsContent value="metrics" className="space-y-6">
                      {generatedTraining.performance_metrics.kpis?.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Target className="w-5 h-5 text-[#c9a227]" />
                            Key Performance Indicators
                          </h3>
                          <div className="grid gap-4">
                            {generatedTraining.performance_metrics.kpis.map((kpi, idx) => (
                              <Card key={idx} className="border-l-4 border-[#c9a227]">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold">{kpi.name}</h4>
                                    <Badge variant="outline">{kpi.timeframe}</Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 mb-3">{kpi.description}</p>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="bg-red-50 p-2 rounded text-center">
                                      <p className="text-xs text-slate-500">Baseline</p>
                                      <p className="font-semibold text-red-700">{kpi.baseline}</p>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded text-center">
                                      <p className="text-xs text-slate-500">Target</p>
                                      <p className="font-semibold text-green-700">{kpi.target}</p>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded text-center">
                                      <p className="text-xs text-slate-500">How to Measure</p>
                                      <p className="font-semibold text-blue-700 text-xs">{kpi.measurement_method}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                      {generatedTraining.performance_metrics.incident_reduction_targets?.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-[#c9a227]" />
                            Incident Reduction Targets
                          </h3>
                          <div className="space-y-3">
                            {generatedTraining.performance_metrics.incident_reduction_targets.map((target, idx) => (
                              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium capitalize">{target.incident_type?.replace(/_/g, ' ')}</p>
                                  <p className="text-sm text-slate-500">Target timeframe: {target.timeframe}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-slate-500">Current</p>
                                  <p className="text-xl font-bold text-slate-700">{target.current_count}</p>
                                </div>
                                <div className="text-2xl text-slate-400">→</div>
                                <div className="text-center">
                                  <p className="text-sm text-slate-500">Reduction Goal</p>
                                  <p className="text-xl font-bold text-green-600">-{target.target_reduction_pct}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {generatedTraining.performance_metrics.evaluation_schedule && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-1">Evaluation Schedule</h4>
                          <p className="text-sm text-blue-800">{generatedTraining.performance_metrics.evaluation_schedule}</p>
                        </div>
                      )}
                    </TabsContent>
                  )}

                  <TabsContent value="exam">
                    <Card>
                      <CardHeader>
                        <CardTitle>Final Examination</CardTitle>
                        <p className="text-sm text-slate-600">20 comprehensive questions covering all training material</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {generatedTraining.final_exam?.map((q, idx) => (
                          <div key={idx} className="border-l-4 border-[#c9a227] pl-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">{q.type?.replace(/_/g, ' ')}</Badge>
                              <Badge className={q.difficulty === 'easy' ? 'bg-green-100 text-green-800' : q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>{q.difficulty}</Badge>
                            </div>
                            <div className="font-semibold mb-2">{idx + 1}. {q.question}</div>
                            {q.type !== 'short_answer' && (
                              <div className="space-y-1 ml-4">
                                {q.options?.map((opt, oidx) => (
                                  <div key={oidx}>
                                    <div className={oidx === q.correct_answer ? "text-green-600 font-semibold" : "text-slate-600"}>
                                      {String.fromCharCode(65 + oidx)}. {opt}{oidx === q.correct_answer && " ✓"}
                                    </div>
                                    {q.distractor_explanations && oidx !== q.correct_answer && (
                                      <div className="text-xs text-red-600 ml-4 italic">Why incorrect: {q.distractor_explanations[oidx]}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.type === 'short_answer' && q.correct_answer_text && (
                              <div className="text-green-600 font-semibold ml-4">Expected answer: {q.correct_answer_text}</div>
                            )}
                            <div className="text-sm text-green-700 mt-2 bg-green-50 p-2 rounded">
                              <strong>Explanation:</strong> {q.explanation}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}