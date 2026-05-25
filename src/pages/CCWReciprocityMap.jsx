import React, { useState, useMemo, useRef } from "react";
import { Search, X, ChevronDown, ChevronUp, Map, Filter, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import USMapSVG from "@/components/ccw/USMapSVG";
import StateDetailPanel from "@/components/ccw/StateDetailPanel";
import StateModal from "@/components/ccw/StateModal";
import { CCW_STATES } from "@/components/ccw/ccwStateData";

const STATE_LIST = Object.values(CCW_STATES)
  .map(s => ({ code: s.state_code, name: s.state_name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const LEGEND = [
  { color: "#c9a227", label: "Your State",        desc: "Home / selected permit state" },
  { color: "#16a34a", label: "Carry Allowed",      desc: "Your permit is fully honored here" },
  { color: "#2563eb", label: "Constitutional Carry", desc: "No permit required — anyone may carry" },
  { color: "#ea580c", label: "Restricted",          desc: "Reciprocity with conditions — verify first" },
  { color: "#dc2626", label: "Not Honored",         desc: "Your permit is NOT recognized here" },
  { color: "#e5e7eb", label: "No Selection",        desc: "Select a home state to see coverage" },
];

const PERMIT_FILTERS = [
  { value: "all",        label: "All States" },
  { value: "permitless", label: "Permitless / Constitutional Carry" },
  { value: "shall-issue",label: "Shall Issue" },
  { value: "may-issue",  label: "May Issue" },
  { value: "no-issue",   label: "No Issue" },
];

export default function CCWReciprocityMap() {
  const [homeState, setHomeState]             = useState("");
  const [selectedStates, setSelectedStates]   = useState([]);
  const [selectedState, setSelectedState]     = useState(null);
  const [modalState, setModalState]           = useState(null);   // drives the modal
  const [searchTerm, setSearchTerm]           = useState("");
  const [searchResults, setSearchResults]     = useState([]);
  const [searchHighlight, setSearchHighlight] = useState(null);
  const [showPermitList, setShowPermitList]   = useState(false);
  const [permitFilter, setPermitFilter]       = useState("all");
  const detailRef = useRef(null);
  const searchRef = useRef(null);

  const handleStateClick = (code) => {
    setSelectedState(code);
    setModalState(code);   // open modal on click
  };

  const handleSearch = (val) => {
    setSearchTerm(val);
    if (!val.trim()) { setSearchHighlight(null); setSearchResults([]); return; }
    const lower = val.toLowerCase();
    const results = STATE_LIST.filter(s =>
      s.name.toLowerCase().includes(lower) || s.code.toLowerCase().includes(lower)
    ).slice(0, 6);
    setSearchResults(results);
    if (results.length > 0) setSearchHighlight(results[0].code);
  };

  const selectSearchResult = (code, name) => {
    setSearchTerm(name);
    setSearchHighlight(code);
    setSelectedState(code);
    setModalState(code);
    setSearchResults([]);
  };

  const togglePermitState = (code) => {
    setSelectedStates(prev =>
      prev.includes(code) ? prev.filter(s => s !== code) : [...prev, code]
    );
  };

  const allSelected = selectedStates.length > 0 ? selectedStates : (homeState ? [homeState] : []);

  const coverageCount = useMemo(() => {
    if (!allSelected.length) return 0;
    return Object.keys(CCW_STATES).filter(code => {
      if (allSelected.includes(code)) return false;
      const sd = CCW_STATES[code];
      if (sd?.constitutional_carry) return true;
      for (const hs of allSelected) {
        const hsData = CCW_STATES[hs];
        if (!hsData) continue;
        if ((hsData.honored_by_these_states || []).includes(code)) return true;
        if ((hsData.restricted_reciprocity_states || []).includes(code)) return true;
      }
      return false;
    }).length;
  }, [allSelected]);

  const selectedStateData = selectedState ? CCW_STATES[selectedState] : null;
  const homeStateData     = homeState     ? CCW_STATES[homeState]     : null;
  const modalStateData    = modalState    ? CCW_STATES[modalState]    : null;

  const handlePrint = () => {
    if (!selectedStateData) return;
    const win = window.open("", "_blank");
    const hs  = homeState ? CCW_STATES[homeState] : null;
    win.document.write(`
      <html><head><title>CCW Reference – ${selectedStateData.state_name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 32px; color: #111; }
        h1 { color: #1a2b4a; border-bottom: 3px solid #c9a227; padding-bottom: 8px; }
        h2 { color: #1a2b4a; margin-top: 24px; }
        .badge { display: inline-block; background: #c9a227; color: #1a2b4a; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 13px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
        .stat { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; }
        .stat label { font-size: 11px; color: #64748b; display: block; }
        .stat span { font-weight: bold; font-size: 15px; }
        .disclaimer { background: #fffbeb; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; font-size: 12px; margin-top: 24px; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <div class="badge">Nationwide Police Services — CCW Reference Guide</div>
      <h1>${selectedStateData.state_name} — Concealed Carry Laws</h1>
      ${hs ? `<p><strong>Viewing from:</strong> ${hs.state_name} permit holder perspective</p>` : ""}
      <h2>Key Statistics</h2>
      <div class="grid">
        <div class="stat"><label>Permit Required</label><span>${selectedStateData.permit_required ? "Yes" : "No"}</span></div>
        <div class="stat"><label>Constitutional Carry</label><span>${selectedStateData.constitutional_carry ? "Yes" : "No"}</span></div>
        <div class="stat"><label>Open Carry</label><span>${selectedStateData.open_carry ? "Yes" : "No"}</span></div>
        <div class="stat"><label>Minimum Age</label><span>${selectedStateData.min_age}</span></div>
        <div class="stat"><label>Permit Type</label><span>${selectedStateData.permit_type || "N/A"}</span></div>
        <div class="stat"><label>Red Flag Law</label><span>${selectedStateData.red_flag_law ? "Yes" : "No"}</span></div>
        <div class="stat"><label>States Honoring This Permit</label><span>${(selectedStateData.honored_by_these_states || []).length}</span></div>
        <div class="stat"><label>Processing Time</label><span>${selectedStateData.processing_time || "N/A"}</span></div>
      </div>
      <h2>Summary of Gun Laws</h2>
      <p>${selectedStateData.summary || "No summary available."}</p>
      <h2>Reciprocity</h2>
      <p><strong>States honoring this permit:</strong> ${(selectedStateData.honored_by_these_states || []).join(", ") || "None"}</p>
      <p><strong>States this state honors:</strong> ${(selectedStateData.honors_these_states || []).join(", ") || "None"}</p>
      <div class="disclaimer">
        <strong>Legal Disclaimer:</strong> This information is for reference only and is not legal advice.
        Concealed carry laws change frequently. Always verify current laws with official state sources before carrying.
        Nationwide Police Services LLC is not responsible for accuracy. Last updated: ${selectedStateData.last_updated || "2025-01-01"}.
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-[#1a2b4a] text-white px-4 py-5 md:px-8">
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Map className="w-7 h-7 text-[#c9a227]" />
              CCW Reciprocity Map
            </h1>
            <p className="text-slate-300 text-sm mt-1">Concealed Carry Weapon laws &amp; state-to-state reciprocity reference</p>
          </div>
          {allSelected.length > 0 && (
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-[#c9a227]">{coverageCount}</div>
              <div className="text-xs text-slate-300">States with carry coverage</div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 space-y-4">

        {/* Controls row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Home State Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Select Your State</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              value={homeState}
              onChange={e => { setHomeState(e.target.value); setSelectedStates([]); }}
            >
              <option value="">— Select your home state —</option>
              {STATE_LIST.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>

          {/* Permit type filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Highlight by Permit Type
            </label>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              value={permitFilter}
              onChange={e => setPermitFilter(e.target.value)}
            >
              {PERMIT_FILTERS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Search State</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 pr-9"
                placeholder="Type state name or abbreviation…"
                value={searchTerm}
                onChange={e => handleSearch(e.target.value)}
                autoComplete="off"
              />
              {searchTerm && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => { setSearchTerm(""); setSearchHighlight(null); setSearchResults([]); }}>
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl overflow-hidden">
                {searchResults.map(s => (
                  <button
                    key={s.code}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                    onClick={() => selectSearchResult(s.code, s.name)}
                  >
                    <span className="font-bold text-[#c9a227] w-8">{s.code}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi-permit accordion trigger */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Multiple Permits</label>
            <Button
              variant="outline"
              className="w-full justify-between border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10 dark:border-[#c9a227] dark:text-[#c9a227]"
              onClick={() => setShowPermitList(!showPermitList)}
            >
              <span className="text-sm font-semibold">
                {selectedStates.length > 0 ? `${selectedStates.length} permit${selectedStates.length > 1 ? "s" : ""} selected` : "Select Multiple States"}
              </span>
              {showPermitList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Active filter badge */}
        {permitFilter !== "all" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Highlighting:</span>
            <span className="inline-flex items-center gap-1 bg-[#1a2b4a] text-[#c9a227] text-xs font-semibold px-3 py-1 rounded-full">
              <Filter className="w-3 h-3" />
              {PERMIT_FILTERS.find(f => f.value === permitFilter)?.label}
              <button className="ml-1 hover:opacity-70" onClick={() => setPermitFilter("all")}>
                <X className="w-3 h-3" />
              </button>
            </span>
            <span className="text-xs text-slate-400">— other states are dimmed</span>
          </div>
        )}

        {/* Multi-permit state checklist */}
        {showPermitList && (
          <div className="bg-white dark:bg-slate-800 border border-[#c9a227]/30 rounded-xl p-4 shadow-sm">
            <div className="mb-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
              Have permits from more than one state? Select all that apply — the map will show your combined coverage.
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{selectedStates.length} selected</span>
              <button className="text-xs text-[#c9a227] hover:underline font-semibold" onClick={() => setSelectedStates([])}>Clear all</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {STATE_LIST.map(s => (
                <label
                  key={s.code}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors border ${
                    selectedStates.includes(s.code)
                      ? "bg-[#c9a227]/10 border-[#c9a227] text-[#1a2b4a] dark:text-[#c9a227] font-bold"
                      : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <input type="checkbox" className="accent-[#c9a227]" checked={selectedStates.includes(s.code)} onChange={() => togglePermitState(s.code)} />
                  <span className="font-semibold">{s.code}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Map */}
        <div className="rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <USMapSVG
            statesData={CCW_STATES}
            homeState={homeState}
            selectedStates={allSelected}
            selectedState={selectedState}
            onStateClick={handleStateClick}
            searchHighlight={searchHighlight}
            permitFilter={permitFilter}
          />
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Map Legend</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {LEGEND.map(({ color, label, desc }) => (
              <div key={label} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded flex-shrink-0 mt-0.5 border border-black/10" style={{ backgroundColor: color }} />
                <div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-snug">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* State detail panel (below map) */}
        <div ref={detailRef} className="scroll-mt-4">
          {selectedStateData ? (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  {selectedStateData.state_name} — Details
                </h2>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600">
                  <Printer className="w-4 h-4" />
                  Print / Save PDF
                </Button>
              </div>
              <StateDetailPanel
                stateCode={selectedState}
                stateData={selectedStateData}
                homeState={homeState}
                homeStateData={homeStateData}
                onClose={() => setSelectedState(null)}
                allHomeStates={allSelected}
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
              <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Click any state on the map to view its laws and reciprocity details</p>
              {!homeState && (
                <p className="text-sm mt-1 text-slate-400">Select your home state above to see color-coded carry coverage across the US</p>
              )}
            </div>
          )}
        </div>

        {/* Legal disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
          <strong>Legal Disclaimer:</strong> This CCW Reciprocity Map is provided for informational purposes only and does not constitute legal advice.
          Concealed carry laws change frequently. Always verify current laws with official state sources before carrying.
          Nationwide Police Services LLC is not responsible for the accuracy or completeness of this information.
        </div>

      </div>

      {/* State click modal */}
      {modalState && modalStateData && (
        <StateModal
          stateCode={modalState}
          stateData={modalStateData}
          homeState={homeState}
          homeStateData={homeStateData}
          allHomeStates={allSelected}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}