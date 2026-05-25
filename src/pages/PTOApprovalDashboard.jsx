import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Check, X, Clock, Eye, Filter,
  Loader2, Calendar, User, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import PTOConflictDetector from "@/components/pto/PTOConflictDetector";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

// Helper: Check if two date ranges overlap
const datesOverlap = (start1, end1, start2, end2) => {
  return new Date(start1) <= new Date(end2) && new Date(start2) <= new Date(end1);
};

export default function PTOApprovalDashboard() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalAction, setApprovalAction] = useState(null); // "approve" or "reject"
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch pending/all PTO requests
  const { data: ptoRequests = [], isLoading: ptoLoading } = useQuery({
    queryKey: ["ptoRequests", statusFilter],
    queryFn: async () => {
      const filter = statusFilter === "all" 
        ? {} 
        : { status: statusFilter };
      return await base44.entities.PTORequest.filter(filter, "-request_date", 100);
    },
  });

  // Fetch employees to get names
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 1000),
  });

  // Fetch sites for conflict checking
  const { data: sites = [] } = useQuery({
    queryKey: ["sites"],
    queryFn: () => base44.entities.Site.list(),
  });

  // Fetch all PTO requests for conflict detection
  const { data: allPTORequests = [] } = useQuery({
    queryKey: ["allPTORequests"],
    queryFn: () => base44.entities.PTORequest.list("-request_date", 500),
  });

  // Detect conflicts in PTO requests
  const conflicts = useMemo(() => {
    const conflictMap = {};

    ptoRequests.forEach((req1, idx1) => {
      ptoRequests.forEach((req2, idx2) => {
        if (idx1 < idx2 && req1.status === "approved" && req2.status === "pending") {
          if (datesOverlap(req1.start_date, req1.end_date, req2.start_date, req2.end_date)) {
            const key = req2.id;
            if (!conflictMap[key]) {
              conflictMap[key] = [];
            }
            conflictMap[key].push(req1.employee_id);
          }
        }
      });
    });

    return conflictMap;
  }, [ptoRequests]);

  // Mutation to approve/reject PTO
  const updatePTOMutation = useMutation({
    mutationFn: async ({ requestId, status, rejectionReason }) => {
      const updateData = {
        status,
        approval_date: new Date().toISOString(),
        approved_by_id: (await base44.auth.me()).id,
      };
      if (status === "rejected" && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      await base44.entities.PTORequest.update(requestId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["ptoRequests"]);
      toast.success("PTO request updated");
      setSelectedRequest(null);
      setApprovalAction(null);
      setRejectionReason("");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Get employee name by ID
  const getEmployeeName = (empId) => {
    const emp = employees.find(e => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : "Unknown";
  };

  // Get employee sites by ID
  const getEmployeeSites = (empId) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp || !emp.siteIds) return [];
    return emp.siteIds
      .map(siteId => sites.find(s => s.id === siteId)?.name)
      .filter(Boolean);
  };

  // Filter requests based on selected filter
  const filteredRequests = ptoRequests;

  // Render status badge
  const renderStatusBadge = (status) => {
    const badgeMap = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-slate-100 text-slate-800",
    };
    return <Badge className={badgeMap[status] || badgeMap.pending}>{status.toUpperCase()}</Badge>;
  };

  // Render PTO type color
  const renderPTOType = (type) => {
    const typeMap = {
      vacation: "bg-blue-50 text-blue-700 border border-blue-200",
      sick: "bg-red-50 text-red-700 border border-red-200",
      personal: "bg-purple-50 text-purple-700 border border-purple-200",
      unpaid: "bg-slate-50 text-slate-700 border border-slate-200",
    };
    return <Badge variant="outline" className={typeMap[type] || typeMap.vacation}>{type}</Badge>;
  };

  if (ptoLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 overflow-y-auto">
      <PageHeader title="PTO Approval Dashboard" subtitle="Review and approve employee time-off requests" />
      <div className="max-w-7xl mx-auto px-4 py-6 pb-32">

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-500" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All Requests</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-600 ml-auto">
                {filteredRequests.length} request{filteredRequests.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* PTO Requests Grid */}
        {filteredRequests.length > 0 ? (
          <div className="grid gap-4">
            {filteredRequests.map((req) => {
              const hasConflict = conflicts[req.id];
              const empName = getEmployeeName(req.employee_id);
              const empSites = getEmployeeSites(req.employee_id);
              const conflictingEmps = hasConflict?.map(getEmployeeName) || [];

              return (
                <Card key={req.id} className={`hover:shadow-md transition-shadow ${hasConflict ? "border-l-4 border-l-red-500 bg-red-50" : ""}`}>
                  <CardContent className="p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Left column: Employee & Request Info */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">{empName}</h3>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                          </div>
                          {empSites.length > 0 && (
                            <div className="flex items-start gap-2 text-sm text-slate-600 mt-2">
                              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              <div>{empSites.join(", ")}</div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {renderStatusBadge(req.status)}
                          {renderPTOType(req.pto_type)}
                          {req.hours_requested && (
                            <Badge variant="outline" className="bg-slate-50">
                              {req.hours_requested} hrs
                            </Badge>
                          )}
                        </div>

                        {req.reason && (
                          <div className="text-sm">
                            <span className="text-slate-500">Reason: </span>
                            <span className="text-slate-700">{req.reason}</span>
                          </div>
                        )}

                        {/* Site-based conflict detection */}
                        {req.status === "pending" && (
                          <PTOConflictDetector
                            ptoRequest={req}
                            employees={employees}
                            allPTORequests={allPTORequests}
                          />
                        )}

                        <div className="text-xs text-slate-500">
                          Submitted {formatDistanceToNow(new Date(req.request_date), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Right column: Action buttons */}
                      <div className="flex flex-col justify-between">
                        {req.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setSelectedRequest(req);
                                setApprovalAction("approve");
                              }}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedRequest(req);
                                setApprovalAction("reject");
                              }}
                              variant="outline"
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 gap-2"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-600 text-center py-2">
                            {req.status === "approved" && "✓ Approved"}
                            {req.status === "rejected" && "✗ Rejected"}
                            {req.status === "cancelled" && "Cancelled"}
                          </div>
                        )}

                        {req.status !== "pending" && req.rejection_reason && (
                          <div className="text-xs bg-slate-100 p-2 rounded text-slate-700 mt-3">
                            <strong>Reason:</strong> {req.rejection_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title="No PTO requests"
            description={statusFilter === "pending" ? "All requests are current!" : "No requests to display"}
          />
        )}
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setApprovalAction(null);
        setRejectionReason("");
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve PTO Request" : "Reject PTO Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-slate-600 mb-2">Employee</p>
              <p className="font-semibold">{selectedRequest && getEmployeeName(selectedRequest.employee_id)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2">Dates</p>
              <p className="font-semibold">
                {selectedRequest && (
                  <>
                    {new Date(selectedRequest.start_date).toLocaleDateString()} - {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
            {approvalAction === "reject" && (
              <div>
                <label className="text-sm text-slate-600 mb-2 block">Rejection Reason (optional)</label>
                <Textarea
                  placeholder="Explain why this request is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setApprovalAction(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedRequest) return;
                updatePTOMutation.mutate({
                  requestId: selectedRequest.id,
                  status: approvalAction === "approve" ? "approved" : "rejected",
                  rejectionReason,
                });
              }}
              disabled={updatePTOMutation.isPending}
              className={approvalAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            >
              {updatePTOMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {approvalAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}