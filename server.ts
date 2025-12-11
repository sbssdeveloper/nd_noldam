import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initializeSocketServer } from './src/lib/socket-server'
import { createServer as createNetServer } from 'net'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const defaultPort = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port: defaultPort })
const handle = app.getRequestHandler()

// Function to find an available port
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createNetServer()
    
    server.listen(startPort, () => {
      const port = (server.address() as any)?.port
      server.close(() => resolve(port))
    })
    
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        // Port is in use, try next port
        findAvailablePort(startPort + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })
  })
}

app.prepare().then(async () => {
  // Find an available port
  const port = await findAvailablePort(defaultPort)
  
  if (port !== defaultPort) {
    console.log(`⚠️  Port ${defaultPort} is in use, using port ${port} instead`)
  }

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || '', true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO server
  initializeSocketServer(httpServer)

  httpServer
    .once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please free the port or use a different one.`)
      } else {
        console.error('Server error:', err)
      }
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
      console.log('> Socket.io server initialized')
    })
})

