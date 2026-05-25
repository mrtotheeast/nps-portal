import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({ page, pageSize, total, onPageChange, isLoading }) {
  const totalPages = Math.ceil(total / pageSize);
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  return (
    <div className="flex items-center justify-between py-4 px-2 border-t bg-slate-50">
      <div className="text-sm text-slate-600">
        Page {page} of {totalPages} • {total} total
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoBack || isLoading}
          className="gap-1 min-h-[40px]"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoForward || isLoading}
          className="gap-1 min-h-[40px]"
        >
          Next <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}