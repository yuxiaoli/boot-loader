export function validateLoadUrl(value: string, siteUrl: string): { url: string } | { error: string } {
  if (value.length > 2048 || !/^https?:\/\/[^/\s]/i.test(value) || /[\s\\\x00-\x1f]/.test(value)) return { error: 'Use an explicit http:// or https:// URL (maximum 2048 characters).' };
  let url: URL;
  try { url = new URL(value); } catch { return { error: 'Invalid web URL.' }; }
  if (!url.hostname || !['https:', 'http:'].includes(url.protocol)) return { error: 'Only HTTP and HTTPS pages are supported.' };
  if (url.username || url.password) return { error: 'URLs containing credentials are not allowed.' };
  const site = new URL(siteUrl);
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { return { error: 'Invalid URL path encoding.' }; }
  if (url.origin === site.origin && (path === site.pathname.replace(/\/$/, '') || path.startsWith(site.pathname))) return { error: 'Boot Loader cannot embed itself.' };
  return { url: url.href };
}
