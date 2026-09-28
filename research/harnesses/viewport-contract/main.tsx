import * as XYFlow from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __viewportContractCapture?: string
  }
}

type EventName = 'start' | 'change' | 'end'

const observedEvents: EventName[] = []

const Probe = () => {
  const instance = XYFlow.useReactFlow()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    const run = async (): Promise<void> => {
      await instance.setViewport({ x: 30, y: -20, zoom: 1.5 }, { duration: 0 })
      const initial = instance.getViewport()

      const conversions = {
        flowToScreen: instance.flowToScreenPosition({ x: 100, y: 80 }),
        screenToFlow: instance.screenToFlowPosition({ x: 210, y: 100 }),
        snapped: instance.screenToFlowPosition(
          { x: 210, y: 100 },
          { snapToGrid: true, snapGrid: [10, 20] }
        ),
      }

      observedEvents.length = 0

      const fitBoundsResult = await instance.fitBounds(
        { x: 100, y: 50, width: 400, height: 200 },
        { padding: 0.1, duration: 0 }
      )

      const fitBounds = {
        result: fitBoundsResult,
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      await instance.setCenter(180, 120, { zoom: 1.25, duration: 0 })

      const centered = {
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      await instance.zoomTo(2, { duration: 0 })

      const zoomed = {
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      await instance.zoomIn({ duration: 0 })

      const zoomedIn = {
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      await instance.zoomOut({ duration: 0 })

      const zoomedOut = {
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      await instance.setViewport({ x: -40, y: 25, zoom: 1.1 }, { duration: 0 })

      const immediate = {
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      observedEvents.length = 0
      instance.setViewport({ x: 300, y: -160, zoom: 1.8 }, { duration: 1000 })

      const interruption = instance.setViewport(
        { x: 12, y: 34, zoom: 0.9 },
        { duration: 0 }
      )

      const interruptionResult = await interruption

      const interrupted = {
        interruptionResult,
        viewport: instance.getViewport(),
        events: [...new Set(observedEvents)],
      }

      window.__viewportContractCapture = JSON.stringify({
        helperFit: XYFlow.getViewportForBounds(
          { x: 10, y: 20, width: 400, height: 200 },
          800,
          600,
          0.5,
          2,
          0.1
        ),
        asymmetricFit: XYFlow.getViewportForBounds(
          { x: 100, y: 50, width: 200, height: 100 },
          800,
          600,
          0.25,
          4,
          { top: '20px', right: '40px', bottom: '60px', left: '80px' }
        ),
        initial,
        conversions,
        fitBounds,
        centered,
        zoomed,
        zoomedIn,
        zoomedOut,
        immediate,
        interrupted,
      })
    }

    const runWithErrorCapture = async (): Promise<void> => {
      try {
        await run()
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        window.__viewportContractCapture = JSON.stringify({ error: message })
      }
    }

    void runWithErrorCapture()
  }, [instance])

  return null
}

const App = () => {
  const [ready, setReady] = useState(false)

  return (
    <XYFlow.ReactFlow
      nodes={[]}
      edges={[]}
      onInit={() => setReady(true)}
      onMoveStart={() => observedEvents.push('start')}
      onMove={() => observedEvents.push('change')}
      onMoveEnd={() => observedEvents.push('end')}
      minZoom={0.25}
      maxZoom={4}
      style={{ width: 800, height: 600 }}
    >
      {ready && <Probe />}
    </XYFlow.ReactFlow>
  )
}

const root = document.querySelector('#root')

if (!(root instanceof HTMLElement)) {
  throw new Error('Missing viewport capture root')
}

createRoot(root).render(<App />)
