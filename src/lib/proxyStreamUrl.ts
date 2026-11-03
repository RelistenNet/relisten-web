const PROXIED_HOSTS = ['archive.org', 'phish.in'];

export function proxyStreamUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (PROXIED_HOSTS.includes(parsed.hostname)) {
      return `https://audio.relisten.net/${parsed.hostname}${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
}
