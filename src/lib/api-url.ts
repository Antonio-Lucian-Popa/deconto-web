export function getApiBaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return rawUrl.replace(/\/+$/, '').replace(/\/api$/, '');
}
