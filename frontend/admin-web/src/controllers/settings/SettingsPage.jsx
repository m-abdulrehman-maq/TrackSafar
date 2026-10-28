import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "../../models/api";
export function useSettingsPageController() {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const settings = useQuery({
    queryKey: ["admin/settings"],
    queryFn: () => get("/admin/settings"),
  });
  const auditPath = `/admin/audit?page=${page}&page_size=${pageSize}`;
  const audit = useQuery({
    queryKey: [auditPath],
    queryFn: () => get(auditPath),
    placeholderData: (p) => p,
  });
  const auditItems = audit.data?.items || [];
  const total = audit.data?.total || 0;
  return {
    page,
    setPage,
    pageSize,
    settings,
    audit,
    auditItems,
    total,
  };
}
