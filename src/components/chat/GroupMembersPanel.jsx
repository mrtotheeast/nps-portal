import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function GroupMembersPanel({ room, users, currentUser, onClose }) {
  if (!room) return null;

  const members = (room.participants || []).map(pid => users.find(u => u.id === pid) || { id: pid, full_name: "Unknown" });
  const isCreator = (uid) => room.created_by === uid;

  return (
    <div className="flex flex-col h-full border-l bg-white">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-600" />
          <span className="font-semibold text-sm">Members ({members.length})</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {members.map(member => (
          <div key={member.id} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg", member.id === currentUser?.id && "bg-slate-50")}>
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarFallback className="bg-[#1a2b4a] text-white text-xs font-bold">
                {(member.full_name || "?").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{member.full_name}</p>
                {isCreator(member.id) && <Crown className="w-3 h-3 text-[#c9a227] shrink-0" title="Group Creator" />}
              </div>
              <p className="text-xs text-slate-400 truncate">{member.email || (member.role_type || member.role || "Member")}</p>
            </div>
            {member.id === currentUser?.id && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}