import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch, post } from "../../models/api";
import { useDebouncedSearch, usePaged } from "../lists";
export const EMPTY = {
  bus_number: "",
  registration_number: "",
  operator: "",
  seating_capacity: "",
};
export function useBusesPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/buses", {
    search: debounced,
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/buses"],
    });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/admin/buses/${id}`, body) : post("/admin/buses", body),
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
      patch(`/admin/buses/${id}`, {
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
  const openEdit = (bus) => {
    setEditing(bus);
    setForm({
      bus_number: bus.bus_number,
      registration_number: bus.registration_number || "",
      operator: bus.operator || "",
      seating_capacity: bus.seating_capacity ?? "",
    });
    setFormError(null);
    setFormOpen(true);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.bus_number.trim()) return setFormError("Bus number is required.");
    const body = {
      bus_number: form.bus_number.trim(),
      registration_number: form.registration_number.trim() || null,
      operator: form.operator.trim() || null,
      seating_capacity: form.seating_capacity
        ? Number(form.seating_capacity)
        : null,
    };
    saveMutation.mutate({
      id: editing?.id,
      body,
    });
  };
  const onToggle = (bus) => setConfirm(bus);
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
    onToggle,
  };
}
