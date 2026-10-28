import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { get, post } from "../../models/api";
import { useAuth } from "../auth";
export function useDriverAppController() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [gpsState, setGpsState] = useState("idle");
  const [network, setNetwork] = useState(
    navigator.onLine ? "online" : "offline",
  );
  const [lastSent, setLastSent] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [samples, setSamples] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const watchIdRef = useRef(null);
  const tripRef = useRef(null);
  const seqRef = useRef(0);
  const handleLogout = () => {
    stopWatching();
    logout();
    navigate("/login/driver");
  };
  const assignment = useQuery({
    queryKey: ["driver/assignment"],
    queryFn: () => get("/driver/assignment"),
    refetchInterval: 30000,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["driver/assignment"],
    });
  };
  const startMutation = useMutation({
    mutationFn: () => post("/driver/trips/start", {}),
    onSuccess: () => {
      invalidate();
      setSendError(null);
    },
    onError: (err) => setSendError(err.message),
  });
  const endMutation = useMutation({
    mutationFn: (tripId) => post(`/driver/trips/${tripId}/end`, {}),
    onSuccess: () => {
      invalidate();
      setConfirmEnd(false);
      stopWatching();
    },
    onError: (err) => {
      setConfirmEnd(false);
      setSendError(err.message);
    },
  });
  useEffect(() => {
    const on = () => setNetwork("online");
    const off = () => setNetwork("offline");
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // active_trip comes nested in the assignment response
  const activeTrip = assignment.data?.active_trip || null;
  tripRef.current = activeTrip;
  const sendSample = useCallback((coords) => {
    const t = tripRef.current;
    if (!t) return;
    seqRef.current += 1;
    const payload = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy_m: coords.accuracy != null ? Math.round(coords.accuracy) : null,
      observed_at: new Date().toISOString(),
      sequence: seqRef.current,
    };
    post(`/driver/trips/${t.id}/location`, payload)
      .then((res) => {
        if (res.accepted) setSamples((n) => n + 1);
        setLastSent(payload);
        setLastSentAt(new Date().toISOString());
        setSendError(res.accepted ? null : res.reason || "Sample rejected");
      })
      .catch((err) => setSendError(err.message));
  }, []);
  const stopWatching = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setGpsState("idle");
  }, []);
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || !tripRef.current) {
      setGpsState("unavailable");
      return;
    }
    setGpsState("locating");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState("active");
        sendSample({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGpsState(
          err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );
  }, [sendSample]);
  useEffect(
    () => () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    },
    [],
  );
  useEffect(() => {
    if (activeTrip && watchIdRef.current == null) {
      startWatching();
    }
  }, [activeTrip, startWatching]);
  const a = assignment.data?.assignment;
  return {
    profile,
    gpsState,
    network,
    lastSent,
    lastSentAt,
    sendError,
    setSendError,
    samples,
    confirmEnd,
    setConfirmEnd,
    handleLogout,
    assignment,
    invalidate,
    startMutation,
    endMutation,
    activeTrip,
    startWatching,
    a,
  };
}
