import React, { useState, useCallback, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Plus, Save, Loader2, Edit, Trash2, BookOpen, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import PageHeader from "@/components/shared/PageHeader";
import LessonEditor from "@/components/training/LessonEditor";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const emptyForm = {
  title: "",
  description: "",
  content: "",
  difficulty: "intermediate",
  duration_hours: 1,
  is_required: false,
  status: "active",
  lessons: [],
};

export default function TrainingBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formExpanded, setFormExpanded] = useState(false);

  const { data: trainings = [], isLoading } = useQuery({
    queryKey: ["trainings-admin"],
    queryFn: () => base44.entities.Training?.list?.() || Promise.resolve([]),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingId
      ? base44.entities.Training.update(editingId, data)
      : base44.entities.Training.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["trainings-admin"]);
      queryClient.invalidateQueries(["trainings"]);
      toast.success(editingId ? "Training updated!" : "Training created!");
      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Training.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["trainings-admin"]);
      toast.success("Training deleted");
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormExpanded(true);
    // Scroll to form after a short delay
    setTimeout(() => {
      document.getElementById('training-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, []);

  const openEdit = (training) => {
    setEditingId(training.id);
    setFormData({
      title: training.title || "",
      description: training.description || "",
      content: training.content || "",
      difficulty: training.difficulty || "intermediate",
      duration_hours: training.duration_hours || 1,
      is_required: training.is_required || false,
      status: training.status || "active",
      lessons: training.lessons || [],
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error("Title is required"); return; }
    saveMutation.mutate(formData);
  };

  const totalLessons = (t) => (t.lessons || []).length;
  const lessonsWithQuiz = (t) => (t.lessons || []).filter(l => l?.quiz?.questions?.length > 0).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Training Builder"
        subtitle="Create and manage training courses with lessons and tests"
        showBack
        action={openCreate}
        actionLabel="New Training"
        actionIcon={Plus}
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {isLoading && <p className="text-slate-400 text-sm text-center py-8">Loading…</p>}

        {!isLoading && trainings.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No training courses yet. Create your first one!</p>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {trainings.map(training => (
            <Card key={training.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">{training.title}</h3>
                      {training.is_required && (
                        <Badge className="bg-red-100 text-red-700 text-xs">Required</Badge>
                      )}
                      <Badge className={`text-xs ${training.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {training.status || "active"}
                      </Badge>
                    </div>
                    {training.description && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{training.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> {totalLessons(training)} lesson{totalLessons(training) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {lessonsWithQuiz(training)} quiz{lessonsWithQuiz(training) !== 1 ? "zes" : ""}
                      </span>
                      <span>{training.duration_hours || 0}h · {training.difficulty || "—"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(training)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => deleteMutation.mutate(training.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Inline Create/Edit Form */}
      {formExpanded && (
        <div id="training-form" className="max-w-5xl mx-auto px-4 py-6">
          <Card className="shadow-lg border-[#1a2b4a]">
            <CardHeader className="bg-[#1a2b4a] text-white">
              <CardTitle className="text-xl">{editingId ? "Edit Training Course" : "Create New Training Course"}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Course Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                      placeholder="Enter course title"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the course…"
                      className="h-20"
                    />
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={v => setFormData(p => ({ ...p, difficulty: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number" min="0" step="0.5"
                      value={formData.duration_hours}
                      onChange={e => setFormData(p => ({ ...p, duration_hours: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, is_required: !p.is_required }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${formData.is_required ? "bg-red-500" : "bg-slate-200"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${formData.is_required ? "left-5" : "left-0.5"}`} />
                    </button>
                    <Label className="cursor-pointer">Mark as Required</Label>
                  </div>
                </div>

                {/* Lesson Editor */}
                <div className="border-t pt-4">
                  <LessonEditor
                    lessons={formData.lessons}
                    onChange={lessons => setFormData(p => ({ ...p, lessons }))}
                  />
                </div>

                <div className="flex gap-3 justify-end border-t pt-4">
                  <Button type="button" variant="outline" onClick={() => setFormExpanded(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#1a2b4a] hover:bg-[#2d4a6f]" disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    {editingId ? "Save Changes" : "Create Course"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}