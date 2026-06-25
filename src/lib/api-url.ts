export function getApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return rawUrl.replace(/\/+$/, '').replace(/\/api$/, '');
}

export function getBasePath() {
  const rawPath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const path = rawPath.replace(/\/+$/, '');
  if (!path) return '';
  return path.startsWith('/') ? path : `/${path}`;
}

export function getAppPath(path: string) {
  const basePath = getBasePath();
  return `${basePath}${path.startsWith('/') ? path : `/${path}`}`;
}
