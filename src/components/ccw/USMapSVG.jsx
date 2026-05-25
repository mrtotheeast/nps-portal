import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Annotation } from "react-simple-maps";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const FIPS_TO_STATE = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL",
  "18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD",
  "25":"MA","26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE",
  "32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND",
  "39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD",
  "47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV",
  "55":"WI","56":"WY"
};

const COLOR_MAP = {
  default: "#e5e7eb",   // no selection — light gray
  gold:    "#c9a227",   // home state
  green:   "#16a34a",   // full reciprocity
  blue:    "#2563eb",   // constitutional carry
  orange:  "#ea580c",   // restricted
  red:     "#dc2626",   // no carry
};

function getStateColor(stateCode, homeState, selectedStates, statesData) {
  const noSelection = !homeState && (!selectedStates || selectedStates.length === 0);
  if (noSelection) return COLOR_MAP.default;

  const allSelected = selectedStates.length > 0 ? selectedStates : (homeState ? [homeState] : []);
  if (allSelected.includes(stateCode)) return COLOR_MAP.gold;

  const sd = statesData[stateCode];
  if (!sd) return COLOR_MAP.default;

  for (const hs of allSelected) {
    if (hs === stateCode) continue;
    const hsData = statesData[hs];
    if (!hsData) continue;
    if (sd.constitutional_carry) return COLOR_MAP.blue;
    const honored = hsData?.honored_by_these_states || [];
    const restricted = hsData?.restricted_reciprocity_states || [];
    if (honored.includes(stateCode)) return COLOR_MAP.green;
    if (restricted.includes(stateCode)) return COLOR_MAP.orange;
  }

  if (sd.constitutional_carry) return COLOR_MAP.blue;
  return COLOR_MAP.red;
}

const RECIPROCITY_CATEGORY_LABEL = {
  "permitless": "Permitless / Constitutional Carry",
  "shall-issue": "Shall Issue",
  "may-issue": "May Issue",
  "no-issue": "No Issue",
};

function getReciprocityLabel(stateCode, homeState, allSelected, statesData) {
  const sd = statesData[stateCode];
  if (!sd) return null;
  if (allSelected.includes(stateCode)) return "Your home/selected state";
  if (!homeState && allSelected.length === 0) {
    const pt = sd.constitutional_carry ? "permitless" : (sd.permit_type || "unknown");
    return RECIPROCITY_CATEGORY_LABEL[pt] || pt;
  }
  if (sd.constitutional_carry) return "Constitutional Carry — carry permitted";
  for (const hs of allSelected) {
    if (hs === stateCode) continue;
    const hsData = statesData[hs];
    if (!hsData) continue;
    if ((hsData.honored_by_these_states || []).includes(stateCode)) return "✓ Carry allowed with your permit";
    if ((hsData.restricted_reciprocity_states || []).includes(stateCode)) return "⚠ Restricted reciprocity";
  }
  return "✗ Carry NOT allowed with your permit";
}

