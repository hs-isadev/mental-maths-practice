import { fileURLToPath, URL } from "node:url";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { joinBasePath, normalizeBasePath } from "./src/lib/pwa-paths";

const outputDirectory = fileURLToPath(new URL("../../dist", import.meta.url));
const deploymentBase = normalizeBasePath(process.env.VITE_BASE_PATH);

function preparePwaAssets(basePath: string): Plugin {
  return {
    name: "prepare-pwa-assets",
    apply: "build",
    async closeBundle() {
      const assetNames = await readdir(join(outputDirectory, "assets"));
      const buildAssets = assetNames
        .filter((name) => !name.endsWith(".map"))
        .map((name) => joinBasePath(basePath, `assets/${name}`));
      const serviceWorkerPath = join(outputDirectory, "sw.js");
      const serviceWorker = await readFile(serviceWorkerPath, "utf8");
      const preparedServiceWorker = serviceWorker
        .replace('"__APP_BASE__"', JSON.stringify(basePath))
        .replace('"__PRECACHE_ASSETS__"', JSON.stringify(buildAssets));

      if (preparedServiceWorker.includes("__APP_BASE__") || preparedServiceWorker.includes("__PRECACHE_ASSETS__")) {
        throw new Error("The production service worker still contains deployment placeholders.");
      }
      await writeFile(
        serviceWorkerPath,
        preparedServiceWorker,
      );

      const manifestPath = join(outputDirectory, "manifest.webmanifest");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        start_url: string;
        scope: string;
        icons: Array<{ src: string }>;
      };
      manifest.start_url = basePath;
      manifest.scope = basePath;
      manifest.icons = manifest.icons.map((icon) => ({
        ...icon,
        src: joinBasePath(basePath, icon.src),
      }));
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig({
  base: deploymentBase,
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), preparePwaAssets(deploymentBase)],
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
