import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, AlertTriangle, CheckCircle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ImportErrorLogViewer() {
  const [expandedSession, setExpandedSession] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["import-error-logs"],
    queryFn: () => base44.entities.ImportErrorLog.list("-import_date", 50),
  });

  const getStatusIcon = (status) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (status === "partially_failed") return <AlertTriangle className="w-4 h-4 text-amber-600" />;
    return <AlertTriangle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (status) => {
    if (status === "completed") return "bg-emerald-50 border-emerald-200";
    if (status === "partially_failed") return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const exportSessionErrors = (session) => {
    const errors = session.errors || [];
    const csv = [
      ["Row Number", "Error Type", "Field Name", "Error Message", "Row Data"],
      ...errors.map(e => [
        e.row_number,
        e.error_type,
        e.field_name,
        e.error_message,
        e.row_data
      ])
    ];
    const csvStr = csv.map(row => row.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csvStr], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import_errors_${session.upload_session_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="text-slate-500">Loading error logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
        <p>No import errors recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((session) => (
        <Card key={session.id} className={cn("border-2", getStatusColor(session.status))}>
          <CardHeader
            className="pb-3 cursor-pointer hover:bg-slate-50"
            onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(session.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{session.file_name}</p>
                    <Badge className="text-xs">
                      {session.successful_imports}/{session.total_rows}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500">
                    {session.uploaded_by_name} • {format(new Date(session.import_date), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {session.failed_imports > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportSessionErrors(session);
                    }}
                    className="gap-1 text-xs"
                  >
                    <Download className="w-3 h-3" /> Export Errors
                  </Button>
                )}
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-slate-400 transition-transform",
                    expandedSession === session.id && "rotate-180"
                  )}
                />
              </div>
            </div>
          </CardHeader>

          {expandedSession === session.id && (
            <CardContent className="pt-0 border-t">
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg text-sm">
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Total Rows</p>
                    <p className="font-semibold text-lg">{session.total_rows}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Successful</p>
                    <p className="font-semibold text-lg text-emerald-600">{session.successful_imports}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs mb-1">Failed</p>
                    <p className="font-semibold text-lg text-red-600">{session.failed_imports}</p>
                  </div>
                </div>

                {session.errors && session.errors.length > 0 && (
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Row</th>
                          <th className="p-2 text-left">Field</th>
                          <th className="p-2 text-left">Error</th>
                          <th className="p-2 text-left">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {session.errors.map((error, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-mono text-slate-600">#{error.row_number}</td>
                            <td className="p-2 font-medium">{error.field_name}</td>
                            <td className="p-2 text-slate-600 max-w-xs truncate">{error.error_message}</td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-xs bg-slate-100">
                                {error.error_type}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}