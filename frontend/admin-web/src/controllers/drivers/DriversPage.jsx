import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post } from "../../models/api";
import { useDebouncedSearch, usePaged } from "../lists";
export function useProvisionDialogController({ open, onClose, onDone }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    driver_code: "",
    license_number: "",
    phone: "",
    temporary_password: "",
  });
  const [error, setError] = useState(null);
  const update = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));
  const mutation = useMutation({
    mutationFn: (body) => post("/admin/drivers", body),
    onSuccess: (driver) => {
      setError(null);
      onDone(driver);
      setForm({
        full_name: "",
        email: "",
        driver_code: "",
        license_number: "",
        phone: "",
        temporary_password: "",
      });
    },
    onError: (err) => setError(err.message),
  });
  const submit = (e) => {
    e.preventDefault();
    if (form.full_name.trim().length < 2)
      return setError("Full name is required.");
    if (!/^\S+@\S+\.\S+$/.test(form.email))
      return setError("A valid email address is required.");
    if (form.driver_code.trim().length < 2)
      return setError("Driver code is required.");
    if (form.temporary_password && form.temporary_password.length < 8)
      return setError("Temporary password must be at least 8 characters.");
    mutation.mutate({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      driver_code: form.driver_code.trim(),
      license_number: form.license_number || null,
      phone: form.phone || null,
      temporary_password: form.temporary_password || null,
    });
  };
  return {
    form,
    error,
    update,
    mutation,
    submit,
  };
}
export function useDriversPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [error, setError] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/drivers", {
    search: debounced,
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const assignments = useQuery({
    queryKey: ["driver-assignments", detail?.id],
    queryFn: () => get(`/admin/drivers/${detail.id}/assignments?page_size=5`),
    enabled: Boolean(detail),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/drivers"],
    });
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) =>
      patch(`/admin/drivers/${id}`, {
        driver_profile_active: active,
        is_active: active,
      }),
    onSuccess: () => {
      invalidate();
      setConfirm(null);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setConfirm(null);
    },
  });
  return {
    page,
    setPage,
    search,
    onSearch,
    debounced,
    provisionOpen,
    setProvisionOpen,
    detail,
    setDetail,
    confirm,
    setConfirm,
    setTempPassword,
    error,
    pageSize,
    query,
    items,
    total,
    assignments,
    invalidate,
    toggleMutation,
  };
}
