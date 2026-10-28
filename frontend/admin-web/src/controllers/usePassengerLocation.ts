import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "../models/passenger";
type Permission = PermissionState | "unknown" | "unsupported";
export function usePassengerLocation() {
  const [permission, setPermission] = useState<Permission>("unknown");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const requesting = useRef(false);
  const requestVersion = useRef(0);
  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let status: PermissionStatus | undefined;
    const updatePermission = () => {
      if (disposed || !status) return;
      setPermission(status.state);
      if (status.state === "denied") {
        requestVersion.current += 1;
        requesting.current = false;
        setLocating(false);
        setPosition(null);
        setError(
          "Location is blocked. You can still search for a bus, route or stop.",
        );
      }
    };
    const readPermission = async () => {
      if (!navigator.geolocation) {
        setPermission("unsupported");
        return;
      }
      if (!navigator.permissions?.query) return;
      try {
        const next = await navigator.permissions.query({
          name: "geolocation",
        });
        if (disposed) return;
        status?.removeEventListener("change", updatePermission);
        status = next;
        updatePermission();
        status.addEventListener("change", updatePermission);
      } catch {
        // Some browsers support GPS but not querying its permission.
      }
    };
    void readPermission();
    window.addEventListener("focus", readPermission);
    return () => {
      disposed = true;
      mounted.current = false;
      requestVersion.current += 1;
      status?.removeEventListener("change", updatePermission);
      window.removeEventListener("focus", readPermission);
    };
  }, []);
  const locate = useCallback(() => {
    if (requesting.current) return;
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setError(
        "Location is not supported in this browser. Search for a bus, route or stop instead.",
      );
      return;
    }
    requesting.current = true;
    setLocating(true);
    setError(null);
    const version = ++requestVersion.current;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!mounted.current || version !== requestVersion.current) return;
        requesting.current = false;
        setPosition({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setPermission("granted");
        setLocating(false);
      },
      (failure) => {
        if (!mounted.current || version !== requestVersion.current) return;
        requesting.current = false;
        setPosition(null);
        setLocating(false);
        if (failure.code === 1) setPermission("denied");
        setError(
          failure.code === 1
            ? "Location is blocked. Allow it in your browser's site settings, or search manually."
            : failure.code === 3
              ? "Finding your location took too long. Please try again."
              : "Your location is unavailable right now. Try again or search manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      },
    );
  }, []);
  return {
    permission,
    position,
    locating,
    error,
    locate,
  };
}
export type PassengerLocation = ReturnType<typeof usePassengerLocation>;
export const permissionLabels: Record<Permission, string> = {
  granted: "Allowed",
  denied: "Blocked",
  prompt: "Ask first",
  unknown: "Not checked",
  unsupported: "Unavailable",
};
