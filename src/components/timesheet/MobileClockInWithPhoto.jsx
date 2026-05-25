import React, { useState, useRef } from "react";
import { Camera, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function MobileClockInWithPhoto({ isClockOut = false, onPhotoCapture, loading = false }) {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const requestCameraPermission = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).catch(() => { setCameraPermission(false); toast.error("Camera access is required to clock in."); return null; });
    if (!stream) return;
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
    setCameraPermission(true);
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedPhoto(photoDataUrl);
    streamRef.current?.getTracks().forEach(t => t.stop());
    const base64Data = photoDataUrl.split(",")[1];
    const bytes = new Uint8Array(atob(base64Data).split("").map(c => c.charCodeAt(0)));
    const file = new File([new Blob([bytes], { type: "image/jpeg" })], `clock-${isClockOut ? "out" : "in"}-${Date.now()}.jpg`, { type: "image/jpeg" });
    const response = await base44.integrations.Core.UploadFile({ file });
    onPhotoCapture(response.file_url);
    setShowCamera(false);
  };

  const handleClose = () => { streamRef.current?.getTracks().forEach(t => t.stop()); setShowCamera(false); setCapturedPhoto(null); };

  if (!showCamera) {
    if (cameraPermission === false) return <Alert variant="destructive" className="my-4"><AlertCircle className="h-4 w-4" /><AlertDescription>Camera access is required. Please enable camera permissions.</AlertDescription></Alert>;
    return <Button onClick={requestCameraPermission} disabled={loading} className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white"><Camera className="w-5 h-5 mr-2" />{isClockOut ? "Clock Out with Photo" : "Clock In with Photo"}</Button>;
  }

  return (
    <Dialog open={showCamera} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" />{isClockOut ? "Clock Out Photo" : "Clock In Photo"}</DialogTitle>
          <DialogDescription>{capturedPhoto ? "Photo captured successfully." : "Position yourself clearly and tap Capture."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!capturedPhoto ? (
            <>
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}><video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                <Button onClick={capturePhoto} className="flex-1 bg-purple-600 hover:bg-purple-700"><Camera className="w-4 h-4 mr-2" />Capture Photo</Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}><img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" /></div>
              <Alert className="bg-green-50 border-green-200"><CheckCircle2 className="h-4 w-4 text-green-600" /><AlertDescription className="text-green-800">Photo captured at {new Date().toLocaleTimeString()}</AlertDescription></Alert>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setCapturedPhoto(null); requestCameraPermission(); }} className="flex-1">Retake</Button>
                <Button onClick={handleClose} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}