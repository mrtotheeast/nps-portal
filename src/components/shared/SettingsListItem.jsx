import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ChevronRight } from "lucide-react";

const COLOR_CLASSES = {
  blue: "bg-blue-50 text-blue-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600", emerald: "bg-emerald-50 text-emerald-600", cyan: "bg-cyan-50 text-cyan-600",
  pink: "bg-pink-50 text-pink-600", slate: "bg-slate-50 text-slate-600", orange: "bg-orange-50 text-orange-600", green: "bg-green-50 text-green-600",
};

export default function SettingsListItem({ icon: Icon, title, description, page, onClick, color = "blue" }) {
  const navigate = useNavigate();
  const handleClick = () => onClick ? onClick() : page && navigate(createPageUrl(page));
  return (
    <div onClick={handleClick} className="bg-white rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow border border-slate-100">
      <div className={`w-12 h-12 rounded-xl ${COLOR_CLASSES[color] || COLOR_CLASSES.blue} flex items-center justify-center shrink-0`}><Icon className="w-6 h-6" /></div>
      <div className="flex-1 min-w-0"><h3 className="font-semibold text-slate-900 text-base">{title}</h3><p className="text-sm text-slate-500 truncate">{description}</p></div>
      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
    </div>
  );
}