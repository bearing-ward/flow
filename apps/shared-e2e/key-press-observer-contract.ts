interface KeyPressContractApi {
  readonly observe: (
    id: string,
    keyCode: string | readonly string[] | null,
    options: {
      readonly target?: Window | Document | HTMLElement | ShadowRoot | null
      readonly actInsideInputWithModifier?: boolean
      readonly preventDefault?: boolean
    }
  ) => void
  readonly states: (id: string) => readonly boolean[]
  readonly unsubscribe: (id: string) => void
  readonly disposeOwner: () => void
}

declare global {
  interface Window {
    __flowKeyPressContract?: KeyPressContractApi
  }
}

interface KeyPressContractResult {
  readonly explicitTarget: readonly boolean[]
  readonly defaultTarget: readonly boolean[]
  readonly combinations: readonly boolean[]
  readonly codeMatch: readonly boolean[]
  readonly keyMatch: readonly boolean[]
  readonly noPreventDefault: boolean
  readonly buttonPreventDefault: boolean
  readonly anchorPreventDefault: boolean
  readonly foreignAnchorPreventDefault: boolean
  readonly foreignEditableSuppression: readonly boolean[]
  readonly modifiedInputWithoutAllowance: readonly boolean[]
  readonly blurReset: readonly boolean[]
  readonly contextMenuReset: readonly boolean[]
  readonly metaCleanup: readonly boolean[]
  readonly metaHeldBeforeRelease: readonly boolean[]
  readonly unsubscribe: readonly boolean[]
  readonly ownerDispose: readonly boolean[]
}

