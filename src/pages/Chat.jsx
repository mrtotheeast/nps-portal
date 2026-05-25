import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Plus, Send, Users as UsersIcon, Search, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Chat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileChannels, setShowMobileChannels] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load current user with error handling
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        if (user) {
          setCurrentUser(user);
        }
      } catch (err) {
        setAuthError("Unable to load user. Please refresh the page.");
        console.error("Auth error:", err);
      }
    };
    loadUser();
  }, []);

  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ["chat-channels", currentUser?.id],
    queryFn: async () => {
      try {
        const all = await base44.entities.ChatChannel.list();
        return all.filter(ch => ch.member_ids?.includes(currentUser?.id) || ch.is_company_wide);
      } catch (err) {
        console.error("Error loading channels:", err);
        return [];
      }
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", selectedChannel?.id],
    queryFn: async () => {
      try {
        return await base44.entities.ChatMessage.filter({ channel_id: selectedChannel?.id }, "-created_date");
      } catch (err) {
        console.error("Error loading messages:", err);
        return [];
      }
    },
    enabled: !!selectedChannel,
    refetchInterval: 3000,
  });

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChannel?.id, messages.length]);

  const { data: employees = [] } = useQuery({
    queryKey: ["chat-employees"],
    queryFn: async () => {
      try {
        const all = await base44.entities.Employee.list();
        return all.filter(e => e.status === "active" && e.invitation_status === "active");
      } catch (err) {
        console.error("Error loading employees:", err);
        return [];
      }
    },
    enabled: !!currentUser,
  });

  const createChannelMutation = useMutation({
    mutationFn: async () => {
      if (!channelName.trim()) {
        toast.error("Channel name is required");
        return;
      }
      try {
        const newChannel = await base44.entities.ChatChannel.create({
          name: channelName.trim(),
          created_by: currentUser.id,
          member_ids: [currentUser.id, ...selectedMembers],
          is_company_wide: false,
          description: ""
        });
        return newChannel;
      } catch (err) {
        toast.error("Failed to create channel");
        throw err;
      }
    },
    onSuccess: (newChannel) => {
      queryClient.invalidateQueries(["chat-channels"]);
      setSelectedChannel(newChannel);
      setShowNewChannel(false);
      setChannelName("");
      setSelectedMembers([]);
      setShowMobileChannels(false);
      toast.success("Channel created");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() || !selectedChannel) return;
      try {
        await base44.entities.ChatMessage.create({
          channel_id: selectedChannel.id,
          sender_id: currentUser.id,
          sender_name: currentUser.full_name,
          message_text: messageText.trim(),
          message_type: "text",
          read_by: [currentUser.id]
        });
      } catch (err) {
        toast.error("Failed to send message");
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["chat-messages", selectedChannel?.id]);
      setMessageText("");
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedChannel) return;
    sendMessageMutation.mutate();
  };

  const getUnreadCount = (channel) => {
    return messages.filter(m => m.channel_id === channel.id && !m.read_by?.includes(currentUser?.id)).length;
  };

  const getTotalUnread = () => {
    return channels.reduce((sum, ch) => sum + getUnreadCount(ch), 0);
  };

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{authError}</p>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </div>
      </div>
    );
  }

  if (!currentUser || channelsLoading) return <LoadingScreen message="Loading chat..." />;

  return (
    <div className="flex flex-col h-screen bg-slate-50 fixed inset-0">
      {/* Header */}
      <div className="bg-[#1a2b4a] text-white px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-[#2d4a6f] h-8 w-8">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <MessageSquare className="w-5 h-5 text-[#c9a227]" />
          <span className="font-bold text-base hidden sm:inline">Team Chat</span>
        </div>
        <Button size="sm" onClick={() => setShowNewChannel(true)} className="bg-[#c9a227] text-[#1a2b4a] hover:bg-[#b8922a] font-semibold h-8">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Channel List */}
        <div className={cn("flex flex-col bg-white border-r w-full md:w-[320px] shrink-0 overflow-hidden", showMobileChannels ? "flex" : "hidden md:flex")}>
          <div className="p-4 border-b shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search channels..." className="pl-9 text-sm h-9 rounded-lg" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {channels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12 px-4">
                <MessageSquare className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm">No channels yet</p>
              </div>
            ) : channels.map(ch => {
              const unread = getUnreadCount(ch);
              return (
                <div key={ch.id} onClick={() => { setSelectedChannel(ch); setShowMobileChannels(false); }} className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b", selectedChannel?.id === ch.id ? "bg-blue-50 border-l-4 border-[#c9a227]" : "hover:bg-slate-50")}>
                  <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {ch.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ch.name}</p>
                    {unread > 0 && <Badge className="mt-1 bg-[#c9a227] text-[#1a2b4a] text-xs font-bold">{unread}</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message View */}
        <div className={cn("flex-1 flex flex-col overflow-hidden min-h-0", showMobileChannels ? "hidden" : "flex")}>
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="p-4 border-b bg-white flex items-center gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setShowMobileChannels(true)}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-full bg-[#1a2b4a] text-white flex items-center justify-center text-sm font-bold">
                  {selectedChannel.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">{selectedChannel.name}</p>
                  <p className="text-xs text-slate-500">{selectedChannel.member_ids?.length || 0} members</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.sender_id === currentUser.id ? "justify-end" : "justify-start")}>
                    {msg.sender_id !== currentUser.id && (
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="text-xs bg-slate-300">{msg.sender_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn("max-w-[75%]", msg.sender_id === currentUser.id && "flex flex-col items-end")}>
                      {msg.sender_id !== currentUser.id && <p className="text-xs text-slate-500 mb-1">{msg.sender_name}</p>}
                      <div className={cn("rounded-lg px-4 py-2", msg.sender_id === currentUser.id ? "bg-[#1a2b4a] text-white" : "bg-white border border-slate-200")}>
                        <p className="text-sm">{msg.message_text}</p>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(msg.created_date), "h:mm a")}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <Input placeholder="Type a message..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} className="flex-1 text-sm h-10 rounded-lg" />
                  <Button onClick={handleSend} disabled={!messageText.trim()} className="bg-[#1a2b4a] hover:bg-[#2d4a6f] text-white h-10 px-4">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-16 h-16 mb-4 text-slate-300" />
              <p className="font-medium">Select a channel</p>
              <p className="text-sm mt-1">or create a new one to start chatting</p>
              <Button onClick={() => setShowNewChannel(true)} className="mt-6 bg-[#1a2b4a] hover:bg-[#2d4a6f]">
                <Plus className="w-4 h-4 mr-2" /> New Channel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Channel Dialog */}
      <Dialog open={showNewChannel} onOpenChange={setShowNewChannel}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Channel name" value={channelName} onChange={e => setChannelName(e.target.value)} className="rounded-lg" />
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search members..." className="pl-9 rounded-lg" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50">
              {employees.filter(e => e.id !== currentUser?.id && (!searchQuery || e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))).map(emp => (
                <div key={emp.id} onClick={() => setSelectedMembers(prev => prev.includes(emp.id) ? prev.filter(x => x !== emp.id) : [...prev, emp.id])} className={cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer", selectedMembers.includes(emp.id) ? "bg-blue-100" : "hover:bg-slate-100")}>
                  <Checkbox checked={selectedMembers.includes(emp.id)} />
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="text-xs bg-slate-300">{emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{emp.full_name}</p>
                    <p className="text-xs text-slate-500">{emp.role || "Employee"}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={() => createChannelMutation.mutate()} disabled={!channelName.trim() || createChannelMutation.isPending} className="w-full bg-[#1a2b4a] hover:bg-[#2d4a6f]">
              {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}