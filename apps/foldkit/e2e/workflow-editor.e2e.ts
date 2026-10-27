import { expect, test as it } from '@playwright/test'

import { workflowEditorAcceptance } from '../../shared/workflow/editor-acceptance.ts'

workflowEditorAcceptance('foldkit')

const { describe } = it

describe('Foldkit workflow layout render readiness', () => {
  it('reports completion only after the accepted fitted viewport reaches the DOM', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const { setProperty: nativeSetProperty } = CSSStyleDeclaration.prototype
      let held: (() => void) | undefined

      CSSStyleDeclaration.prototype.setProperty = function setProperty(
        property,
        value,
        priority
      ) {
        if (
          property === 'transform' &&
          document.documentElement.dataset.holdWorkflowFit === 'true' &&
          document.querySelector<HTMLElement>('.flow-foldkit-viewport')
            ?.style === this
        ) {
          held = () => nativeSetProperty.call(this, property, value, priority)
          document.documentElement.dataset.workflowFitHeld = 'true'

          return
        }

        nativeSetProperty.call(this, property, value, priority)
      }

      document.addEventListener('release-workflow-fit', () => {
        delete document.documentElement.dataset.holdWorkflowFit
        held?.()
        CSSStyleDeclaration.prototype.setProperty = nativeSetProperty
      })
    })
    await page.goto('/workflow/')
    await page
      .getByRole('button', { name: 'Load base workflow', exact: true })
      .click()
    await expect(page.locator('[data-testid="flow-node"]')).toHaveCount(5)
    await page.evaluate(() => {
      document.documentElement.dataset.holdWorkflowFit = 'true'
    })
    await page
      .getByRole('button', { name: 'Layout and fit', exact: true })
      .click()
    await expect(page.locator('html')).toHaveAttribute(
      'data-workflow-fit-held',
      'true'
    )
    await expect(page.getByLabel('Layout status', { exact: true })).toHaveText(
      'ELK layout running'
    )
    await page.evaluate(() =>
      document.dispatchEvent(new Event('release-workflow-fit'))
    )
    await expect(page.getByLabel('Layout status', { exact: true })).toHaveText(
      'ELK layout complete'
    )
  })
})
