export function normalizeBasePath(value = "/"): string {
  const segment = value.trim().replace(/^\/+|\/+$/g, "");
  return segment ? `/${segment}/` : "/";
}

export function joinBasePath(basePath: string, path: string): string {
  return `${normalizeBasePath(basePath)}${path.replace(/^\/+/, "")}`;
}
