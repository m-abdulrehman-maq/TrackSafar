import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_URL || "http://127.0.0.1:8000";
  const wsTarget = env.VITE_WS_URL || apiTarget.replace(/^http/, "ws");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err, req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: {
                      code: "backend_unavailable",
                      message: `Cannot connect to backend server at ${apiTarget}. Please ensure the FastAPI backend is running (e.g. uvicorn app.main:app --app-dir backend --port 8000 --reload).`,
                    },
                  }),
                );
              }
            });
          },
        },
        "/ws": { target: wsTarget, ws: true },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.js"],
    },
  };
});
