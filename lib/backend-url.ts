export function backendUrlWithPath(baseUrl: URL, path: string) {
  const normalizedBase = new URL(baseUrl);
  if (!normalizedBase.pathname.endsWith("/")) normalizedBase.pathname += "/";
  return new URL(path.replace(/^\//, ""), normalizedBase);
}
