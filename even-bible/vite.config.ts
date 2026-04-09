import { defineConfig, type Plugin } from 'vite';

function apiProxy(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const target = `http://localhost:3001/api${req.url ?? ''}`;
        const t0 = Date.now();
        console.log(`[proxy] → ${req.method} ${target}`);

        // Collect request body for non-GET/HEAD requests
        let reqBody: Buffer | undefined;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks: Buffer[] = [];
          await new Promise<void>((resolve, reject) => {
            req.on('data', (chunk: Buffer) => chunks.push(chunk));
            req.on('end', resolve);
            req.on('error', reject);
          });
          if (chunks.length) reqBody = Buffer.concat(chunks);
        }

        try {
          const upstream = await fetch(target, {
            method: req.method,
            headers: { 'content-type': req.headers['content-type'] ?? 'application/json' },
            body: reqBody,
          });
          const ms = Date.now() - t0;
          console.log(`[proxy] ← ${upstream.status} ${req.method} ${target} (${ms}ms)`);
          res.writeHead(upstream.status, {
            'Content-Type': upstream.headers.get('content-type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          const body = await upstream.arrayBuffer();
          res.end(Buffer.from(body));
        } catch (err) {
          const ms = Date.now() - t0;
          console.error(`[proxy] ✗ ${target} (${ms}ms) — ${err}`);
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end(`Proxy error: ${err}`);
        }
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [apiProxy()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    assetsDir: '',
  },
});
