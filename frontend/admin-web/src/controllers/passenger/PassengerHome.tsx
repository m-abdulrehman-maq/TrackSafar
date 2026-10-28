import type { PassengerLocation } from "../usePassengerLocation";
import type { Bus, Profile, Stop, TrackedBus } from "../../models/passenger";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BusFront, Leaf } from "lucide-react";
import {
  apiGet,
  loadBusCatalog,
  matchesService,
  searchNetwork,
} from "../../models/passenger";
import type {
  NearbyBus,
  RouteDetail,
  ServiceFilter,
} from "../../models/passenger";
import { searchPlaces } from "../../models/maps/geocoding";
import type { Place } from "../../models/maps/geocoding";
export type Selection =
  | {
      kind: "route";
      id: string;
      bus?: TrackedBus;
    }
  | {
      kind: "bus";
      bus: Bus;
    }
  | {
      kind: "stop";
      stop: Stop;
    };
export const filters: {
  value: ServiceFilter;
  label: string;
  icon: typeof BusFront;
}[] = [
  {
    value: "all",
    label: "All",
    icon: BusFront,
  },
  {
    value: "speedo",
    label: "Speedo",
    icon: BusFront,
  },
  {
    value: "electric",
    label: "Electric",
    icon: Leaf,
  },
];
export function usePassengerHomeController({
  profile,
  location,
}: {
  profile: Profile;
  location: PassengerLocation;
}) {
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [term, setTerm] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<Place | null>(null);
  const [now, setNow] = useState(Date.now());
  const searching = searchText.trim().length > 0;
  const mapPosition = focus ?? location.position;
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(searchText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const nearby = useQuery({
    queryKey: [
      "passenger",
      profile.id,
      "nearby",
      mapPosition?.latitude,
      mapPosition?.longitude,
    ],
    enabled: Boolean(mapPosition) && !searching,
    queryFn: ({ signal }) =>
      apiGet<NearbyBus[]>(
        "/tracking/nearby?lat=" +
          mapPosition!.latitude +
          "&lon=" +
          mapPosition!.longitude +
          "&radius_m=1500",
        signal,
      ),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const search = useQuery({
    queryKey: ["passenger", profile.id, "search", term],
    enabled: term.length >= 2 && searching,
    queryFn: ({ signal }) => searchNetwork(term, signal),
  });
  const places = useQuery({
    queryKey: ["passenger", profile.id, "places", term],
    enabled: term.length >= 2 && searching,
    queryFn: ({ signal }) => searchPlaces(term, signal),
    staleTime: 60_000,
    retry: 0,
  });
  const catalog = useQuery({
    queryKey: ["passenger", profile.id, "bus-catalog"],
    enabled: filter !== "all" && (Boolean(mapPosition) || term.length >= 2),
    queryFn: ({ signal }) => loadBusCatalog(signal),
    staleTime: 60_000,
  });
  const operators = new Map(
    (catalog.data || []).map((bus) => [bus.id, bus.operator]),
  );
  const nearbyItems = (nearby.data || []).filter((item) =>
    matchesService(operators.get(item.bus.bus_id), filter),
  );
  const filteredBuses = (search.data?.buses || []).filter((bus) =>
    matchesService(bus.operator, filter),
  );
  const resultCount =
    filteredBuses.length +
    (search.data?.routes.length || 0) +
    (search.data?.stops.length || 0) +
    (places.data?.length || 0);
  const filterPending = filter !== "all" && catalog.isPending;
  const filterError = filter !== "all" && catalog.isError;
  const nearbyReady =
    Boolean(mapPosition) && nearby.isSuccess && !filterPending && !filterError;
  const chooseBus = (item: NearbyBus) =>
    setSelection({
      kind: "route",
      id: item.bus.route_id,
      bus: item.bus,
    });
  const choosePlace = (place: Place) => {
    setFocus(place);
    setSearchText("");
    setTerm("");
  };
  const useMyLocation = () => {
    setFocus(null);
    location.locate();
  };
  return {
    filter,
    setFilter,
    searchText,
    setSearchText,
    term,
    setTerm,
    selection,
    setSelection,
    focus,
    setFocus,
    now,
    searching,
    mapPosition,
    nearby,
    search,
    places,
    catalog,
    nearbyItems,
    filteredBuses,
    resultCount,
    filterPending,
    filterError,
    nearbyReady,
    chooseBus,
    choosePlace,
    useMyLocation,
  };
}
export function useRouteDetailsController({
  routeId,
  profileId,
}: {
  routeId: string;
  profileId: string;
}) {
  const route = useQuery({
    queryKey: ["passenger", profileId, "route", routeId],
    queryFn: ({ signal }) =>
      apiGet<RouteDetail>(
        "/catalog/routes/" + encodeURIComponent(routeId),
        signal,
      ),
  });
  return {
    route,
  };
}
