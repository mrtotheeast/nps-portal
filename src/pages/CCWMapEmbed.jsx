import React, { useState, useMemo, useRef } from "react";
import { Search, X, ChevronDown, ChevronUp, Filter, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import USMapSVG from "@/components/ccw/USMapSVG";
import StateDetailPanel from "@/components/ccw/StateDetailPanel";
import { CCW_STATES } from "@/components/ccw/ccwStateData";

const STATE_LIST = Object.values(CCW_STATES)
  .map(s => ({ code: s.state_code, name: s.state_name }))
  .sort((a, b) => a.name.localeCompare(b.name));

const PERMIT_FILTERS = [
  { value: "all",         label: "All States" },
  { value: "permitless",  label: "Permitless / Constitutional Carry" },
  { value: "shall-issue", label: "Shall Issue" },
  { value: "may-issue",   label: "May Issue" },
  { value: "no-issue",    label: "No Issue" },
];

export default function CCWMapEmbed() {
  const [homeState, setHomeState]             = useState("");
  const [selectedStates, setSelectedStates]   = useState([]);
  const [selectedState, setSelectedState]     = useState(null);
  const [searchTerm, setSearchTerm]           = useState("");
  const [searchResults, setSearchResults]     = useState([]);
  const [searchHighlight, setSearchHighlight] = useState(null);
  const [showPermitList, setShowPermitList]   = useState(false);
  const [permitFilter, setPermitFilter]       = useState("all");
  const searchRef = useRef(null);
  const detailRef = useRef(null);

  const handleStateClick = (code) => {
    setSelectedState(code);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
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

  return (
    <div className="w-full min-h-screen bg-white" style={{ margin: 0, padding: 0 }}>
      <div className="w-full p-3 space-y-3">

        {/* Controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Home State */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Your Home State</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
              value={homeState}
              onChange={e => { setHomeState(e.target.value); setSelectedStates([]); }}
            >
              <option value="">— Select your home state —</option>
              {STATE_LIST.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>

          {/* Permit filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Permit Type Filter
            </label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#c9a227]"
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
            <label className="block text-xs font-semibold text-slate-600 mb-1">Search State</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                className="pl-9 pr-9"
                placeholder="State name or abbreviation…"
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
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                {searchResults.map(s => (
                  <button
                    key={s.code}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    onClick={() => selectSearchResult(s.code, s.name)}
                  >
                    <span className="font-bold text-[#c9a227] w-8">{s.code}</span>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Multi-permit */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Multiple Permits</label>
            <Button
              variant="outline"
              className="w-full justify-between border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227]/10"
              onClick={() => setShowPermitList(!showPermitList)}
            >
              <span className="text-sm font-semibold">
                {selectedStates.length > 0 ? `${selectedStates.length} permit${selectedStates.length > 1 ? "s" : ""} selected` : "Select Multiple States"}
              </span>
              {showPermitList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Coverage badge */}
        {allSelected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 bg-[#1a2b4a] text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="text-[#c9a227] text-sm font-bold">{coverageCount}</span>
              states with carry coverage
            </span>
          </div>
        )}

        {/* Multi-permit checklist */}
        {showPermitList && (
          <div className="bg-white border border-[#c9a227]/30 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">{selectedStates.length} selected</span>
              <button className="text-xs text-[#c9a227] hover:underline font-semibold" onClick={() => setSelectedStates([])}>Clear all</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {STATE_LIST.map(s => (
                <label
                  key={s.code}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors border ${
                    selectedStates.includes(s.code)
                      ? "bg-[#c9a227]/10 border-[#c9a227] text-[#1a2b4a] font-bold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
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
        <div className="rounded-xl overflow-hidden border border-slate-200">
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

        {/* State detail panel */}
        <div ref={detailRef} className="scroll-mt-2">
          {selectedStateData ? (
            <StateDetailPanel
              stateCode={selectedState}
              stateData={selectedStateData}
              homeState={homeState}
              homeStateData={homeStateData}
              onClose={() => setSelectedState(null)}
              allHomeStates={allSelected}
            />
          ) : (
            <div className="border border-slate-200 rounded-xl p-8 text-center text-slate-400">
              <Map className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Click any state on the map to view its laws and reciprocity details</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}