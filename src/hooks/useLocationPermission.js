import { useState, useEffect } from "react";

const LOCATION_PERMISSION_KEY = "nps_location_permission_shown";

export function useLocationPermission() {
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null); // "accepted" | "declined" | null

  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_PERMISSION_KEY);
    if (!stored) {
      setShowPermissionDialog(true);
    } else {
      setPermissionStatus(stored); // "accepted" or "declined"
    }
  }, []);

  const handlePermissionAccepted = () => {
    localStorage.setItem(LOCATION_PERMISSION_KEY, "accepted");
    setShowPermissionDialog(false);
    setPermissionStatus("accepted");
    // Trigger the native permission prompt immediately after explanation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {});
    }
  };

  const handlePermissionDenied = () => {
    localStorage.setItem(LOCATION_PERMISSION_KEY, "declined");
    setShowPermissionDialog(false);
    setPermissionStatus("declined");
  };

  const resetLocationPermission = () => {
    localStorage.removeItem(LOCATION_PERMISSION_KEY);
    setPermissionStatus(null);
    setShowPermissionDialog(true);
  };

  return {
    showPermissionDialog,
    hasShownPermission: !!permissionStatus,
    permissionStatus,
    permissionDenied: permissionStatus === "declined",
    handlePermissionAccepted,
    handlePermissionDenied,
    resetLocationPermission,
  };
}