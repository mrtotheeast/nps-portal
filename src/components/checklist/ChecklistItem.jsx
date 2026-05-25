import React, { useState } from "react";
import { Camera, Flag, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function ChecklistItem({ item, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const update = (changes) => onChange({ ...item, ...changes });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update({ photo_urls: [...(item.photo_urls || []), file_url] });
    setUploading(false);
  };

  const removePhoto = (url) => update({ photo_urls: (item.photo_urls || []).filter((u) => u !== url) });

  return (
    <div className={`rounded-lg border transition-all ${item.flagged ? "border-red-300 bg-red-50" : item.checked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-3 p-3">
        <Checkbox checked={item.checked} onCheckedChange={(v) => update({ checked: !!v })} className="shrink-0" />
        <span className={`flex-1 text-sm font-medium ${item.checked ? "line-through text-slate-400" : "text-slate-800"}`}>
          {item.label}
          {item.requires_photo && !item.photo_urls?.length && <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">Photo required</Badge>}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => update({ flagged: !item.flagged })} className={`p-1.5 rounded ${item.flagged ? "text-red-500" : "text-slate-300 hover:text-red-400"}`}><Flag className="w-4 h-4" /></button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 text-slate-400 hover:text-slate-700">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3">
          <Textarea placeholder="Add notes for this item..." value={item.notes || ""} onChange={(e) => update({ notes: e.target.value })} className="text-sm min-h-[60px]" />
          {(item.photo_urls || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.photo_urls.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} className="w-16 h-16 object-cover rounded border" />
                  <button onClick={() => removePhoto(url)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"><X className="w-2.5 h-2.5" /></button>
                </div>
              ))}
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span><Camera className="w-4 h-4 mr-1" />{uploading ? "Uploading..." : "Add Photo"}</span>
            </Button>
          </label>
        </div>
      )}
    </div>
  );
}