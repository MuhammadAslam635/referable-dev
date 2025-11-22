import { defineConfig } from "vite";
// @ts-ignore - TypeScript sometimes has issues resolving this package, but it works at runtime
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  // Conditionally load Replit plugins only in development/Replit environment
  // These are ESM-only packages, so we must use dynamic imports
  const plugins: any[] = [
    react(),
  ];

  // Only load Replit plugins if in Replit environment
  if (process.env.REPL_ID !== undefined) {
    try {
      const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal");
      plugins.push(runtimeErrorOverlay.default());
    } catch (e) {
      // Plugin not available, skip it
    }

    try {
      const cartographer = await import("@replit/vite-plugin-cartographer");
      plugins.push(cartographer.cartographer());
    } catch (e) {
      // Plugin not available, skip it
    }
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
  };
});
