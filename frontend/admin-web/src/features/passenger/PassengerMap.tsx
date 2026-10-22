import { MapPin } from "lucide-react";
import type { Coordinates, NearbyBus } from "./passenger-data";

export type PassengerMapProps = {
  position: Coordinates | null;
  buses: NearbyBus[];
  onSelectBus: (bus: NearbyBus) => void;
};

/**
 * Map-provider boundary. Replace the contents after the team approves a provider.
 * Incoming positions are real API observations; do not generate demo markers.
 * Future markers should use trip_id, observed_at and freshness, and stop moving
 * when observations are stale. This component currently draws no geographic map.
 */
export function PassengerMap(_props: PassengerMapProps) {
  return <div className="ps-map-placeholder" aria-label="Map unavailable">
    <span className="ps-map-symbol" aria-hidden="true"><MapPin size={30} strokeWidth={1.6} /></span>
    <h1>Your journey starts here</h1>
    <p>The map isn't available yet.<br />Search routes or find buses near you below.</p>
  </div>;
}
