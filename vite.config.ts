import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// Versao exibida na barra de titulo (Titlebar.tsx) vem sempre do package.json -
// nunca escrita a mao, pra nao divergir da versao real do build.
const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf-8"),
);

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  // Quebra o bundle em pedaços (motion, vendor) pra não carregar tudo num
  // chunk só — primeira pintura mais rápida. TASK-407: o editor de imagem
  // (Filerobot) saiu daqui - agora e' `React.lazy` em ImageViewer.tsx, o
  // Rollup ja cria o chunk assincrono sozinho sem precisar de manualChunks
  // (markerjs2, o editor anterior, so tinha chunk proprio mas carregava
  // eager - nunca foi sob demanda de verdade).
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          motion: ["framer-motion"],
          vendor: ["react", "react-dom", "zustand", "fuse.js"],
        },
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
