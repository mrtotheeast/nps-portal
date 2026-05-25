import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Award, Star, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { toast } from "sonner";

export default function RecognitionSystem() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [recipientId, setRecipientId] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState("company");
  const [recognitionType, setRecognitionType] = useState("peer");
  const [bonusAmount, setBonusAmount] = useState("");
  const [createBadgeOpen, setCreateBadgeOpen] = useState(false);
  const [newBadge, setNewBadge] = useState({ name: "", icon_emoji: "", icon_color: "#fbbf24" });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["recognition-employees"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: badges = [], isLoading: badgesLoading } = useQuery({
    queryKey: ["recognition-badges"],
    queryFn: () => base44.entities.RecognitionBadge.list(),
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ["recognitions"],
    queryFn: () => base44.entities.Recognition.list(),
  });

  const recognizeMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Recognition.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recognitions"]);
      setRecipientId("");
      setBadgeId("");
      setMessage("");
      setBonusAmount("");
      toast.success("Recognition sent!");
    }
  });

  const createBadgeMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.RecognitionBadge.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["recognition-badges"]);
      setCreateBadgeOpen(false);
      setNewBadge({ name: "", icon_emoji: "", icon_color: "#fbbf24" });
      toast.success("Badge created!");
    }
  });

  const handleRecognize = () => {
    if (!recipientId || !badgeId || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const selectedBadge = badges.find(b => b.id === badgeId);
    recognizeMutation.mutate({
      recipient_id: recipientId,
      sender_id: user.id,
      badge_id: badgeId,
      message,
      recognition_type: recognitionType,
      points_awarded: selectedBadge?.points_value || 0,
      bonus_amount: recognitionType === "bonus" ? parseFloat(bonusAmount) || 0 : null,
      visibility
    });
  };

  const isManager = ["admin", "super_admin", "manager"].includes(user?.role_type);
  const employeeList = employees.filter(e => e.id !== user?.id && ["employee", "officer", "supervisor"].includes(e.role_type));
  const activeBadges = badges.filter(b => b.status === "active");

  if (employeesLoading || badgesLoading || !user) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Recognition System"
        subtitle="Celebrate your teammates"
        showBack
        action={() => navigate(createPageUrl("RecognitionLeaderboard"))}
        actionLabel="View Leaderboard"
        actionIcon={Award}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Give Recognition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Select Employee*</Label>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeList.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name || emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recognition Type*</Label>
                <Select value={recognitionType} onValueChange={setRecognitionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peer">Peer Recognition</SelectItem>
                    {isManager && <SelectItem value="manager">Manager Award</SelectItem>}
                    {isManager && <SelectItem value="bonus">Bonus</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Badge*</Label>
              <div className="flex gap-2">
                <Select value={badgeId} onValueChange={setBadgeId} className="flex-1">
                  <SelectTrigger>
                    <SelectValue placeholder="Choose badge..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBadges.map(badge => (
                      <SelectItem key={badge.id} value={badge.id}>
                        {badge.icon_emoji} {badge.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={createBadgeOpen} onOpenChange={setCreateBadgeOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">+ New</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Badge</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Badge Name</Label>
                        <Input
                          value={newBadge.name}
                          onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                          placeholder="e.g., Superstar"
                        />
                      </div>
                      <div>
                        <Label>Emoji</Label>
                        <Input
                          value={newBadge.icon_emoji}
                          onChange={(e) => setNewBadge({ ...newBadge, icon_emoji: e.target.value })}
                          placeholder="🌟"
                          maxLength="1"
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <Input
                          type="color"
                          value={newBadge.icon_color}
                          onChange={(e) => setNewBadge({ ...newBadge, icon_color: e.target.value })}
                        />
                      </div>
                      <Button
                        onClick={() => createBadgeMutation.mutate(newBadge)}
                        className="w-full bg-[#c9a227] hover:bg-[#b8922a]"
                      >
                        Create Badge
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {recognitionType === "bonus" && isManager && (
              <div>
                <Label>Bonus Amount ($)*</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                  placeholder="100.00"
                />
              </div>
            )}

            <div>
              <Label>Message*</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share why this person deserves recognition..."
                rows={4}
              />
            </div>

            <div>
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="team">Team Only</SelectItem>
                  <SelectItem value="company">Company Wide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleRecognize}
              disabled={recognizeMutation.isLoading}
              className="w-full bg-[#c9a227] hover:bg-[#b8922a]"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Recognition
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Recent Recognitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recognitions.slice(0, 5).map(recognition => {
                const recipient = employees.find(e => e.id === recognition.recipient_id);
                const sender = employees.find(e => e.id === recognition.sender_id);
                const badge = badges.find(b => b.id === recognition.badge_id);
                
                return (
                  <div key={recognition.id} className="p-3 bg-slate-50 rounded-lg border">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={recipient?.profile_photo} />
                        <AvatarFallback>{recipient?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{recipient?.full_name}</p>
                        <p className="text-xs text-slate-600">
                          Recognized by {sender?.full_name} {badge && `with ${badge.icon_emoji} ${badge.name}`}
                        </p>
                        <p className="text-sm text-slate-700 mt-1">{recognition.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}