/** Run the same DOM-event contract through each host's production observer API. */
export const runKeyPressObserverContract = (
  apiName: string
): KeyPressContractResult => {
  // SAFETY: page.evaluate serializes this function body without its module scope.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const makeTarget = (): HTMLDivElement => {
    const target = document.createElement('div')
    document.body.append(target)

    return target
  }

  // SAFETY: page.evaluate serializes this function body without its module scope.
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const send = (
    target: EventTarget,
    type: 'keydown' | 'keyup',
    key: string,
    code: string,
    options: KeyboardEventInit = {}
  ): KeyboardEvent => {
    const event = new KeyboardEvent(type, {
      key,
      code,
      bubbles: true,
      cancelable: true,
      ...options,
    })

    target.dispatchEvent(event)

    return event
  }

  if (apiName !== '__flowKeyPressContract') {
    throw new Error(`Unexpected observer contract API ${apiName}`)
  }

  const api = window[apiName]

  if (api === undefined) {
    throw new Error(`Missing observer contract API ${apiName}`)
  }

  const snapshot = (id: string): readonly boolean[] => [...api.states(id)]

  const explicitTarget = makeTarget()
  const input = document.createElement('input')
  const contenteditable = document.createElement('div')
  contenteditable.setAttribute('contenteditable', 'true')
  const noKey = document.createElement('div')
  noKey.className = 'nokey'
  const noKeyChild = document.createElement('span')
  noKey.append(noKeyChild)
  explicitTarget.append(input, contenteditable, noKey)
  api.observe('explicit', 'x', { target: explicitTarget })
  send(document, 'keydown', 'x', 'KeyX')
  send(input, 'keydown', 'x', 'KeyX')
  send(contenteditable, 'keydown', 'x', 'KeyX')
  send(noKeyChild, 'keydown', 'x', 'KeyX')
  const explicitSuppressed = snapshot('explicit')
  send(input, 'keydown', 'x', 'KeyX', { ctrlKey: true })
  send(input, 'keyup', 'x', 'KeyX')
  const explicitStates = snapshot('explicit')
  api.unsubscribe('explicit')
  send(explicitTarget, 'keydown', 'x', 'KeyX')

  const defaultTarget = makeTarget()
  api.observe('default', 'n', { target: null })
  send(document, 'keydown', 'n', 'KeyN')
  send(document, 'keyup', 'n', 'KeyN')
  const defaultStates = snapshot('default')
  api.unsubscribe('default')

  const combinationsTarget = makeTarget()
  api.observe('combinations', ['Control+KeyA', 'b'], {
    target: combinationsTarget,
  })
  send(combinationsTarget, 'keydown', 'Control', 'ControlLeft', {
    ctrlKey: true,
  })
  send(combinationsTarget, 'keydown', 'a', 'KeyA', { ctrlKey: true })
  send(combinationsTarget, 'keyup', 'a', 'KeyA', { ctrlKey: true })
  send(combinationsTarget, 'keydown', 'b', 'KeyB')
  send(combinationsTarget, 'keyup', 'b', 'KeyB')
  const combinations = snapshot('combinations')
  api.unsubscribe('combinations')

  const codeTarget = makeTarget()
  api.observe('code', 'KeyC', { target: codeTarget })
  send(codeTarget, 'keydown', 'different', 'KeyC')
  send(codeTarget, 'keyup', 'different', 'KeyC')
  const codeMatch = snapshot('code')
  api.unsubscribe('code')

  const keyTarget = makeTarget()
  api.observe('key', 'q', { target: keyTarget })
  send(keyTarget, 'keydown', 'q', 'KeyQ')
  send(keyTarget, 'keyup', 'q', 'KeyQ')
  const keyMatch = snapshot('key')
  api.unsubscribe('key')

  const noPreventTarget = makeTarget()
  api.observe('no-prevent', 'z', {
    target: noPreventTarget,
    preventDefault: false,
  })

  const noPreventDefault = send(
    noPreventTarget,
    'keydown',
    'z',
    'KeyZ'
  ).defaultPrevented

  api.unsubscribe('no-prevent')

  const modifiedInputTarget = makeTarget()
  const modifiedInput = document.createElement('input')
  modifiedInputTarget.append(modifiedInput)
  api.observe('modified-input-without-allowance', 'm', {
    target: modifiedInputTarget,
    actInsideInputWithModifier: false,
  })
  send(modifiedInput, 'keydown', 'm', 'KeyM', { ctrlKey: true })

  const modifiedInputWithoutAllowance = snapshot(
    'modified-input-without-allowance'
  )

  api.unsubscribe('modified-input-without-allowance')

  const buttonTarget = makeTarget()
  const button = document.createElement('button')
  const anchor = document.createElement('a')
  buttonTarget.append(button, anchor)
  api.observe('interactive', 'i', { target: buttonTarget })

  const buttonPreventDefault = send(
    button,
    'keydown',
    'i',
    'KeyI'
  ).defaultPrevented

  send(button, 'keyup', 'i', 'KeyI')

  const anchorPreventDefault = send(
    anchor,
    'keydown',
    'i',
    'KeyI'
  ).defaultPrevented

  api.unsubscribe('interactive')

  const frame = document.createElement('iframe')
  document.body.append(frame)
  const foreignDocument = frame.contentDocument

  if (foreignDocument === null) {
    throw new Error('Could not create the key observer iframe target')
  }

  const foreignAnchor = foreignDocument.createElement('a')
  foreignDocument.body.append(foreignAnchor)
  api.observe('foreign-anchor', 'f', { target: foreignDocument })

  const foreignAnchorPreventDefault = send(
    foreignAnchor,
    'keydown',
    'f',
    'KeyF'
  ).defaultPrevented

  api.unsubscribe('foreign-anchor')
  const foreignInput = foreignDocument.createElement('input')
  foreignDocument.body.append(foreignInput)
  api.observe('foreign-editable', 'e', { target: foreignDocument })
  send(foreignInput, 'keydown', 'e', 'KeyE')
  const foreignEditableSuppression = snapshot('foreign-editable')
  api.unsubscribe('foreign-editable')
  frame.remove()

  const blurTarget = makeTarget()
  api.observe('blur', 'u', { target: blurTarget })
  send(blurTarget, 'keydown', 'u', 'KeyU')
  window.dispatchEvent(new Event('blur'))
  const blurReset = snapshot('blur')
  api.unsubscribe('blur')

  const contextTarget = makeTarget()
  api.observe('context', 'u', { target: contextTarget })
  send(contextTarget, 'keydown', 'u', 'KeyU')
  window.dispatchEvent(new Event('contextmenu'))
  const contextMenuReset = snapshot('context')
  api.unsubscribe('context')

  const metaTarget = makeTarget()
  api.observe('meta', 'Meta+x', { target: metaTarget })
  send(metaTarget, 'keydown', 'Meta', 'MetaLeft', { metaKey: true })
  send(metaTarget, 'keydown', 'x', 'KeyX', { metaKey: true })
  const metaHeldBeforeRelease = snapshot('meta')
  // macOS can omit the non-modifier keyup when Meta is released first.
  send(metaTarget, 'keyup', 'Meta', 'MetaLeft', { metaKey: false })
  const metaCleanup = snapshot('meta')
  api.unsubscribe('meta')

  const unsubscribeTarget = makeTarget()
  api.observe('unsubscribe', 'v', { target: unsubscribeTarget })
  send(unsubscribeTarget, 'keydown', 'v', 'KeyV')
  api.unsubscribe('unsubscribe')
  send(unsubscribeTarget, 'keyup', 'v', 'KeyV')
  send(unsubscribeTarget, 'keydown', 'v', 'KeyV')
  const unsubscribe = snapshot('unsubscribe')

  const ownerTarget = makeTarget()
  api.observe('owner-dispose', 'w', { target: ownerTarget })
  send(ownerTarget, 'keydown', 'w', 'KeyW')
  api.disposeOwner()
  send(ownerTarget, 'keyup', 'w', 'KeyW')
  send(ownerTarget, 'keydown', 'w', 'KeyW')
  const ownerDispose = snapshot('owner-dispose')

  for (const target of [
    explicitTarget,
    defaultTarget,
    combinationsTarget,
    codeTarget,
    keyTarget,
    noPreventTarget,
    modifiedInputTarget,
    buttonTarget,
    blurTarget,
    contextTarget,
    metaTarget,
    unsubscribeTarget,
    ownerTarget,
  ]) {
    target.remove()
  }

  if (explicitSuppressed.length !== 1 || explicitSuppressed[0] !== false) {
    throw new Error(`Explicit target suppression failed: ${explicitSuppressed}`)
  }

  return {
    explicitTarget: explicitStates,
    defaultTarget: defaultStates,
    combinations,
    codeMatch,
    keyMatch,
    noPreventDefault,
    buttonPreventDefault,
    anchorPreventDefault,
    foreignAnchorPreventDefault,
    foreignEditableSuppression,
    modifiedInputWithoutAllowance,
    blurReset,
    contextMenuReset,
    metaCleanup,
    metaHeldBeforeRelease,
    unsubscribe,
    ownerDispose,
  }
}
