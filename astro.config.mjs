import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://www.pjl.design',
  // keep the existing flat URLs: /healthline.html, /print-work.html
  build: { format: 'file' },
  vite: { plugins: [tailwindcss()] },
});
