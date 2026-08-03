import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import { registrySyncPlugin } from './scripts/vite-plugin-registry-sync.mjs';

export default defineConfig({
  integrations: [tailwind(), mdx()],
  output: 'static',
  trailingSlash: 'ignore',
  vite: {
    plugins: [registrySyncPlugin()],
  },
});
