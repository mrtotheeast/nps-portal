import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_CLASSES = {
  blue: "bg-slate-100 text-slate-600", gold: "bg-[#c9a227]/10 text-[#c9a227]",
  green: "bg-slate-100 text-slate-600", red: "bg-slate-100 text-slate-700",
  purple: "bg-slate-100 text-slate-600", navy: "bg-slate-100 text-slate-700",
};

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = "blue", onClick }) {
  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300", onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-0.5")} onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
            {trend && <div className={cn("flex items-center gap-1 text-sm mt-2", trendUp ? "text-[#c9a227]" : "text-slate-500")}><span>{trend}</span></div>}
          </div>
          {Icon && <div className={cn("p-3 rounded-xl", COLOR_CLASSES[color])}><Icon className="w-6 h-6" /></div>}
        </div>
      </CardContent>
    </Card>
  );
}