import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, ChevronRight, CheckCircle, X, FileText,
  Video, File, ExternalLink, AlertCircle, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

function getEmbedUrl(url) {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function QuizPanel({ quiz, onPass, onFail }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const questions = quiz.questions || [];
  const passingScore = quiz.passing_score ?? 70;

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }
    let correct = 0;
    questions.forEach((q, i) => {
      if (parseInt(answers[i]) === q.correct_index) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    setSubmitted(true);
    if (pct >= passingScore) {
      onPass(pct);
    } else {
      onFail(pct);
    }
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(null);
  };

  const passed = score !== null && score >= passingScore;

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Lesson Quiz</h3>
        <Badge className="bg-amber-100 text-amber-800">Pass: {passingScore}%</Badge>
      </div>

      {submitted && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${passed ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          {passed
            ? <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />}
          <div>
            <p className={`font-semibold ${passed ? "text-emerald-800" : "text-red-700"}`}>
              {passed ? `Passed! Score: ${score}%` : `Failed. Score: ${score}% (need ${passingScore}%)`}
            </p>
            {!passed && (
              <p className="text-sm text-red-600 mt-0.5">Please review the lesson and try again.</p>
            )}
          </div>
          {!passed && (
            <Button size="sm" variant="outline" onClick={reset} className="ml-auto">
              Retry
            </Button>
          )}
        </div>
      )}

      {!submitted && questions.map((q, qi) => (
        <div key={qi} className="border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-slate-800">
            <span className="text-slate-400 mr-2">Q{qi + 1}.</span>{q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                  parseInt(answers[qi]) === oi
                    ? "border-[#1a2b4a] bg-[#1a2b4a]/5 font-medium text-[#1a2b4a]"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className="text-slate-400 mr-2 text-xs">{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      {!submitted && questions.length > 0 && (
        <Button
          onClick={handleSubmit}
          className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f]"
          disabled={Object.keys(answers).length < questions.length}
        >
          Submit Quiz
        </Button>
      )}
    </div>
  );
}

export default function LessonPlayer({ training, assignment, onComplete }) {
  const lessons = training?.lessons || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track which lessons have been passed (either no quiz, or quiz passed)
  const [lessonStatus, setLessonStatus] = useState({}); // { lessonIndex: 'passed' | 'failed' }
  const [quizKey, setQuizKey] = useState(0); // force remount quiz on retry

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p>No lessons available for this training.</p>
      </div>
    );
  }

  const lesson = lessons[currentIndex];
  const hasQuiz = !!(lesson?.quiz?.questions?.length > 0);
  const lessonPassed = !hasQuiz || lessonStatus[currentIndex] === "passed";
  const allComplete = lessons.every((_, i) => {
    const lq = lessons[i]?.quiz?.questions?.length > 0;
    return !lq || lessonStatus[i] === "passed";
  });

  const handleQuizPass = (score) => {
    setLessonStatus(prev => ({ ...prev, [currentIndex]: "passed" }));
  };

  const handleQuizFail = (score) => {
    setLessonStatus(prev => ({ ...prev, [currentIndex]: "failed" }));
  };

  const handleNext = () => {
    if (currentIndex < lessons.length - 1) {
      setCurrentIndex(i => i + 1);
      setQuizKey(k => k + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setQuizKey(k => k + 1);
    }
  };

  const renderContent = () => {
    if (!lesson.file_url) {
      return (
        <div className="flex items-center justify-center h-48 text-slate-400 border rounded-xl bg-slate-50">
          <p className="text-sm">No content uploaded for this lesson.</p>
        </div>
      );
    }

    if (lesson.type === "video_link") {
      const embedUrl = getEmbedUrl(lesson.file_url);
      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            title={lesson.title}
          />
        </div>
      );
    }

    if (lesson.type === "pdf") {
      return (
        <div className="w-full rounded-xl overflow-hidden border">
          <iframe src={lesson.file_url} className="w-full" style={{ minHeight: "500px" }} title={lesson.title} />
        </div>
      );
    }

    // pptx/docx — can't embed directly, show download link
    return (
      <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl gap-3 text-slate-500">
        <File className="w-10 h-10 opacity-40" />
        <p className="text-sm">{lesson.file_name || lesson.title}</p>
        <Button variant="outline" size="sm" onClick={() => window.open(lesson.file_url, "_blank")} className="gap-2">
          <ExternalLink className="w-4 h-4" /> Open / Download File
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500">Lesson {currentIndex + 1} of {lessons.length}</span>
        <Progress value={((currentIndex + 1) / lessons.length) * 100} className="flex-1 h-2" />
        <span className="text-xs text-slate-500">
          {Object.values(lessonStatus).filter(v => v === "passed").length}/{lessons.length} passed
        </span>
      </div>

      {/* Lesson tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {lessons.map((l, i) => {
          const lq = l?.quiz?.questions?.length > 0;
          const st = !lq ? "done" : lessonStatus[i];
          return (
            <button
              key={i}
              onClick={() => { setCurrentIndex(i); setQuizKey(k => k + 1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                i === currentIndex
                  ? "bg-[#1a2b4a] text-white border-[#1a2b4a]"
                  : st === "done"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : st === "failed"
                  ? "border-red-300 bg-red-50 text-red-600"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st === "done" && i !== currentIndex ? <CheckCircle className="w-3 h-3 inline mr-1" /> : null}
              {l.title || `Lesson ${i + 1}`}
            </button>
          );
        })}
      </div>

      {/* Lesson content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{lesson.title || `Lesson ${currentIndex + 1}`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContent()}

          {/* Quiz */}
          {hasQuiz && (
            <QuizPanel
              key={quizKey}
              quiz={lesson.quiz}
              onPass={handleQuizPass}
              onFail={handleQuizFail}
            />
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>

            {currentIndex < lessons.length - 1 ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!lessonPassed}
                className="gap-1 bg-[#1a2b4a] hover:bg-[#2d4a6f]"
              >
                {!lessonPassed ? "Pass quiz to continue" : "Next Lesson"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onComplete}
                disabled={!allComplete}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Award className="w-4 h-4" />
                {allComplete ? "Complete Training" : "Pass all quizzes to finish"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}