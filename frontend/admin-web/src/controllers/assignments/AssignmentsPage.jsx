import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "../../models/api";
import { usePaged } from "../lists";
export function useAssignmentsPageController() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("active");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(null);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({
    driver_id: "",
    bus_id: "",
    route_id: "",
  });
  const pageSize = 10;
  const query = usePaged("/admin/assignments", {
    page,
    pageSize,
    extra: status ? `&status=${status}` : "",
  });
  const drivers = useQuery({
    queryKey: ["admin/drivers", "all"],
    queryFn: () => get("/admin/drivers?page_size=100&active=true"),
  });
  const buses = useQuery({
    queryKey: ["admin/buses", "all"],
    queryFn: () => get("/admin/buses?page_size=100&active=true"),
  });
  const routes = useQuery({
    queryKey: ["admin/routes", "all"],
    queryFn: () => get("/admin/routes?page_size=100&active=true"),
  });
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin/assignments"],
    });
  const createMutation = useMutation({
    mutationFn: (body) => post("/admin/assignments", body),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setFormError(null);
      setForm({
        driver_id: "",
        bus_id: "",
        route_id: "",
      });
    },
    onError: (err) => setFormError(err.message),
  });
  const endMutation = useMutation({
    mutationFn: (id) => post(`/admin/assignments/${id}/end`, {}),
    onSuccess: () => {
      invalidate();
      setConfirmEnd(null);
    },
    onError: (err) => {
      setConfirmEnd(null);
      setFormError(err.message);
    },
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const submitCreate = (e) => {
    e.preventDefault();
    if (!form.driver_id || !form.bus_id || !form.route_id) {
      setFormError("Driver, bus and route are all required.");
      return;
    }
    createMutation.mutate(form);
  };
  return {
    page,
    setPage,
    status,
    setStatus,
    createOpen,
    setCreateOpen,
    confirmEnd,
    setConfirmEnd,
    formError,
    setFormError,
    form,
    setForm,
    pageSize,
    query,
    drivers,
    buses,
    routes,
    createMutation,
    endMutation,
    items,
    total,
    submitCreate,
  };
}
