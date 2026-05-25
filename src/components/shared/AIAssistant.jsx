import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AIAssistant({ value, onChange, placeholder = "Enter text...", promptContext = "Improve this text for a professional security report", rows = 4, className = "" }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState("");

  const handleAIAssist = async () => {
    if (!value?.trim()) { toast.error("Please enter some text first"); return; }
    setIsGenerating(true);
    const response = await base44.integrations.Core.InvokeLLM({ prompt: `${promptContext}:\n\n"${value}"\n\nProvide an improved, professional version. Keep it concise and factual. Only return the improved text, nothing else.` });
    setSuggestion(response); setShowSuggestion(true); setIsGenerating(false);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const response = await base44.integrations.Core.InvokeLLM({ prompt: `${promptContext}. Generate professional, detailed content based on common scenarios in security work. Make it realistic and thorough.` });
    onChange({ target: { value: response } }); toast.success("Content generated"); setIsGenerating(false);
  };

  const applySuggestion = () => { onChange({ target: { value: suggestion } }); setShowSuggestion(false); toast.success("AI suggestion applied"); };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className={`${className} pr-12`} />
        <div className="absolute top-2 right-2 flex gap-1">
          {!value?.trim() && (
            <Button type="button" size="sm" variant="ghost" onClick={handleGenerate} disabled={isGenerating} className="h-8 w-8 p-0" title="Generate with AI">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <Sparkles className="w-4 h-4 text-purple-500" />}
            </Button>
          )}
          {value?.trim() && (
            <Button type="button" size="sm" variant="ghost" onClick={handleAIAssist} disabled={isGenerating} className="h-8 w-8 p-0" title="Improve with AI">
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin text-purple-500" /> : <RefreshCw className="w-4 h-4 text-purple-500" />}
            </Button>
          )}
        </div>
      </div>
      {showSuggestion && suggestion && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-900"><Sparkles className="w-4 h-4" />AI Suggestion</div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{suggestion}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={applySuggestion} className="bg-purple-600 hover:bg-purple-700">Apply Suggestion</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowSuggestion(false)}>Dismiss</Button>
          </div>
        </div>
      )}
    </div>
  );
}