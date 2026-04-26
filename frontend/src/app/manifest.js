export default function manifest() {
  return {
    name: 'ResQ Emergency System',
    short_name: 'ResQ',
    description: 'Centralised Citizen Distress System',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#ff2d2d',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
