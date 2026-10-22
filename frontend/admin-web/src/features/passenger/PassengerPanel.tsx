import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import type { PassengerAuth } from "./passenger-data";
import { PassengerHome } from "./PassengerHome";
import { PassengerAccount } from "./PassengerAccount";
import { usePassengerLocation } from "./usePassengerLocation";
import "./passenger.css";

export function PassengerApp() {
  const auth = useAuth() as PassengerAuth;
  const location = usePassengerLocation();
  if (!auth.profile) return null;
  return <div className="ps-app">
    <div className="ps-shell">
      <Routes>
        <Route index element={<PassengerHome profile={auth.profile} location={location} />} />
        <Route path="account" element={<PassengerAccount auth={auth} location={location} />} />
        <Route path="*" element={<Navigate to="/passenger" replace />} />
      </Routes>
    </div>
  </div>;
}
