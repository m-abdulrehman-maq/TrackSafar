import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  GOOGLE_MAPS_API_KEY,
  loadGoogleMaps,
} from "../../models/maps/googleMaps";
import type { Coordinates, NearbyBus } from "../../models/passenger";
import { PassengerLeafletMap } from "./PassengerLeafletMap";
export type PassengerMapProps = {
  position: Coordinates | null;
  focus:
    | (Coordinates & {
        label?: string;
      })
    | null;
  buses: NearbyBus[];
  onSelectBus: (bus: NearbyBus) => void;
};
const DEFAULT_CENTER = {
  lat: 31.5204,
  lng: 74.3587,
};
const USER_ICON = {
  scale: 8,
  fillColor: "#1a73e8",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
};
const BUS_ICON = {
  scale: 15,
  fillColor: "#006852",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
};
const FOCUS_ICON = {
  scale: 11,
  fillColor: "#d93025",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 3,
};
function busLabel(routeNumber: string) {
  return {
    text: routeNumber,
    color: "#ffffff",
    fontSize: "10px",
    fontWeight: "700",
  };
}

/**
 * Google Maps is preferred when a working key is configured. If the key is
 * missing, not activated, or rejected, the panel falls back to Leaflet/OSM.
 */
export function PassengerMap(props: PassengerMapProps) {
  const [fallback, setFallback] = useState(!GOOGLE_MAPS_API_KEY);
  if (fallback) return <PassengerLeafletMap {...props} />;
  return (
    <GooglePassengerMap {...props} onUnavailable={() => setFallback(true)} />
  );
}
function GooglePassengerMap({
  position,
  focus,
  buses,
  onSelectBus,
  onUnavailable,
}: PassengerMapProps & {
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const focusMarkerRef = useRef<any>(null);
  const lastFocusKeyRef = useRef<string | null>(null);
  const busMarkersRef = useRef(new Map<string, any>());
  const selectBusRef = useRef(onSelectBus);
  const unavailableRef = useRef(onUnavailable);
  const centeredOnUserRef = useRef(false);
  const fittedBusesRef = useRef(false);
  const authFailedRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  useEffect(() => {
    selectBusRef.current = onSelectBus;
  }, [onSelectBus]);
  useEffect(() => {
    unavailableRef.current = onUnavailable;
  }, [onUnavailable]);
  useEffect(() => {
    let cancelled = false;
    const useFallback = (reason: string) => {
      if (cancelled) return;
      console.warn(
        "Google Maps unavailable, using OpenStreetMap fallback: " + reason,
      );
      unavailableRef.current();
    };
    const onAuthFailure = () => {
      authFailedRef.current = true;
      useFallback(
        "the Google Maps JavaScript API is not activated for this key",
      );
    };
    window.gm_authFailure = onAuthFailure;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (cancelled || authFailedRef.current || !containerRef.current) return;
        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(containerRef.current, {
            center: DEFAULT_CENTER,
            zoom: 13,
            disableDefaultUI: false,
            clickableIcons: false,
            fullscreenControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            gestureHandling: "greedy",
          });
        }
        setStatus("ready");
      })
      .catch((error) => {
        useFallback(
          error instanceof Error
            ? error.message
            : "the map could not be loaded",
        );
      });
    return () => {
      cancelled = true;
      if (window.gm_authFailure === onAuthFailure) delete window.gm_authFailure;
    };
  }, []);
  useEffect(() => {
    const google = window.google;
    const map = mapRef.current;
    if (!google || !map || status !== "ready") return;
    const points: {
      lat: number;
      lng: number;
    }[] = [];
    if (focus) {
      const key = focus.latitude + "," + focus.longitude;
      const point = {
        lat: focus.latitude,
        lng: focus.longitude,
      };
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setPosition(point);
      } else {
        focusMarkerRef.current = new google.maps.Marker({
          map,
          position: point,
          zIndex: 40,
          icon: {
            ...FOCUS_ICON,
            path: google.maps.SymbolPath.CIRCLE,
          },
        });
      }
      focusMarkerRef.current.setTitle(focus.label || "Searched place");
      if (lastFocusKeyRef.current !== key) {
        lastFocusKeyRef.current = key;
        centeredOnUserRef.current = false;
        map.setCenter(point);
        map.setZoom(14);
      }
      points.push(point);
    } else {
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setMap(null);
        focusMarkerRef.current = null;
      }
      lastFocusKeyRef.current = null;
    }
    if (position) {
      const point = {
        lat: position.latitude,
        lng: position.longitude,
      };
      const icon = {
        ...USER_ICON,
        path: google.maps.SymbolPath.CIRCLE,
      };
      if (userMarkerRef.current) {
        userMarkerRef.current.setPosition(point);
      } else {
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: point,
          title: "Your location",
          zIndex: 30,
          icon,
        });
      }
      if (!focus && !centeredOnUserRef.current) {
        centeredOnUserRef.current = true;
        map.setCenter(point);
        map.setZoom(15);
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    const seen = new Set<string>();
    for (const item of buses) {
      const {
        latitude,
        longitude,
        trip_id: tripId,
        route_number: routeNumber,
        bus_number: busNumber,
      } = item.bus;
      if (latitude == null || longitude == null) continue;
      const point = {
        lat: latitude,
        lng: longitude,
      };
      points.push(point);
      seen.add(tripId);
      let marker = busMarkersRef.current.get(tripId);
      if (!marker) {
        marker = new google.maps.Marker({
          map,
          position: point,
          title: routeNumber + " · " + busNumber,
          zIndex: 10,
          icon: {
            ...BUS_ICON,
            path: google.maps.SymbolPath.CIRCLE,
          },
          label: busLabel(routeNumber),
        });
        marker.addListener("click", () => selectBusRef.current(item));
        busMarkersRef.current.set(tripId, marker);
      } else {
        marker.setPosition(point);
        marker.setTitle(routeNumber + " · " + busNumber);
        marker.setLabel(busLabel(routeNumber));
      }
    }
    for (const [tripId, marker] of busMarkersRef.current) {
      if (seen.has(tripId)) continue;
      marker.setMap(null);
      busMarkersRef.current.delete(tripId);
    }
    if (!position && !focus && !fittedBusesRef.current && points.length > 0) {
      fittedBusesRef.current = true;
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(15);
      } else {
        const bounds = new google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 64);
      }
    }
  }, [position, focus, buses, status]);
  return (
    <>
      <div
        ref={containerRef}
        className="ps-map-canvas"
        role="region"
        aria-label="Bus map"
      />
      {status !== "ready" && (
        <div className="ps-map-placeholder" aria-live="polite">
          <span className="ps-map-symbol" aria-hidden="true">
            <LoaderCircle className="ps-spin" size={28} />
          </span>
          <h1>Loading the map…</h1>
          <p>
            Your location and nearby buses will appear as soon as the map is
            ready.
          </p>
        </div>
      )}
    </>
  );
}
