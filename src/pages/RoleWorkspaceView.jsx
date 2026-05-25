import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users, DollarSign, Calendar, Briefcase, Shield, User, FileText,
  BarChart3, MessageSquare, Bell, Award, Clock, Map, AlertTriangle,
  GraduationCap, Receipt, Plus, Sparkles, Home, Settings, Star,
  ClipboardList, Download, FolderOpen, Upload, Building2, Zap
} from "lucide-react";

const ICON_MAP = {
  Users, DollarSign, Calendar, Briefcase, Shield, User, FileText,
  BarChart3, MessageSquare, Bell, Award, Clock, Map, AlertTriangle,
  GraduationCap, Receipt, Plus, Sparkles, Home, Settings, Star,
  ClipboardList, Download, FolderOpen, Upload, Building2, Zap
};

const MODULE_TYPE_COLORS = {
  dashboard: "border-blue-200 bg-blue-50",
  module: "border-slate-200 bg-white",
  ai_tool: "border-purple-200 bg-purple-50",
  document: "border-amber-200 bg-amber-50",
  report: "border-green-200 bg-green-50",
  quick_action: "border-teal-200 bg-teal-50"
};

const MODULE_TYPE_BADGE = {
  dashboard: "bg-blue-100 text-blue-700",
  module: "bg-slate-100 text-slate-600",
  ai_tool: "bg-purple-100 text-purple-700",
  document: "bg-amber-100 text-amber-700",
  report: "bg-green-100 text-green-700",
  quick_action: "bg-teal-100 text-teal-700"
};

export default function RoleWorkspaceView() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const roleType = urlParams.get("role");
  const [user, setUser] = useState(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadUser(); }, []);
  const loadUser = async () => { const u = await base44.auth.me(); setUser(u); };

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["role-workspaces"],
    queryFn: () => base44.entities.RoleWorkspace.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["role-audit", roleType],
    queryFn: () => base44.entities.AuditLog.filter({ entity_type: "RoleWorkspace" }, "-created_date", 10),
    enabled: !!roleType
  });

  const workspace = workspaces.find(w => w.role_type === roleType);

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for the ${workspace?.display_name || roleType} role at NPS (Nationwide Police Services). 
        
The user asks: "${aiQuery}"

Provide a helpful, concise, professional response relevant to this role's responsibilities.`
      });
      setAiResponse(result);
    } catch {
      setAiResponse("Sorry, I couldn't process that request.");
    } finally {
      setAiLoading(false);
      setAiQuery("");
    }
  };

  if (isLoading || !user) return <LoadingScreen />;
  if (!workspace) {
    return (
      <div className="min-h-screen bg-slate-50">
        <PageHeader title="Workspace Not Found" showBack />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <EmptyState
            icon={Sparkles}
            title="Workspace Not Generated"
            description="This workspace hasn't been generated yet. Go to Role Management to generate it."
            action={() => navigate(createPageUrl("RoleWorkspaceAdmin"))}
            actionLabel="Go to Role Management"
          />
        </div>
      </div>
    );
  }

  const sortedModules = [...(workspace.modules || [])].sort((a, b) => (a.position || 0) - (b.position || 0));

  return (
    <div className="min-h-screen bg-slate-50">
      <div style={{ backgroundColor: workspace.color || "#1a2b4a" }} className="text-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" className="text-white/70 hover:text-white mb-4 -ml-2" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{workspace.display_name?.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{workspace.display_name} Workspace</h1>
              <p className="text-white/70 text-sm">{workspace.department} · {workspace.description}</p>
            </div>
            <div className="ml-auto flex gap-2">
              {workspace.ai_generated && (
                <Badge className="bg-white/20 text-white border-white/30">
                  <Sparkles className="w-3 h-3 mr-1" /> AI Generated
                </Badge>
              )}
              <Badge className="bg-white/20 text-white border-white/30">
                {sortedModules.length} Modules
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {workspace.quick_actions?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-[#c9a227]" /> Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {workspace.quick_actions.map((action, idx) => {
                  const IconComp = ICON_MAP[action.icon] || Briefcase;
                  return (
                    <Link key={idx} to={createPageUrl(action.page_link || "AdminDashboard")}>
                      <Button variant="outline" className="gap-2">
                        <IconComp className="w-4 h-4" style={{ color: workspace.color }} />
                        {action.label}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="text-lg font-semibold mb-4 text-slate-700">Workspace Modules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedModules.map((mod, idx) => {
              const IconComp = ICON_MAP[mod.icon] || FileText;
              const borderColor = MODULE_TYPE_COLORS[mod.type] || MODULE_TYPE_COLORS.module;
              const badgeColor = MODULE_TYPE_BADGE[mod.type] || MODULE_TYPE_BADGE.module;
              return (
                <Card key={mod.id || idx} className={`border-2 ${borderColor} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                        <IconComp className="w-5 h-5" style={{ color: workspace.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{mod.title}</h3>
                        <Badge className={`${badgeColor} text-xs capitalize`}>{mod.type?.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{mod.description}</p>
                    {mod.page_link && mod.type !== "ai_tool" ? (
                      <Link to={createPageUrl(mod.page_link)}>
                        <Button size="sm" variant="outline" className="w-full text-xs">Open Module →</Button>
                      </Link>
                    ) : mod.type === "ai_tool" ? (
                      <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setAiQuery(`Help me with: ${mod.title}`)}>
                        <Sparkles className="w-3 h-3 mr-1" /> Use AI Tool
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Sparkles className="w-5 h-5" /> {workspace.display_name} AI Assistant
            </CardTitle>
            <p className="text-sm text-slate-500">Ask anything related to your role responsibilities</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiResponse && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 text-sm text-slate-700 whitespace-pre-wrap">
                <strong>Assistant:</strong> {aiResponse}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder={`Ask the ${workspace.display_name} AI Assistant...`}
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAiQuery()}
              />
              <Button
                onClick={handleAiQuery}
                disabled={aiLoading || !aiQuery.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {aiLoading ? "..." : "Ask"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {workspace.role_type === "hr" && ["Draft a disciplinary report", "Generate evaluation template", "HR policy suggestions"].map(q => (
                <button key={q} onClick={() => setAiQuery(q)} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">{q}</button>
              ))}
              {workspace.role_type === "accounting" && ["Summarize unpaid invoices", "Generate expense report", "Reconciliation checklist"].map(q => (
                <button key={q} onClick={() => setAiQuery(q)} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">{q}</button>
              ))}
              {workspace.role_type === "operations" && ["Site inspection checklist", "Incident summary template", "Patrol schedule optimization"].map(q => (
                <button key={q} onClick={() => setAiQuery(q)} className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">{q}</button>
              ))}
            </div>
          </CardContent>
        </Card>

        {workspace.permissions && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Role Permissions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(workspace.permissions).map(([key, level]) => (
                  <div key={key} className="p-2 bg-slate-50 rounded flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600 capitalize">{key.replace(/_/g, " ")}</span>
                    <Badge className={`text-xs capitalize ${
                      level === "full" ? "bg-green-100 text-green-700" :
                      level === "edit" ? "bg-amber-100 text-amber-700" :
                      level === "view" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-500"
                    }`}>{level}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {auditLogs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Role Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded text-sm">
                    <Badge className={log.action === "create" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {log.action}
                    </Badge>
                    <span className="text-slate-600 flex-1">{log.entity_name}</span>
                    <span className="text-slate-400 text-xs">{log.user_name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}