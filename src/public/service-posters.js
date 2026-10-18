// Artwork is presentation only; inventory, names, states, and links stay runtime-owned.
const posters = [
  ['coolify-db', /coolify[\s_-]*(?:db|database)/],
  ['coolify-redis', /coolify[\s_-]*redis/],
  ['coolify-sentinel', /coolify[\s_-]*sentinel/],
  ['max-telegram-forwarder', /max[\s_-]*telegram[\s_-]*forwarder/],
  ['uptime-kuma', /uptime[\s_-]*kuma/],
  ['emby', /emby/],
  ['immich', /immich/],
  ['it-tools', /it[\s_-]*tools/],
  ['komga', /komga/],
  ['portlight', /portlight/],
  ['prowlarr', /prowlarr/],
  ['reels-downloader', /reels/],
  ['tempo', /tempo|nutrition/],
  ['torrserver', /torrserver/],
  ['mangarodl', /manga(?:rodl|[\s_-]*downloader)/],
  ['alice-echo', /alice[\s_-]*echo|neuro[\s_-]*alice/],
  ['coolify', /coolify/],
  ['tnas', /terramaster|tnas/],
];

export function getServicePoster(service = {}) {
  const identity = [service.name, service.containerName, service.image].filter(Boolean).join(' ').toLowerCase();
  const key = posters.find(([, pattern]) => pattern.test(identity))?.[0] ?? 'generic';
  return `/assets/posters/${key}.webp`;
}
