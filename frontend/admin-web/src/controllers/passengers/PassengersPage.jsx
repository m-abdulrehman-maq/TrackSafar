import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patch } from "../../models/api";
import { useDebouncedSearch, usePaged } from "../lists";
export function usePassengersPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveError, setSaveError] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/passengers", {
    search: debounced,
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["/admin/passengers"],
    });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => patch(`/admin/passengers/${id}`, body),
    onSuccess: () => {
      invalidate();
      setDetail(null);
      setConfirm(null);
      setSaveError(null);
    },
    onError: (err) => setSaveError(err.message),
  });
  const openDetail = (p) => {
    setDetail(p);
    setEditName(p.full_name);
    setEditPhone(p.phone || "");
    setSaveError(null);
  };
  const saveProfile = () => {
    if (editName.trim().length < 2) {
      setSaveError("Name must be at least 2 characters.");
      return;
    }
    updateMutation.mutate({
      id: detail.id,
      body: {
        full_name: editName.trim(),
        phone: editPhone || null,
      },
    });
  };
  const toggleActive = (p) => {
    setConfirm({
      passenger: p,
      activate: !p.is_active,
    });
  };
  return {
    page,
    setPage,
    search,
    onSearch,
    debounced,
    detail,
    setDetail,
    confirm,
    setConfirm,
    editName,
    setEditName,
    editPhone,
    setEditPhone,
    saveError,
    pageSize,
    query,
    items,
    total,
    updateMutation,
    openDetail,
    saveProfile,
    toggleActive,
  };
}
