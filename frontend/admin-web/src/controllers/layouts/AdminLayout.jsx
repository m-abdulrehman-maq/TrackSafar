import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
export function titleFor(pathname) {
  const map = {
    "/admin": "Fleet overview",
    "/admin/passengers": "Passenger management",
    "/admin/drivers": "Driver management",
    "/admin/buses": "Fleet — buses",
    "/admin/routes": "Routes",
    "/admin/stops": "Stops",
    "/admin/assignments": "Driver assignments",
    "/admin/trips": "Trips & live tracking",
    "/admin/alerts": "Notifications",
    "/admin/incidents": "Operational incidents",
    "/admin/settings": "Settings & audit",
    "/admin/profile": "My profile",
  };
  if (map[pathname]) return map[pathname];
  if (/^\/admin\/routes\/.+/.test(pathname)) return "Route detail";
  return "Administration";
}
export function useRequireAuthController({ role }) {
  const { profile, initializing } = useAuth();
  const location = useLocation();
  return {
    profile,
    initializing,
    location,
  };
}
export function useAdminLayoutController() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate("/login/admin");
  };
  return {
    profile,
    location,
    sidebarOpen,
    setSidebarOpen,
    collapsed,
    setCollapsed,
    menuOpen,
    setMenuOpen,
    handleLogout,
  };
}
