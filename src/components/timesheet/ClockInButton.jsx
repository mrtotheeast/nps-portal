import React, { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";

export default function ClockInButton({ onClockIn, disabled = false, isDesktop = false }) {
  const [desktopAllowed, setDesktopAllowed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getAppSettings", {}).then(res => {
      if (isDesktop && res.data?.desktop_clock_in_allowed?.value === false) setDesktopAllowed(false);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isDesktop]);

  if (isDesktop && !desktopAllowed) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Clock-in is only permitted from the NPS Portal mobile app. Please use your mobile device to clock in.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Button onClick={onClockIn} disabled={disabled || loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">
      <Clock className="w-5 h-5 mr-2" />Clock In
    </Button>
  );
}