import path from 'node:path'

const root = path.resolve('dist-site')

Bun.serve({
  hostname: '127.0.0.1',
  port: 4186,
  async fetch(request) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/flow/')) {
      return new Response('Not found', { status: 404 })
    }

    const name = decodeURIComponent(url.pathname.slice('/flow/'.length))

    const filename = path.resolve(
      root,
      name + (url.pathname.endsWith('/') ? 'index.html' : '')
    )

    if (!filename.startsWith(root + path.sep)) {
      return new Response('Not found', { status: 404 })
    }

    const file = Bun.file(filename)

    return (await file.exists())
      ? new Response(file)
      : new Response('Not found', { status: 404 })
  },
})
