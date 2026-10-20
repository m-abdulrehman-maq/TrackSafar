import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { TrackSafarLoader } from "./components/ui/Loader";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

function Boot() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Brief branded splash so the animated loader is visible on cold start
    const t = setTimeout(() => setReady(true), 900);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return <TrackSafarLoader label="Starting TrackSafar…" />;
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Boot />
  </StrictMode>
);
