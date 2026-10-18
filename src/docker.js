import fs from 'node:fs/promises';
import Docker from 'dockerode';
import { detectService } from './catalog.js';

const INFRASTRUCTURE_NAMES = new Set(['caddy-caddy-1', 'home-portal']);

export function parseCaddyRoutes(caddyfile) {
  const routes = [];
  let currentHost = null;
  let depth = 0;

  for (const rawLine of caddyfile.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const hostMatch = depth === 0 ? line.match(/^([a-zA-Z0-9.-]+)\s*\{$/) : null;
    if (hostMatch) {
      currentHost = hostMatch[1];
      depth += count(line, '{') - count(line, '}');
      continue;
    }

    if (currentHost && depth === 1) {
      const proxyMatch = line.match(/^reverse_proxy\s+([a-zA-Z0-9._-]+):(\d+)/);
      if (proxyMatch && !isIpAddress(proxyMatch[1])) {
        routes.push({
          host: proxyMatch[1] === 'host.docker.internal' ? null : currentHost,
          target: proxyMatch[1],
          port: Number(proxyMatch[2])
        });
      }
    }

    depth += count(line, '{') - count(line, '}');
    if (depth <= 0) {
      currentHost = null;
      depth = 0;
    }
  }

  return routes.filter((route) => route.host);
}

export async function readCaddyRoutes(path = process.env.CADDYFILE_PATH) {
  if (!path) return [];

  try {
    return parseCaddyRoutes(await fs.readFile(path, 'utf8'));
  } catch {
    return [];
  }
}

export async function listServices({ hostname, caddyfilePath } = {}) {
  const docker = new Docker({ socketPath: '/var/run/docker.sock' });
  const [containers, caddyRoutes, runtimeConfig] = await Promise.all([
    docker.listContainers({ all: false }),
    readCaddyRoutes(caddyfilePath),
    readRuntimeConfig()
  ]);

  const dockerServices = containers
    .map((container) => buildService(container, {
      hostname,
      caddyRoutes,
      catalog: runtimeConfig.catalog
    }))
    .filter(Boolean);

  return mergeServices(dockerServices, runtimeConfig.services)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function buildService(container, { hostname = 'localhost', caddyRoutes = [], catalog = [] } = {}) {
  const containerName = normalizeName(container.Names?.[0]);
  const displayName = getDisplayName(container, containerName);
  if (!containerName || INFRASTRUCTURE_NAMES.has(containerName) || INFRASTRUCTURE_NAMES.has(displayName)) return null;

  const publishedPort = findPublishedWebPort(container.Ports ?? []);
  const vncPort = findVncPort(container.Ports ?? []);
  const caddyRoute = findCaddyRoute(containerName, container.Ports ?? [], caddyRoutes);
  const meta = detectService(displayName, container.Image ?? '', catalog);
  const url = buildUrl({ caddyRoute, hostname, publishedPort });
  const routeSource = caddyRoute
    ? 'caddy'
    : publishedPort
      ? 'published-port'
      : vncPort
        ? 'vnc'
        : 'background';

  return {
    id: containerName,
    name: meta.name,
    containerName,
    image: container.Image,
    category: routeSource === 'background' ? 'Background' : meta.category,
    accent: meta.accent,
    artwork: meta.artwork,
    preview: meta.preview ?? 'metadata',
    status: container.Status,
    state: container.State,
    url,
    port: publishedPort?.PublicPort ?? caddyRoute?.port ?? vncPort?.PublicPort ?? null,
    routeSource
  };
}

export async function readExternalServices(path = process.env.EXTERNAL_SERVICES_PATH) {
  return (await readRuntimeConfig(path)).services;
}

export async function readRuntimeConfig(path = process.env.EXTERNAL_SERVICES_PATH) {
  if (!path) return { services: [], catalog: [] };

  try {
    const payload = JSON.parse(await fs.readFile(path, 'utf8'));
    return {
      services: Array.isArray(payload.services) ? payload.services : [],
      catalog: Array.isArray(payload.catalog) ? payload.catalog : []
    };
  } catch {
    return { services: [], catalog: [] };
  }
}

export function mergeServices(dockerServices, externalServices) {
  const dockerIds = new Set(dockerServices.map((service) => service.id));
  const normalizedExternal = externalServices
    .filter((service) => service?.id && service?.name && service?.url && !dockerIds.has(service.id))
    .map((service) => ({
      ...service,
      containerName: service.host ?? new URL(service.url).hostname,
      image: service.image ?? 'external',
      status: service.status ?? 'External service',
      state: 'external',
      port: service.port ?? Number(new URL(service.url).port || defaultPort(new URL(service.url).protocol)),
      routeSource: 'external',
      preview: service.preview ?? 'metadata'
    }));

  return [...dockerServices, ...normalizedExternal];
}

function findPublishedWebPort(ports) {
  return ports.find((port) =>
    port.Type === 'tcp' &&
    Number.isInteger(port.PublicPort) &&
    isLikelyWebPort(port.PrivatePort)
  );
}

function findVncPort(ports) {
  return ports.find((port) =>
    port.Type === 'tcp' &&
    Number.isInteger(port.PublicPort) &&
    port.PrivatePort === 5900
  );
}

function findCaddyRoute(containerName, ports, routes) {
  return routes.find((route) => {
    const targetMatches = route.target === containerName;
    const portMatches = ports.length === 0 || ports.some((port) => port.Type === 'tcp' && port.PrivatePort === route.port);
    return targetMatches && portMatches;
  });
}

function isLikelyWebPort(port) {
  return ![22, 25, 53, 5900].includes(port);
}

function normalizeName(name) {
  return name?.replace(/^\//, '') ?? '';
}

function getDisplayName(container, fallback) {
  const labels = container.Labels ?? {};
  return labels['coolify.resourceName'] || labels['coolify.serviceName'] || fallback;
}

function isIpAddress(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);
}

function count(value, needle) {
  return value.split(needle).length - 1;
}

function defaultPort(protocol) {
  return protocol === 'https:' ? 443 : 80;
}

function buildUrl({ caddyRoute, hostname, publishedPort }) {
  if (caddyRoute) return `https://${caddyRoute.host}`;
  if (publishedPort) return `http://${hostname}:${publishedPort.PublicPort}`;
  return null;
}
