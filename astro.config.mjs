import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

const SITE = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/explore') &&
        !page.includes('/aviso-legal') &&
        !page.includes('/privacidad'),
      changefreq: 'monthly',
      priority: 0.7,
      serialize(item) {
        if (item.url.endsWith('/')) {
          return { ...item, priority: 1.0, changefreq: 'weekly' };
        }
        if (item.url.includes('/receta/')) {
          return { ...item, priority: 0.8, changefreq: 'yearly' };
        }
        if (item.url.includes('/categoria/') || item.url.includes('/ingrediente/')) {
          return { ...item, priority: 0.6, changefreq: 'monthly' };
        }
        return item;
      },
    }),
  ],
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
  redirects: {
    '/recetas': '/recetas/1',
    '/categorias': '/',
  },
});
