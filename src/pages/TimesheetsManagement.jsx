import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Clock, Search, Check, X, Download, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import PaginationControls from "@/components/shared/PaginationControls";
import TableSkeleton from "@/components/shared/TableSkeleton";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function TimesheetsManagement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingTimesheet, setRejectingTimesheet] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvingTimesheet, setApprovingTimesheet] = useState(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const pageSize = 10;

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["all-timesheets", statusFilter, page, tenantFilter],
    queryFn: async () => {
      try {
        setError(null);
        const start = (page - 1) * pageSize;
        const filter = statusFilter === "all" ? tenantFilter : { ...tenantFilter, status: statusFilter };
        return await base44.entities.Timesheet.filter(filter, "-date", pageSize, start);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    enabled: !!tenantFilter.company_id,
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["timesheets-total", statusFilter, tenantFilter],
    queryFn: async () => {
      const filter = statusFilter === "all" ? tenantFilter : { ...tenantFilter, status: statusFilter };
      const all = await base44.entities.Timesheet.filter(filter, "-date", 999);
      return all.length;
    },
    enabled: !!tenantFilter.company_id,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["employees-for-timesheets", tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter, "", 2000),
    enabled: !!tenantFilter.company_id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }) => {
      await base44.entities.Timesheet.update(id, { status: "approved", manager_comment: comment || "" });
      // Notify employee
      const ts = timesheets.find(t => t.id === id);
      if (ts?.employee_id) {
        await base44.functions.invoke("sendNotification", {
          user_id: ts.employee_id,
          title: "Timesheet Approved ✓",
          message: comment ? `Your timesheet was approved. Manager note: ${comment}` : "Your timesheet has been approved.",
          type: "timesheet",
          priority: "normal",
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-timesheets"]);
      setShowApproveDialog(false);
      setApprovingTimesheet(null);
      setApprovalComment("");
      toast.success("Timesheet approved — employee notified");
    },
    onError: (error) => {
      toast.error(`Failed to approve timesheet: ${error.message || "Unknown error"}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      await base44.entities.Timesheet.update(id, { status: "rejected", rejection_reason: reason, manager_comment: reason });
      const ts = timesheets.find(t => t.id === id);
      if (ts?.employee_id) {
        await base44.functions.invoke("sendNotification", {
          user_id: ts.employee_id,
          title: "Timesheet Rejected",
          message: `Your timesheet was rejected. Reason: ${reason}`,
          type: "timesheet",
          priority: "high",
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-timesheets"]);
      setShowRejectDialog(false);
      setRejectingTimesheet(null);
      setRejectionReason("");
      toast.success("Timesheet rejected — employee notified");
    },
    onError: (error) => {
      toast.error(`Failed to reject timesheet: ${error.message || "Unknown error"}`);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedTimesheets) {
        await base44.entities.Timesheet.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-timesheets"]);
      setSelectedTimesheets([]);
      toast.success("Timesheets deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete timesheets: ${error.message || "Unknown error"}`);
    },
  });

  const handleExportCSV = () => {
    const rows = [["Employee", "Date", "Clock In", "Clock Out", "Hours", "Status"]];
    const sorted = [...filteredTimesheets].sort((a, b) => {
      const nameA = (getUserById(a.employee_id)?.full_name || "").toLowerCase();
      const nameB = (getUserById(b.employee_id)?.full_name || "").toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return (a.date || "").localeCompare(b.date || "");
    });
    sorted.forEach((ts) => {
      const emp = getUserById(ts.employee_id);
      rows.push([
        emp?.full_name || "Unknown",
        ts.date || "",
        ts.clock_in ? format(new Date(ts.clock_in), "h:mm a") : "",
        ts.clock_out ? format(new Date(ts.clock_out), "h:mm a") : "",
        ts.total_hours?.toFixed(2) || "",
        ts.status || "",
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "timesheets.csv";
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedTimesheets) {
        await base44.entities.Timesheet.update(id, { status: "approved" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["all-timesheets"]);
      setSelectedTimesheets([]);
      toast.success("Timesheets approved successfully");
    },
    onError: (error) => {
      toast.error(`Failed to approve timesheets: ${error.message || "Unknown error"}`);
    }
  });

  const getUserById = (id) => {
    const emp = users.find(u => u.id === id);
    if (!emp) return null;
    return { ...emp, full_name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() };
  };

  const filteredTimesheets = timesheets.filter(ts => {
    const employee = getUserById(ts.employee_id);
    const name = employee?.full_name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           employee?.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const toggleSelect = (id) => {
    setSelectedTimesheets(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedTimesheets(
      selectedTimesheets.length === filteredTimesheets.length ? [] : filteredTimesheets.map(t => t.id)
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      rejected: "bg-red-100 text-red-700"
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <ErrorBoundary error={error} resetError={() => setError(null)}>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b p-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Timesheets Management</h1>
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by employee name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedTimesheets.length > 0 && (
              <div className="flex items-center gap-4 mt-4 pt-4 border-t flex-wrap">
                <span className="text-sm text-slate-500">{selectedTimesheets.length} selected</span>
                <Button
                  size="sm"
                  onClick={() => bulkApproveMutation.mutate()}
                  disabled={bulkApproveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {bulkApproveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Approve Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => bulkDeleteMutation.mutate()}
                  disabled={bulkDeleteMutation.isPending}
                  className="gap-2"
                >
                  {bulkDeleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  Delete Selected
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedTimesheets([])}>Clear</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <TableSkeleton rows={5} cols={8} />
        ) : filteredTimesheets.length > 0 ? (
          <Card className="shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedTimesheets.length === filteredTimesheets.length && filteredTimesheets.length > 0}
                        onCheckedChange={selectAll}
                      />
                    </th>
                    <th className="p-4 text-left font-medium">Employee</th>
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Clock In</th>
                    <th className="p-4 text-left font-medium">Clock Out</th>
                    <th className="p-4 text-left font-medium">Hours</th>
                    <th className="p-4 text-left font-medium">Status</th>
                    <th className="p-4 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTimesheets.map((timesheet) => {
                    const employee = getUserById(timesheet.employee_id);
                    return (
                      <tr key={timesheet.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedTimesheets.includes(timesheet.id)}
                            onCheckedChange={() => toggleSelect(timesheet.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={employee?.profile_photo} />
                              <AvatarFallback className="bg-slate-200 text-sm">
                                {employee?.full_name?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee?.full_name || "Unknown"}</p>
                              <p className="text-sm text-slate-500">{employee?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{format(parseISO(timesheet.date), "MMM d, yyyy")}</td>
                        <td className="p-4">{timesheet.clock_in ? format(new Date(timesheet.clock_in), "h:mm a") : "--:--"}</td>
                        <td className="p-4">{timesheet.clock_out ? format(new Date(timesheet.clock_out), "h:mm a") : "--:--"}</td>
                        <td className="p-4 font-medium">{timesheet.total_hours?.toFixed(2) || "--"}</td>
                        <td className="p-4">{getStatusBadge(timesheet.status)}</td>
                        <td className="p-4">
                          {timesheet.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => { setApprovingTimesheet(timesheet); setShowApproveDialog(true); }}
                                title="Approve with comment"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setRejectingTimesheet(timesheet);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {timesheet.manager_comment && timesheet.status !== "pending" && (
                            <p className="text-xs text-slate-400 mt-1 max-w-[140px] truncate" title={timesheet.manager_comment}>
                              💬 {timesheet.manager_comment}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationControls 
              page={page} 
              pageSize={pageSize} 
              total={totalCount} 
              onPageChange={setPage}
              isLoading={isLoading}
            />
          </Card>
        ) : (
          <EmptyState icon={Clock} title="No timesheets found" description="Try adjusting your filters" />
        )}

        {/* Approve with comment dialog */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approve Timesheet</DialogTitle>
              <DialogDescription>Optionally add a manager comment before approving</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Manager Comment (optional)</Label>
                <Textarea
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  placeholder="Add a note for the employee (optional)..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => approveMutation.mutate({ id: approvingTimesheet?.id, comment: approvalComment })}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve & Notify"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="flex items-center justify-between">
              <div>
                <DialogTitle>Reject Timesheet</DialogTitle>
                <DialogDescription>Please provide a reason for rejection</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowRejectDialog(false)} className="h-6 w-6">
                <X className="w-4 h-4" />
              </Button>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                <Button
                  onClick={() => rejectMutation.mutate({ id: rejectingTimesheet?.id, reason: rejectionReason })}
                  disabled={!rejectionReason.trim() || rejectMutation.isLoading}
                  variant="destructive"
                >
                  {rejectMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </ErrorBoundary>
  );
}