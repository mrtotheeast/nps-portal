import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScanPatrol() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const startScan = () => {
    setScanning(true);
    // Placeholder for QR code scanner implementation
    setTimeout(() => {
      setScanning(false);
      setResult({ checkpointId: "CP001", site: "Downtown Office", time: new Date().toLocaleTimeString() });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Scan Patrol Checkpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-100 rounded-lg p-8 text-center">
              {scanning ? (
                <div className="animate-pulse">
                  <Camera className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Scanning...</p>
                </div>
              ) : (
                <>
                  <Camera className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Point camera at checkpoint QR code</p>
                </>
              )}
            </div>

            {result && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">{result.site}</p>
                    <p className="text-xs text-emerald-700">{result.time}</p>
                  </div>
                </div>
              </div>
            )}

            <Button onClick={startScan} disabled={scanning} className="w-full bg-[#1a2b4a]">
              {scanning ? "Scanning..." : "Start Scan"}
            </Button>
            <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}