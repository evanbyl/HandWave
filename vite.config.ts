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
      // Precache the bundled fonts too, so the game looks right offline (ADR-011, NFR-401).
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
      manifest: {
        name: 'HandWave',
        short_name: 'HandWave',
        description: 'A silent, phone-passing spectrum guessing game.',
        theme_color: '#F3F1FF',
        background_color: '#F3F1FF',
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
