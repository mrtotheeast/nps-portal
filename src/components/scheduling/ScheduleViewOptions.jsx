import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ScheduleViewOptions({ viewMode, onViewModeChange, arrangeBy, onArrangeByChange }) {
  const modes = ["day", "twoweek", "week", "month"];
  const labels = { day: "Day", twoweek: "2 Week", week: "Week", month: "Month" };
  return (
    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6 p-4 bg-white rounded-lg border">
      <div className="flex gap-2">
        {modes.map(m => (
          <Button key={m} variant={viewMode === m ? "default" : "outline"} onClick={() => onViewModeChange(m)} className={viewMode === m ? "bg-[#c9a227] text-[#1a2b4a]" : ""}>{labels[m]}</Button>
        ))}
      </div>
      <div className="w-full md:w-48">
        <Select value={arrangeBy} onValueChange={onArrangeByChange}>
          <SelectTrigger><SelectValue placeholder="Arrange by..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="user">By User</SelectItem>
            <SelectItem value="position">By Position</SelectItem>
            <SelectItem value="site">By Site</SelectItem>
            <SelectItem value="date">By Date</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}