import React from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/shared/Breadcrumb";

export default function PageHeader({ title, subtitle, action, actionLabel = "Add New", actionIcon: ActionIcon = Plus, showBack = true, onBack, currentPage }) {
  const navigate = useNavigate();
  // Always show back button unless explicitly disabled
  const autoBack = showBack;
  const handleBack = () => onBack ? onBack() : navigate(-1);

  return (
    <>
      {currentPage && <Breadcrumb currentPage={currentPage} />}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {autoBack && <Button variant="ghost" size="icon" onClick={handleBack} className="text-slate-600 hover:text-slate-900 -ml-1 min-h-[44px] min-w-[44px]"><ArrowLeft className="w-5 h-5" /></Button>}
              <div>
                <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
              </div>
            </div>
            {action && <Button onClick={action} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold"><ActionIcon className="w-4 h-4 mr-2" />{actionLabel}</Button>}
          </div>
        </div>
      </div>
    </>
  );
}