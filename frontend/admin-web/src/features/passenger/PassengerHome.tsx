import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BusFront, ChevronRight, Leaf, LoaderCircle, LocateFixed, MapPin, RefreshCw, Search, UserRound, X } from "lucide-react";
import { apiGet, distanceLabel, errorMessage, loadBusCatalog, matchesService, searchNetwork, timeAgo } from "./passenger-data";
import type { Bus, NearbyBus, Profile, RouteDetail, ServiceFilter, Stop, TrackedBus } from "./passenger-data";
import type { PassengerLocation } from "./usePassengerLocation";
import { PassengerBrand, PassengerEmpty, PassengerModal } from "./PassengerUi";
import { PassengerMap } from "./PassengerMap";

type Selection =
  | { kind: "route"; id: string; bus?: TrackedBus }
  | { kind: "bus"; bus: Bus }
  | { kind: "stop"; stop: Stop };

const filters: { value: ServiceFilter; label: string; icon: typeof BusFront }[] = [
  { value: "all", label: "All", icon: BusFront },
  { value: "speedo", label: "Speedo", icon: BusFront },
  { value: "electric", label: "Electric", icon: Leaf },
];

export function PassengerHome({ profile, location }: { profile: Profile; location: PassengerLocation }) {
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [term, setTerm] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [now, setNow] = useState(Date.now());
  const searching = searchText.trim().length > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(searchText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const nearby = useQuery({
    queryKey: ["passenger", profile.id, "nearby", location.position?.latitude, location.position?.longitude],
    enabled: Boolean(location.position) && !searching,
    queryFn: ({ signal }) => apiGet<NearbyBus[]>("/tracking/nearby?lat=" + location.position!.latitude +
      "&lon=" + location.position!.longitude + "&radius_m=1500", signal),
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
  const catalog = useQuery({
    queryKey: ["passenger", profile.id, "bus-catalog"],
    enabled: filter !== "all" && (Boolean(location.position) || term.length >= 2),
    queryFn: ({ signal }) => loadBusCatalog(signal),
    staleTime: 60_000,
  });
  const operators = new Map((catalog.data || []).map((bus) => [bus.id, bus.operator]));
  const nearbyItems = (nearby.data || []).filter((item) => matchesService(operators.get(item.bus.bus_id), filter));
  const filteredBuses = (search.data?.buses || []).filter((bus) => matchesService(bus.operator, filter));
  const filterPending = filter !== "all" && catalog.isPending;
  const filterError = filter !== "all" && catalog.isError;
  const nearbyReady = Boolean(location.position) && nearby.isSuccess && !filterPending && !filterError;
  const chooseBus = (item: NearbyBus) => setSelection({ kind: "route", id: item.bus.route_id, bus: item.bus });

  return <main className="ps-home">
    <header className="ps-home-header">
      <div className="ps-topbar">
        <PassengerBrand />
        <Link to="/passenger/account" className="ps-account-button" aria-label="Open account" title={profile.full_name || "My account"}>
          <UserRound size={21} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
      <form className="ps-search" role="search" onSubmit={(event) => { event.preventDefault(); setTerm(searchText.trim()); }}>
        <Search size={19} aria-hidden="true" />
        <label className="ps-sr-only" htmlFor="passenger-search">Search buses, routes or stops</label>
        <input id="passenger-search" type="search" placeholder="Where are you going?" value={searchText}
          maxLength={100} autoComplete="off" onChange={(event) => setSearchText(event.target.value)} />
        {searchText && <button type="button" className="ps-icon-button" aria-label="Clear search" onClick={() => { setSearchText(""); setTerm(""); }}>
          <X size={18} aria-hidden="true" />
        </button>}
      </form>
      <div className="ps-filters" role="group" aria-label="Bus service">
        {filters.map(({ value, label, icon: Icon }) => <button key={value} type="button" className="ps-filter"
          aria-pressed={filter === value} onClick={() => setFilter(value)}>
          <Icon size={17} aria-hidden="true" /><span>{label}</span>
        </button>)}
      </div>
    </header>

    {searching ? <section className="ps-search-results" aria-label="Search results" aria-busy={search.isFetching}>
      <div className="ps-section-heading"><h1>Find your route</h1><span>Bus · route · stop</span></div>
      {searchText.trim().length < 2 ? <p className="ps-inline-note">Enter at least 2 characters to search.</p>
        : term !== searchText.trim() || search.isPending ? <Loading text="Searching the network…" />
        : search.isError ? <Failure message={errorMessage(search.error)} onRetry={() => void search.refetch()} />
        : <>
          {filter !== "all" && <p className="ps-inline-note">The service filter applies to buses. Routes and stops are shown for all services.</p>}
          {filteredBuses.length + (search.data?.routes.length || 0) + (search.data?.stops.length || 0) === 0 &&
            <PassengerEmpty title="No matches found">Try a different bus number, route or stop name.</PassengerEmpty>}
          {!!search.data?.routes.length && <h2 className="ps-result-label">Routes</h2>}
          {search.data?.routes.map((route) => <button type="button" className="ps-result" key={route.id}
            onClick={() => setSelection({ kind: "route", id: route.id })}>
            <span className="ps-bus-icon"><BusFront size={20} aria-hidden="true" /></span>
            <span className="ps-result-copy"><strong>{route.route_number} · {route.name}</strong><small>{route.origin} → {route.destination}</small></span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>)}
          {!!filteredBuses.length && <h2 className="ps-result-label">Buses</h2>}
          {filteredBuses.map((bus) => <button type="button" className="ps-result" key={bus.id}
            onClick={() => setSelection({ kind: "bus", bus })}>
            <span className="ps-bus-icon"><BusFront size={20} aria-hidden="true" /></span>
            <span className="ps-result-copy"><strong>{bus.bus_number}</strong><small>{bus.operator || "Registered bus"}</small></span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>)}
          {!!search.data?.stops.length && <h2 className="ps-result-label">Stops</h2>}
          {search.data?.stops.map((stop) => <button type="button" className="ps-result" key={stop.id}
            onClick={() => setSelection({ kind: "stop", stop })}>
            <span className="ps-stop-icon"><MapPin size={20} aria-hidden="true" /></span>
            <span className="ps-result-copy"><strong>{stop.name}</strong><small>Registered stop</small></span>
            <ChevronRight size={18} aria-hidden="true" />
          </button>)}
        </>}
    </section> : <>
      <section className="ps-map-area" aria-label="Bus map">
        <PassengerMap position={location.position} buses={nearbyReady ? nearbyItems : []} onSelectBus={chooseBus} />
        <button type="button" className="ps-locate-button" aria-label={location.locating ? "Finding your location" : "Use my location"}
          title="Use my location" disabled={location.locating} onClick={location.locate}>
          {location.locating ? <LoaderCircle className="ps-spin" size={23} aria-hidden="true" /> : <LocateFixed size={24} aria-hidden="true" />}
        </button>
      </section>
      <section className="ps-nearby-sheet" aria-label="Nearby buses" aria-busy={nearby.isFetching || location.locating}>
        <div className="ps-sheet-handle" aria-hidden="true" />
        <div className="ps-section-heading">
          <h2>{nearbyReady ? nearbyItems.length + (nearbyItems.length === 1 ? " bus nearby" : " buses nearby") : "Nearby buses"}</h2>
          <div className="ps-check-time">
            {nearbyReady && <span>Checked {timeAgo(nearby.dataUpdatedAt, now)}</span>}
            {location.position && <button type="button" className="ps-icon-button" aria-label="Refresh nearby buses"
              disabled={nearby.isFetching} onClick={() => { void nearby.refetch(); if (filter !== "all") void catalog.refetch(); }}>
              <RefreshCw size={15} className={nearby.isFetching ? "ps-spin" : ""} aria-hidden="true" />
            </button>}
          </div>
        </div>
        {location.error && <p className="ps-notice" role="alert">{location.error}</p>}
        {!location.position ? <div className="ps-location-prompt">
          <span className="ps-location-symbol" aria-hidden="true"><LocateFixed size={22} /></span>
          <h2>{location.locating ? "Finding your location…" : "Find buses around you"}</h2>
          <p>Use your location to see buses within 1.5 km.<br />You can also search without sharing your location.</p>
          <button type="button" className="ps-button ps-button-primary" disabled={location.locating} onClick={location.locate}>
            {location.locating ? <LoaderCircle size={16} className="ps-spin" aria-hidden="true" /> : <LocateFixed size={16} aria-hidden="true" />}
            {location.locating ? "Locating…" : "Use my location"}
          </button>
        </div> : nearby.isPending || filterPending ? <Loading text="Finding nearby buses…" />
          : nearby.isError || filterError ? <Failure message={errorMessage(nearby.error || catalog.error)}
            onRetry={() => { void nearby.refetch(); if (filter !== "all") void catalog.refetch(); }} />
          : nearbyItems.length === 0 ? <PassengerEmpty title="No buses nearby right now">
            {filter === "all" ? "Buses will appear here when a nearby active trip shares its location." : "No nearby buses are tagged as " + filter + ". Try All services or check again later."}
          </PassengerEmpty> : <div className="ps-bus-list">
            {nearbyItems.map((item) => <button key={item.bus.trip_id} type="button" className="ps-bus-card" onClick={() => chooseBus(item)}>
              <span className="ps-bus-icon"><BusFront size={23} aria-hidden="true" /></span>
              <span className="ps-bus-copy">
                <span className="ps-bus-title"><strong>{item.bus.route_number}</strong><ChevronRight size={13} aria-hidden="true" /><span>{item.bus.route_name}</span></span>
                <small>{item.bus.bus_number} · {distanceLabel(item.distance_m)}</small>
                <small>{item.bus.freshness === "stale" ? "Stale · " : ""}Observed {timeAgo(item.bus.observed_at, now)}</small>
              </span>
              <span className="ps-bus-end"><span>ETA unavailable</span><ChevronRight size={17} aria-hidden="true" /></span>
            </button>)}
          </div>}
      </section>
    </>}
    {selection && <PassengerModal title={selection.kind === "route" ? "Route details" : selection.kind === "bus" ? "Bus details" : "Stop details"}
      onClose={() => setSelection(null)}>
      {selection.kind === "route" ? <RouteDetails routeId={selection.id} profileId={profile.id} />
        : selection.kind === "bus" ? <div className="ps-dialog-body">
          <h3>{selection.bus.bus_number}</h3><p>{selection.bus.operator || "Operator not specified"}</p>
          <p>Registered buses appear in nearby results when an active trip shares a recent location within your area.</p>
        </div> : <div className="ps-dialog-body">
          <h3>{selection.stop.name}</h3><p>This stop is in the registered network. Map directions and arrival estimates are not available yet.</p>
        </div>}
    </PassengerModal>}
  </main>;
}

function Loading({ text }: { text: string }) {
  return <p className="ps-loading" role="status"><LoaderCircle className="ps-spin" size={19} aria-hidden="true" />{text}</p>;
}

function Failure({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="ps-error" role="alert"><p>{message}</p><button type="button" className="ps-button" onClick={onRetry}>Try again</button></div>;
}

function RouteDetails({ routeId, profileId }: { routeId: string; profileId: string }) {
  const route = useQuery({
    queryKey: ["passenger", profileId, "route", routeId],
    queryFn: ({ signal }) => apiGet<RouteDetail>("/catalog/routes/" + encodeURIComponent(routeId), signal),
  });
  if (route.isPending) return <Loading text="Loading route…" />;
  if (route.isError) return <Failure message={errorMessage(route.error)} onRetry={() => void route.refetch()} />;
  return <div className="ps-dialog-body">
    <h3>{route.data.route_number} · {route.data.name}</h3>
    <p>{route.data.origin} → {route.data.destination}</p>
    <p className="ps-inline-note">Arrival estimate unavailable</p>
    {route.data.stops.length === 0 ? <p>No stops have been added to this route yet.</p> : <ol className="ps-route-stops">
      {[...route.data.stops].sort((a, b) => a.sequence - b.sequence).map((stop) => <li key={stop.id}>
        <span aria-hidden="true" /><div>{stop.stop_name}{!stop.stop_active && <small>Currently inactive</small>}</div>
      </li>)}
    </ol>}
  </div>;
}
