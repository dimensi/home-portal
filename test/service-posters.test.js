import { describe, expect, it } from 'vitest';
import { getServicePoster } from '../src/public/service-posters.js';

describe('service posters', () => {
  it('recognizes specific services before shared host and image labels', () => {
    expect(getServicePoster({ name: 'Emby on TNAS', image: 'media:latest' })).toBe('/assets/posters/emby.webp');
    expect(getServicePoster({ name: 'Coolify Db', image: 'coolify/database' })).toBe('/assets/posters/coolify-db.webp');
    expect(getServicePoster({ name: 'Coolify Redis' })).toBe('/assets/posters/coolify-redis.webp');
    expect(getServicePoster({ name: 'Coolify Sentinel' })).toBe('/assets/posters/coolify-sentinel.webp');
  });

  it('uses container identity when the display name differs and safely falls back', () => {
    expect(getServicePoster({ name: 'My tracker', containerName: 'nutrition' })).toBe('/assets/posters/tempo.webp');
    expect(getServicePoster({ containerName: 'mangarodl' })).toBe('/assets/posters/mangarodl.webp');
    expect(getServicePoster({ name: 'Future service', url: 'https://example.invalid/emby' })).toBe('/assets/posters/generic.webp');
    expect(getServicePoster()).toBe('/assets/posters/generic.webp');
  });
});
