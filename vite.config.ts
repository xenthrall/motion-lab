import { URL, fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** Kept in sync with server/config.ts (API_PORT). */
const API_PORT = Number(process.env.MOTION_LAB_API_PORT ?? 5174);

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // The lab UI people actually use...
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        // ...and the UI-less page Playwright drives to render frames. Built
        // as a real entry (not a dev-only hook) so the production server can
        // render without a Vite dev server running. See src/render/entry.ts.
        render: fileURLToPath(new URL("./render.html", import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      // In dev the frontend is served by Vite and the render API by the Node
      // backend; proxying keeps everything same-origin for the browser, so
      // there's no CORS setup and no environment-specific base URL in the
      // frontend code. In production a single process serves both.
      "/api": {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
