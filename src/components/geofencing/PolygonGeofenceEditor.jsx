import React, { useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

function PolygonDrawer({ coordinates, onChange }) {
  const [points, setPoints] = useState(coordinates || []);
  useMapEvents({
    click: (e) => {
      const newPoints = [...points, { lat: e.latlng.lat, lng: e.latlng.lng }];
      setPoints(newPoints);
      onChange(newPoints);
    }
  });
  return points.length >= 3
    ? <Polygon positions={points.map(p => [p.lat, p.lng])} color="#c9a227" />
    : <>{points.map((point, idx) => <Marker key={idx} position={[point.lat, point.lng]} />)}</>;
}

export default function PolygonGeofenceEditor({ coordinates = [], onChange, center = [40.7128, -74.0060] }) {
  const [points, setPoints] = useState(coordinates);

  const handlePointsChange = (newPoints) => { setPoints(newPoints); onChange(newPoints); };
  const removePoint = (index) => { const np = points.filter((_, i) => i !== index); setPoints(np); onChange(np); };
  const clearPoints = () => { setPoints([]); onChange([]); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Draw Polygon Geofence</Label>
        <Button type="button" variant="outline" size="sm" onClick={clearPoints} disabled={points.length === 0}><Trash2 className="w-4 h-4 mr-1" />Clear</Button>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        <MapPin className="w-4 h-4 inline mr-2" />Click on the map to add polygon points (minimum 3 required)
      </div>
      <div className="h-80 rounded-lg overflow-hidden border">
        <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
          <PolygonDrawer coordinates={points} onChange={handlePointsChange} />
        </MapContainer>
      </div>
      {points.length > 0 && (
        <div className="space-y-2">
          <Label>Polygon Points ({points.length})</Label>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {points.map((point, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 rounded p-2 text-sm">
                <span>Point {idx + 1}: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePoint(idx)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}