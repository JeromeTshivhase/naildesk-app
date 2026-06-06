import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
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
  build: { outDir: "dist" },
  resolve: { alias: { "@": "/src" } },
});
