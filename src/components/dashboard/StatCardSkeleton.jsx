import React from "react";

export default function StatCardSkeleton() {
  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 animate-pulse">
      <div className="h-4 bg-slate-200 rounded mb-3 w-24"></div>
      <div className="h-8 bg-slate-300 rounded w-16"></div>
    </div>
  );
}