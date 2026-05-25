import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Star, Plus, Eye, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";

export default function PerformanceReviewList() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["performance-reviews"],
    queryFn: () => base44.entities.PerformanceReview.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users-reviews"],
    queryFn: () => base44.entities.User.list(),
  });

  if (isLoading || !user) return <LoadingScreen />;

  const isManager = ["admin", "super_admin", "manager"].includes(user.role_type);
  
  const myReviews = reviews.filter(r => r.employee_id === user.id);
  const managedReviews = reviews.filter(r => r.reviewer_id === user.id);
  const allReviews = isManager ? reviews : myReviews;

  const getEmployee = (employeeId) => users.find(u => u.id === employeeId);
  const getReviewer = (reviewerId) => users.find(u => u.id === reviewerId);

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-slate-100 text-slate-700",
      submitted: "bg-blue-100 text-blue-700",
      acknowledged: "bg-green-100 text-green-700"
    };
    return <Badge className={styles[status]}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Performance Reviews"
        subtitle={`${allReviews.length} reviews`}
        showBack
        action={isManager ? () => navigate(createPageUrl("PerformanceReviewForm")) : null}
        actionLabel="Create Review"
        actionIcon={Plus}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue={isManager ? "all" : "my"}>
          <TabsList>
            {isManager && <TabsTrigger value="all">All Reviews ({allReviews.length})</TabsTrigger>}
            <TabsTrigger value="my">My Reviews ({myReviews.length})</TabsTrigger>
            {isManager && <TabsTrigger value="managed">Reviews I Created ({managedReviews.length})</TabsTrigger>}
          </TabsList>

          {isManager && (
            <TabsContent value="all">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allReviews.map((review) => {
                  const employee = getEmployee(review.employee_id);
                  const reviewer = getReviewer(review.reviewer_id);
                  return (
                    <Card key={review.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={employee?.profile_photo} />
                              <AvatarFallback className="bg-[#1a2b4a] text-white">
                                {employee?.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{employee?.full_name}</CardTitle>
                              <p className="text-xs text-slate-500">by {reviewer?.full_name}</p>
                            </div>
                          </div>
                          {getStatusBadge(review.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {review.overall_rating && (
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            <span className="font-semibold">{review.overall_rating}/5</span>
                          </div>
                        )}
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Period: {format(new Date(review.review_period_start), "MMM d")} - {format(new Date(review.review_period_end), "MMM d, yyyy")}</p>
                          {review.review_date && (
                            <p>Reviewed: {format(new Date(review.review_date), "MMM d, yyyy")}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-4"
                          onClick={() => navigate(createPageUrl(`PerformanceReviewDetail?id=${review.id}`))}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}

          <TabsContent value="my">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myReviews.map((review) => {
                const reviewer = getReviewer(review.reviewer_id);
                return (
                  <Card key={review.id} className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">My Review</CardTitle>
                        {getStatusBadge(review.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-2">Reviewer: {reviewer?.full_name}</p>
                      {review.overall_rating && (
                        <div className="flex items-center gap-2 mb-3">
                          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                          <span className="font-semibold">{review.overall_rating}/5</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(createPageUrl(`PerformanceReviewDetail?id=${review.id}`))}
                      >
                        View Review
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {isManager && (
            <TabsContent value="managed">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {managedReviews.map((review) => {
                  const employee = getEmployee(review.employee_id);
                  return (
                    <Card key={review.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{employee?.full_name}</CardTitle>
                          {getStatusBadge(review.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => navigate(createPageUrl(`PerformanceReviewDetail?id=${review.id}`))}
                        >
                          Continue Editing
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}