import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Edit, Copy, Trash2, Loader2, CheckCircle, Eye, Settings, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ICON_COLORS = {
  "#6366f1": "bg-indigo-100 text-indigo-700", "#059669": "bg-emerald-100 text-emerald-700",
  "#0891b2": "bg-cyan-100 text-cyan-700", "#d97706": "bg-amber-100 text-amber-700",
  "#0f766e": "bg-teal-100 text-teal-700", "#7c3aed": "bg-violet-100 text-violet-700",
  "#1a2b4a": "bg-slate-100 text-slate-700", "#c9a227": "bg-yellow-100 text-yellow-700",
};

export default function RoleCard({ role, isGenerating, onGenerate, onEdit, onEditModules, onDuplicate, onDelete }) {
  const navigate = useNavigate();
  const colorClass = ICON_COLORS[role.color] || "bg-slate-100 text-slate-700";
  const isGenerated = !role._notGenerated;

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: role.color || "#1a2b4a" }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${colorClass}`}>{role.display_name?.charAt(0) || "R"}</div>
            <div><h3 className="font-semibold text-slate-900">{role.display_name}</h3><p className="text-xs text-slate-500">{role.department || "General"}</p></div>
          </div>
          <div className="flex items-center gap-1">
            {isGenerated ? <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge> : <Badge variant="outline" className="text-xs">Not Generated</Badge>}
            {role.ai_generated && <Badge className="bg-purple-100 text-purple-700 text-xs ml-1"><Sparkles className="w-3 h-3 mr-1" />AI</Badge>}
          </div>
        </div>
        {role.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{role.description}</p>}
        {isGenerated && role.modules && <p className="text-xs text-slate-500 mb-3">{role.modules.length} modules configured</p>}
        <div className="flex flex-wrap gap-2">
          {isGenerated ? (
            <>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => navigate(createPageUrl(`RoleWorkspaceView?role=${role.role_type}`))}><Eye className="w-3 h-3 mr-1" />View</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={onEdit}><Settings className="w-3 h-3 mr-1" />Edit</Button>
              {onEditModules && <Button size="sm" variant="outline" className="text-xs" onClick={onEditModules}><Layers className="w-3 h-3 mr-1" />Modules</Button>}
              <Button size="sm" variant="outline" className="text-xs" onClick={onDuplicate}><Copy className="w-3 h-3 mr-1" />Duplicate</Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={onGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}Regenerate
              </Button>
            </>
          ) : (
            <Button size="sm" className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] text-xs" onClick={onGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
              {isGenerating ? "Generating..." : "Generate Workspace"}
            </Button>
          )}
          {onDelete && <Button size="sm" variant="ghost" className="text-xs text-red-500 hover:text-red-700" onClick={onDelete}><Trash2 className="w-3 h-3" /></Button>}
        </div>
      </CardContent>
    </Card>
  );
}