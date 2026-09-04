import { fileURLToPath, URL } from "node:url";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const outputDirectory = fileURLToPath(new URL("../../dist", import.meta.url));

function injectOfflineAssets(): Plugin {
  return {
    name: "inject-offline-assets",
    apply: "build",
    async closeBundle() {
      const assetNames = await readdir(join(outputDirectory, "assets"));
      const buildAssets = assetNames
        .filter((name) => !name.endsWith(".map"))
        .map((name) => `/assets/${name}`);
      const serviceWorkerPath = join(outputDirectory, "sw.js");
      const serviceWorker = await readFile(serviceWorkerPath, "utf8");
      await writeFile(
        serviceWorkerPath,
        serviceWorker.replace('"__PRECACHE_ASSETS__"', JSON.stringify(buildAssets)),
      );
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), injectOfflineAssets()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    sourcemap: true,
  },
  server: { port: 4173, strictPort: true },
});
