import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A unique id for this build. Embedded in the bundle AND written to
 * /version.json. The running app polls version.json and reloads itself
 * when the id changes, so every screen picks up a new deploy automatically.
 *
 * Note the `||` rather than `??`: Docker passes an empty string when the
 * BUILD_ID build-arg is unset, and `??` would happily accept it.
 */
const BUILD_ID = process.env.BUILD_ID || String(Date.now());

/**
 * Serves the gitignored ./config.json during `npm run dev`.
 *
 * It deliberately lives outside public/ so it can never be copied into
 * dist/ and baked into the Docker image.
 */
function devConfigPlugin() {
  return {
    name: 'dev-serve-config',
    apply: 'serve' as const,
    configureServer(server: {
      middlewares: {
        use: (
          path: string,
          handler: (req: unknown, res: any, next: () => void) => void,
        ) => void;
      };
    }) {
      server.middlewares.use('/config.json', (_req, res) => {
        const file = resolve(__dirname, 'config.json');
        if (!existsSync(file)) {
          res.statusCode = 404;
          res.end('{}');
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(readFileSync(file, 'utf8'));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    devConfigPlugin(),
    {
      name: 'emit-version-json',
      apply: 'build',
      closeBundle() {
        writeFileSync(
          resolve(__dirname, 'dist/version.json'),
          JSON.stringify({ buildId: BUILD_ID }),
        );
      },
    },
  ],
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
