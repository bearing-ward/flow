const output = document.querySelector('#result')

try {
  const { AvoidLib } = await import('libavoid-js')
  await AvoidLib.load(
    new URL(
      '../../../node_modules/libavoid-js/dist/libavoid.wasm',
      import.meta.url
    ).href
  )
  const avoid = AvoidLib.getInstance()
  const router = new avoid.Router(avoid.RouterFlag.OrthogonalRouting.value)

  const obstacle = new avoid.ShapeRef(
    router,
    new avoid.Rectangle(new avoid.Point(100, 50), new avoid.Point(200, 150))
  )

  const connection = new avoid.ConnRef(
    router,
    new avoid.ConnEnd(new avoid.Point(0, 100)),
    new avoid.ConnEnd(new avoid.Point(300, 100))
  )

  connection.setRoutingType(avoid.ConnType.ConnType_Orthogonal)
  router.processTransaction()
  const route = connection.displayRoute()

  const points = Array.from({ length: route.size() }, (_, index) => {
    const point = route.at(index)

    return { x: point.x, y: point.y }
  })

  output.textContent = JSON.stringify({ points, state: 'routed' })
  router.deleteConnector(connection)
  router.deleteShape(obstacle)
  router.delete()
} catch (error) {
  output.textContent = JSON.stringify({ error: String(error), state: 'failed' })
}
