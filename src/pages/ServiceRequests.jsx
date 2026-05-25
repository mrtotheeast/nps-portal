import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function ServiceRequests() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    request_type: "additional_personnel",
    priority: "medium",
    title: "",
    description: "",
    requested_date: "",
    personnel_count: 1,
    estimated_duration: ""
  });

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["service-requests"],
    queryFn: () => base44.entities.ServiceRequest.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceRequest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["service-requests"]);
      setShowDialog(false);
      setFormData({
        request_type: "additional_personnel",
        priority: "medium",
        title: "",
        description: "",
        requested_date: "",
        personnel_count: 1,
        estimated_duration: ""
      });
      toast.success("Request submitted successfully");
    }
  });

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      client_id: user.id
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-amber-100 text-amber-800",
      reviewing: "bg-blue-100 text-blue-800",
      approved: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-slate-100 text-slate-800"
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "text-blue-600",
      medium: "text-amber-600",
      high: "text-red-600",
      urgent: "text-red-800 font-bold"
    };
    return colors[priority] || "text-slate-600";
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Service Requests" 
        subtitle="Request additional services or changes"
        action={() => setShowDialog(true)}
        actionLabel="New Request"
        actionIcon={Plus}
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        {requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{request.title}</h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-sm mb-3">{request.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <AlertCircle className={`w-4 h-4 ${getPriorityColor(request.priority)}`} />
                          <span className="text-slate-500">
                            Priority: <span className={getPriorityColor(request.priority)}>
                              {request.priority}
                            </span>
                          </span>
                        </div>
                        {request.requested_date && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Calendar className="w-4 h-4" />
                            <span>Needed by: {new Date(request.requested_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {request.personnel_count > 0 && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Users className="w-4 h-4" />
                            <span>{request.personnel_count} personnel</span>
                          </div>
                        )}
                        {request.estimated_duration && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-4 h-4" />
                            <span>{request.estimated_duration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {request.admin_notes && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">Admin Response:</p>
                      <p className="text-sm text-blue-800">{request.admin_notes}</p>
                    </div>
                  )}

                  {request.estimated_cost > 0 && (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <p className="text-sm font-medium text-emerald-900">
                        Estimated Cost: ${request.estimated_cost.toLocaleString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No service requests"
            description="Submit a request for additional services or changes"
            action={() => setShowDialog(true)}
            actionLabel="New Request"
          />
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Service Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Request Type</label>
              <Select 
                value={formData.request_type} 
                onValueChange={(v) => setFormData({...formData, request_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="additional_personnel">Additional Personnel</SelectItem>
                  <SelectItem value="schedule_change">Schedule Change</SelectItem>
                  <SelectItem value="service_upgrade">Service Upgrade</SelectItem>
                  <SelectItem value="equipment">Equipment Request</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Priority</label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({...formData, priority: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Brief summary of request"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Detailed description of your request"
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Needed</label>
              <Input
                type="date"
                value={formData.requested_date}
                onChange={(e) => setFormData({...formData, requested_date: e.target.value})}
              />
            </div>

            {formData.request_type === "additional_personnel" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Number of Personnel</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.personnel_count}
                  onChange={(e) => setFormData({...formData, personnel_count: parseInt(e.target.value)})}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <Input
                value={formData.estimated_duration}
                onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                placeholder="e.g., 2 weeks, 3 months"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.title || !formData.description || createMutation.isLoading}
                className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
              >
                {createMutation.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}