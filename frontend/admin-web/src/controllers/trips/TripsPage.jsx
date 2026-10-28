import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post, getToken } from "../../models/api";
import { WS_BASE_URL } from "../../config/env";
export const FRESHNESS_TONE = {
  fresh: "success",
  stale: "warning",
  unavailable: "neutral",
};
export function useTrackingSocket(onEvent) {
  const [status, setStatus] = useState("connecting"); // connecting | live | offline

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setStatus("offline");
      return undefined;
    }
    let ws;
    let closed = false;
    let retryTimer;
    const connect = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const wsBase = WS_BASE_URL || `${proto}://${window.location.host}`;
      ws = new WebSocket(`${wsBase}/ws/tracking`);
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "auth",
            token,
          }),
        );
        setStatus("live");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== "pong") onEvent(data);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus("offline");
        retryTimer = setTimeout(connect, 4000);
      };
      ws.onerror = () => ws.close();
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        /* already closed */
      }
    };
  }, [onEvent]);
  return status;
}
export function useTripsPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [recover, setRecover] = useState(null);
  const [live, setLive] = useState([]);
  const [notice, setNotice] = useState(null);
  const pageSize = 10;
  const path = `/admin/trips?page=${page}&page_size=${pageSize}${status ? `&status=${status}` : ""}`;
  const query = useQuery({
    queryKey: [path],
    queryFn: () => get(path),
    placeholderData: (p) => p,
  });
  const overview = useQuery({
    queryKey: ["admin/overview"],
    queryFn: () => get("/admin/overview"),
  });
  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: [path],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin/overview"],
    });
  };

  // Live events (authoritative REST snapshot re-fetched after each event)
  const onEvent = (event) => {
    if (event.type === "location-updated") {
      setLive((prev) => {
        const next = prev.filter((b) => b.trip_id !== event.data.trip_id);
        return [event.data, ...next];
      });
      clearTimeout(window.__tsLive);
      window.__tsLive = setTimeout(invalidateAll, 800);
    } else if (event.type === "trip-ended") {
      setLive((prev) => prev.filter((b) => b.trip_id !== event.data.trip_id));
      setNotice("A trip ended — it has been removed from the active fleet.");
      invalidateAll();
    }
  };
  const socketStatus = useTrackingSocket(onEvent);

  // Initial authoritative snapshot for the live list
  useEffect(() => {
    get("/tracking/active")
      .then(setLive)
      .catch(() => setLive([]));
  }, []);
  const recoverMutation = useMutation({
    mutationFn: (tripId) => post(`/admin/trips/${tripId}/recover-end`, {}),
    onSuccess: () => {
      setRecover(null);
      setNotice(
        "Trip recovered and ended. The action was recorded in the audit log.",
      );
      setLive((prev) => prev.filter((b) => b.trip_id !== recover.id));
      invalidateAll();
    },
    onError: (err) => {
      setRecover(null);
      setNotice(`Recovery failed: ${err.message}`);
    },
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const refreshLive = () =>
    get("/tracking/active")
      .then(setLive)
      .catch(() => {});
  return {
    refreshLive,
    page,
    setPage,
    status,
    setStatus,
    recover,
    setRecover,
    live,
    setLive,
    notice,
    pageSize,
    query,
    overview,
    invalidateAll,
    socketStatus,
    recoverMutation,
    items,
    total,
  };
}
