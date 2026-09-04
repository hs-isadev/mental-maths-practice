import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(process.cwd(), "apps/web");

function read(relativePath: string) {
  return readFileSync(`${webRoot}/${relativePath}`, "utf8");
}

function pngSize(relativePath: string) {
  const png = readFileSync(`${webRoot}/${relativePath}`);
  expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("installable mobile app assets", () => {
  it("provides a standalone manifest with phone-ready icons", () => {
    const manifest = JSON.parse(read("public/manifest.webmanifest")) as {
      display?: string;
      scope?: string;
      start_url?: string;
      icons?: Array<{ sizes?: string; purpose?: string; src?: string; type?: string }>;
    };

    expect(manifest).toMatchObject({
      display: "standalone",
      scope: "/",
      start_url: "/",
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", type: "image/png" }),
      expect.objectContaining({ src: "/icon-maskable-512.png", purpose: "maskable" }),
    ]));
    expect(pngSize("public/icon-192.png")).toEqual({ width: 192, height: 192 });
    expect(pngSize("public/icon-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("public/icon-maskable-512.png")).toEqual({ width: 512, height: 512 });
    expect(pngSize("public/apple-touch-icon.png")).toEqual({ width: 180, height: 180 });
  });

  it("advertises iOS installation and native mobile presentation", () => {
    const html = read("index.html");

    expect(html).toContain('content="width=device-width, initial-scale=1.0, viewport-fit=cover"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
  });

  it("keeps the app shell and icon set available offline", () => {
    const serviceWorker = read("public/sw.js");

    expect(serviceWorker).toContain('appUrl("icon-192.png")');
    expect(serviceWorker).toContain('appUrl("icon-512.png")');
    expect(serviceWorker).toContain('appUrl("apple-touch-icon.png")');
    expect(serviceWorker).toContain('"__PRECACHE_ASSETS__"');
    expect(serviceWorker).toContain('"__APP_BASE__"');
    expect(serviceWorker).toContain("request.mode === \"navigate\"");
    expect(serviceWorker).toContain("caches.match(appUrl())");
  });
});
