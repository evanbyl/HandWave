import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://evanbyl.github.io/HandWave/ (ADR-004)
export default defineConfig({
  base: '/HandWave/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
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
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
