import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch, post } from "../../models/api";
import { usePaged } from "../lists";
export const STATUS_TONE = {
  open: "danger",
  acknowledged: "warning",
  resolved: "success",
};
export const EMPTY = {
  title: "",
  description: "",
  severity: "warning",
};
export function useIncidentsPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);
  const [resolveNote, setResolveNote] = useState("");
  const pageSize = 10;
  const query = usePaged("/admin/incidents", {
    page,
    pageSize,
    extra: status ? `&status=${status}` : "",
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/incidents"],
    });
  const createMutation = useMutation({
    mutationFn: (body) => post("/admin/incidents", body),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY);
      setFormError(null);
    },
    onError: (err) => setFormError(err.message),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => patch(`/admin/incidents/${id}`, body),
    onSuccess: () => {
      invalidate();
      setResolveTarget(null);
      setResolveNote("");
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message);
    },
  });
  const submitCreate = (e) => {
    e.preventDefault();
    if (form.title.trim().length < 3)
      return setFormError("Title must be at least 3 characters.");
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      severity: form.severity,
    });
  };
  return {
    page,
    setPage,
    status,
    setStatus,
    createOpen,
    setCreateOpen,
    form,
    setForm,
    formError,
    setFormError,
    resolveTarget,
    setResolveTarget,
    resolveNote,
    setResolveNote,
    pageSize,
    query,
    items,
    total,
    createMutation,
    updateMutation,
    submitCreate,
  };
}
