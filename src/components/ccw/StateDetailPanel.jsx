import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, ExternalLink, Shield, AlertTriangle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CARRY_LOCATIONS = [
  { key: "vehicle", label: "Carry in vehicle" },
  { key: "bars", label: "Carry in bars/restaurants" },
  { key: "state_parks", label: "Carry in state parks" },
  { key: "national_parks", label: "Carry in national parks" },
  { key: "rest_areas", label: "Carry at roadside rest areas" },
  { key: "hotels", label: "Carry in hotels" },
  { key: "worship", label: "Carry in places of worship" },
  { key: "bow_hunting", label: "Carry while bow hunting" },
  { key: "gun_hunting", label: "Carry while gun hunting" },
];

const CARRY_LOCATION_DATA = {
  constitutional_carry: { vehicle: true, bars: "check", state_parks: true, national_parks: true, rest_areas: true, hotels: true, worship: "check", bow_hunting: true, gun_hunting: true },
  default: { vehicle: "check", bars: false, state_parks: true, national_parks: true, rest_areas: true, hotels: true, worship: "check", bow_hunting: true, gun_hunting: true },
};

const YesNo = ({ val }) => {
  if (val === true) return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-semibold">Yes</span>;
  if (val === false) return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded text-xs font-semibold">No</span>;
  return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded text-xs font-semibold">Check Local Laws</span>;
};

const StatItem = ({ label, value }) => (
  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
    <div className="text-xs text-slate-500 mb-0.5">{label}</div>
    <div className="font-semibold text-slate-800 text-sm">{value ?? "N/A"}</div>
  </div>
);

const AccordionSection = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-semibold text-slate-700 text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 py-3 text-sm text-slate-600 space-y-2">{children}</div>}
    </div>
  );
};

