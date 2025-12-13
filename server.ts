import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocketServer } from './src/lib/socket-server'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

console.log(`[Server] Starting... NODE_ENV=${process.env.NODE_ENV}, port=${port}`)

const app = next({ dev })
const handle = app.getRequestHandler()

let httpServer: ReturnType<typeof createServer>

app.prepare()
  .then(() => {
    console.log('[Server] Next.js prepared')

    httpServer = createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url || '', true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('[Server] Request error:', err)
        res.statusCode = 500
        res.end('Internal server error')
      }
    })

    console.log('[Server] Initializing Socket.IO')
    initializeSocketServer(httpServer)

    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`> Ready on http://localhost:${port}`)
      console.log('> Socket.IO initialized')
    })
  })
  .catch((err) => {
    console.error('[Server] Startup failed:', err)
    process.exit(1)
  })

/**
 * Graceful shutdown
 */
const shutdown = (signal: string) => {
  console.log(`[Server] Received ${signal}, shutting down...`)
  if (httpServer) {
    httpServer.close(() => {
      console.log('[Server] HTTP server closed')
      process.exit(0)
    })
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
