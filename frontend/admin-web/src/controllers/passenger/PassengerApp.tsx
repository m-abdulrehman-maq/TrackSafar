import { useAuth } from "../auth";
import type { PassengerAuth } from "../../models/passenger";
import { usePassengerLocation } from "../usePassengerLocation";
import "../../views/passenger/passenger.css";
export function usePassengerAppController() {
  const auth = useAuth() as PassengerAuth;
  const location = usePassengerLocation();
  return {
    auth,
    location,
  };
}
