import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "../models/api";
/** Shared list controllers: requests, pagination, and search timing. */

export function usePaged(
  fetchPath,
  { search = "", page = 1, pageSize = 10, extra = "" } = {},
) {
  const path = `${fetchPath}?page=${page}&page_size=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ""}${extra}`;
  return useQuery({
    queryKey: [fetchPath, { search, page, pageSize, extra }],
    queryFn: () => get(path),
    placeholderData: (prev) => prev,
  });
}
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
export function useDebouncedSearch(initial = "") {
  const [value, setValue] = useState(initial);
  const debounced = useDebounced(value.trim());
  return { value, onChange: setValue, debounced };
}
