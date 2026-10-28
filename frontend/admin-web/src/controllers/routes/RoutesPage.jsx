import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, patch, post, put } from "../../models/api";
import { useDebouncedSearch, usePaged } from "../lists";
export const EMPTY = {
  route_number: "",
  name: "",
  origin: "",
  destination: "",
  direction: "outbound",
  path_text: "",
};
export function parsePath(text) {
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length < 2) throw new Error();
    return parsed;
  } catch {
    throw new Error(
      "Path must be JSON coordinates like [[74.34,31.55],[74.35,31.52]] (longitude first).",
    );
  }
}
export function useRoutesPageController() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { value: search, onChange: onSearch, debounced } = useDebouncedSearch();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const pageSize = 10;
  const query = usePaged("/admin/routes", {
    search: debounced,
    page,
    pageSize,
  });
  const items = query.data?.items || [];
  const total = query.data?.total || 0;
  const createMutation = useMutation({
    mutationFn: (body) => post("/admin/routes", body),
    onSuccess: (route) => {
      queryClient.invalidateQueries({
        queryKey: ["/admin/routes"],
      });
      setFormOpen(false);
      setForm(EMPTY);
      setFormError(null);
      navigate(`/admin/routes/${route.id}`);
    },
    onError: (err) => setFormError(err.message),
  });
  const submit = (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.route_number.trim())
      return setFormError("Route number is required.");
    if (form.name.trim().length < 2)
      return setFormError("Route name is required.");
    let path = null;
    try {
      path = parsePath(form.path_text);
    } catch (err) {
      return setFormError(err.message);
    }
    createMutation.mutate({
      route_number: form.route_number.trim(),
      name: form.name.trim(),
      origin: form.origin.trim() || "—",
      destination: form.destination.trim() || "—",
      direction: form.direction,
      path,
    });
  };
  const update = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));
  return {
    navigate,
    page,
    setPage,
    search,
    onSearch,
    debounced,
    formOpen,
    setFormOpen,
    form,
    formError,
    setFormError,
    pageSize,
    query,
    items,
    total,
    createMutation,
    submit,
    update,
  };
}
export function useStopSequenceEditorController({ route, stops, onSaved }) {
  const [order, setOrder] = useState(route.stops.map((rs) => rs.stop_id));
  const [adding, setAdding] = useState("");
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const saveMutation = useMutation({
    mutationFn: (stop_ids) =>
      put(`/admin/routes/${route.id}/stops`, {
        stop_ids,
      }),
    onSuccess: (detail) => {
      onSaved(detail);
      setDirty(false);
      setError(null);
    },
    onError: (err) => setError(err.message),
  });
  const move = (index, delta) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
  };
  const removeStop = (index) => {
    setOrder(order.filter((_, i) => i !== index));
    setDirty(true);
  };
  const addStop = () => {
    if (!adding) return;
    if (order.includes(adding)) {
      setError("That stop is already on this route.");
      return;
    }
    setOrder([...order, adding]);
    setAdding("");
    setError(null);
    setDirty(true);
  };
  const stopById = Object.fromEntries(stops.map((s) => [s.id, s]));
  return {
    order,
    adding,
    setAdding,
    error,
    dirty,
    saveMutation,
    move,
    removeStop,
    addStop,
    stopById,
  };
}
export function useRouteDetailPageController() {
  const { routeId } = useParams();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const routeQuery = useQuery({
    queryKey: ["admin/route", routeId],
    queryFn: () => get(`/admin/routes/${routeId}`),
  });
  const stopsQuery = useQuery({
    queryKey: ["admin/stops", "all"],
    queryFn: () => get("/admin/stops?page_size=100"),
  });
  const route = routeQuery.data;
  const stops = stopsQuery.data?.items || [];
  const updateMutation = useMutation({
    mutationFn: (body) => patch(`/admin/routes/${routeId}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin/route", routeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/admin/routes"],
      });
      setEditing(false);
    },
  });
  return {
    routeId,
    queryClient,
    editing,
    setEditing,
    routeQuery,
    stopsQuery,
    route,
    stops,
    updateMutation,
  };
}
export function useUpdateRouteFormController({
  route,
  open,
  onClose,
  mutation,
}) {
  const [form, setForm] = useState({
    name: route.name,
    origin: route.origin,
    destination: route.destination,
    is_active: route.is_active,
    path_text: route.path ? JSON.stringify(route.path) : "",
  });
  const [error, setError] = useState(null);
  const submit = () => {
    setError(null);
    let path;
    try {
      path = form.path_text.trim() ? parsePath(form.path_text) : undefined;
    } catch (err) {
      setError(err.message);
      return;
    }
    const body = {
      name: form.name.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      is_active: form.is_active,
    };
    if (path !== undefined) body.path = path;
    mutation.mutate(body, {
      onError: (err) => setError(err.message),
    });
  };
  return {
    form,
    setForm,
    error,
    submit,
  };
}
