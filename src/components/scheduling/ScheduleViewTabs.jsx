import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MapPin, Briefcase } from "lucide-react";

export default function ScheduleViewTabs({ activeView, onViewChange, viewMode, onViewModeChange }) {
  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={onViewChange}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="user" className="flex items-center gap-2"><Users className="w-4 h-4" />By User</TabsTrigger>
          <TabsTrigger value="site" className="flex items-center gap-2"><MapPin className="w-4 h-4" />By Site</TabsTrigger>
          <TabsTrigger value="position" className="flex items-center gap-2"><Briefcase className="w-4 h-4" />By Position</TabsTrigger>
        </TabsList>
      </Tabs>
      <Tabs value={viewMode} onValueChange={onViewModeChange}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="biweekly">Bi-Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}