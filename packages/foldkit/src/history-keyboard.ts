import { Effect, Queue, Stream } from 'effect'

import { isInputDOMNode } from './key-press-observer.ts'

/** Native input stays scoped to the canvas that owns focus. */
export const historyKeyboardStream = <Message>(
  instanceId: string,
  replay: (action: 'undo' | 'redo') => Message,
  endGesture: () => Message,
  clipboard?: (action: 'copy' | 'paste') => Message
): Stream.Stream<Message> => {
  const owns = (event: KeyboardEvent): boolean =>
    !isInputDOMNode(event) &&
    event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.dataset.flowInstance === instanceId
      )

  return Stream.callback<Message>((queue) => {
    const end = (): void => {
      Queue.offerUnsafe(queue, endGesture())
    }

    const down = (event: KeyboardEvent): void => {
      if (
        event.isComposing ||
        event.defaultPrevented ||
        !owns(event) ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey)
      ) {
        return
      }

      const key = event.key.toLowerCase()

      if (
        (key === 'c' || key === 'v') &&
        !event.shiftKey &&
        clipboard !== undefined
      ) {
        event.preventDefault()

        if (!event.repeat) {
          Queue.offerUnsafe(queue, clipboard(key === 'c' ? 'copy' : 'paste'))
        }

        return
      }

      if (key !== 'z' && !(key === 'y' && event.ctrlKey)) {
        return
      }

      event.preventDefault()

      if (!event.repeat) {
        Queue.offerUnsafe(
          queue,
          replay(key === 'y' || event.shiftKey ? 'redo' : 'undo')
        )
      }
    }

    const up = (event: KeyboardEvent): void => {
      if (owns(event) && event.key.startsWith('Arrow')) {
        end()
      }
    }

    return Effect.acquireRelease(
      Effect.sync(() => {
        document.addEventListener('keydown', down, true)
        document.addEventListener('keyup', up, true)
        window.addEventListener('blur', end)

        return () => {
          document.removeEventListener('keydown', down, true)
          document.removeEventListener('keyup', up, true)
          window.removeEventListener('blur', end)
        }
      }),
      (dispose) => Effect.sync(dispose)
    )
  })
}
