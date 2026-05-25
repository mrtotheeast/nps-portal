import React, { useState, useRef } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0) return;
    pullDistance.current = e.touches[0].clientY - startY.current;
    if (pullDistance.current > 0 && window.scrollY === 0) { setPulling(true); e.preventDefault(); }
  };

  const handleTouchEnd = async () => {
    if (pullDistance.current > 80) { setRefreshing(true); await onRefresh(); setRefreshing(false); }
    setPulling(false); startY.current = 0; pullDistance.current = 0;
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} className="relative">
      {(pulling || refreshing) && (
        <div className="absolute top-0 left-0 right-0 flex justify-center py-4 z-50">
          <RefreshCw className={`w-6 h-6 text-[#c9a227] ${refreshing ? "animate-spin" : ""}`} />
        </div>
      )}
      <div style={{ transform: pulling ? `translateY(${Math.min(pullDistance.current, 80)}px)` : "translateY(0)", transition: pulling ? "none" : "transform 0.3s" }}>
        {children}
      </div>
    </div>
  );
}