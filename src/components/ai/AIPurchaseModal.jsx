import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check, Loader2, Zap, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/context/CompanyContext';
import { usePlatformOwnerCheck } from '@/hooks/usePlatformOwnerCheck';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$29.99',
    period: '/month',
    description: 'Per organization. Cancel anytime.',
    badge: null,
    icon: Zap
  },
  {
    id: 'annual',
    label: 'Annual',
    price: '$299.99',
    period: '/year',
    description: 'Per organization. Save 17% vs monthly.',
    badge: 'Save 17%',
    icon: Calendar
  }
];

const FEATURES = [
  'AI-generated incident reports',
  'AI post order & document drafting',
  'AI writing assistant across the portal',
  'AI training program builder',
  'AI analytics & scheduled reports',
  'Unlimited generations for your entire team'
];

export default function AIPurchaseModal({ open, onClose }) {
  const { isPlatformOwner } = usePlatformOwnerCheck();
  const { companyId } = useCompany();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [loading, setLoading] = useState(false);

  // Hide billing UI for native iOS/Android apps
  const isNativeApp = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
  if (isNativeApp) {
    return null;
  }

  // Platform owner (NPS) never sees AI purchase modal - they have free access
  if (isPlatformOwner) {
    return null;
  }

  const handleCheckout = async () => {
    if (!companyId) { toast.error('Company not found'); return; }
    setLoading(true);
    const res = await base44.functions.invoke('createAICheckoutSession', {
      plan: selectedPlan,
      company_id: companyId,
      success_url: `${window.location.origin}/CompanySettings?ai_success=1`,
      cancel_url: window.location.href
    });
    setLoading(false);
    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error('Could not start checkout. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-[#c9a227]" />
            Unlock AI Reporting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Feature list */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Plan selector */}
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const selected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                    selected
                      ? 'border-[#c9a227] bg-[#fdf8ee]'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2 right-3 bg-[#c9a227] text-[#1a2b4a] text-xs font-bold px-2 py-0.5 rounded-full">
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${selected ? 'text-[#c9a227]' : 'text-slate-400'}`} />
                    <span className={`font-semibold ${selected ? 'text-[#1a2b4a]' : 'text-slate-700'}`}>{plan.label}</span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-[#1a2b4a]">{plan.price}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-12 text-base font-semibold"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            Continue with Stripe
          </Button>

          <p className="text-center text-xs text-slate-400">
            Secure checkout powered by Stripe. Cancel anytime from Company Settings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}