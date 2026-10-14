export type FlowKeyCode = string | readonly string[] | null

export type FlowKeyPressTarget =
  | Window
  | Document
  | HTMLElement
  | ShadowRoot
  | null

export interface FlowKeyPressOptions {
  readonly target?: FlowKeyPressTarget
  readonly actInsideInputWithModifier?: boolean
  readonly preventDefault?: boolean
}

type KeyParts = readonly string[]

type KeyOrCode = 'key' | 'code'

const parseKeyCode = (keyCode: FlowKeyCode): KeyParts[] => {
  if (keyCode === null) {
    return []
  }

  const alternatives: readonly string[] = Array.isArray(keyCode)
    ? keyCode
    : [keyCode]

  return alternatives.map((value) =>
    value.replaceAll('+', '\n').replace('\n\n', '\n+').split('\n')
  )
}

const matches = (
  alternatives: readonly KeyParts[],
  pressedKeys: ReadonlySet<string>,
  isKeyUp: boolean
): boolean =>
  alternatives
    .filter((keys) => isKeyUp || keys.length === pressedKeys.size)
    .some((keys) => keys.every((key) => pressedKeys.has(key)))

const useKeyOrCode = (
  eventCode: string,
  keysToWatch: readonly string[]
): KeyOrCode => (keysToWatch.includes(eventCode) ? 'code' : 'key')

const isElementNode = (target: EventTarget | null): target is Element =>
  target !== null && 'nodeType' in target && target.nodeType === 1

export const firstEventElement = (event: KeyboardEvent): Element | null => {
  const first = event.composedPath?.()[0] ?? event.target

  return isElementNode(first) ? first : null
}

const hasKeyboardEventFields = (event: Event): event is KeyboardEvent =>
  'key' in event &&
  'code' in event &&
  'altKey' in event &&
  'ctrlKey' in event &&
  'metaKey' in event &&
  'shiftKey' in event

export const isInputDOMNode = (event: KeyboardEvent): boolean => {
  const element = firstEventElement(event)

  if (element === null) {
    return false
  }

  return (
    element.nodeName === 'INPUT' ||
    element.nodeName === 'SELECT' ||
    element.nodeName === 'TEXTAREA' ||
    element.hasAttribute('contenteditable') ||
    element.closest('.nokey') !== null
  )
}

/** Attach one owner-scoped observer for a key or key combination. */
export const observeKeyPress = (
  keyCode: FlowKeyCode,
  listener: (pressed: boolean, event?: KeyboardEvent) => void,
  options: FlowKeyPressOptions = {}
): (() => void) => {
  const defaultTarget = typeof document === 'undefined' ? null : document
  const target = options.target ?? defaultTarget
  const actInsideInputWithModifier = options.actInsideInputWithModifier ?? true
  const preventDefault = options.preventDefault ?? true
  const alternatives = parseKeyCode(keyCode)
  const keysToWatch = alternatives.flat()
  const pressedKeys = new Set<string>()
  let modifierPressed = false
  let pressed = false
  let disposed = false

  listener(false)

  const notify = (next: boolean, event?: KeyboardEvent): void => {
    if (disposed || pressed === next) {
      return
    }

    pressed = next
    listener(next, event)
  }

  if (keyCode === null || target === null || alternatives.length === 0) {
    return () => {
      disposed = true
    }
  }

  const downHandler = (event: KeyboardEvent): void => {
    modifierPressed =
      event.ctrlKey || event.metaKey || event.shiftKey || event.altKey

    if (
      (!modifierPressed || !actInsideInputWithModifier) &&
      isInputDOMNode(event)
    ) {
      return
    }

    const keyOrCode = useKeyOrCode(event.code, keysToWatch)
    pressedKeys.add(event[keyOrCode])

    if (matches(alternatives, pressedKeys, false)) {
      const eventTarget = firstEventElement(event)

      const interactive =
        eventTarget?.nodeName === 'BUTTON' || eventTarget?.nodeName === 'A'

      if (preventDefault && (modifierPressed || !interactive)) {
        event.preventDefault()
      }

      notify(true, event)
    }
  }

  const upHandler = (event: KeyboardEvent): void => {
    const keyOrCode = useKeyOrCode(event.code, keysToWatch)

    if (matches(alternatives, pressedKeys, true)) {
      notify(false)
      pressedKeys.clear()
    } else {
      pressedKeys.delete(event[keyOrCode])
    }

    if (event.key === 'Meta') {
      pressedKeys.clear()
    }

    modifierPressed = false
  }

  const resetHandler = (): void => {
    pressedKeys.clear()
    modifierPressed = false
    notify(false)
  }

  const onKeyDown: EventListener = (event) => {
    if (hasKeyboardEventFields(event)) {
      downHandler(event)
    }
  }

  const onKeyUp: EventListener = (event) => {
    if (hasKeyboardEventFields(event)) {
      upHandler(event)
    }
  }

  target.addEventListener('keydown', onKeyDown)
  target.addEventListener('keyup', onKeyUp)
  globalThis.addEventListener('blur', resetHandler)
  globalThis.addEventListener('contextmenu', resetHandler)

  return () => {
    if (disposed) {
      return
    }

    disposed = true
    pressedKeys.clear()
    pressed = false
    target.removeEventListener('keydown', onKeyDown)
    target.removeEventListener('keyup', onKeyUp)
    globalThis.removeEventListener('blur', resetHandler)
    globalThis.removeEventListener('contextmenu', resetHandler)
  }
}
