import { filterServices } from './service-filters.js';

const serviceList = document.querySelector('#services');
const statusLine = document.querySelector('#status');
const updatedLine = document.querySelector('#updated');
const search = document.querySelector('#search');
const refresh = document.querySelector('#refresh');
const themeToggle = document.querySelector('#theme-toggle');
const cardTemplate = document.querySelector('#service-card');
const locationFilters = document.querySelector('#location-filters');
const categoryFilters = document.querySelector('#category-filters');
const serviceCount = document.querySelector('#service-count');
const webCount = document.querySelector('#web-count');
const categoryCount = document.querySelector('#category-count');

let services = [];
let selectedCategory = 'All';
let selectedLocation = 'all';

locationFilters.addEventListener('click', (event) => {
  const button = event.target.closest('[data-location]');
  if (!button) return;
  selectedLocation = button.dataset.location;
  locationFilters.querySelectorAll('button').forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip === button));
  });
  render();
});

const storedTheme = localStorage.getItem('theme');
const preferredTheme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
setTheme(storedTheme ?? preferredTheme);

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(next);
  localStorage.setItem('theme', next);
});

refresh.addEventListener('click', loadServices);
search.addEventListener('input', render);
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !isTypingTarget(event.target)) {
    event.preventDefault();
    search.focus();
  }
});

async function loadServices() {
  statusLine.textContent = 'Refreshing live inventory…';
  serviceList.setAttribute('aria-busy', 'true');
  refresh.disabled = true;
  refresh.classList.add('is-loading');

  try {
    const response = await fetch('/api/services', { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message ?? 'Unable to load services');
    services = payload.services ?? [];
    updateSummary();
    renderFilters();
    render();
    updatedLine.textContent = `Updated ${formatTime(payload.generatedAt)}`;
  } catch (error) {
    services = [];
    updateSummary();
    serviceList.replaceChildren(createEmptyState('Inventory unavailable', 'Check the server connection, then refresh.'));
    statusLine.textContent = error instanceof Error ? error.message : 'Unable to load services';
  } finally {
    serviceList.setAttribute('aria-busy', 'false');
    refresh.disabled = false;
    refresh.classList.remove('is-loading');
  }
}

function render() {
  const needle = search.value.trim().toLowerCase();
  const filtered = filterServices(services, {
    category: selectedCategory, location: selectedLocation, search: needle
  }).sort(compareServices);

  serviceList.replaceChildren();
  const hasFilter = selectedCategory !== 'All' || selectedLocation !== 'all';
  statusLine.textContent = needle || hasFilter
    ? `${filtered.length} of ${services.length} services shown`
    : `${services.length} service${services.length === 1 ? '' : 's'} available`;

  if (!filtered.length) {
    serviceList.append(createEmptyState(
      needle || hasFilter ? 'No matching services' : 'No services found',
      needle || hasFilter ? 'Try another location, category, or search.' : 'Refresh after a service starts.'
    ));
    return;
  }

  for (const service of filtered) {
    serviceList.append(renderCard(service));
    if (service.url) loadMetadata(service);
  }
}

function renderCard(service) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  const initials = getInitials(service.name);
  card.style.setProperty('--service-accent', service.accent || '#70a7ff');
  card.dataset.serviceId = service.id;
  card.dataset.state = service.state ?? 'running';
  card.querySelectorAll('.service-initials').forEach((node) => { node.textContent = initials; });
  card.querySelector('h3').textContent = service.name;
  card.querySelector('.state').textContent = formatState(service.state);
  card.querySelector('.details').textContent = service.containerName;
  card.querySelector('.category').textContent = service.category || 'Service';
  card.querySelector('.route').textContent = formatRoute(service);

  const link = card.querySelector('.open');
  if (service.url) {
    link.href = service.url;
    link.setAttribute('aria-label', `Open ${service.name}`);
    if (service.preview === 'screenshot') addPreviewImage(card, service);
  } else {
    link.remove();
  }
  return card;
}

function addPreviewImage(card, service) {
  const image = document.createElement('img');
  image.className = 'preview-image';
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  image.src = `/api/preview/${encodeURIComponent(service.id)}`;
  image.addEventListener('error', () => image.remove(), { once: true });
  card.querySelector('.art').prepend(image);
}

async function loadMetadata(service) {
  try {
    const response = await fetch(`/api/metadata/${encodeURIComponent(service.id)}`, { cache: 'force-cache' });
    if (!response.ok) return;
    const metadata = await response.json();
    const card = document.querySelector(`[data-service-id="${escapeCss(service.id)}"]`);
    if (!card) return;

    if (metadata.favicon) addFavicon(card, metadata.favicon);
    if (metadata.title && metadata.title !== service.name) {
      card.querySelector('.metadata-title').textContent = metadata.title;
    }
  } catch {
    // Metadata is optional; service state and links remain useful without it.
  }
}

function addFavicon(card, url) {
  const icon = card.querySelector('.service-icon');
  if (icon.querySelector('.favicon')) return;
  const image = document.createElement('img');
  image.className = 'favicon';
  image.alt = '';
  image.src = url;
  image.addEventListener('load', () => icon.replaceChildren(image), { once: true });
  image.addEventListener('error', () => image.remove(), { once: true });
}

function updateSummary() {
  serviceCount.textContent = String(services.length);
  webCount.textContent = String(services.filter((service) => service.url).length);
  categoryCount.textContent = String(new Set(services.map((service) => service.category)).size);
}

function renderFilters() {
  const categories = [...new Set(services.map((service) => service.category || 'Service'))].sort();
  if (selectedCategory !== 'All' && !categories.includes(selectedCategory)) selectedCategory = 'All';
  categoryFilters.replaceChildren();
  for (const category of ['All', ...categories]) {
    const button = document.createElement('button');
    button.className = 'filter-chip';
    button.type = 'button';
    button.textContent = category;
    button.setAttribute('aria-pressed', String(category === selectedCategory));
    button.addEventListener('click', () => {
      selectedCategory = category;
      categoryFilters.querySelectorAll('.filter-chip').forEach((chip) => {
        chip.setAttribute('aria-pressed', String(chip === button));
      });
      render();
    });
    categoryFilters.append(button);
  }
}

function compareServices(left, right) {
  const leftRank = left.url ? 0 : left.routeSource === 'background' ? 2 : 1;
  const rightRank = right.url ? 0 : right.routeSource === 'background' ? 2 : 1;
  return leftRank - rightRank || left.name.localeCompare(right.name);
}

function createEmptyState(title, message) {
  const empty = document.createElement('div');
  empty.className = 'empty';
  const heading = document.createElement('strong');
  heading.textContent = title;
  const body = document.createElement('span');
  body.textContent = message;
  empty.append(heading, body);
  return empty;
}

function getInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'SR';
}

function formatState(state) {
  if (!state) return 'Running';
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function formatRoute(service) {
  if (service.routeSource === 'caddy') return 'Proxy route';
  if (service.routeSource === 'published-port') return `Port ${service.port}`;
  if (service.routeSource === 'vnc') return `VNC ${service.port}`;
  if (service.routeSource === 'external') return 'External';
  return 'Background';
}

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'just now' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  document.querySelector('meta[name="theme-color"]').content = isDark ? '#0c0e12' : '#f3f5f7';
}

function isTypingTarget(target) {
  return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable);
}

function escapeCss(value) {
  if (globalThis.CSS?.escape) return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

loadServices();
setInterval(loadServices, 60_000);
