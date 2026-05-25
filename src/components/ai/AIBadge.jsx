import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AIBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#c9a227]/15 text-[#8a6e1a] border border-[#c9a227]/30 ${className}`}>
      <Sparkles className="w-3 h-3" />
      AI Powered
    </span>
  );
}