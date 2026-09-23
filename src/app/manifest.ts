import type { MetadataRoute } from 'next';

/** The same mark the browser tab uses, for a phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumen',
    short_name: 'Lumen',
    description: 'Ship a website from a sentence.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#0a0a08',
    theme_color: '#0a0a08',
    icons: [
      { src: '/lumen-mark-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/lumen-mark.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
