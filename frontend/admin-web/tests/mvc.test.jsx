import { describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { get, post } from "../src/models/api";
import { useDebouncedSearch, usePaged } from "../src/controllers/lists";
import { BusesPage } from "../src/views/buses/BusesPage";
import { DriversPage } from "../src/views/drivers/DriversPage";
import { PassengersPage } from "../src/views/passengers/PassengersPage";
import { RoutesPage } from "../src/views/routes/RoutesPage";
import { StopsPage } from "../src/views/stops/StopsPage";
import { AssignmentsPage } from "../src/views/assignments/AssignmentsPage";
import { AlertsPage } from "../src/views/alerts/AlertsPage";
import { IncidentsPage } from "../src/views/incidents/IncidentsPage";
vi.mock("../src/models/api", () => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  getToken: () => null,
}));
vi.mock("../src/controllers/auth", () => ({
  useAuth: () => ({ profile: { id: "admin", role: "admin" } }),
}));
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    Wrapper: ({ children }) => (
      <MemoryRouter>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </MemoryRouter>
    ),
  };
}
describe("MVC screens", () => {
  it.each([
    BusesPage,
    DriversPage,
    PassengersPage,
    RoutesPage,
    StopsPage,
    AssignmentsPage,
    AlertsPage,
    IncidentsPage,
  ])("renders %s using its controller", async (Page) => {
    get.mockResolvedValue({ items: [], total: 0 });
    const { Wrapper } = wrapper();
    render(<Page />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    );
    expect(screen.getAllByRole("heading").length).toBeGreaterThan(0);
  });
  it("refreshes a list when its resource is invalidated after a save", async () => {
    get.mockResolvedValue({ items: [], total: 0 });
    const { Wrapper, client } = wrapper();
    const { result } = renderHook(
      () => {
        const query = usePaged("/admin/buses");
        return { data: query.data, isSuccess: query.isSuccess };
      },
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    get.mockResolvedValue({ items: [{ bus_number: "TEST" }], total: 1 });
    await act(async () => {
      await client.invalidateQueries({ queryKey: ["/admin/buses"] });
    });
    await waitFor(() => expect(result.current.data.total).toBe(1));
  });
  it("keeps two search boxes independent", async () => {
    const { result } = renderHook(() => ({
      first: useDebouncedSearch(),
      second: useDebouncedSearch(),
    }));
    act(() => {
      result.current.first.onChange(" bus ");
      result.current.second.onChange(" stop ");
    });
    await waitFor(() => {
      expect(result.current.first.debounced).toBe("bus");
      expect(result.current.second.debounced).toBe("stop");
    });
  });
});

it("creates a bus through the view and its controller", async () => {
  get.mockResolvedValue({ items: [], total: 0 });
  post.mockResolvedValue({ id: "new-bus", bus_number: "SYNTHETIC-01" });
  const { Wrapper } = wrapper();
  render(<BusesPage />, { wrapper: Wrapper });
  fireEvent.click(screen.getByRole("button", { name: /add bus/i }));
  fireEvent.change(screen.getByLabelText(/bus number/i), {
    target: { value: "SYNTHETIC-01" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create bus/i }));
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      "/admin/buses",
      expect.objectContaining({ bus_number: "SYNTHETIC-01" }),
    ),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});
