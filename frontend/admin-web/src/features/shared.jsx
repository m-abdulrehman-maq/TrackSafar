import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { get } from "../lib/api";
import { Input } from "../components/ui/Forms";

/** Small shared building blocks for admin list pages. */

export function usePaged(fetchPath, { search = "", page = 1, pageSize = 10, extra = "" } = {}) {
  const path = `${fetchPath}?page=${page}&page_size=${pageSize}${
    search ? `&search=${encodeURIComponent(search)}` : ""
  }${extra}`;
  return useQuery({
    queryKey: [path],
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

export function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label="Search"
      />
    </div>
  );
}

export function useDebouncedSearch(initial = "") {
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const onChange = (next) => {
    setValue(next);
    clearTimeout(window.__tsSearch);
    window.__tsSearch = setTimeout(() => setDebounced(next.trim()), 300);
  };
  return { value, onChange, debounced };
}
