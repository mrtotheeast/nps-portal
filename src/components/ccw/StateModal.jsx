import React from "react";
import { X, ExternalLink, Shield, CheckCircle, XCircle, AlertTriangle, Info, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RECIPROCITY_LABELS = {
  permitless: { label: "Permitless / Constitutional Carry", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "shall-issue": { label: "Shall Issue", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  "may-issue": { label: "May Issue", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
  "no-issue": { label: "No Issue", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
};

function Stat({ label, value, icon: Icon, positive }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
      {Icon && (
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${positive ? "text-green-500" : positive === false ? "text-red-500" : "text-slate-400"}`} />
      )}
      <div className="min-w-0">
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">{value ?? "N/A"}</div>
      </div>
    </div>
  );
}

export default function StateModal({ stateCode, stateData, homeState, homeStateData, allHomeStates = [], onClose }) {
  if (!stateData) return null;

  const permitType = stateData.constitutional_carry ? "permitless" : (stateData.permit_type || "unknown");
  const permitStyle = RECIPROCITY_LABELS[permitType] || { label: permitType, color: "bg-slate-100 text-slate-700" };

  // Determine reciprocity status relative to user's home state(s)
  let reciprocityStatus = null;
  let reciprocityColor = "";
  if (allHomeStates.length > 0 && !allHomeStates.includes(stateCode)) {
    if (stateData.constitutional_carry) {
      reciprocityStatus = "Constitutional Carry — carry permitted";
      reciprocityColor = "text-blue-600 dark:text-blue-400";
    } else {
      let isHonored = false;
      let isRestricted = false;
      for (const hs of allHomeStates) {
        if (hs === stateCode) continue;
        const hsData = homeStateData || {};
        if ((hsData.honored_by_these_states || []).includes(stateCode)) { isHonored = true; break; }
        if ((hsData.restricted_reciprocity_states || []).includes(stateCode)) { isRestricted = true; }
      }
      if (isHonored) { reciprocityStatus = "Your permit is honored here"; reciprocityColor = "text-green-600 dark:text-green-400"; }
      else if (isRestricted) { reciprocityStatus = "Restricted reciprocity — check conditions"; reciprocityColor = "text-orange-600 dark:text-orange-400"; }
      else { reciprocityStatus = "Your permit is NOT recognized here"; reciprocityColor = "text-red-600 dark:text-red-400"; }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1a2b4a] text-white p-5 rounded-t-2xl flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-[#c9a227]" />
              <h2 className="text-xl font-bold">{stateData.state_name}</h2>
              <span className="text-slate-400 text-sm">({stateCode})</span>
            </div>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${permitStyle.color}`}>
              {permitStyle.label}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Reciprocity status banner */}
          {reciprocityStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-semibold ${
              reciprocityColor.includes("green") ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700" :
              reciprocityColor.includes("blue")  ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700" :
              reciprocityColor.includes("orange") ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700" :
              "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700"
            }`}>
              <Info className={`w-4 h-4 flex-shrink-0 ${reciprocityColor}`} />
              <span className={reciprocityColor}>{reciprocityStatus}</span>
            </div>
          )}

          {/* Key stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Permit Required" value={stateData.permit_required ? "Yes" : "No"} icon={stateData.permit_required ? CheckCircle : XCircle} positive={!stateData.permit_required} />
            <Stat label="Constitutional Carry" value={stateData.constitutional_carry ? "Yes" : "No"} icon={stateData.constitutional_carry ? CheckCircle : XCircle} positive={stateData.constitutional_carry} />
            <Stat label="Open Carry" value={stateData.open_carry ? "Yes" : "No"} icon={stateData.open_carry ? CheckCircle : XCircle} positive={stateData.open_carry} />
            <Stat label="Minimum Age" value={stateData.min_age ? `${stateData.min_age} years` : "N/A"} />
            <Stat label="Red Flag Law" value={stateData.red_flag_law ? "Yes" : "No"} icon={stateData.red_flag_law ? AlertTriangle : CheckCircle} positive={!stateData.red_flag_law} />
            <Stat label="Processing Time" value={stateData.processing_time} />
            <Stat label="Permit Fee" value={stateData.permit_fee} />
            <Stat label="Training Required" value={stateData.training_required || "N/A"} />
          </div>

          {/* Reciprocity counts */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{(stateData.honored_by_these_states || []).length}</div>
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">States honor this permit</div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{(stateData.honors_these_states || []).length}</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Permits this state honors</div>
            </div>
          </div>

          {/* Summary */}
          {stateData.summary && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Gun Law Summary</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{stateData.summary}</p>
            </div>
          )}

          {/* Self defense */}
          {stateData.self_defense_laws && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1.5">Self-Defense Laws</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{stateData.self_defense_laws}</p>
            </div>
          )}

          {/* Recent Enacted Law Changes */}
          {stateData.recent_changes && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-3">
              <h3 className="text-xs font-bold text-orange-800 dark:text-orange-300 mb-1 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" />
                Recent Law Changes (Last 90 Days — Enacted)
              </h3>
              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">{stateData.recent_changes}</p>
            </div>
          )}

          {/* Notes */}
          {stateData.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">Additional Notes</h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">{stateData.notes}</p>
            </div>
          )}

          {/* Honored by states */}
          {(stateData.honored_by_these_states || []).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">States Honoring This Permit</h3>
              <div className="flex flex-wrap gap-1">
                {stateData.honored_by_these_states.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded font-mono font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* States this state honors */}
          {(stateData.honors_these_states || []).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide">Out-of-State Permits This State Honors</h3>
              <div className="flex flex-wrap gap-1">
                {stateData.honors_these_states.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded font-mono font-semibold">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Official source */}
          {stateData.official_source_url && (
            <a
              href={stateData.official_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-[#c9a227] hover:underline font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Official State Source
            </a>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-3">
            For reference only — not legal advice. Always verify current laws before carrying.
          </p>
        </div>
      </div>
    </div>
  );
}