export default function StateDetailPanel({ stateCode, stateData: sd, homeState, homeStateData, onClose, allHomeStates = [] }) {
  if (!sd) return null;

  const allSelected = allHomeStates.length > 0 ? allHomeStates : (homeState ? [homeState] : []);
  
  const getReciprocityStatus = () => {
    if (!allSelected.length || allSelected.includes(stateCode)) return null;
    for (const hs of allSelected) {
      if (hs === stateCode) continue;
      const hsData = homeStateData; // use passed homeStateData for first hs
      if (!hsData) continue;
      const honored = hsData.honored_by_these_states || [];
      const restricted = hsData.restricted_reciprocity_states || [];
      if (sd.constitutional_carry) return { label: "Constitutional Carry – Check Ages", color: "bg-blue-100 text-blue-800" };
      if (honored.includes(stateCode)) return { label: "Yes – Carry Allowed", color: "bg-green-100 text-green-800" };
      if (restricted.includes(stateCode)) return { label: "Yes – With Restrictions", color: "bg-orange-100 text-orange-800" };
    }
    if (sd.constitutional_carry) return { label: "Constitutional Carry – Check Ages", color: "bg-blue-100 text-blue-800" };
    return { label: "No – Carry Not Allowed", color: "bg-red-100 text-red-800" };
  };

  const status = getReciprocityStatus();
  const carryData = sd.constitutional_carry ? CARRY_LOCATION_DATA.constitutional_carry : CARRY_LOCATION_DATA.default;
  const recipStates = sd.honored_by_these_states || [];
  const honorsStates = sd.honors_these_states || [];
  const lastUpdated = sd.last_updated || "2025-01-01";

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="pb-3 border-b bg-[#1a2b4a] text-white rounded-t-xl">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-white">{sd.state_name}</CardTitle>
            <p className="text-slate-300 text-sm mt-1">Concealed Carry Reciprocity Map and Gun Laws</p>
            {status && (
              <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                <Shield className="w-3 h-3" />
                {homeState ? `Carry with ${homeState} permit: ` : ""}{status.label}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Color Legend */}
        {homeState && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Carry allowed with my {homeState} permit?</p>
            <div className="flex flex-wrap gap-2">
              {[
                { color: "bg-red-500", label: "No" },
                { color: "bg-gray-400", label: "Yes – Selected States" },
                { color: "bg-green-500", label: "Yes" },
                { color: "bg-blue-500", label: "Yes – Constitutional Carry, Check Ages" },
                { color: "bg-orange-400", label: "Yes – Other Restrictions" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className={`w-3 h-3 rounded-sm ${color}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Stats */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">Key Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatItem label="States Honoring This Permit" value={recipStates.length} />
            <StatItem label="Min Age to CC" value={sd.min_age} />
            <StatItem label="Reciprocating States" value={honorsStates.length} />
            <StatItem label="Permit Required" value={sd.permit_required ? "Yes" : "No"} />
            <StatItem label="Constitutional Carry" value={sd.constitutional_carry ? "Yes" : "No"} />
            <StatItem label="Open Carry" value={sd.open_carry ? "Yes" : "No"} />
            <StatItem label="Permit Type" value={sd.permit_type} />
            <StatItem label="Processing Time" value={sd.processing_time} />
          </div>
        </div>

        {/* Permit Details */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">Permit Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <StatItem label="Permit Fee" value={sd.permit_fee} />
            <StatItem label="Training Required" value={sd.training_required} />
            <StatItem label="Red Flag Law" value={sd.red_flag_law ? "Yes" : "No"} />
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">Summary of Gun Laws</h3>
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{sd.summary}</p>
        </div>

        {/* Carry Locations */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-2">Carry Locations</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {CARRY_LOCATIONS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded border border-slate-100 text-sm">
                <span className="text-slate-600">{label}</span>
                <YesNo val={carryData[key]} />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1.5">*Location data is approximate. Always verify locally.</p>
        </div>

        {/* Recent Enacted Law Changes */}
        {sd.recent_changes && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-2">
            <Bell className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-orange-800 mb-0.5">Recent Law Changes (Last 90 Days — Enacted)</p>
              <p className="text-xs text-orange-700 leading-relaxed">{sd.recent_changes}</p>
            </div>
          </div>
        )}

        {/* Expandable Sections */}
        <div className="space-y-2">
          <AccordionSection title="Reciprocity – States That Honor This Permit">
            {recipStates.length > 0
              ? <p className="text-slate-700 font-medium">{recipStates.join(", ")}</p>
              : <p className="text-slate-500 italic">No states honor this permit for concealed carry.</p>}
          </AccordionSection>
          <AccordionSection title="License Information">
            <p><strong>Permit Type:</strong> {sd.permit_type}</p>
            <p><strong>Permit Fee:</strong> {sd.permit_fee}</p>
            <p><strong>Processing Time:</strong> {sd.processing_time}</p>
            {sd.official_source_url && (
              <a href={sd.official_source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Official State Website
              </a>
            )}
          </AccordionSection>
          <AccordionSection title="Required Training">
            <p>{sd.training_required || "No training required for permitless carry."}</p>
          </AccordionSection>
          <AccordionSection title="Self Defense Laws">
            <p>{sd.self_defense_laws || "Contact state authorities for self-defense law details."}</p>
          </AccordionSection>
          {sd.notes && (
            <AccordionSection title="Key Restrictions & Notes">
              <p>{sd.notes}</p>
            </AccordionSection>
          )}
          <AccordionSection title="States This State Honors">
            {honorsStates.length > 0
              ? <p className="text-slate-700 font-medium">{honorsStates.join(", ")}</p>
              : <p className="text-slate-500 italic">Does not honor out-of-state permits.</p>}
          </AccordionSection>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            This information is for reference only and is not legal advice. Concealed carry laws change frequently. 
            Always verify current laws with official state sources before carrying. Nationwide Police Services LLC is not 
            responsible for accuracy of this information. <strong>Last updated: {lastUpdated}</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}