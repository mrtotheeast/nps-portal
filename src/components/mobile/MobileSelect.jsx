import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BottomSheet from "@/components/mobile/BottomSheet";
import { Button } from "@/components/ui/button";

export default function MobileSelect({ value, onValueChange, placeholder = "Select...", options = [], trigger, title, className }) {
  const selectedOption = options.find(opt => opt.value === value);
  return (
    <>
      <div className="md:hidden">
        <BottomSheet
          trigger={trigger || <Button variant="outline" className={`w-full justify-start min-h-[44px] ${className}`}>{selectedOption?.label || placeholder}</Button>}
          title={title || placeholder} options={options} value={value} onSelect={onValueChange}
        />
      </div>
      <div className="hidden md:block">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={className}><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </>
  );
}