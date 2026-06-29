import { useState, useEffect, useCallback } from "react";

export type PermissionState = "prompt" | "granted" | "denied" | "unknown";

export function useDevicePermissions() {
  const [cameraStatus, setCameraStatus] = useState<PermissionState>("unknown");
  const [micStatus, setMicStatus] = useState<PermissionState>("unknown");
  const [loading, setLoading] = useState(true);

  const checkPermissions = useCallback(async () => {
    setLoading(true);
    try {
      // Query API is supported in Chrome/Firefox but not Safari
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const camQuery = await navigator.permissions.query({ name: "camera" as PermissionName });
          setCameraStatus(camQuery.state as PermissionState);
          camQuery.onchange = () => setCameraStatus(camQuery.state as PermissionState);
        } catch {
          setCameraStatus("prompt");
        }

        try {
          const micQuery = await navigator.permissions.query({ name: "microphone" as PermissionName });
          setMicStatus(micQuery.state as PermissionState);
          micQuery.onchange = () => setMicStatus(micQuery.state as PermissionState);
        } catch {
          setMicStatus("prompt");
        }
      } else {
        // Fallback for browsers that don't support query permissions API
        setCameraStatus("prompt");
        setMicStatus("prompt");
      }
    } catch {
      setCameraStatus("unknown");
      setMicStatus("unknown");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<{ camera: boolean; mic: boolean }> => {
    setLoading(true);
    let cameraGranted = false;
    let micGranted = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Stop streams immediately after check
      stream.getTracks().forEach((track) => track.stop());
      
      setCameraStatus("granted");
      setMicStatus("granted");
      cameraGranted = true;
      micGranted = true;
    } catch (err) {
      console.warn("Failed to request full media devices:", err);
      // Try video only or audio only to see which failed
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach((track) => track.stop());
        setCameraStatus("granted");
        cameraGranted = true;
      } catch {
        setCameraStatus("denied");
      }

      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach((track) => track.stop());
        setMicStatus("granted");
        micGranted = true;
      } catch {
        setMicStatus("denied");
      }
    } finally {
      setLoading(false);
    }

    return { camera: cameraGranted, mic: micGranted };
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    cameraStatus,
    micStatus,
    loading,
    checkPermissions,
    requestPermissions,
  };
}
