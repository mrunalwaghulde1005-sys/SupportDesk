import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig(() => {
  const apiProxyTarget = "http://localhost:3000";
  return {
    plugins: [react(), tailwindcss()],
    server: {
      fs: {
        allow: [
          process.cwd(),
          resolve(process.cwd(), "../api/src/validation"),
          resolve(process.cwd(), "../api/src/domain"),
          resolve(process.cwd(), "../api/node_modules/zod"),
        ],
      },
      proxy: {
        "/auth": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/tickets": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/api/admin": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: apiProxyTarget,
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
