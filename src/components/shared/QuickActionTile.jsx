import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  slate: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
  gold: "bg-[#c9a227]/10 text-[#c9a227] hover:bg-[#c9a227]/20 hover:shadow-md",
  navy: "bg-[#1a2b4a] text-white hover:bg-[#2d4a6f] hover:shadow-md",
  blue: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
  green: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
  red: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
  purple: "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md",
};

export default function QuickActionTile({ title, icon: Icon, page, color = "slate", badge, onClick }) {
  const Content = () => (
    <div className={cn("relative flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 cursor-pointer aspect-square", COLOR_CLASSES[color])}>
      {badge && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">{badge}</span>}
      <Icon className="w-7 h-7 mb-2" />
      <span className="text-sm font-medium text-center leading-tight">{title}</span>
    </div>
  );
  if (onClick) return <div onClick={onClick}><Content /></div>;
  return <Link to={createPageUrl(page)}><Content /></Link>;
}