import React, { useState } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlatformOwnerCheck } from '@/hooks/usePlatformOwnerCheck';
import AIPurchaseModal from './AIPurchaseModal';

export default function AIUpgradeBanner({ compact = false }) {
  const { isPlatformOwner } = usePlatformOwnerCheck();
  const [modalOpen, setModalOpen] = useState(false);

  // Platform owner (NPS) never sees upgrade prompts
  if (isPlatformOwner) {
    return null;
  }

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#c9a227]/40 bg-[#fdf8ee]">
          <Lock className="w-4 h-4 text-[#c9a227] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1a2b4a]">AI features require a subscription</p>
          </div>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold shrink-0"
          >
            Unlock
          </Button>
        </div>
        <AIPurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border-2 border-[#c9a227]/40 bg-gradient-to-br from-[#fdf8ee] to-white p-6 text-center space-y-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#c9a227]/10 mx-auto">
          <Sparkles className="w-7 h-7 text-[#c9a227]" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-[#1a2b4a]">AI Report Writing — Upgrade to Unlock</h3>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Generate professional incident reports, post orders, and operational documents instantly
            with AI assistance. Save time and improve documentation accuracy across your entire team.
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold px-8"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Unlock AI Reporting
        </Button>

        <p className="text-xs text-slate-400">From $29.99/month · Per organization</p>
      </div>

      <AIPurchaseModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}