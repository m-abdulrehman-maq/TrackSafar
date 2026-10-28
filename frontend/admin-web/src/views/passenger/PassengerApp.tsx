import type { PassengerAuth } from "../../models/passenger";
import { usePassengerAppController } from "../../controllers/passenger/PassengerApp";
import { Navigate, Route, Routes } from "react-router-dom";
import { PassengerHome } from "./PassengerHome";
import { PassengerAccount } from "./PassengerAccount";
import "./passenger.css";
export function PassengerApp() {
  const { auth, location } = usePassengerAppController();
  if (!auth.profile) return null;
  return (
    <div className="ps-app">
      <div className="ps-shell">
        <Routes>
          <Route
            index
            element={
              <PassengerHome profile={auth.profile} location={location} />
            }
          />
          <Route
            path="account"
            element={<PassengerAccount auth={auth} location={location} />}
          />
          <Route path="*" element={<Navigate to="/passenger" replace />} />
        </Routes>
      </div>
    </div>
  );
}
