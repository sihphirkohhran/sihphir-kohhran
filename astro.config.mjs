import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import adminAssets from './scripts/admin-assets.mjs';

export default defineConfig({
  integrations: [tailwind(), mdx(), adminAssets()],
  output: 'static',
  trailingSlash: 'ignore',
});
