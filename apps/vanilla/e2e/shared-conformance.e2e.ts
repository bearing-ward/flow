import { expect, test } from "@playwright/test";

import { conformanceFixtures } from "../../../packages/conformance/src/index.ts";
import { createVanillaConformanceAdapter } from "./controller-conformance.ts";

test("vanilla adapter satisfies every shared conformance fixture", async ({ page }) => {
  const adapter = createVanillaConformanceAdapter(page);

  for (const fixture of conformanceFixtures) {
    await test.step(fixture.id, async () => {
      await adapter.mount(fixture);
      for (const id of fixture.expected.preservedIdentityIds ?? []) {
        await adapter.markIdentity(id, "preserved");
      }
      for (const action of fixture.actions) await adapter.perform(action);

      await expect.poll(async () => (await adapter.snapshot()).nodeIds).toEqual(fixture.expected.nodeIds);
      const snapshot = await adapter.snapshot();
      expect(snapshot.nodeIds, fixture.id).toEqual(fixture.expected.nodeIds);
      expect(snapshot.edgeIds, fixture.id).toEqual(fixture.expected.edgeIds);
      expect(snapshot.positions, fixture.id).toEqual(fixture.expected.positions);
      expect(snapshot.identityMarkers, fixture.id).toEqual(fixture.expected.preservedIdentityIds ?? []);
      expect(await adapter.changeKinds(), fixture.id).toEqual(fixture.expected.changeKinds);

      const cleanup = await adapter.destroy();
      expect(cleanup.mountedElements, fixture.id).toBe(0);
      expect(cleanup.changesAfterDestroy, fixture.id).toBe(0);
    });
  }
});
