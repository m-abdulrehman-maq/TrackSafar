import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { patch } from "../../models/api";
import { useAuth } from "../auth";
export function useProfilePageController() {
  const { profile, reload, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const saveMutation = useMutation({
    mutationFn: () =>
      patch("/auth/me", {
        full_name: name.trim(),
        phone: phone.trim() || null,
      }),
    onSuccess: async () => {
      setError(null);
      setMessage("Profile updated.");
      await reload();
    },
    onError: (err) => {
      setMessage(null);
      setError(err.message);
    },
  });
  const submit = (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    saveMutation.mutate();
  };
  const handleLogout = () => {
    logout();
    navigate("/login/admin");
  };
  return {
    profile,
    name,
    setName,
    phone,
    setPhone,
    message,
    error,
    saveMutation,
    submit,
    handleLogout,
  };
}
