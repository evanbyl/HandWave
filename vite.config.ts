import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://evanbyl.github.io/HandWave/ (ADR-004)
export default defineConfig({
  base: '/HandWave/',
  plugins: [
    VitePWA({
      // Updates are applied at the next hand-off, not mid-screen (NFR-405).
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'HandWave',
        short_name: 'HandWave',
        description: 'A silent, phone-passing spectrum guessing game.',
        theme_color: '#1b1340',
        background_color: '#1b1340',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
