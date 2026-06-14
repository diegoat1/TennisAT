import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" produce rutas relativas a los assets, asi funciona tanto en
// GitHub Pages (https://usuario.github.io/tennisat/) como en local sin
// depender del nombre exacto del repositorio.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
