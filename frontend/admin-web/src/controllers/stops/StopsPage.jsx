import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch, post } from "../../models/api";
import { useDebouncedSearch, usePaged } from "../lists";
export const EMPTY = {
  name: "",
  latitude: "",
  longitude: "",
};
export function useStopsPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/stops", {
    search: debounced,
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/stops"],
    });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/admin/stops/${id}`, body) : post("/admin/stops", body),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) =>
      patch(`/admin/stops/${id}`, {
        is_active,
      }),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
    },
    onError: (err) => {
      setConfirm(null);
      setFormError(err.message);
    },
  });
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (stop) => {
    setEditing(stop);
    setForm({
      name: stop.name,
      latitude: String(stop.latitude),
      longitude: String(stop.longitude),
    });
    setFormError(null);
    setFormOpen(true);
  };
  const submit = (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2)
      return setFormError("Stop name is required.");
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return setFormError("Latitude must be between -90 and 90.");
    if (!Number.isFinite(lon) || lon < -180 || lon > 180)
      return setFormError("Longitude must be between -180 and 180.");
    saveMutation.mutate({
      id: editing?.id,
      body: {
        name: form.name.trim(),
        latitude: lat,
        longitude: lon,
      },
    });
  };
  return {
    page,
    setPage,
    search,
    onSearch,
    debounced,
    formOpen,
    setFormOpen,
    editing,
    form,
    setForm,
    formError,
    confirm,
    setConfirm,
    pageSize,
    query,
    items,
    total,
    saveMutation,
    toggleMutation,
    openCreate,
    openEdit,
    submit,
  };
}
