import { describe, expect, it } from 'vitest';
import { buildService, mergeServices, parseCaddyRoutes, readRuntimeConfig } from '../src/docker.js';

describe('buildService', () => {
  it('creates a local URL from a published TCP port', () => {
    const service = buildService(
      {
        Names: ['/kuma-uptime-kuma-1'],
        Image: 'louislam/uptime-kuma:2',
        State: 'running',
        Status: 'Up 7 weeks (healthy)',
        Ports: [
          { PrivatePort: 3001, PublicPort: 3001, Type: 'tcp', IP: '0.0.0.0' }
        ]
      },
      { hostname: 'portal-host.example', caddyRoutes: [] }
    );

    expect(service).toMatchObject({
      id: 'kuma-uptime-kuma-1',
      name: 'Uptime Kuma',
      category: 'Monitoring',
      url: 'http://portal-host.example:3001',
      port: 3001,
      status: 'Up 7 weeks (healthy)'
    });
  });

  it('uses Caddy routes for containers without published host ports', () => {
    const service = buildService(
      {
        Names: ['/example-app'],
        Image: 'example/app:latest',
        State: 'running',
        Status: 'Up 7 weeks',
        Ports: [{ PrivatePort: 3000, Type: 'tcp' }]
      },
      {
        hostname: 'portal-host.example',
        caddyRoutes: [{ host: 'app.example', target: 'example-app', port: 3000 }],
        catalog: [{
          match: ['example/app'],
          name: 'Example App',
          category: 'Tools',
          accent: '#123456',
          artwork: 'generic'
        }]
      }
    );

    expect(service).toMatchObject({
      name: 'Example App',
      url: 'https://app.example',
      routeSource: 'caddy'
    });
  });

  it('prefers a Caddy route over a published host port when both exist', () => {
    const service = buildService(
      {
        Names: ['/komga'],
        Image: 'gotson/komga',
        State: 'running',
        Status: 'Up 2 months',
        Ports: [{ PrivatePort: 25600, PublicPort: 25600, Type: 'tcp' }]
      },
      {
        hostname: 'portal-host.example',
        caddyRoutes: [{ host: 'books.example', target: 'komga', port: 25600 }]
      }
    );

    expect(service).toMatchObject({
      name: 'Komga',
      url: 'https://books.example',
      routeSource: 'caddy'
    });
  });

  it('shows running containers without web ports as background services', () => {
    const service = buildService(
      {
        Names: ['/max-telegram-forwarder'],
        Image: 'example/background-worker:latest',
        State: 'running',
        Status: 'Up 7 weeks',
        Ports: []
      },
      { hostname: 'portal-host.example', caddyRoutes: [] }
    );

    expect(service).toMatchObject({
      name: 'Max Telegram Forwarder',
      category: 'Background',
      url: null,
      routeSource: 'background'
    });
  });

  it('shows VNC-only containers without treating the VNC port as a web URL', () => {
    const service = buildService(
      {
        Names: ['/desktop-helper'],
        Image: 'example/desktop-helper:latest',
        State: 'running',
        Status: 'Up 7 weeks',
        Ports: [{ PrivatePort: 5900, PublicPort: 5900, Type: 'tcp' }]
      },
      { hostname: 'portal-host.example', caddyRoutes: [] }
    );

    expect(service).toMatchObject({
      name: 'Desktop Helper',
      category: 'Service',
      url: null,
      port: 5900,
      routeSource: 'vnc'
    });
  });

  it('detects Emby by image and applies media metadata', () => {
    const service = buildService(
      {
        Names: ['/emby'],
        Image: 'emby/embyserver:latest',
        State: 'running',
        Status: 'Up 2 hours',
        Ports: [{ PrivatePort: 8096, PublicPort: 8096, Type: 'tcp' }]
      },
      { hostname: 'portal-host.example', caddyRoutes: [] }
    );

    expect(service).toMatchObject({
      name: 'Emby',
      category: 'Media',
      accent: '#52b54b',
      artwork: 'media'
    });
  });

  it('uses Coolify resource labels for generic display names while keeping the real container id', () => {
    const service = buildService({
      Names: ['/it-tools-vks0c4k0gs0k4k0c8s8w4s4o'],
      Image: 'corentinth/it-tools:latest',
      Labels: { 'coolify.resourceName': 'it-tools' },
      State: 'running',
      Status: 'Up 10 minutes',
      Ports: [{ PrivatePort: 80, PublicPort: 8080, Type: 'tcp' }]
    });

    expect(service).toMatchObject({
      id: 'it-tools-vks0c4k0gs0k4k0c8s8w4s4o',
      containerName: 'it-tools-vks0c4k0gs0k4k0c8s8w4s4o',
      name: 'IT-Tools',
      url: 'http://localhost:8080'
    });
  });

  it('keeps the portal hidden when Coolify gives it a generated container name', () => {
    const service = buildService({
      Names: ['/app-w8c0o0ks0o8cgg0os8k8g8kg'],
      Image: 'home-portal:latest',
      Labels: { 'coolify.resourceName': 'home-portal' },
      State: 'running',
      Ports: [{ PrivatePort: 8080, PublicPort: 8088, Type: 'tcp' }]
    });

    expect(service).toBeNull();
  });
});

describe('mergeServices', () => {
  it('adds configured external services after Docker services', () => {
    const services = mergeServices(
      [{ id: 'komga', name: 'Komga' }],
      [
        {
          id: 'remote-media',
          name: 'Remote Media',
          category: 'Media',
          url: 'http://media.example:8096',
          accent: '#52b54b',
          artwork: 'media'
        }
      ]
    );

    expect(services.map((service) => service.id)).toEqual(['komga', 'remote-media']);
    expect(services[1]).toMatchObject({
      containerName: 'media.example',
      routeSource: 'external',
      state: 'external'
    });
  });
});

describe('parseCaddyRoutes', () => {
  it('maps Caddy hosts to reverse_proxy container targets', () => {
    const routes = parseCaddyRoutes(`
home.example {
  reverse_proxy 192.0.2.80:8123
}

app.example {
  reverse_proxy example-app:3000
}

atlas.example {
  basic_auth {
    operator hashed
  }
  reverse_proxy atlas:3000
}
`);

    expect(routes).toContainEqual({ host: 'app.example', target: 'example-app', port: 3000 });
    expect(routes).toContainEqual({ host: 'atlas.example', target: 'atlas', port: 3000 });
    expect(routes).not.toContainEqual({ host: 'home.example', target: '192.0.2.80', port: 8123 });
  });
});

describe('readRuntimeConfig', () => {
  it('uses empty runtime sections when no config path is set', async () => {
    await expect(readRuntimeConfig('')).resolves.toEqual({ services: [], catalog: [] });
  });
});
