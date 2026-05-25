import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Clock, MapPin, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DraggableShift({ shift, index, employee, site, onEdit }) {
  return (
    <Draggable draggableId={shift.id} index={index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => onEdit?.(shift)}
          className={`p-2 mb-2 rounded-lg border transition-all cursor-pointer ${snapshot.isDragging ? "bg-blue-100 border-blue-300 shadow-lg" : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"}`}>
          <div className="flex items-start gap-2">
            <GripVertical className="w-4 h-4 text-slate-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{employee?.full_name || "Unassigned"}</p>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1"><MapPin className="w-3 h-3" /><span className="truncate">{site?.name || "No site"}</span></div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5"><Clock className="w-3 h-3" /><span>{shift.start_time} - {shift.end_time}</span></div>
              {shift.status && <Badge variant={shift.status === "confirmed" ? "default" : "secondary"} className="mt-1 text-xs">{shift.status}</Badge>}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}