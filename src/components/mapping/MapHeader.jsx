import React, { useState } from "react";
import { Search, MapPin, Navigation, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

export default function MapHeader({ viewMode, onViewModeChange, onSearch, onRefresh, selectedSites = [], selectedPositions = [], onSitesFilterChange, onPositionsFilterChange, sites = [], positions = [], isAdmin = false, refreshing = false }) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => { setSearchQuery(e.target.value); onSearch(e.target.value); };

  return (
    <div className="bg-white border-b sticky top-0 z-40 p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-600">View:</span>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <Button size="sm" variant={viewMode === "all" ? "default" : "ghost"} onClick={() => onViewModeChange("all")} className={viewMode === "all" ? "bg-[#1a2b4a]" : ""}><MapPin className="w-4 h-4 mr-1" />All Sites</Button>
          <Button size="sm" variant={viewMode === "single" ? "default" : "ghost"} onClick={() => onViewModeChange("single")} className={viewMode === "single" ? "bg-[#1a2b4a]" : ""}><MapPin className="w-4 h-4 mr-1" />Single Site</Button>
          {isAdmin && <Button size="sm" variant={viewMode === "patrol" ? "default" : "ghost"} onClick={() => onViewModeChange("patrol")} className={viewMode === "patrol" ? "bg-[#1a2b4a]" : ""}><Navigation className="w-4 h-4 mr-1" />Patrol</Button>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input placeholder="Search sites or officers..." value={searchQuery} onChange={handleSearch} className="pl-9 h-9" />
        </div>
        {isAdmin && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9"><Filter className="w-4 h-4 mr-1" />Sites{selectedSites.length > 0 && <Badge className="ml-2 bg-[#c9a227]">{selectedSites.length}</Badge>}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {sites.map(site => <DropdownMenuCheckboxItem key={site.id} checked={selectedSites.includes(site.id)} onCheckedChange={checked => onSitesFilterChange(checked ? [...selectedSites, site.id] : selectedSites.filter(id => id !== site.id))}>{site.name}</DropdownMenuCheckboxItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9"><Filter className="w-4 h-4 mr-1" />Positions{selectedPositions.length > 0 && <Badge className="ml-2 bg-[#c9a227]">{selectedPositions.length}</Badge>}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {positions.map(pos => <DropdownMenuCheckboxItem key={pos.id} checked={selectedPositions.includes(pos.id)} onCheckedChange={checked => onPositionsFilterChange(checked ? [...selectedPositions, pos.id] : selectedPositions.filter(id => id !== pos.id))}>{pos.name}</DropdownMenuCheckboxItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing} className="h-9"><RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /></Button>
      </div>
      <div className="flex gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-700" /><span>Sites</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span>Officers (Clocked In)</span></div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400" /><span>On Break</span></div>
      </div>
    </div>
  );
}