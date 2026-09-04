import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = resolve(process.cwd(), "apps/web");

function read(relativePath: string) {
  return readFileSync(`${webRoot}/${relativePath}`, "utf8");
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
  });

  it("advertises iOS installation and native mobile presentation", () => {
    const html = read("index.html");

    expect(html).toContain('content="width=device-width, initial-scale=1.0, viewport-fit=cover"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('rel="apple-touch-icon" href="/apple-touch-icon.png"');
  });

  it("keeps the app shell and icon set available offline", () => {
    const serviceWorker = read("public/sw.js");

    expect(serviceWorker).toContain('"/icon-192.png"');
    expect(serviceWorker).toContain('"/icon-512.png"');
    expect(serviceWorker).toContain('"/apple-touch-icon.png"');
    expect(serviceWorker).toContain("request.mode === \"navigate\"");
    expect(serviceWorker).toContain('caches.match("/")');
  });
});
