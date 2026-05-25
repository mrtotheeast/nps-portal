import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ children, error, resetError }) {
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center p-6">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h2>
          <p className="text-red-700 mb-4 text-sm">{error?.message || "An error occurred while loading this page."}</p>
          {resetError && <Button onClick={resetError} className="gap-2"><RotateCw className="w-4 h-4" />Try again</Button>}
        </div>
      </div>
    );
  }
  return children;
}