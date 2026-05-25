import React from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/components/ui/alert-dialog";
import { MapPin } from "lucide-react";

export default function LocationPermissionExplanation({ open, onAccept, onCancel }) {
  const handleAccept = () => {
    onAccept();
    // Request native location permission after user accepts explanation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("Location permission granted:", position);
        },
        (error) => {
          console.warn("Location permission denied:", error);
        }
      );
    }
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            <AlertDialogTitle>Location Access Needed</AlertDialogTitle>
          </div>
        </AlertDialogHeader>
        <AlertDialogDescription>
          NPS Portal uses your device location for three specific purposes only:
        </AlertDialogDescription>
        <div className="text-sm text-slate-700 space-y-3 mt-3">
          <div className="flex gap-2">
            <span className="text-[#c9a227] font-bold shrink-0">1.</span>
            <span><strong>Geofenced Clock-In &amp; Clock-Out:</strong> When you tap Clock In or Clock Out, your GPS coordinates are captured to verify you are physically within the boundaries of your assigned work site (e.g., confirmed at 123 Main St before clocking in).</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#c9a227] font-bold shrink-0">2.</span>
            <span><strong>Patrol Route Tracking:</strong> During an active patrol session, your route is recorded so supervisors can verify that each checkpoint was visited in the correct order and the full patrol was completed.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[#c9a227] font-bold shrink-0">3.</span>
            <span><strong>Site Check-In Verification:</strong> When you check in to a site, your GPS coordinates are saved alongside your timestamp so supervisors can confirm you were on-site at the recorded time.</span>
          </div>
          <p className="text-xs text-slate-500 pt-1">Location is only active during your shift. It is never tracked in the background and is never shared with third parties.</p>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <AlertDialogCancel onClick={onCancel}>
            Not Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleAccept}>
            Allow Location
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}