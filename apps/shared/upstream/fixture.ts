export const prepareUpstreamRoot = (): HTMLElement => {
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error('Missing upstream fixture root')
  }

  root.replaceChildren()
  const style = document.createElement('style')
  style.textContent =
    '* {box-sizing:border-box} html,body,#app { margin:0; width:100%; height:100%; } #app {position:relative} .flow-foldkit-root {width:100%;height:100%} .flow-foldkit-canvas {position:relative;width:100%;height:100%;overflow:hidden;touch-action:none} .custom-drag-handle { display:inline-block;width:25px;height:25px;background:green; } .upstream-drag-content { width:100px;height:50px;background:red;display:flex;align-items:center;justify-content:center; }'
  document.head.append(style)

  return root
}

export const colorModeSelect = (
  root: HTMLElement,
  update: (mode: 'light' | 'dark' | 'system') => void
): void => {
  const select = document.createElement('select')
  select.dataset.testid = 'colormode-select'
  select.style.cssText =
    'position:absolute;right:10px;top:10px;z-index:10000000'

  for (const mode of ['light', 'dark', 'system']) {
    const option = document.createElement('option')
    option.value = mode
    option.textContent = mode
    select.append(option)
  }

  select.addEventListener('change', () => {
    if (
      select.value === 'light' ||
      select.value === 'dark' ||
      select.value === 'system'
    ) {
      update(select.value)
    }
  })
  root.append(select)
}

export const toolbarContent = (): HTMLElement => {
  const content = document.createElement('div')

  for (const label of ['delete', 'copy', 'expand']) {
    const button = document.createElement('button')
    button.textContent = label
    content.append(button)
  }

  return content
}

interface ToolbarVisibility {
  readonly isVisible?: boolean
}

export const toolbarVisibility = (
  visible: boolean | undefined
): ToolbarVisibility => (visible === undefined ? {} : { isVisible: visible })
