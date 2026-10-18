import { describe, expect, it } from 'vitest';
import { filterServices } from '../src/public/service-filters.js';

const services = [
  { name: 'Worker', category: 'Tools', routeSource: 'background' },
  { name: 'Desktop', category: 'Tools', routeSource: 'vnc' },
  { name: 'Library', category: 'Media', routeSource: 'caddy' },
  { name: 'Remote library', category: 'Media', state: 'external' },
  { name: 'Remote tool', category: 'Tools', routeSource: 'external' },
  { name: 'Uncategorized' },
];
describe('service location filters', () => {
  it('keeps local background and VNC services and excludes either external marker', () => {
    expect(filterServices(services, { location: 'local' }).map((s) => s.name))
      .toEqual(['Worker', 'Desktop', 'Library', 'Uncategorized']);
    expect(filterServices(services, { location: 'external' }).map((s) => s.name))
      .toEqual(['Remote library', 'Remote tool']);
  });
  it('composes location, category and case-insensitive search without changing inventory', () => {
    expect(filterServices(services, { location: 'external', category: 'Media', search: ' LIBRARY ' }))
      .toEqual([services[3]]);
    expect(filterServices(services, { location: 'local', search: 'remote' })).toEqual([]);
    expect(filterServices(services)).toHaveLength(6);
    expect(filterServices(services, { category: 'Service' })).toEqual([services[5]]);
  });
});
