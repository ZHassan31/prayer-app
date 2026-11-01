/// <reference types="vite/client" />

/** Injected by Vite at build time (see vite.config.ts). */
declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  /**
   * Optional UmmahAPI key. Raises rate limits 5x; the API works without it.
   * Set in .env.local (gitignored) — never commit a real key.
   */
  readonly VITE_UMMAH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
