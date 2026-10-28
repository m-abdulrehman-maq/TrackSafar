import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch, post } from "../../models/api";
import { usePaged } from "../lists";
export const AUDIENCES = [
  {
    value: "all_authenticated",
    label: "All signed-in users",
  },
  {
    value: "passengers",
    label: "Passengers only",
  },
  {
    value: "drivers",
    label: "Drivers only",
  },
  {
    value: "admins",
    label: "Administrators only",
  },
];
export const EMPTY = {
  title: "",
  body: "",
  severity: "info",
  audience: "all_authenticated",
  is_published: true,
};
export function useAlertsPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/alerts", {
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/alerts"],
    });
  const saveMutation = useMutation({
    mutationFn: ({ id, body }) =>
      id ? patch(`/admin/alerts/${id}`, body) : post("/admin/alerts", body),
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      setForm(EMPTY);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setFormOpen(true);
  };
  const openEdit = (alert) => {
    setEditing(alert);
    setForm({
      title: alert.title,
      body: alert.body,
      severity: alert.severity,
      audience: alert.audience,
      is_published: alert.is_published,
    });
    setFormError(null);
    setFormOpen(true);
  };
  const submit = (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3)
      return setFormError("Title must be at least 3 characters.");
    if (!form.body.trim()) return setFormError("Message body is required.");
    saveMutation.mutate({
      id: editing?.id,
      body: {
        title: form.title.trim(),
        body: form.body.trim(),
        severity: form.severity,
        audience: form.audience,
        is_published: form.is_published,
      },
    });
  };
  return {
    page,
    setPage,
    formOpen,
    setFormOpen,
    editing,
    form,
    setForm,
    formError,
    pageSize,
    query,
    items,
    total,
    saveMutation,
    openCreate,
    openEdit,
    submit,
  };
}
