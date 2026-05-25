import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useTenantFilter } from "@/hooks/useTenantFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInMinutes } from "date-fns";
import { Shield, MapPin, Clock, Check, FileText, Camera, Route, Calendar, User, AlertCircle, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import PullToRefresh from "@/components/mobile/PullToRefresh";
import { toast } from "sonner";

export default function PatrolReview() {
  const queryClient = useQueryClient();
  const tenantFilter = useTenantFilter();
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [dateRange, setDateRange] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, patrol: null });
  const [deletionReason, setDeletionReason] = useState("");

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const { data: patrols = [], isLoading, refetch: refetchPatrols } = useQuery({
    queryKey: ["patrols", selectedSite, selectedOfficer, dateRange, tenantFilter],
    queryFn: async () => {
      const filter = { ...tenantFilter, status: "completed" };
      const allPatrols = await base44.entities.PatrolSession.filter(filter, "-end_time", 500);
      let filtered = allPatrols;
      
      if (selectedSite) {
        filtered = filtered.filter(p => p.site_id === selectedSite);
      }
      if (selectedOfficer) {
        filtered = filtered.filter(p => p.officer_id === selectedOfficer);
      }
      if (dateRange !== "all") {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
        filtered = filtered.filter(p => new Date(p.end_time) >= daysAgo);
      }
      return filtered;
    },
    enabled: !!tenantFilter.company_id,
  });

  const { data: sites = [] } = useQuery({ queryKey: ["sites", tenantFilter], queryFn: () => base44.entities.Site.filter(tenantFilter), enabled: !!tenantFilter.company_id });
  const { data: employees = [] } = useQuery({ queryKey: ["employees", tenantFilter], queryFn: () => base44.entities.Employee.filter({ ...tenantFilter, employmentType: "officer" }), enabled: !!tenantFilter.company_id });
  const { data: users = [] } = useQuery({ queryKey: ["users", tenantFilter], queryFn: () => base44.entities.Employee.filter(tenantFilter), enabled: !!tenantFilter.company_id });

  const getOfficerName = (officerId) => {
    const employee = employees.find(e => e.id === officerId) || users.find(u => u.id === officerId);
    return `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || "Unknown";
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site?.name || "Unknown Site";
  };

  const calculateDuration = (patrol) => {
    if (!patrol.start_time || !patrol.end_time) return "N/A";
    const minutes = differenceInMinutes(new Date(patrol.end_time), new Date(patrol.start_time));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const deletePatrolMutation = useMutation({
    mutationFn: async ({ patrol, reason }) => {
      await base44.entities.PatrolSession.delete(patrol.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["patrols"]);
      setDeleteDialog({ open: false, patrol: null });
      setDeletionReason("");
      toast.success("Patrol deleted");
    }
  });

  const filteredPatrols = patrols.filter(patrol => {
    const siteName = getSiteName(patrol.site_id).toLowerCase();
    const officerName = getOfficerName(patrol.officer_id).toLowerCase();
    const query = searchQuery.toLowerCase();
    return siteName.includes(query) || officerName.includes(query);
  });

  if (isLoading) return <LoadingScreen />;

  const stats = {
    total: filteredPatrols.length,
    completed: filteredPatrols.filter(p => p.scanned_checkpoints === p.total_checkpoints).length,
    avgDuration: filteredPatrols.reduce((sum, p) => {
      const minutes = differenceInMinutes(new Date(p.end_time), new Date(p.start_time));
      return sum + minutes;
    }, 0) / (filteredPatrols.length || 1)
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Patrol Review" subtitle="Review completed patrol sessions and reports" currentPage="PatrolReview" />

      <PullToRefresh onRefresh={refetchPatrols}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Patrols</p>
                  <p className="text-3xl font-bold text-[#1a2b4a]">{stats.total}</p>
                </div>
                <Shield className="w-12 h-12 text-[#c9a227] opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">100% Complete</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
                </div>
                <Check className="w-12 h-12 text-emerald-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg Duration</p>
                  <p className="text-3xl font-bold text-[#1a2b4a]">{Math.round(stats.avgDuration / 60)}h</p>
                </div>
                <Clock className="w-12 h-12 text-[#c9a227] opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input placeholder="Search patrols..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger><SelectValue placeholder="All Sites" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Sites</SelectItem>
                  {sites.map(site => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger><SelectValue placeholder="All Officers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Officers</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {filteredPatrols.length > 0 ? (
          <div className="space-y-4">
            {filteredPatrols.map((patrol) => {
              const completionRate = patrol.total_checkpoints > 0
                ? Math.round((patrol.scanned_checkpoints / patrol.total_checkpoints) * 100)
                : 0;
              
              return (
                <Card key={patrol.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-lg bg-[#1a2b4a] flex items-center justify-center">
                            <Shield className="w-6 h-6 text-[#c9a227]" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{getSiteName(patrol.site_id)}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <User className="w-4 h-4" />
                              {getOfficerName(patrol.officer_id)}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-slate-500">Date</p>
                            <p className="font-medium flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(patrol.end_time), "MMM d, yyyy")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Duration</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {calculateDuration(patrol)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Checkpoints</p>
                            <p className="font-medium">{patrol.scanned_checkpoints || 0} / {patrol.total_checkpoints || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Completion</p>
                            <Badge className={completionRate === 100 ? "bg-emerald-100 text-emerald-700" : completionRate >= 80 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}>
                              {completionRate}%
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {patrol.notes?.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {patrol.notes.length} Notes
                            </Badge>
                          )}
                          {patrol.photos?.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {patrol.photos.length} Photos
                            </Badge>
                          )}
                          {patrol.gps_track?.length > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Route className="w-3 h-3" />
                              GPS Tracked
                            </Badge>
                          )}
                        </div>

                        {patrol.notes && patrol.notes.length > 0 && (
                          <div className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-700 mb-1">Latest Note:</p>
                            <p className="text-sm text-slate-600">{patrol.notes[patrol.notes.length - 1]?.text}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {['admin', 'manager'].includes(currentUser?.role_type) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, patrol })}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={Shield} title="No patrols found" description="No completed patrols match your filters" />
        )}
        </div>
      </PullToRefresh>

      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, patrol: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Patrol Record
            </DialogTitle>
            <DialogDescription>This patrol record will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {deleteDialog.patrol && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p><strong>Site:</strong> {getSiteName(deleteDialog.patrol.site_id)}</p>
                <p><strong>Officer:</strong> {getOfficerName(deleteDialog.patrol.officer_id)}</p>
                <p><strong>Date:</strong> {format(new Date(deleteDialog.patrol.end_time), "MMM d, yyyy h:mm a")}</p>
              </div>
            )}
            <div>
              <Label>Reason for Deletion *</Label>
              <Textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="Enter reason for deleting this patrol record..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setDeleteDialog({ open: false, patrol: null }); setDeletionReason(""); }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletePatrolMutation.mutate({ patrol: deleteDialog.patrol, reason: deletionReason })}
                disabled={!deletionReason.trim() || deletePatrolMutation.isLoading}
              >
                {deletePatrolMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}