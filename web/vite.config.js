import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// host: true expõe o dev server na rede local (necessário p/ os 3 notebooks).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
