import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HeaderChatPanel({ currentUser }) {
  const { data: channels = [] } = useQuery({
    queryKey: ["chat-channels-nav", currentUser?.id],
    queryFn: async () => {
      try {
        const all = await base44.entities.ChatChannel.list();
        return all.filter(ch => ch.member_ids?.includes(currentUser?.id) || ch.is_company_wide);
      } catch {
        return [];
      }
    },
    enabled: !!currentUser,
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages-nav", channels],
    queryFn: async () => {
      try {
        if (channels.length === 0) return [];
        const msgs = await base44.entities.ChatMessage.list();
        return msgs.filter(m => channels.some(ch => ch.id === m.channel_id));
      } catch {
        return [];
      }
    },
    enabled: channels.length > 0,
    refetchInterval: 3000,
  });

  const unreadCount = messages.filter(m => !m.read_by?.includes(currentUser?.id)).length;
  const navigate = useNavigate();

  return (
    <Button variant="ghost" size="icon" className="relative text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px]" onClick={() => navigate(createPageUrl("Chat"))}>
      <MessageSquare className="w-5 h-5" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full">
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      )}
    </Button>
  );
}