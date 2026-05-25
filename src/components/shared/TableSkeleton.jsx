import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="space-y-2 p-4">
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array(cols).fill(0).map((_, j) => (
            <Skeleton key={j} className="h-12 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}