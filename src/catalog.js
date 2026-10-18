const services = [
  {
    match: ['emby/embyserver', 'emby'],
    name: 'Emby',
    category: 'Media',
    accent: '#52b54b',
    artwork: 'media',
    preview: 'screenshot'
  },
  {
    match: ['jellyfin/jellyfin', 'jellyfin'],
    name: 'Jellyfin',
    category: 'Media',
    accent: '#aa5cc3',
    artwork: 'media',
    preview: 'screenshot'
  },
  {
    match: ['gotson/komga', 'komga'],
    name: 'Komga',
    category: 'Books',
    accent: '#f05d5e',
    artwork: 'library',
    preview: 'screenshot'
  },
  {
    match: ['uptime-kuma', 'kuma'],
    name: 'Uptime Kuma',
    category: 'Monitoring',
    accent: '#5cdd8b',
    artwork: 'monitoring',
    preview: 'screenshot'
  },
  {
    match: ['dozzle'],
    name: 'Dozzle',
    category: 'Logs',
    accent: '#3aa3ff',
    artwork: 'logs'
  },
  {
    match: ['corentinth/it-tools', 'it-tools'],
    name: 'IT-Tools',
    category: 'Tools',
    accent: '#3157d5',
    artwork: 'tools'
  }
];

export function detectService(containerName, image, catalog = []) {
  const haystack = `${containerName} ${image}`.toLowerCase();
  const configured = catalog.find((service) =>
    Array.isArray(service?.match) &&
    service.match.some((needle) => typeof needle === 'string' && haystack.includes(needle.toLowerCase()))
  );

  return configured ?? services.find((service) => service.match.some((needle) => haystack.includes(needle))) ?? {
    name: titleize(containerName),
    category: 'Service',
    accent: '#7ca7ff',
    artwork: 'generic',
    preview: 'metadata'
  };
}

function titleize(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
