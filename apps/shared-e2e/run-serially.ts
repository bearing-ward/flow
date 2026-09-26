/** Run stateful browser actions one at a time while preserving rejection order. */
export const runSerially = async <Item>(
  items: readonly Item[],
  operation: (item: Item) => Promise<void>
): Promise<void> => {
  const iterator = items.values()

  const runNext = async (): Promise<void> => {
    const next = iterator.next()

    if (next.done) {
      return
    }

    await operation(next.value)

    return runNext()
  }

  await runNext()
}
