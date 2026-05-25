import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Plus, Eye, Edit, Loader2, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

export default function PerformanceReviews() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: "",
    review_period_start: "",
    review_period_end: "",
    review_date: new Date().toISOString().split('T')[0],
    overall_rating: 3,
    ratings: {
      quality_of_work: 3,
      reliability: 3,
      communication: 3,
      teamwork: 3,
      professionalism: 3
    },
    strengths: "",
    areas_for_improvement: "",
    reviewer_comments: "",
    status: "draft"
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => base44.entities.PerformanceReview.list("-created_date"),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PerformanceReview.create({
      ...data,
      reviewer_id: user.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(["performance-reviews"]);
      setShowCreateDialog(false);
      resetForm();
      toast.success("Performance review created");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PerformanceReview.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["performance-reviews"]);
      setShowCreateDialog(false);
      setSelectedReview(null);
      toast.success("Review updated");
    }
  });

  const resetForm = () => {
    setFormData({
      employee_id: "",
      review_period_start: "",
      review_period_end: "",
      review_date: new Date().toISOString().split('T')[0],
      overall_rating: 3,
      ratings: {
        quality_of_work: 3,
        reliability: 3,
        communication: 3,
        teamwork: 3,
        professionalism: 3
      },
      strengths: "",
      areas_for_improvement: "",
      reviewer_comments: "",
      status: "draft"
    });
  };

  const calculateAverage = (ratings) => {
    const values = Object.values(ratings);
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-amber-600";
    return "text-red-600";
  };

  const myReviews = user ? reviews.filter(r => r.employee_id === user.id) : [];
  const submittedReviews = reviews.filter(r => r.reviewer_id === user?.id);

  if (!user || isLoading) return <LoadingScreen />;

  const isManager = ["admin", "super_admin", "manager", "supervisor"].includes(user.role_type);

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader 
        title="Performance Reviews"
        subtitle={isManager ? "Manage employee performance" : "Your performance reviews"}
        showBack
        action={isManager ? () => setShowCreateDialog(true) : null}
        actionLabel="New Review"
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue={isManager ? "all" : "mine"}>
          <TabsList className="mb-6">
            {!isManager && <TabsTrigger value="mine">My Reviews</TabsTrigger>}
            {isManager && <TabsTrigger value="all">All Reviews</TabsTrigger>}
            {isManager && <TabsTrigger value="submitted">My Submissions</TabsTrigger>}
          </TabsList>

          <TabsContent value="mine">
            {myReviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myReviews.map((review) => {
                  const reviewer = users.find(u => u.id === review.reviewer_id);
                  const avgRating = calculateAverage(review.ratings);
                  return (
                    <Card key={review.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm text-slate-500">Reviewed by</p>
                            <p className="font-semibold">{reviewer?.full_name || "Unknown"}</p>
                          </div>
                          <div className={`text-2xl font-bold ${getRatingColor(avgRating)}`}>
                            {avgRating}
                            <Star className="w-5 h-5 inline ml-1 fill-current" />
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">
                          {new Date(review.review_period_start).toLocaleDateString()} - {new Date(review.review_period_end).toLocaleDateString()}
                        </p>
                        <Badge className={
                          review.status === "acknowledged" ? "bg-green-100 text-green-700" :
                          review.status === "submitted" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }>
                          {review.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => {
                            setSelectedReview(review);
                            setShowCreateDialog(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                icon={Award}
                title="No reviews yet"
                description="Your performance reviews will appear here"
              />
            )}
          </TabsContent>

          <TabsContent value="all">
            {reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review) => {
                  const employee = users.find(u => u.id === review.employee_id);
                  const reviewer = users.find(u => u.id === review.reviewer_id);
                  const avgRating = calculateAverage(review.ratings);
                  return (
                    <Card key={review.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`text-3xl font-bold ${getRatingColor(avgRating)}`}>
                              {avgRating}
                            </div>
                            <div>
                              <p className="font-semibold">{employee?.full_name || "Unknown"}</p>
                              <p className="text-sm text-slate-600">
                                Reviewed by {reviewer?.full_name} on {new Date(review.review_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={
                              review.status === "acknowledged" ? "bg-green-100 text-green-700" :
                              review.status === "submitted" ? "bg-blue-100 text-blue-700" :
                              "bg-slate-100 text-slate-700"
                            }>
                              {review.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedReview(review);
                                setFormData({
                                  ...review,
                                  review_date: review.review_date?.split('T')[0] || "",
                                  review_period_start: review.review_period_start?.split('T')[0] || "",
                                  review_period_end: review.review_period_end?.split('T')[0] || ""
                                });
                                setShowCreateDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                icon={Award}
                title="No reviews yet"
                description="Create your first performance review"
                action={() => setShowCreateDialog(true)}
                actionLabel="New Review"
              />
            )}
          </TabsContent>

          <TabsContent value="submitted">
            {submittedReviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {submittedReviews.map((review) => {
                  const employee = users.find(u => u.id === review.employee_id);
                  const avgRating = calculateAverage(review.ratings);
                  return (
                    <Card key={review.id} className="shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold">{employee?.full_name || "Unknown"}</p>
                            <p className="text-sm text-slate-600">
                              {new Date(review.review_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className={`text-2xl font-bold ${getRatingColor(avgRating)}`}>
                            {avgRating}
                          </div>
                        </div>
                        <Badge className={
                          review.status === "acknowledged" ? "bg-green-100 text-green-700" :
                          review.status === "submitted" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        }>
                          {review.status}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <EmptyState 
                icon={Award}
                title="No submitted reviews"
                description="Reviews you submit will appear here"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setSelectedReview(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReview ? "View/Edit Review" : "New Performance Review"}</DialogTitle>
            <DialogDescription>
              {selectedReview && selectedReview.employee_id === user.id 
                ? "View your performance review"
                : "Complete the performance review form"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Employee *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                disabled={!!selectedReview}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => ["employee", "officer"].includes(u.role_type)).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Period Start</Label>
                <Input
                  type="date"
                  value={formData.review_period_start}
                  onChange={(e) => setFormData({ ...formData, review_period_start: e.target.value })}
                  disabled={selectedReview && selectedReview.employee_id === user.id}
                />
              </div>
              <div>
                <Label>Review Period End</Label>
                <Input
                  type="date"
                  value={formData.review_period_end}
                  onChange={(e) => setFormData({ ...formData, review_period_end: e.target.value })}
                  disabled={selectedReview && selectedReview.employee_id === user.id}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="mb-3 block">Ratings</Label>
              <div className="space-y-3">
                {Object.keys(formData.ratings).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                    <Select
                      value={formData.ratings[key].toString()}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        ratings: { ...formData.ratings, [key]: parseInt(value) }
                      })}
                      disabled={selectedReview && selectedReview.employee_id === user.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} ⭐</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Strengths</Label>
              <Textarea
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                rows={3}
                disabled={selectedReview && selectedReview.employee_id === user.id}
              />
            </div>

            <div>
              <Label>Areas for Improvement</Label>
              <Textarea
                value={formData.areas_for_improvement}
                onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                rows={3}
                disabled={selectedReview && selectedReview.employee_id === user.id}
              />
            </div>

            <div>
              <Label>Reviewer Comments</Label>
              <Textarea
                value={formData.reviewer_comments}
                onChange={(e) => setFormData({ ...formData, reviewer_comments: e.target.value })}
                rows={3}
                disabled={selectedReview && selectedReview.employee_id === user.id}
              />
            </div>

            {selectedReview && selectedReview.employee_id === user.id && (
              <div>
                <Label>Your Comments</Label>
                <Textarea
                  value={formData.employee_comments || ""}
                  onChange={(e) => setFormData({ ...formData, employee_comments: e.target.value })}
                  rows={3}
                  placeholder="Add your comments..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setSelectedReview(null);
                resetForm();
              }}>
                Cancel
              </Button>
              {(!selectedReview || selectedReview.employee_id !== user.id) && (
                <Button
                  onClick={() => {
                    if (selectedReview) {
                      updateMutation.mutate({ id: selectedReview.id, data: formData });
                    } else {
                      createMutation.mutate(formData);
                    }
                  }}
                  disabled={!formData.employee_id || createMutation.isLoading || updateMutation.isLoading}
                  className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                >
                  {(createMutation.isLoading || updateMutation.isLoading) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    selectedReview ? "Update Review" : "Create Review"
                  )}
                </Button>
              )}
              {selectedReview && selectedReview.employee_id === user.id && selectedReview.status !== "acknowledged" && (
                <Button
                  onClick={() => updateMutation.mutate({ 
                    id: selectedReview.id, 
                    data: { ...formData, status: "acknowledged" } 
                  })}
                  disabled={updateMutation.isLoading}
                  className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"
                >
                  Acknowledge Review
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}