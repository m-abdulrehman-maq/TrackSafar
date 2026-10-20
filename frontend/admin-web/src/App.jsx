import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { PublicLayout } from "./layouts/PublicLayout";
import { AdminLayout, RequireAuth } from "./layouts/AdminLayout";
import { LandingPage } from "./pages/Landing";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { FeaturesPage, ForbiddenPage, NotFoundPage, StaticPage } from "./pages/Misc";

import { OverviewPage } from "./features/overview/OverviewPage";
import { PassengersPage } from "./features/passengers/PassengersPage";
import { DriversPage } from "./features/drivers/DriversPage";
import { BusesPage } from "./features/buses/BusesPage";
import { RoutesPage, RouteDetailPage } from "./features/routes/RoutesPage";
import { StopsPage } from "./features/stops/StopsPage";
import { AssignmentsPage } from "./features/assignments/AssignmentsPage";
import { TripsPage } from "./features/trips/TripsPage";
import { AlertsPage } from "./features/alerts/AlertsPage";
import { IncidentsPage } from "./features/incidents/IncidentsPage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { ProfilePage } from "./features/settings/ProfilePage";
import { PassengerApp } from "./features/passenger/PassengerApp";
import { DriverApp } from "./features/driver/DriverApp";

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
            <Route path="privacy" element={
              <StaticPage title="Privacy notice">
                <p>TrackSafar collects only the information needed to run the service: your name, email and (for drivers) trip location observations while on an active trip.</p>
                <p>Passenger GPS is not retained by default. Driver location is recorded only during active trips, with an observed timestamp, and is accessible only through authorized operational views.</p>
                <p>You can request deletion of your account at any time; referenced operational history is anonymized rather than silently destroyed.</p>
              </StaticPage>
            } />
            <Route path="terms" element={
              <StaticPage title="Terms of use">
                <p>TrackSafar provides observed public transport information. Arrival estimates and positions are shown only when data supports them and may be unavailable.</p>
                <p>Driver and administrator accounts are issued by operators. Attempting to access restricted functionality is prohibited and recorded in the audit log.</p>
              </StaticPage>
            } />
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
