import { errorMessage } from "../../models/passenger";
import { patch } from "../../models/api";
import type { PassengerLocation } from "../usePassengerLocation";
import type { PassengerAuth } from "../../models/passenger";
import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
export type Panel = "edit" | "location" | "help" | "about" | null;
export function usePassengerAccountController({
  auth,
  location,
}: {
  auth: PassengerAuth;
  location: PassengerLocation;
}) {
  const { profile, reload, logout } = auth;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [panel, setPanel] = useState<Panel>(null);
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    const fullName = name.trim();
    if (fullName.length < 2 || fullName.length > 160) {
      setError("Please enter a name between 2 and 160 characters.");
      return;
    }
    setSaving(true);
    try {
      // Self-service only: do not submit email, identity, role or active status.
      await patch("/auth/me", {
        full_name: fullName,
      });
      const updated = await reload();
      if (!updated) return;
      setPanel(null);
      setMessage("Your profile has been updated.");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }
  function signOut() {
    // No cached locations/profile-linked responses should outlive this session.
    queryClient.removeQueries({
      queryKey: ["passenger", profile!.id],
    });
    logout();
    // Match RequireAuth's existing signed-out destination.
    navigate("/login", {
      replace: true,
    });
  }
  const title =
    panel === "edit"
      ? "Edit profile"
      : panel === "location"
        ? "Location permission"
        : panel === "help"
          ? "Help & feedback"
          : "About TrackSafar";
  return {
    profile,
    reload,
    logout,
    navigate,
    queryClient,
    panel,
    setPanel,
    name,
    setName,
    saving,
    setSaving,
    error,
    setError,
    message,
    setMessage,
    saveProfile,
    event,
    signOut,
    title,
  };
}
