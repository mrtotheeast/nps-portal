import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Trash2, Upload, Link2, FileText, Video, File,
  CheckCircle, X, GripVertical, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const LESSON_TYPES = [
  { value: "pdf", label: "PDF Document", icon: FileText },
  { value: "pptx", label: "PowerPoint (.pptx)", icon: File },
  { value: "docx", label: "Word Document (.docx)", icon: File },
  { value: "video_link", label: "Video Link (YouTube/Vimeo)", icon: Video },
];

function QuizBuilder({ quiz, onChange }) {
  const addQuestion = () => {
    onChange({
      ...quiz,
      questions: [
        ...(quiz.questions || []),
        { question: "", options: ["", "", "", ""], correct_index: 0 }
      ]
    });
  };

  const updateQuestion = (qi, field, value) => {
    const questions = [...(quiz.questions || [])];
    questions[qi] = { ...questions[qi], [field]: value };
    onChange({ ...quiz, questions });
  };

  const updateOption = (qi, oi, value) => {
    const questions = [...(quiz.questions || [])];
    const opts = [...questions[qi].options];
    opts[oi] = value;
    questions[qi] = { ...questions[qi], options: opts };
    onChange({ ...quiz, questions });
  };

  const removeQuestion = (qi) => {
    const questions = (quiz.questions || []).filter((_, i) => i !== qi);
    onChange({ ...quiz, questions });
  };

  return (
    <div className="space-y-4 mt-3">
      <div className="flex items-center gap-4">
        <div>
          <Label className="text-xs">Passing Score (%)</Label>
          <Input
            type="number" min="0" max="100"
            value={quiz.passing_score ?? 70}
            onChange={e => onChange({ ...quiz, passing_score: parseInt(e.target.value) || 70 })}
            className="h-8 w-20 text-sm mt-1"
          />
        </div>
        <div className="flex-1 flex items-end justify-end">
          <Button size="sm" variant="outline" onClick={addQuestion} className="gap-1">
            <Plus className="w-3 h-3" /> Add Question
          </Button>
        </div>
      </div>

      {(quiz.questions || []).length === 0 && (
        <p className="text-xs text-slate-400 text-center py-3">No questions yet. Add a question to create a test.</p>
      )}

      {(quiz.questions || []).map((q, qi) => (
        <div key={qi} className="border rounded-lg p-3 bg-slate-50 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-bold text-slate-500 mt-1 w-5 flex-shrink-0">Q{qi + 1}</span>
            <Input
              value={q.question}
              onChange={e => updateQuestion(qi, "question", e.target.value)}
              placeholder="Enter question text…"
              className="h-8 text-sm flex-1"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 flex-shrink-0"
              onClick={() => removeQuestion(qi)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          <div className="ml-7 space-y-1">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuestion(qi, "correct_index", oi)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    q.correct_index === oi ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-emerald-400"
                  }`}
                >
                  {q.correct_index === oi && <div className="w-2 h-2 rounded-full bg-white" />}
                </button>
                <Input
                  value={opt}
                  onChange={e => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                  className="h-7 text-xs flex-1"
                />
                {q.correct_index === oi && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs px-1.5 py-0">✓ Correct</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LessonCard({ lesson, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);

  const typeConfig = LESSON_TYPES.find(t => t.value === lesson.type) || LESSON_TYPES[0];
  const Icon = typeConfig.icon;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...lesson, file_url, file_name: file.name });
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="p-3 pb-0">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-[#1a2b4a]/10`}>
            <Icon className="w-3.5 h-3.5 text-[#1a2b4a]" />
          </div>
          <span className="text-xs text-slate-400 font-medium">Lesson {index + 1}</span>
          <Input
            value={lesson.title}
            onChange={e => onChange({ ...lesson, title: e.target.value })}
            placeholder="Lesson title…"
            className="h-7 text-sm flex-1"
          />
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-600">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="p-3 pt-3 space-y-3">
          {/* Type selector */}
          <div>
            <Label className="text-xs">Content Type</Label>
            <Select value={lesson.type} onValueChange={v => onChange({ ...lesson, type: v, file_url: "", file_name: "" })}>
              <SelectTrigger className="h-8 text-sm mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LESSON_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload or video link */}
          {lesson.type === "video_link" ? (
            <div>
              <Label className="text-xs">Video URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <Link2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <Input
                  value={lesson.file_url || ""}
                  onChange={e => onChange({ ...lesson, file_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  className="h-8 text-sm flex-1"
                />
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Upload File</Label>
              <label className="block mt-1 cursor-pointer">
                <div className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                  lesson.file_url ? "border-emerald-300 bg-emerald-50" : "border-slate-300 hover:border-[#1a2b4a]"
                }`}>
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                    </div>
                  ) : lesson.file_url ? (
                    <span className="text-emerald-700 text-xs flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {lesson.file_name || "File uploaded"}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs flex items-center justify-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Click to upload {typeConfig.label}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept={lesson.type === "pdf" ? ".pdf" : lesson.type === "pptx" ? ".pptx,.ppt" : ".docx,.doc"}
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files[0])}
                />
              </label>
            </div>
          )}

          {/* Quiz toggle */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-slate-700">Test / Quiz</Label>
                {lesson.quiz && (
                  <Badge className="bg-[#c9a227] text-[#1a2b4a] text-xs px-1.5 py-0">
                    {lesson.quiz.questions?.length || 0} questions
                  </Badge>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newQuiz = lesson.quiz ? null : { passing_score: 70, questions: [] };
                  onChange({ ...lesson, quiz: newQuiz });
                }}
                className={`relative w-10 h-5 rounded-full transition-colors ${lesson.quiz ? "bg-[#c9a227]" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${lesson.quiz ? "left-5" : "left-0.5"}`} />
              </button>
            </div>
            {lesson.quiz && (
              <QuizBuilder
                quiz={lesson.quiz}
                onChange={q => onChange({ ...lesson, quiz: q })}
              />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function LessonEditor({ lessons = [], onChange }) {
  const addLesson = () => {
    onChange([
      ...lessons,
      { title: "", type: "pdf", file_url: "", file_name: "", quiz: null }
    ]);
  };

  const updateLesson = (i, updated) => {
    const next = [...lessons];
    next[i] = updated;
    onChange(next);
  };

  const removeLesson = (i) => {
    onChange(lessons.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Lessons & Content</Label>
        <Button size="sm" variant="outline" onClick={addLesson} className="gap-1">
          <Plus className="w-3 h-3" /> Add Lesson
        </Button>
      </div>

      {lessons.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No lessons yet. Add a lesson to get started.</p>
        </div>
      )}

      <div className="space-y-2">
        {lessons.map((lesson, i) => (
          <LessonCard
            key={i}
            lesson={lesson}
            index={i}
            onChange={updated => updateLesson(i, updated)}
            onRemove={() => removeLesson(i)}
          />
        ))}
      </div>
    </div>
  );
}