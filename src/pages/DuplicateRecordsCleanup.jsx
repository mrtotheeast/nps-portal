import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Trash2, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function DuplicateRecordsCleanup() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedForDeletion, setSelectedForDeletion] = useState(new Set());

  const { data: auditResults = null, isLoading } = useQuery({
    queryKey: ["duplicate-audit"],
    queryFn: async () => {
      const res = await base44.functions.invoke("auditAndCleanDuplicates", { dryRun: true });
      return res.data;
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke("auditAndCleanDuplicates", {
        dryRun: false,
        duplicateIds: Array.from(selectedForDeletion),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["duplicate-audit"] });
      setSelectedForDeletion(new Set());
      toast.success(`Cleanup complete: ${data.deletedCount || 0} duplicates removed`);
    },
    onError: (error) => {
      toast.error(`Cleanup failed: ${error.message}`);
    },
  });

  const toggleSelect = (id) => {
    const newSet = new Set(selectedForDeletion);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForDeletion(newSet);
  };

  const selectAll = (duplicates) => {
    if (selectedForDeletion.size === duplicates.length) {
      setSelectedForDeletion(new Set());
    } else {
      setSelectedForDeletion(new Set(duplicates.map(d => d.id)));
    }
  };

  if (isLoading) return <LoadingScreen message="Scanning for duplicates..." />;

  const emailDuplicates = auditResults?.emailDuplicates || [];
  const similarNameDuplicates = auditResults?.similarNameDuplicates || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold flex-1">Duplicate Records Cleanup</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Found <strong>{emailDuplicates.length + similarNameDuplicates.length}</strong> potential duplicate records. 
            Review and select duplicates to delete. Original records will be preserved.
          </AlertDescription>
        </Alert>

        {/* Email Duplicates */}
        {emailDuplicates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5 text-red-600" />
                  Email Duplicates ({emailDuplicates.length})
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => selectAll(emailDuplicates.flatMap(g => g.duplicates))}
                >
                  {selectedForDeletion.size > 0 ? "Deselect All" : "Select All"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {emailDuplicates.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="font-semibold text-slate-900">Email: {group.email}</div>
                  <div className="space-y-2">
                    {group.duplicates.map((dup) => (
                      <div
                        key={dup.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSelect(dup.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForDeletion.has(dup.id)}
                          onChange={() => toggleSelect(dup.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{dup.firstName} {dup.lastName}</p>
                          <p className="text-sm text-slate-500">Hire Date: {dup.hireDate || "N/A"}</p>
                          <p className="text-sm text-slate-500">Created: {new Date(dup.created_date).toLocaleDateString()}</p>
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-300">Duplicate</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Similar Name Duplicates (Manual Review) */}
        {similarNameDuplicates.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Similar Name Matches ({similarNameDuplicates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-700 text-sm">
                  These are potential duplicates based on name/DOB similarity. Review carefully before deleting.
                </AlertDescription>
              </Alert>
              {similarNameDuplicates.map((group, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="font-semibold text-slate-900">
                    {group.name1.split(" ").join(" / ")} vs {group.name2.split(" ").join(" / ")}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[group.emp1, group.emp2].map((emp, i) => (
                      <div
                        key={emp.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleSelect(emp.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedForDeletion.has(emp.id)}
                          onChange={() => toggleSelect(emp.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                          <p className="text-sm text-slate-500">{emp.email}</p>
                          <p className="text-sm text-slate-500">DOB: {emp.dateOfBirth || "N/A"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* No Duplicates */}
        {emailDuplicates.length === 0 && similarNameDuplicates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-slate-900">No Duplicates Found</p>
              <p className="text-slate-500">Your employee records are clean!</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {(emailDuplicates.length > 0 || similarNameDuplicates.length > 0) && (
          <div className="flex justify-end gap-3 sticky bottom-4">
            <Button variant="outline" onClick={() => setSelectedForDeletion(new Set())}>
              Clear Selection
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 gap-2"
              onClick={() => cleanupMutation.mutate()}
              disabled={selectedForDeletion.size === 0 || cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete {selectedForDeletion.size} Selected
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}