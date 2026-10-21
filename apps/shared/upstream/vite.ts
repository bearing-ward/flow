import type { Plugin } from 'vite'

export const upstreamFixtureRoute = (): Plugin => ({
  name: 'flow-upstream-fixture-route',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (request.url?.startsWith('/upstream/')) {
        request.url = '/upstream.html'
      }

      next()
    })
  },
})
