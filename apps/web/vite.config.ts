import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/auth": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
        "/tickets": {
          target: apiBaseUrl,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
