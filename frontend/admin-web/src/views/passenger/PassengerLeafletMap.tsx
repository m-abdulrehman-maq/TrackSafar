import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates, NearbyBus } from "../../models/passenger";
export type PassengerLeafletMapProps = {
  position: Coordinates | null;
  focus:
    | (Coordinates & {
        label?: string;
      })
    | null;
  buses: NearbyBus[];
  onSelectBus: (bus: NearbyBus) => void;
};
const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587];
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

/**
 * Leaflet/OpenStreetMap fallback used when Google Maps is unavailable. It draws
 * the same real position and bus observations; no demo markers are added.
 */
export function PassengerLeafletMap({
  position,
  focus,
  buses,
  onSelectBus,
}: PassengerLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const focusMarkerRef = useRef<L.CircleMarker | null>(null);
  const lastFocusKeyRef = useRef<string | null>(null);
  const busMarkersRef = useRef(new Map<string, L.Marker>());
  const selectBusRef = useRef(onSelectBus);
  const centeredOnUserRef = useRef(false);
  const fittedBusesRef = useRef(false);
  useEffect(() => {
    selectBusRef.current = onSelectBus;
  }, [onSelectBus]);
  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      userMarkerRef.current = null;
      busMarkersRef.current.clear();
    };
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points: [number, number][] = [];
    if (focus) {
      const key = focus.latitude + "," + focus.longitude;
      const latlng: [number, number] = [focus.latitude, focus.longitude];
      if (focusMarkerRef.current) {
        focusMarkerRef.current.setLatLng(latlng);
      } else {
        focusMarkerRef.current = L.circleMarker(latlng, {
          radius: 11,
          color: "#ffffff",
          weight: 3,
          fillColor: "#d93025",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(focus.label || "Searched place");
      }
      if (lastFocusKeyRef.current !== key) {
        lastFocusKeyRef.current = key;
        centeredOnUserRef.current = false;
        map.setView(latlng, 14);
      }
      points.push(latlng);
    } else {
      if (focusMarkerRef.current) {
        focusMarkerRef.current.remove();
        focusMarkerRef.current = null;
      }
      lastFocusKeyRef.current = null;
    }
    if (position) {
      const latlng: [number, number] = [position.latitude, position.longitude];
      points.push(latlng);
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(latlng);
      } else {
        userMarkerRef.current = L.circleMarker(latlng, {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip("Your location");
      }
      if (!focus && !centeredOnUserRef.current) {
        centeredOnUserRef.current = true;
        map.setView(latlng, 15);
      }
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
      const latlng: [number, number] = [latitude, longitude];
      points.push(latlng);
      seen.add(tripId);
      let marker = busMarkersRef.current.get(tripId);
      if (!marker) {
        const icon = L.divIcon({
          className: "ps-leaflet-bus",
          html: "<span>" + escapeHtml(routeNumber) + "</span>",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        marker = L.marker(latlng, {
          icon,
          title: routeNumber + " · " + busNumber,
          keyboard: true,
        })
          .addTo(map)
          .bindTooltip(escapeHtml(routeNumber) + " · " + escapeHtml(busNumber));
        marker.on("click", () => selectBusRef.current(item));
        busMarkersRef.current.set(tripId, marker);
      } else {
        marker.setLatLng(latlng);
        marker.setTooltipContent(
          escapeHtml(routeNumber) + " · " + escapeHtml(busNumber),
        );
      }
    }
    for (const [tripId, marker] of busMarkersRef.current) {
      if (seen.has(tripId)) continue;
      marker.remove();
      busMarkersRef.current.delete(tripId);
    }
    if (!position && !focus && !fittedBusesRef.current && points.length > 0) {
      fittedBusesRef.current = true;
      if (points.length === 1) {
        map.setView(points[0], 15);
      } else {
        map.fitBounds(L.latLngBounds(points), {
          padding: [40, 40],
          maxZoom: 16,
        });
      }
    }
  }, [position, focus, buses]);
  return (
    <div
      ref={containerRef}
      className="ps-map-canvas ps-leaflet-map"
      role="region"
      aria-label="Bus map"
    />
  );
}
