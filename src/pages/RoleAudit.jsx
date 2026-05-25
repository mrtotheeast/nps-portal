import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, XCircle, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PROTECTED_ADMINS = [
  "aaron.williams@nationwidepolice.com",
  "justin.ashe@nationwidepolice.com",
];

export default function RoleAudit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [runningFix, setRunningFix] = useState(false);

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: users = [], isLoading: userLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  // Build user map
  const userMap = {};
  users.forEach(u => {
    userMap[u.email?.toLowerCase()] = u;
  });

  // Check each employee for mismatches
  const auditResults = employees.map(emp => {
    const email = emp.email?.toLowerCase();
    const linkedUser = email ? userMap[email] : null;
    const isProtected = email && PROTECTED_ADMINS.includes(email);
    
    let status = "ok";
    let issues = [];

    // Check for null/empty role
    if (!emp.role || emp.role.trim() === "") {
      status = "error";
      issues.push("Empty role (should be 'employee')");
    }

    // Check for unlinked admin
    if (emp.role === "admin" && !linkedUser && !isProtected) {
      status = "warning";
      issues.push("Admin role but no user account");
    }

    // Check for role mismatch
    if (linkedUser && emp.role === "admin" && linkedUser.role !== "admin") {
      status = "error";
      issues.push(`Employee=admin but User=${linkedUser.role}`);
    }

    return {
      ...emp,
      linkedUser,
      isProtected,
      status,
      issues,
    };
  });

  const errorCount = auditResults.filter(r => r.status === "error").length;
  const warningCount = auditResults.filter(r => r.status === "warning").length;
  const okCount = auditResults.filter(r => r.status === "ok").length;

  const handleFixAll = async () => {
    if (!window.confirm(`Fix ${errorCount} errors? This cannot be undone.`)) return;

    setRunningFix(true);
    try {
      const result = await base44.functions.invoke("bulkFixEmployeeRoles", {});
      if (result?.data?.success) {
        toast.success(`Fixed ${result.data.summary.corrected} records`);
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        queryClient.invalidateQueries({ queryKey: ["users"] });
      }
    } catch (err) {
      toast.error(`Fix failed: ${err.message}`);
    } finally {
      setRunningFix(false);
    }
  };

  const isLoading = empLoading || userLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Role Audit</h1>
            <p className="text-slate-600">Verify employee roles match their Base44 user accounts</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-emerald-600">{okCount}</div>
              <p className="text-slate-600 text-sm">OK</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-amber-600">{warningCount}</div>
              <p className="text-slate-600 text-sm">Warnings</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{errorCount}</div>
              <p className="text-slate-600 text-sm">Errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-slate-900">{employees.length}</div>
              <p className="text-slate-600 text-sm">Total Employees</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Button */}
        {(errorCount > 0 || warningCount > 0) && (
          <div className="mb-8">
            <Button
              onClick={handleFixAll}
              disabled={runningFix}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              {runningFix ? "Fixing..." : `Fix ${errorCount + warningCount} Issues`}
            </Button>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : (
            auditResults.map(emp => (
              <Card key={emp.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {emp.status === "ok" && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      {emp.status === "warning" && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                      {emp.status === "error" && <XCircle className="w-5 h-5 text-red-600" />}
                      <div>
                        <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                        <p className="text-sm text-slate-600">{emp.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <div className="flex gap-2 mb-1">
                        <Badge variant={emp.role === "admin" ? "default" : "secondary"}>
                          Employee: {emp.role || "null"}
                        </Badge>
                        {emp.linkedUser && (
                          <Badge variant={emp.linkedUser.role === "admin" ? "default" : "secondary"}>
                            User: {emp.linkedUser.role}
                          </Badge>
                        )}
                        {!emp.linkedUser && <Badge variant="outline">No User</Badge>}
                        {emp.isProtected && (
                          <Badge className="bg-purple-600">Protected</Badge>
                        )}
                      </div>
                      {emp.issues.length > 0 && (
                        <p className="text-xs text-red-600">{emp.issues[0]}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Box */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Protected Admins:</strong> Aaron Williams and Justin Ashe always retain admin access.
              Their roles cannot be changed by bulk fixes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}