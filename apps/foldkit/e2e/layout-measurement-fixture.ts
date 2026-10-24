import { createFoldkitNodeMeasurementObserver } from '@flow/foldkit'

declare global {
  interface Window {
    measureLayoutFeedback: () => readonly number[]
  }
}

window.measureLayoutFeedback = () => {
  const owner = document.createElement('div')
  const node = document.createElement('div')
  node.dataset.nodeId = 'fractional'
  node.dataset.testid = 'flow-node'
  node.style.cssText = 'width:105.5px;height:36px;box-sizing:border-box'
  owner.style.transform =
    'translate(40px, 82.46530094090247px) scale(1.0247798076968213)'
  owner.append(node)
  document.body.append(owner)

  const widths: number[] = []

  const observer = createFoldkitNodeMeasurementObserver({
    owner,
    zoom: () => 1.0247798076968213,
    onMeasure: (requests) => {
      for (const { measurement } of requests) {
        widths.push(measurement.width)
        node.style.width = `${measurement.width}px`
      }
    },
  })

  for (let index = 0; index < 4; index += 1) {
    observer.measure(node)
  }

  observer.dispose()
  owner.remove()

  return widths
}