export default function USMapSVG({ statesData, homeState, selectedStates = [], selectedState, onStateClick, searchHighlight, permitFilter }) {
  const [position, setPosition] = useState({ coordinates: [-96, 38], zoom: 1 });
  const [tooltip, setTooltip] = useState(null); // { stateCode, x, y }

  const allSelected = selectedStates.length > 0 ? selectedStates : (homeState ? [homeState] : []);

  const handleMoveEnd = (pos) => setPosition(pos);

  const noSelection = !homeState && (!selectedStates || selectedStates.length === 0);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ minHeight: 380, background: "#f0f7ff" }}
      onMouseLeave={() => setTooltip(null)}
    >
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: "100%", height: "auto" }}
        projectionConfig={{ scale: 1000 }}
      >
        <ZoomableGroup
          zoom={position.zoom}
          center={position.coordinates}
          onMoveEnd={handleMoveEnd}
          maxZoom={4}
          minZoom={1}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateCode = FIPS_TO_STATE[geo.id];
                if (!stateCode) return null;

                // Permit filter dimming
                const sd = statesData[stateCode];
                const permitType = sd?.constitutional_carry ? "permitless" : (sd?.permit_type || "");
                const dimmed = permitFilter && permitFilter !== "all" && permitType !== permitFilter;

                const color = getStateColor(stateCode, homeState, allSelected, statesData);
                const isSelected = selectedState === stateCode;
                const isSearchHL = searchHighlight === stateCode;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => onStateClick(stateCode)}
                    onMouseEnter={(e) => {
                      setTooltip({ stateCode, x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : t);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: {
                        fill: color,
                        stroke: isSelected ? "#1a2b4a" : isSearchHL ? "#fbbf24" : (noSelection ? "#9ca3af" : "#ffffff"),
                        strokeWidth: isSelected ? 2.5 : isSearchHL ? 2.5 : (noSelection ? 0.8 : 0.7),
                        outline: "none",
                        cursor: "pointer",
                        opacity: dimmed ? 0.2 : 1,
                        transition: "fill 0.25s ease, opacity 0.2s ease",
                      },
                      hover: {
                        fill: color,
                        stroke: "#1a2b4a",
                        strokeWidth: 1.8,
                        outline: "none",
                        cursor: "pointer",
                        opacity: dimmed ? 0.3 : 0.82,
                      },
                      pressed: {
                        fill: color,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom + Reset controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          className="w-8 h-8 bg-white/90 text-slate-800 font-bold text-lg rounded shadow hover:bg-white flex items-center justify-center"
          title="Zoom in"
          onClick={() => setPosition(p => ({ ...p, zoom: Math.min(4, p.zoom * 1.4) }))}
        >+</button>
        <button
          className="w-8 h-8 bg-white/90 text-slate-800 font-bold text-lg rounded shadow hover:bg-white flex items-center justify-center"
          title="Zoom out"
          onClick={() => setPosition(p => ({ ...p, zoom: Math.max(1, p.zoom / 1.4) }))}
        >−</button>
        <button
          className={`w-8 h-8 text-xs rounded shadow flex items-center justify-center font-bold transition-colors ${
            position.zoom !== 1 || position.coordinates[0] !== -96
              ? "bg-[#c9a227] text-[#1a2b4a] hover:bg-[#e6c35c]"
              : "bg-white/40 text-slate-500 cursor-default"
          }`}
          onClick={() => setPosition({ coordinates: [-96, 38], zoom: 1 })}
          title="Reset to national view"
        >⊙</button>
      </div>

      {/* Search pulse overlay hint */}
      {searchHighlight && statesData[searchHighlight] && (
        <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs px-3 py-1.5 rounded pointer-events-none font-semibold animate-pulse">
          📍 {statesData[searchHighlight].state_name}
        </div>
      )}

      {/* Hover tooltip — follows cursor via fixed positioning */}
      {tooltip && statesData[tooltip.stateCode] && (() => {
        const sd = statesData[tooltip.stateCode];
        const label = getReciprocityLabel(tooltip.stateCode, homeState, allSelected, statesData);
        const permitType = sd.constitutional_carry ? "permitless" : (sd.permit_type || "");
        return (
          <div
            className="fixed z-50 pointer-events-none"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <div className="bg-[#1a2b4a] text-white text-xs rounded-lg shadow-xl px-3 py-2 max-w-[220px] border border-white/10">
              <div className="font-bold text-sm text-[#c9a227] mb-0.5">{sd.state_name}</div>
              {label && <div className="text-slate-300 leading-snug">{label}</div>}
              <div className="mt-1 flex flex-wrap gap-1">
                {sd.constitutional_carry && (
                  <span className="bg-blue-500/30 text-blue-200 text-[10px] px-1.5 py-0.5 rounded">Constitutional Carry</span>
                )}
                {sd.permit_type && !sd.constitutional_carry && (
                  <span className="bg-slate-600 text-slate-200 text-[10px] px-1.5 py-0.5 rounded capitalize">{sd.permit_type}</span>
                )}
                {sd.open_carry && (
                  <span className="bg-slate-600 text-slate-200 text-[10px] px-1.5 py-0.5 rounded">Open Carry</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Click for full details</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}