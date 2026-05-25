import React from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Shield, Star, BookOpen, Phone, Mail, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";
const TRAINING_CATALOG_URL = "https://www.nationwidepolice.com/training";
const ACUITY_URL = "https://nationwidepoliceservicesllc.as.me/schedule/549dc3bd";

const CATEGORIES = [
  { name: "Security Guard Training", icon: "🛡️" }, { name: "Special Police Officer Training", icon: "⭐" },
  { name: "Firearms Qualification", icon: "🎯" }, { name: "Use of Force Training", icon: "⚖️" },
  { name: "First Aid & CPR", icon: "❤️" }, { name: "De-escalation Training", icon: "🤝" },
  { name: "Active Threat Response", icon: "🚨" }, { name: "Custom On-Site Training", icon: "🏢" },
];

function openInAppBrowser(url, title) {
  window.location.href = `/InAppBrowser?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&back=${encodeURIComponent(window.location.href)}`;
}

async function notifyAdmin(user) {
  const clientName = user?.full_name || "A client";
  await base44.integrations.Core.SendEmail({ to: "Info@NationwidePolice.com", subject: `Training Request — ${clientName}`, body: `Client "${clientName}" (${user?.email}) has requested training information.\n\nNPS Portal` }).catch(() => {});
  await base44.entities.Notification.create({ user_id: "admin", title: "Client Training Request", message: `Client ${clientName} has requested training information.`, type: "training", is_read: false, created_at: new Date().toISOString() }).catch(() => {});
}

export default function ClientTrainingSection({ user }) {
  const handleRequestTraining = async () => { await notifyAdmin(user); toast.success("Opening scheduling page. Your account manager has been notified."); openInAppBrowser(ACUITY_URL, "Request Training for My Team"); };

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#1a2b4a] via-[#1e3357] to-[#0d1a2e]">
      <div className="p-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <img src={LOGO_URL} alt="NPS Badge" className="w-14 h-14 object-contain rounded-full border-2 border-[#c9a227] shadow-lg shrink-0" />
          <div>
            <div className="flex items-center gap-1 mb-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-[#c9a227] fill-[#c9a227]" />)}</div>
            <h2 className="text-white text-lg font-bold leading-tight">Professional Security Training Programs</h2>
            <p className="text-[#c9a227] text-xs font-semibold mt-0.5">Nationwide Police Services</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed mb-5">Nationwide Police Services offers comprehensive security training including Maryland Security Guard Entry Level, Special Police Officer Training, Use of Force, First Aid/CPR, and more. All programs are <span className="text-[#c9a227] font-semibold">MPCTC-approved</span> and state certified.</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {CATEGORIES.map((cat, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/15 transition-colors cursor-pointer" onClick={() => openInAppBrowser(TRAINING_CATALOG_URL, "NPS Training Programs")}>
              <span className="text-base">{cat.icon}</span><span className="text-white text-xs font-medium leading-tight">{cat.name}</span><ChevronRight className="w-3 h-3 text-white/50 ml-auto shrink-0" />
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Button onClick={() => openInAppBrowser(TRAINING_CATALOG_URL, "NPS Training Programs")} className="flex-1 bg-[#1a2b4a] hover:bg-[#0d1a2e] text-[#c9a227] border border-[#c9a227]/50 font-bold"><BookOpen className="w-4 h-4 mr-2" />View Training Programs</Button>
          <Button onClick={handleRequestTraining} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold"><Shield className="w-4 h-4 mr-2" />Request Training for My Team</Button>
        </div>
        <p className="text-slate-400 text-xs text-center mb-3">Training can be scheduled on-site at your location or at our training facility.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 border-t border-white/10">
          <a href="tel:+12407491141" className="flex items-center gap-1.5 text-[#c9a227] text-sm font-semibold hover:text-[#e6c35c] transition-colors"><Phone className="w-4 h-4" />(240) 749-1141</a>
          <span className="text-white/20 hidden sm:block">·</span>
          <a href="mailto:Info@NationwidePolice.com" className="flex items-center gap-1.5 text-[#c9a227] text-sm font-semibold hover:text-[#e6c35c] transition-colors"><Mail className="w-4 h-4" />Info@NationwidePolice.com</a>
        </div>
      </div>
    </div>
  );
}