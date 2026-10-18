import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listServices } from './docker.js';
import { MetadataCache, PreviewCache, selectPreviewableServices } from './preview.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT ?? 8080);
const dockerHostname = process.env.DOCKER_HOSTNAME ?? 'localhost';
const previewCache = new PreviewCache({
  ttlMs: Number(process.env.PREVIEW_TTL_MS ?? 20 * 60 * 1000)
});
const metadataCache = new MetadataCache({
  ttlMs: Number(process.env.METADATA_TTL_MS ?? 60 * 60 * 1000)
});

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    commit: process.env.DEPLOYED_COMMIT ?? null
  });
});

app.get('/api/services', async (req, res) => {
  try {
    const services = await listServices({
      hostname: dockerHostname,
      caddyfilePath: process.env.CADDYFILE_PATH
    });
    res.json({ services, generatedAt: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({
      error: 'docker_unavailable',
      message: 'Unable to read Docker services'
    });
  }
});

app.get('/api/previews', async (req, res) => {
  try {
    const services = await getServices(req);
    res.json({
      previews: selectPreviewableServices(services).map((service) => ({
        id: service.id,
        url: `/api/preview/${encodeURIComponent(service.id)}`
      }))
    });
  } catch (error) {
    res.status(503).json({
      error: 'preview_index_unavailable',
      message: 'Unable to list previews'
    });
  }
});

app.get('/api/metadata/:id', async (req, res) => {
  try {
    const services = await getServices(req);
    const service = services.find((item) => item.id === req.params.id && item.url);
    if (!service) {
      res.status(404).json({ error: 'metadata_not_found' });
      return;
    }

    res.json(await metadataCache.get(service.id, service.url));
  } catch (error) {
    res.status(503).json({
      error: 'metadata_load_failed',
      message: 'Unable to load metadata'
    });
  }
});

app.get('/api/preview/:id', async (req, res) => {
  try {
    const services = await getServices(req);
    const service = selectPreviewableServices(services).find((item) => item.id === req.params.id);
    if (!service) {
      res.status(404).json({ error: 'preview_not_found' });
      return;
    }

    const buffer = await previewCache.get(service.id, service.url);
    res.type('png');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(buffer);
  } catch (error) {
    res.status(503).json({
      error: 'preview_capture_failed',
      message: 'Unable to capture preview'
    });
  }
});

function getServices(req) {
  return listServices({
    hostname: dockerHostname,
    caddyfilePath: process.env.CADDYFILE_PATH
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`home-portal listening on ${port}`);
});
