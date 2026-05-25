import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Shield, Search, Eye, Lock, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import EmptyState from "@/components/shared/EmptyState";

export default function AdminDMMonitor() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  // Only allow admins
  const isAdmin = user?.role === "admin" || user?.role_type === "super_admin";

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["dm-rooms-admin"],
    queryFn: async () => {
      const all = await base44.entities.ChatRoom.list("-last_message_at");
      return all.filter(r => r.type === "direct");
    },
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["all-users-monitor"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: messages = [], isLoading: loadingMsgs } = useQuery({
    queryKey: ["dm-messages-admin", selectedRoom?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ room_id: selectedRoom.id }, "created_date"),
    enabled: !!selectedRoom,
    refetchInterval: 5000,
  });

  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const getRoomName = (room) => {
    const names = (room.participants || []).map(pid => userMap[pid]?.full_name || "Unknown");
    return names.join(" ↔ ");
  };

  const filteredRooms = rooms.filter(r => {
    if (!search) return true;
    return (room => getRoomName(room).toLowerCase().includes(search.toLowerCase()))(r);
  });

  if (!user) return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-lg font-semibold text-slate-700">Admin Access Only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="DM Monitor"
        subtitle="Admin-only view of direct messages — users are not notified"
        showBack
        currentPage="DM Monitor"
      />

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Security notice */}
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-800">
          <Lock className="w-4 h-4 shrink-0 text-red-600" />
          <span><strong>Confidential:</strong> This view is for admin security review only. Users are not notified that messages may be monitored.</span>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-260px)]">
          {/* DM Room List */}
          <Card className="flex flex-col overflow-hidden shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4" /> Direct Conversations ({filteredRooms.length})
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <Input placeholder="Search users..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto">
              {loadingRooms ? (
                <div className="p-4 text-center text-slate-400 text-sm">Loading...</div>
              ) : filteredRooms.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">No DM conversations yet</div>
              ) : filteredRooms.map(room => (
                <div key={room.id} onClick={() => setSelectedRoom(room)}
                  className={`px-4 py-3 cursor-pointer border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedRoom?.id === room.id ? "bg-red-50 border-l-4 border-l-red-500" : ""}`}>
                  <p className="font-medium text-sm truncate">{getRoomName(room)}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{room.last_message?.text?.substring(0, 50) || "No messages"}</p>
                  {room.last_message?.timestamp && (
                    <p className="text-xs text-slate-300 mt-0.5">{format(new Date(room.last_message.timestamp), "MMM d, h:mm a")}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Messages Panel */}
          <Card className="flex flex-col overflow-hidden shadow-sm">
            {selectedRoom ? (
              <>
                <CardHeader className="pb-2 border-b bg-red-50">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <CardTitle className="text-sm text-red-800">{getRoomName(selectedRoom)}</CardTitle>
                    <Badge className="bg-red-100 text-red-700 text-xs ml-auto">Admin View</Badge>
                  </div>
                </CardHeader>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                  {loadingMsgs ? (
                    <div className="text-center text-slate-400 text-sm py-8">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="No messages yet" description="This conversation has no messages." />
                  ) : messages.map(msg => {
                    const sender = userMap[msg.sender_id];
                    const isSystem = msg.message_type === "alert";
                    return (
                      <div key={msg.id} className="flex gap-3 items-start">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="text-xs font-bold bg-[#1a2b4a] text-white">
                            {(sender?.full_name || msg.sender_name || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-white rounded-xl px-3 py-2 shadow-sm border">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-700">{sender?.full_name || msg.sender_name || "Unknown"}</span>
                            <span className="text-xs text-slate-400">{format(new Date(msg.created_date || msg.timestamp), "MMM d, h:mm a")}</span>
                            {msg.priority === "urgent" && <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>}
                          </div>
                          {msg.message_type === "image" && msg.media_url
                            ? <img src={msg.content} alt="shared" className="max-w-xs rounded-lg" />
                            : <p className="text-sm text-slate-800">{msg.content}</p>
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <Eye className="w-14 h-14 mb-3 text-slate-300" />
                <p className="font-medium">Select a DM thread to review</p>
                <p className="text-sm text-slate-400 mt-1">All direct messages are visible here for admin review</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}