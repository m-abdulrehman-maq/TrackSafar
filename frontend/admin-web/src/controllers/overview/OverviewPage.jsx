import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "../../models/api";
export const FRESHNESS_TONE = {
  fresh: "success",
  stale: "warning",
  unavailable: "neutral",
};
export function useOverviewPageController() {
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["admin/overview"],
    queryFn: () => get("/admin/overview"),
    refetchInterval: 30000,
  });
  const trips = useQuery({
    queryKey: ["admin/trips", "active"],
    queryFn: () => get("/admin/trips?status=active&page_size=10"),
    refetchInterval: 15000,
  });
  const audit = useQuery({
    queryKey: ["admin/audit", "recent"],
    queryFn: () => get("/admin/audit?page_size=6"),
  });
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin/overview"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin/trips"],
    });
    queryClient.invalidateQueries({
      queryKey: ["admin/audit"],
    });
  };
  const data = overview.data;
  const tripItems = trips.data?.items || [];
  return {
    overview,
    trips,
    audit,
    refresh,
    data,
    tripItems,
  };
}
