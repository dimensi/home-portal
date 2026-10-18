let browserPromise;

export function selectPreviewableServices(services) {
  return services.filter((service) =>
    service.preview === 'screenshot' &&
    typeof service.url === 'string' &&
    service.url.length > 0
  );
}

export class PreviewCache {
  constructor({ ttlMs, now = () => Date.now(), capture = captureScreenshot } = {}) {
    this.ttlMs = ttlMs ?? 20 * 60 * 1000;
    this.now = now;
    this.capture = capture;
    this.entries = new Map();
  }

  async get(id, url) {
    const cached = this.entries.get(id);
    const timestamp = this.now();
    if (cached && cached.url === url && timestamp - cached.createdAt < this.ttlMs) {
      return cached.buffer;
    }

    const buffer = await this.capture(url);
    this.entries.set(id, { url, buffer, createdAt: timestamp });
    return buffer;
  }
}

export class MetadataCache {
  constructor({ ttlMs, now = () => Date.now(), load = loadMetadata } = {}) {
    this.ttlMs = ttlMs ?? 60 * 60 * 1000;
    this.now = now;
    this.load = load;
    this.entries = new Map();
  }

  async get(id, url) {
    const cached = this.entries.get(id);
    const timestamp = this.now();
    if (cached && cached.url === url && timestamp - cached.createdAt < this.ttlMs) {
      return cached.metadata;
    }

    const metadata = await this.load(url);
    this.entries.set(id, { url, metadata, createdAt: timestamp });
    return metadata;
  }
}

export async function loadMetadata(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(Number(process.env.METADATA_TIMEOUT_MS ?? 5000))
  });
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    return { title: null, favicon: null, manifest: null };
  }

  return parseHtmlMetadata(await response.text(), response.url || url);
}

export function parseHtmlMetadata(html, baseUrl) {
  return {
    title: decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? null),
    favicon: resolveLink(baseUrl, findLink(html, ['icon', 'shortcut icon', 'apple-touch-icon'])),
    manifest: resolveLink(baseUrl, findLink(html, ['manifest']))
  };
}

export async function captureScreenshot(url) {
  const { chromium } = await import('playwright');
  const browser = await getBrowser(chromium);
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: Number(process.env.PREVIEW_NAVIGATION_TIMEOUT_MS ?? 10000)
    });
    await page.waitForTimeout(1200);
    return await page.screenshot({
      type: 'png',
      fullPage: false,
      animations: 'disabled'
    });
  } finally {
    await page.close();
  }
}

async function getBrowser(chromium) {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
  }

  return browserPromise;
}

function findLink(html, rels) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = getAttribute(tag, 'rel')?.toLowerCase();
    const href = getAttribute(tag, 'href');
    if (!rel || !href) continue;

    const relParts = rel.split(/\s+/);
    if (rels.some((candidate) => rel === candidate || relParts.includes(candidate))) {
      return href;
    }
  }

  return null;
}

function getAttribute(tag, name) {
  return tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))?.[1] ?? null;
}

function resolveLink(baseUrl, value) {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function decodeEntities(value) {
  if (!value) return value;
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}
