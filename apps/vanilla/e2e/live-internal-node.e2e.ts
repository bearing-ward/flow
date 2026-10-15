import { runLiveInternalNodeTests } from '../../shared-e2e/live-internal-node.ts'

runLiveInternalNodeTests(async (page) => {
  await page.goto('/')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('beforeunload')))
  await page.evaluate(async () => {
    const modulePath = '/src/live-internal-node-fixture.ts'
    const { mountLiveInternalFixture } = await import(modulePath)
    const root = document.querySelector<HTMLElement>('#app')

    if (root === null) {
      throw new Error('Missing fixture host')
    }

    mountLiveInternalFixture(root)
  })
})
