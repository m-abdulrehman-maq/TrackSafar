import { get } from "../../lib/api";

export type Coordinates = { latitude: number; longitude: number };
export type ServiceFilter = "all" | "speedo" | "electric";
export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
};
export type PassengerAuth = {
  profile: Profile | null;
  reload: () => Promise<Profile | null>;
  logout: () => void;
};
export type Bus = {
  id: string;
  bus_number: string;
  operator: string | null;
  has_active_trip: boolean;
};
export type RouteInfo = {
  id: string;
  route_number: string;
  name: string;
  origin: string;
  destination: string;
  direction: string;
  path: number[][] | null;
};
export type Stop = { id: string; name: string } & Coordinates;
export type RouteDetail = RouteInfo & {
  stops: {
    id: string;
    stop_id: string;
    stop_name: string;
    sequence: number;
    stop_active: boolean;
    latitude: number;
    longitude: number;
  }[];
};
export type TrackedBus = {
  trip_id: string;
  bus_id: string;
  bus_number: string;
  route_id: string;
  route_number: string;
  route_name: string;
  latitude: number | null;
  longitude: number | null;
  observed_at: string | null;
  freshness: "fresh" | "stale" | "unavailable";
};
export type NearbyBus = { distance_m: number; bus: TrackedBus };
export type SearchResults = { buses: Bus[]; routes: RouteInfo[]; stops: Stop[] };
type Page<T> = { items: T[]; total: number; page: number; page_size: number };

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return get(path, { signal }) as Promise<T>;
}

export async function searchNetwork(term: string, signal?: AbortSignal): Promise<SearchResults> {
  const encoded = encodeURIComponent(term);
  // The route catalog also matches origin/destination, unlike tracking/search.
  const [results, routes] = await Promise.all([
    apiGet<SearchResults>("/tracking/search?q=" + encoded, signal),
    apiGet<Page<RouteInfo>>("/catalog/routes?search=" + encoded + "&page_size=100", signal),
  ]);
  return {
    ...results,
    routes: [...new Map([...results.routes, ...routes.items].map((route) => [route.id, route])).values()],
  };
}

export async function loadBusCatalog(signal?: AbortSignal): Promise<Bus[]> {
  const buses: Bus[] = [];
  let page = 1;
  // Do not silently filter only the first 20 buses.
  while (true) {
    const result = await apiGet<Page<Bus>>("/catalog/buses?page_size=100&page=" + page, signal);
    buses.push(...result.items);
    if (buses.length >= result.total || result.items.length === 0) return buses;
    page += 1;
  }
}

export function matchesService(operator: string | null | undefined, filter: ServiceFilter) {
  if (filter === "all") return true;
  const words = (operator || "").trim().toLowerCase().split(/[^a-z]+/);
  return words.includes(filter);
}

export function initials(name?: string) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  return words.length ? (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase() : "";
}

export function timeAgo(timestamp: string | number | null | undefined, now = Date.now()) {
  if (!timestamp) return "Time unavailable";
  const time = typeof timestamp === "number" ? timestamp : Date.parse(timestamp);
  if (!Number.isFinite(time) || time > now + 60_000) return "Time unavailable";
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return seconds + " sec ago";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? hours + " hr ago" : Math.floor(hours / 24) + " days ago";
}

export function distanceLabel(metres: number) {
  if (!Number.isFinite(metres)) return "Distance unavailable";
  return metres < 1000 ? Math.round(metres) + " m away" : (metres / 1000).toFixed(1) + " km away";
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
