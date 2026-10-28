import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./controllers/auth";
import { PublicLayout } from "./views/layouts/PublicLayout";
import { AdminLayout, RequireAuth } from "./views/layouts/AdminLayout";
import { LandingPage } from "./views/public/Landing";
import { LoginPage } from "./views/public/Login";
import { RegisterPage } from "./views/public/Register";
import {
  FeaturesPage,
  ForbiddenPage,
  NotFoundPage,
  StaticPage,
} from "./views/public/Misc";

import { OverviewPage } from "./views/overview/OverviewPage";
import { PassengersPage } from "./views/passengers/PassengersPage";
import { DriversPage } from "./views/drivers/DriversPage";
import { BusesPage } from "./views/buses/BusesPage";
import { RoutesPage, RouteDetailPage } from "./views/routes/RoutesPage";
import { StopsPage } from "./views/stops/StopsPage";
import { AssignmentsPage } from "./views/assignments/AssignmentsPage";
import { TripsPage } from "./views/trips/TripsPage";
import { AlertsPage } from "./views/alerts/AlertsPage";
import { IncidentsPage } from "./views/incidents/IncidentsPage";
import { SettingsPage } from "./views/settings/SettingsPage";
import { ProfilePage } from "./views/settings/ProfilePage";
import { PassengerApp } from "./views/passenger/PassengerApp";
import { DriverApp } from "./views/driver/DriverApp";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="login/:role" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forbidden" element={<ForbiddenPage />} />
            <Route
              path="privacy"
              element={
                <StaticPage title="Privacy notice">
                  <p>
                    TrackSafar collects only the information needed to run the
                    service: your name, email and (for drivers) trip location
                    observations while on an active trip.
                  </p>
                  <p>
                    Passenger GPS is not retained by default. Driver location is
                    recorded only during active trips, with an observed
                    timestamp, and is accessible only through authorized
                    operational views.
                  </p>
                  <p>
                    You can request deletion of your account at any time;
                    referenced operational history is anonymized rather than
                    silently destroyed.
                  </p>
                </StaticPage>
              }
            />
            <Route
              path="terms"
              element={
                <StaticPage title="Terms of use">
                  <p>
                    TrackSafar provides observed public transport information.
                    Arrival estimates and positions are shown only when data
                    supports them and may be unavailable.
                  </p>
                  <p>
                    Driver and administrator accounts are issued by operators.
                    Attempting to access restricted functionality is prohibited
                    and recorded in the audit log.
                  </p>
                </StaticPage>
              }
            />
          </Route>

          {/* Passenger */}
          <Route element={<RequireAuth role="passenger" />}>
            <Route path="passenger/*" element={<PassengerApp />} />
          </Route>

          {/* Driver */}
          <Route element={<RequireAuth role="driver" />}>
            <Route path="driver/*" element={<DriverApp />} />
          </Route>

          {/* Administrator */}
          <Route element={<RequireAuth role="admin" />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="passengers" element={<PassengersPage />} />
              <Route path="drivers" element={<DriversPage />} />
              <Route path="buses" element={<BusesPage />} />
              <Route path="routes" element={<RoutesPage />} />
              <Route path="routes/:routeId" element={<RouteDetailPage />} />
              <Route path="stops" element={<StopsPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="trips" element={<TripsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
