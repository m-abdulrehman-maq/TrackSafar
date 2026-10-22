import type { Coordinates } from "../features/passenger/passenger-data";

export type Place = Coordinates & {
  id: string;
  name: string;
  address: string;
};

type RawPlace = Place & { locality: string };

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

type NominatimResult = {
  place_id?: number | string;
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
  address?: Record<string, string>;
};

const STOPWORDS = new Set([
  "of", "the", "and", "in", "at", "near", "by", "for", "to",
  "main", "campus", "city", "town",
]);

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Ranks geocoder candidates so the requested locality wins over same-named
 * branches elsewhere (e.g. "UET Lahore" must prefer the Lahore campus, not the
 * Faisalabad campus that merely repeats "Lahore" in its institution name).
 */
function rank(places: RawPlace[], term: string): Place[] {
  const queryTokens = tokens(term);
  if (queryTokens.length === 0) return places;

  return places
    .map((place) => {
      const nameTokens = new Set(tokens(place.name));
      const localityTokens = new Set(tokens(place.locality));
      const nameMatches = queryTokens.filter((token) => nameTokens.has(token)).length;
      const localityMatches = queryTokens.filter((token) => localityTokens.has(token)).length;
      const score = (nameMatches / queryTokens.length) * 2 + (localityMatches / queryTokens.length) * 3;
      return { place, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ place }) => place);
}

function dedupe(places: RawPlace[]): RawPlace[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = place.latitude.toFixed(4) + "," + place.longitude.toFixed(4);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeByName(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = place.name.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchPhoton(term: string, signal?: AbortSignal): Promise<RawPlace[]> {
  const url = "https://photon.komoot.io/api/?limit=10&lang=en&q=" + encodeURIComponent(term);
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Place search is unavailable right now.");

  const data = (await response.json()) as { features?: PhotonFeature[] };
  const places: RawPlace[] = [];
  for (const feature of data.features || []) {
    const coordinates = feature.geometry?.coordinates;
    const properties = feature.properties;
    if (!coordinates || !properties) continue;
    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const name = properties.name || properties.street || term;
    const locality = [
      properties.street,
      properties.city,
      properties.district,
      properties.county,
      properties.state,
      properties.country,
    ].filter(Boolean).join(", ");
    const addressParts = [
      properties.street && properties.housenumber
        ? properties.housenumber + " " + properties.street
        : properties.street,
      properties.city,
      properties.district,
      properties.county,
      properties.state,
      properties.country,
    ].filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index);

    places.push({
      id: String(properties.osm_type || "osm") + "-" + String(properties.osm_id ?? latitude + "," + longitude),
      name,
      address: addressParts.join(", "),
      latitude,
      longitude,
      locality,
    });
  }
  return dedupe(places);
}

async function searchNominatim(term: string, signal?: AbortSignal): Promise<RawPlace[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&accept-language=en&q=" +
    encodeURIComponent(term);
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Place search is unavailable right now.");

  const results = (await response.json()) as NominatimResult[];
  const places: RawPlace[] = [];
  for (const result of results) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const address = result.address || {};
    const locality = [
      address.city,
      address.town,
      address.village,
      address.suburb,
      address.county,
      address.state_district,
      address.state,
      address.country,
    ].filter(Boolean).join(", ");
    const displayName = result.display_name || term;

    places.push({
      id: String(result.place_id ?? latitude + "," + longitude),
      name: result.name || displayName.split(",")[0] || term,
      address: displayName,
      latitude,
      longitude,
      locality,
    });
  }
  return dedupe(places);
}

/**
 * Forward-geocodes a free-text place using OpenStreetMap data (Photon first,
 * Nominatim as fallback). Both are keyless and return real map features.
 */
export async function searchPlaces(term: string, signal?: AbortSignal): Promise<Place[]> {
  try {
    const results = await searchPhoton(term, signal);
    if (results.length > 0) return dedupeByName(rank(results, term));
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  const fallback = await searchNominatim(term, signal);
  return dedupeByName(rank(fallback, term));
}
