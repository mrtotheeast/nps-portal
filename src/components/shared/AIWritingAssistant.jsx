import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useAIAccess } from "@/hooks/useAIAccess";
import AIUpgradeBanner from "@/components/ai/AIUpgradeBanner";
import AIBadge from "@/components/ai/AIBadge";

export default function AIWritingAssistant({ open, onClose, onInsert, context = "", placeholder = "Describe what happened..." }) {
  const [prompt, setPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { hasAccess, isLoading: accessLoading } = useAIAccess();

  const handleGenerate = async () => {
    if (!prompt) { toast.error("Please enter a description"); return; }
    setIsGenerating(true);
    const fullPrompt = context ? `${context}\n\nUser description: ${prompt}\n\nGenerate a professional, detailed narrative based on the above information.` : `Generate a professional, detailed incident narrative based on: ${prompt}`;
    const response = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
    setGeneratedText(response); setIsGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedText);
    setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied to clipboard");
  };

  const handleInsert = () => { onInsert(generatedText); onClose(); setPrompt(""); setGeneratedText(""); };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Writing Assistant
            {hasAccess && <AIBadge />}
          </DialogTitle>
        </DialogHeader>
        {!accessLoading && !hasAccess ? (
          <AIUpgradeBanner />
        ) : (
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-2 block">Describe what you want to write</label><Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={placeholder} rows={4} className="resize-none" /></div>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt} className="w-full bg-purple-600 hover:bg-purple-700">
            {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4 mr-2" />Generate Text</>}
          </Button>
          {generatedText && (
            <div className="space-y-3">
              <div className="relative">
                <Textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)} rows={8} className="resize-none" />
                <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={handleCopy}>{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>Regenerate</Button>
                <Button onClick={handleInsert} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">Insert Text</Button>
              </div>
            </div>
          )}
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}