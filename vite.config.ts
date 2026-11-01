import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function localApiMiddleware() {
  return {
    name: 'local-api-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0];
        if (url === '/api/generate' || url === '/api/refine' || url === '/api/narrate') {
          let body = '';
          req.on('data', (chunk: any) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              req.body = body ? JSON.parse(body) : {};

              // Load .env into process.env during local development
              const env = loadEnv(server.config.mode, process.cwd(), '');
              for (const key of Object.keys(env)) {
                if (!process.env[key]) {
                  process.env[key] = env[key];
                }
              }

              // Mock standard Express/Vercel serverless res helpers
              const mockRes = {
                status(code: number) {
                  res.statusCode = code;
                  return this;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return this;
                },
              };

              if (url === '/api/generate') {
                const { default: handler } = await import('./api/generate.ts');
                await handler(req, mockRes);
              } else if (url === '/api/refine') {
                const { default: handler } = await import('./api/refine.ts');
                await handler(req, mockRes);
              } else if (url === '/api/narrate') {
                const { default: handler } = await import('./api/narrate.ts');
                await handler(req, mockRes);
              }
            } catch (err: any) {
              console.error('Local API dev middleware error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Internal dev server error' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApiMiddleware()],
  test: {
    globals: true,
    environment: 'node',
  },
} as any);
