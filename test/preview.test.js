import { describe, expect, it, vi } from 'vitest';
import { MetadataCache, PreviewCache, parseHtmlMetadata, selectPreviewableServices } from '../src/preview.js';

describe('selectPreviewableServices', () => {
  it('keeps only screenshot-enabled services with URLs', () => {
    const services = selectPreviewableServices([
      { id: 'kuma', url: 'http://portal-host.example:3001', preview: 'screenshot' },
      { id: 'dozzle', url: 'http://portal-host.example:8081', preview: 'metadata' },
      { id: 'worker', url: null },
      { id: 'missing' }
    ]);

    expect(services).toEqual([{ id: 'kuma', url: 'http://portal-host.example:3001', preview: 'screenshot' }]);
  });
});

describe('PreviewCache', () => {
  it('reuses cached previews until ttl expires', async () => {
    let now = 1000;
    const capture = vi.fn(async () => Buffer.from('png'));
    const cache = new PreviewCache({ ttlMs: 100, now: () => now, capture });

    await cache.get('kuma', 'http://portal-host.example:3001');
    await cache.get('kuma', 'http://portal-host.example:3001');
    now = 1200;
    await cache.get('kuma', 'http://portal-host.example:3001');

    expect(capture).toHaveBeenCalledTimes(2);
  });

  it('does not cache failed captures', async () => {
    const capture = vi
      .fn()
      .mockRejectedValueOnce(new Error('capture failed'))
      .mockResolvedValueOnce(Buffer.from('png'));
    const cache = new PreviewCache({ ttlMs: 100, now: () => 1000, capture });

    await expect(cache.get('kuma', 'http://portal-host.example:3001')).rejects.toThrow('capture failed');
    await cache.get('kuma', 'http://portal-host.example:3001');

    expect(capture).toHaveBeenCalledTimes(2);
  });
});

describe('parseHtmlMetadata', () => {
  it('extracts title, icon, and manifest URLs', () => {
    const metadata = parseHtmlMetadata(
      '<html><head><title>Uptime Kuma</title><link rel="icon" href="/favicon.ico"><link rel="manifest" href="/manifest.json"></head></html>',
      'http://portal-host.example:3001/status'
    );

    expect(metadata).toEqual({
      title: 'Uptime Kuma',
      favicon: 'http://portal-host.example:3001/favicon.ico',
      manifest: 'http://portal-host.example:3001/manifest.json'
    });
  });
});

describe('MetadataCache', () => {
  it('caches metadata by service id and URL', async () => {
    let now = 1000;
    const load = vi.fn(async () => ({ title: 'Komga', favicon: null, manifest: null }));
    const cache = new MetadataCache({ ttlMs: 100, now: () => now, load });

    await cache.get('komga', 'https://books.example');
    await cache.get('komga', 'https://books.example');
    now = 1200;
    await cache.get('komga', 'https://books.example');

    expect(load).toHaveBeenCalledTimes(2);
  });
});
