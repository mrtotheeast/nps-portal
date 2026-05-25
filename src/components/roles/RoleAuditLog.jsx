import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";

const ACTION_COLORS = { create: "bg-green-100 text-green-700", update: "bg-blue-100 text-blue-700", delete: "bg-red-100 text-red-700", permission_change: "bg-amber-100 text-amber-700" };

export default function RoleAuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["role-audit-logs"],
    queryFn: () => base44.entities.AuditLog.filter({ entity_type: "RoleWorkspace" }, "-created_date", 50),
  });

  if (isLoading) return <div className="p-4 text-slate-500 text-sm">Loading audit log...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="w-5 h-5" />Role Management Activity Log</CardTitle>
        <p className="text-sm text-slate-500">All role creation, modification, and permission changes</p>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {logs.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">No activity recorded yet.</p>
          ) : (
            <div className="divide-y">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                  <Badge className={`${ACTION_COLORS[log.action] || "bg-slate-100 text-slate-600"} text-xs shrink-0 mt-0.5 capitalize`}>{log.action}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{log.entity_name || log.entity_type}</p>
                    <p className="text-xs text-slate-500">{log.user_name || log.user_email} · {log.created_date ? format(new Date(log.created_date), "MMM d, yyyy h:mm a") : ""}</p>
                    {log.changes?.after && <p className="text-xs text-slate-400 mt-0.5 truncate">{Object.entries(log.changes.after).map(([k, v]) => `${k}: ${v}`).join(", ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}