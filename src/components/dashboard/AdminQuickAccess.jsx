import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Award, ClipboardList, ChevronRight, ChevronLeft, Zap } from "lucide-react";
import { createPageUrl } from "@/utils";

const QUICK_LINKS = [
  { label: "Badge Management", icon: Award, page: "BadgeManagement", color: "#c9a227" },
  { label: "Audit Log", icon: ClipboardList, page: "AuditLog", color: "#1a2b4a" },
];

export default function AdminQuickAccess() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-stretch transition-all duration-200 ${
        collapsed ? "w-9" : "w-44"
      }`}
    >
      {/* Toggle tab */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center w-9 flex-shrink-0 bg-[#1a2b4a] text-[#c9a227] rounded-l-lg shadow-lg hover:bg-[#2d4a6f] transition-colors"
        title={collapsed ? "Open quick access" : "Close quick access"}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <Zap className="w-4 h-4" />
          </div>
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Panel */}
      {!collapsed && (
        <div className="bg-white border border-l-0 border-slate-200 rounded-r-lg shadow-lg flex flex-col overflow-hidden">
          <div className="px-3 py-2 bg-[#1a2b4a] text-[#c9a227] text-xs font-bold tracking-wide">
            QUICK ACCESS
          </div>
          {QUICK_LINKS.map(({ label, icon: Icon, page, color }) => (
            <button
              key={page}
              onClick={() => navigate(createPageUrl(page))}
              className="flex items-center gap-2 px-3 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 leading-tight">
                {label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}