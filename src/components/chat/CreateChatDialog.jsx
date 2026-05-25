import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Search } from "lucide-react";
import { toast } from "sonner";

export default function CreateChatDialog({ open, onClose, employees, currentUserId, onChatCreated }) {
  const [chatType, setChatType] = useState("group");
  const [chatName, setChatName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleParticipant = (empId) => setSelectedParticipants(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  const selectAll = () => setSelectedParticipants(filteredEmployees.map(e => e.id));
  const deselectAll = () => setSelectedParticipants([]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setGroupPhoto(file_url);
    setUploading(false);
    toast.success("Photo uploaded");
  };

  const handleCreate = async () => {
    if (chatType === "group" && !chatName) { toast.error("Please enter a group name"); return; }
    if (selectedParticipants.length === 0) { toast.error("Please select at least one participant"); return; }
    const newChat = await base44.entities.ChatRoom.create({ type: chatType, name: chatType === "group" ? chatName : null, photo_url: groupPhoto, participants: [currentUserId, ...selectedParticipants], created_by: currentUserId });
    toast.success("Chat created");
    onChatCreated(newChat);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create New Chat</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant={chatType === "direct" ? "default" : "outline"} onClick={() => setChatType("direct")} className="flex-1">Direct Message</Button>
            <Button variant={chatType === "group" ? "default" : "outline"} onClick={() => setChatType("group")} className="flex-1">Group Chat</Button>
          </div>
          {chatType === "group" && (
            <>
              <div><Label>Group Name</Label><Input value={chatName} onChange={(e) => setChatName(e.target.value)} placeholder="Enter group name" /></div>
              <div>
                <Label>Group Photo</Label>
                <div className="flex items-center gap-4">
                  {groupPhoto && <img src={groupPhoto} alt="Group" className="w-16 h-16 rounded-full object-cover" />}
                  <Input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </div>
              </div>
            </>
          )}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Participants ({selectedParticipants.length} selected)</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>Select All</Button>
                <Button size="sm" variant="ghost" onClick={deselectAll}>Clear</Button>
              </div>
            </div>
            <div className="mb-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search employees..." className="pl-10" />
            </div>
            <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                  <Checkbox checked={selectedParticipants.includes(emp.id)} onCheckedChange={() => toggleParticipant(emp.id)} />
                  <div className="flex-1"><p className="font-medium">{emp.firstName} {emp.lastName}</p><p className="text-sm text-slate-500">{emp.email}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]"><Users className="w-4 h-4 mr-2" />Create Chat</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}