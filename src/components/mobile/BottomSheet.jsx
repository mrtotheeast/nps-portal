import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomSheet({ trigger, title, options, value, onSelect }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader><DrawerTitle>{title}</DrawerTitle></DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto">
          {options.map((option) => (
            <button key={option.value} onClick={() => { onSelect(option.value); setOpen(false); }}
              className={cn("w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
                value === option.value ? "bg-[#c9a227] text-[#1a2b4a] border-[#c9a227]" : "bg-white hover:bg-slate-50")}>
              <span>{option.label}</span>
              {value === option.value && <Check className="w-5 h-5" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}