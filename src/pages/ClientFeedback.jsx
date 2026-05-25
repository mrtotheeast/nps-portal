import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, CheckCircle, Send, Loader2 } from "lucide-react";
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

export default function ClientFeedback() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [formData, setFormData] = useState({ feedback_type: "service_quality", subject: "", message: "" });

  React.useEffect(() => { loadUser(); }, []);
  const loadUser = async () => { const currentUser = await base44.auth.me(); setUser(currentUser); };

  const { data: feedbacks = [], isLoading } = useQuery({
    queryKey: ["client-feedback"],
    queryFn: () => base44.entities.ClientFeedback.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientFeedback.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["client-feedback"]);
      setShowDialog(false);
      setFormData({ feedback_type: "service_quality", subject: "", message: "" });
      setRating(5);
      toast.success("Feedback submitted successfully");
    }
  });

  const handleSubmit = () => { createMutation.mutate({ ...formData, rating, client_id: user.id }); };

  const getStatusColor = (status) => {
    const colors = { new: "bg-blue-100 text-blue-800", acknowledged: "bg-amber-100 text-amber-800", resolved: "bg-emerald-100 text-emerald-800" };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Feedback" subtitle="Share your experience and suggestions" action={() => setShowDialog(true)} actionLabel="Give Feedback" actionIcon={MessageSquare} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {feedbacks.length > 0 ? (
          <div className="space-y-4">
            {feedbacks.map((feedback) => (
              <Card key={feedback.id} className="shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{feedback.subject}</h3>
                        <Badge className={getStatusColor(feedback.status)}>{feedback.status}</Badge>
                      </div>
                      <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= feedback.rating ? "fill-[#c9a227] text-[#c9a227]" : "text-slate-300"}`} />
                        ))}
                        <span className="text-sm text-slate-500 ml-2">{new Date(feedback.created_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-600 text-sm">{feedback.message}</p>
                    </div>
                  </div>
                  {feedback.response && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-4 h-4 text-emerald-600" /><p className="text-sm font-medium text-emerald-900">Response:</p></div>
                      <p className="text-sm text-emerald-800">{feedback.response}</p>
                      {feedback.responded_at && <p className="text-xs text-emerald-600 mt-2">Responded on {new Date(feedback.responded_at).toLocaleDateString()}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={MessageSquare} title="No feedback submitted yet" description="Share your thoughts and help us improve" action={() => setShowDialog(true)} actionLabel="Give Feedback" />
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Submit Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                    <Star className={`w-8 h-8 ${star <= rating ? "fill-[#c9a227] text-[#c9a227]" : "text-slate-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Feedback Type</label>
              <Select value={formData.feedback_type} onValueChange={(v) => setFormData({ ...formData, feedback_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service_quality">Service Quality</SelectItem>
                  <SelectItem value="officer_performance">Officer Performance</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="Brief summary" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Message</label>
              <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Tell us more..." className="min-h-[120px]" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formData.subject || !formData.message || createMutation.isLoading} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                {createMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Submit</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}