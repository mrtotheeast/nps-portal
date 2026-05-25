import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Shield, ChevronDown, ChevronUp, ExternalLink, Info, Lock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { ROLE_PERMISSIONS_DISPLAY } from "@/lib/rolesPermissionsDisplay";

function FeatureColumn({ title, features, columnColor }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`px-3 py-2 flex items-center gap-2 ${columnColor}`}>
        <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
      </div>
      <div className="p-3 space-y-3">
        {features.map((cap, i) => (
          <div key={i}>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">{cap.section}</p>
            <div className="flex flex-wrap gap-1">
              {cap.items.map((item, j) => (
                <Badge key={j} variant="outline" className="text-xs">{item}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RolesPermissions() {
  const navigate = useNavigate();
  const [expandedRole, setExpandedRole] = useState(null);

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  if (!user) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Roles & Permissions" subtitle="View access levels for each role in the system" showBack />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">How Role Permissions Work</p>
            <p>Each role has a defined set of pages and features. Supervisors and Managers have a <strong>dual-view system</strong> — they switch between their management view and a personal employee view. Role assignments are managed per employee in <strong>User Management</strong>.</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={() => navigate(createPageUrl("UserManagement"))}>
                <ExternalLink className="w-3 h-3 mr-1" /> User Management
              </Button>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100"
                onClick={() => navigate(createPageUrl("RoleWorkspaceAdmin"))}>
                <ExternalLink className="w-3 h-3 mr-1" /> Role Workspace Admin
              </Button>
            </div>
          </div>
        </div>

        {ROLE_PERMISSIONS_DISPLAY.map((role) => {
          const isExpanded = expandedRole === role.key;
          return (
            <Card key={role.key}>
              <CardHeader
                className="cursor-pointer select-none flex flex-row items-center justify-between py-4"
                onClick={() => setExpandedRole(isExpanded ? null : role.key)}
              >
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5 text-[#1a2b4a]" />
                  {role.label}
                  <Badge className={role.badgeClass}>{role.key}</Badge>
                  {role.locked && <Badge className="bg-slate-100 text-slate-500 border border-slate-200 text-xs"><Lock className="w-2.5 h-2.5 mr-0.5 inline" />Locked</Badge>}
                  {role.dualView && <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs"><Users className="w-2.5 h-2.5 mr-0.5 inline" />Dual View</Badge>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-500 mb-4">{role.description}</p>
                  <p className="text-xs text-slate-400 mb-4">Default dashboard: <span className="font-medium text-slate-600">{role.dashboard}</span></p>

                  {role.locked ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-sm text-slate-500">
                      <Lock className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                      All features enabled — cannot be toggled off for this role.
                    </div>
                  ) : role.dualView ? (
                    // Two-column layout for supervisor/manager
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FeatureColumn
                        title="Management Features"
                        features={role.managementFeatures}
                        columnColor="bg-[#1a2b4a] text-white"
                      />
                      <FeatureColumn
                        title="Personal Employee Features"
                        features={role.personalFeatures}
                        columnColor="bg-[#c9a227]/20 text-[#c9a227]"
                      />
                    </div>
                  ) : (
                    // Single column for employee/officer/client
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {role.capabilities.map((cap, i) => (
                        <div key={i} className="border rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{cap.section}</p>
                          <div className="flex flex-wrap gap-1">
                            {cap.items.map((item, j) => (
                              <Badge key={j} variant="outline" className="text-xs">{item}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}