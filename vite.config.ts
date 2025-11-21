import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills({
        include: ["buffer"],
        globals: {
          Buffer: true,
        },
      }),
      wasm(),
    ],
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      exclude: ["@stellar/stellar-xdr-json"],
    },
    define: {
      global: "window",
    },
    envPrefix: "PUBLIC_",
    server: {
      proxy: {
        "/friendbot": {
          target: "http://localhost:8000/friendbot",
          changeOrigin: true,
        },
      },
    },
  };
});
