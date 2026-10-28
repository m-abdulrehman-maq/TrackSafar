import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/** Public site chrome: navbar + footer shared by landing, login and register. */
export /** Public site chrome: navbar + footer shared by landing, login and register. */

const NAV_LINKS = [
  {
    to: "/",
    label: "Home",
  },
  {
    to: "/features",
    label: "Features",
  },
  {
    to: "/#how-it-works",
    label: "How It Works",
  },
  {
    to: "/#about",
    label: "About",
  },
];
export function dashboardPathFor(role) {
  return (
    {
      admin: "/admin",
      driver: "/driver",
      passenger: "/passenger",
    }[role] || null
  );
}
export function usePublicLayoutController({ profile, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);
  const dashTarget = profile ? dashboardPathFor(profile.role) : null;
  return {
    open,
    setOpen,
    dashTarget,
  };
}
