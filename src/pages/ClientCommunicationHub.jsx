import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Star, Upload, FileText } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import AIAssistant from "@/components/shared/AIAssistant";
import { toast } from "sonner";

export default function ClientCommunicationHub() {
  const [user, setUser] = useState(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [message, setMessage] = useState("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackData, setFeedbackData] = useState({ type: "general", rating: 5, comments: "", incident_id: "", officer_id: "" });
  const queryClient = useQueryClient();

  useEffect(() => { loadUser(); }, []);
  const loadUser = async () => { const currentUser = await base44.auth.me(); setUser(currentUser); };

  const { data: sites = [] } = useQuery({
    queryKey: ["client-sites", user?.client_id],
    queryFn: async () => { if (!user?.client_id) return []; return base44.entities.Site.filter({ client_id: user.client_id }); },
    enabled: !!user?.client_id
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["client-messages", user?.client_id],
    queryFn: async () => { const all = await base44.entities.ChatMessage.list('-timestamp'); return all.filter(m => m.site_id && sites.some(s => s.id === m.site_id)); },
    enabled: sites.length > 0,
    refetchInterval: 5000
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["client-incidents", sites],
    queryFn: async () => { const all = await base44.entities.Incident.list(); return all.filter(i => sites.some(s => s.id === i.site_id)); },
    enabled: sites.length > 0
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      const site = sites.find(s => s.id === selectedSite);
      await base44.entities.ChatMessage.create({ sender_id: user.id, sender_type: 'client', site_id: selectedSite, message, timestamp: new Date().toISOString(), read_by: [user.id] });
      // Create a ClientNotification so officers at this site see it and must acknowledge
      await base44.entities.ClientNotification.create({
        site_id: selectedSite,
        client_id: user.id,
        client_name: user.full_name || "Client",
        message,
        priority: "normal",
        acknowledged_by: [],
        sent_at: new Date().toISOString(),
      });
      if (site) {
        const newNote = `\n[${format(new Date(), 'MMM d, h:mm a')}] Client message: ${message}`;
        await base44.entities.Site.update(selectedSite, { notes: (site.notes || "") + newNote });
      }
      await base44.functions.invoke('sendNotification', { title: 'Client Message', message: `New message from client at ${site?.name || 'site'}`, type: 'message', site_id: selectedSite });
    },
    onSuccess: () => { queryClient.invalidateQueries(["client-messages"]); setMessage(""); setSelectedSite(""); toast.success("Message sent to security team"); }
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ClientFeedback.create({
        client_id: user.client_id, site_id: selectedSite, incident_id: feedbackData.incident_id || null,
        officer_id: feedbackData.officer_id || null, rating: feedbackData.rating, feedback_type: feedbackData.type,
        comments: feedbackData.comments, submitted_date: new Date().toISOString(), status: 'pending'
      });
    },
    onSuccess: () => { setShowFeedbackDialog(false); setFeedbackData({ type: "general", rating: 5, comments: "", incident_id: "", officer_id: "" }); toast.success("Feedback submitted"); }
  });

  if (isLoading || !user) return <LoadingScreen />;

  const messagesBySite = selectedSite ? messages.filter(m => m.site_id === selectedSite) : messages;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader title="Communication Hub" subtitle="Message your security team" showBack />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Send className="w-5 h-5" />Send Message to Site</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Site *</Label>
                  <Select value={selectedSite} onValueChange={setSelectedSite}>
                    <SelectTrigger className="mt-2"><SelectValue placeholder="Choose a site..." /></SelectTrigger>
                    <SelectContent>{sites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message *</Label>
                  <AIAssistant value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type your message to the security team..." promptContext="Improve this message to security officers at the site. Keep it professional and clear." rows={4} />
                </div>
                <Button onClick={() => sendMessageMutation.mutate()} disabled={!selectedSite || !message || sendMessageMutation.isPending} className="w-full">
                  <Send className="w-4 h-4 mr-2" />{sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Message History</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {messagesBySite.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No messages yet</p>
                ) : messagesBySite.map(msg => {
                  const site = sites.find(s => s.id === msg.site_id);
                  const isFromClient = msg.sender_type === 'client';
                  return (
                    <div key={msg.id} className={`p-4 rounded-lg ${isFromClient ? 'bg-blue-50 dark:bg-blue-900/20 ml-8' : 'bg-slate-50 dark:bg-slate-800 mr-8'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={isFromClient ? 'bg-blue-600' : 'bg-slate-600'}>{msg.sender_type}</Badge>
                          <span className="text-sm text-slate-500">{site?.name}</span>
                        </div>
                        <span className="text-xs text-slate-400">{format(new Date(msg.timestamp), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" />Submit Feedback</CardTitle>
                  <Button onClick={() => setShowFeedbackDialog(true)}><Star className="w-4 h-4 mr-2" />New Feedback</Button>
                </div>
              </CardHeader>
              <CardContent><p className="text-sm text-slate-500">Provide feedback on incidents, officers, or general service quality. Your feedback helps us improve.</p></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="dark:bg-slate-900">
          <DialogHeader><DialogTitle>Submit Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feedback Type *</Label>
              <Select value={feedbackData.type} onValueChange={(val) => setFeedbackData({ ...feedbackData, type: val })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Service</SelectItem>
                  <SelectItem value="incident">Specific Incident</SelectItem>
                  <SelectItem value="officer">Specific Officer</SelectItem>
                  <SelectItem value="service">Service Quality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {feedbackData.type === 'incident' && (
              <div>
                <Label>Incident (Optional)</Label>
                <Select value={feedbackData.incident_id} onValueChange={(val) => setFeedbackData({ ...feedbackData, incident_id: val })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select incident..." /></SelectTrigger>
                  <SelectContent>{incidents.slice(0, 10).map(inc => <SelectItem key={inc.id} value={inc.id}>{inc.incident_type} - {inc.incident_date}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {feedbackData.type === 'officer' && (
              <div>
                <Label>Officer (Optional)</Label>
                <Select value={feedbackData.officer_id} onValueChange={(val) => setFeedbackData({ ...feedbackData, officer_id: val })}>
                  <SelectTrigger className="mt-2"><SelectValue placeholder="Select officer..." /></SelectTrigger>
                  <SelectContent>{employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Rating *</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button key={rating} type="button" onClick={() => setFeedbackData({ ...feedbackData, rating })} className="focus:outline-none">
                    <Star className={`w-8 h-8 ${rating <= feedbackData.rating ? 'fill-yellow-500 text-yellow-500' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Comments</Label>
              <AIAssistant value={feedbackData.comments} onChange={(e) => setFeedbackData({ ...feedbackData, comments: e.target.value })} placeholder="Share your feedback..." promptContext="Improve this client feedback for security services. Keep it professional and constructive." rows={4} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowFeedbackDialog(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => submitFeedbackMutation.mutate()} disabled={submitFeedbackMutation.isPending} className="flex-1">
                {submitFeedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}