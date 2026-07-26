import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/* In production Vercel serves `api/chat.js` as a serverless function. There's
   no equivalent in `vite dev`, so this mounts the exact same handler as
   middleware — one implementation, both environments.

   The handler is imported lazily so an edit to it takes effect on the next
   request instead of requiring a dev-server restart. */
function apiRoutes(env) {
  return {
    name: 'woodley-api-routes',
    configureServer(server) {
      // loadEnv with an empty prefix returns unprefixed vars too. Vite only
      // exposes VITE_* to the client, so the key stays server-side.
      process.env.ANTHROPIC_API_KEY ??= env.ANTHROPIC_API_KEY

      server.middlewares.use('/api/chat', async (req, res, next) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/api/chat.js')
          await handler(req, res)
        } catch (err) {
          server.config.logger.error(`[api/chat] ${err?.stack || err}`)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: String(err?.message || err) }))
          } else {
            res.end()
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      apiRoutes(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        workbox: {
          // Never cache the chat endpoint — a cached reply would be worse than
          // no reply.
          navigateFallbackDenylist: [/^\/api\//],
        },
        manifest: {
          name: 'Woodley Travels',
          short_name: 'Travels',
          description: 'A passport for every place.',
          theme_color: '#0B3B32',
          background_color: '#0B3B32',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
          ],
        },
      }),
    ],
  }
})
