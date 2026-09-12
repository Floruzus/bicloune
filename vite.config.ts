import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Chemin de publication. GitHub Pages sert un dépôt de projet sous
 * https://<compte>.github.io/<dépôt>/ : c'est le nom du dépôt qu'il faut ici.
 * En local, `npm run dev` reste à la racine.
 */
const BASE = '/bicloune/'

export default defineConfig(({ command }) => {
  const base = command === 'build' ? BASE : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'Bicloune — cadence',
          short_name: 'Bicloune',
          lang: 'fr',
          description:
            'Cadence de pédalage en temps réel à partir du GPS et du rapport engagé',
          theme_color: '#0b0d10',
          background_color: '#0b0d10',
          display: 'standalone',
          orientation: 'portrait',
          // Relatifs au manifeste, donc valides quel que soit le sous-dossier.
          start_url: './',
          scope: './',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
