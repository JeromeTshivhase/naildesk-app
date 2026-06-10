import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  base: "/",
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "https://naildesk-api-prod.up.railway.app",
        changeOrigin: true,
        secure: true,
      },
      "/ws": {
        target: "https://naildesk-api-prod.up.railway.app",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 600,

    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
  resolve: { alias: { "@": "/src" } },
});