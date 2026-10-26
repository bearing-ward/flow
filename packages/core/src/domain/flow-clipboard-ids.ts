/** A caller-owned namespace separates concurrent allocators without changing session IDs. */
export const allocateFlowClipboardId = (
  base: string,
  used: Set<string>,
  namespace?: string
): string => {
  const prefix = namespace === undefined ? base : `${base}-${namespace}`
  let sequence = 1

  while (used.has(`${prefix}-copy-${sequence}`)) {
    sequence += 1
  }

  const id = `${prefix}-copy-${sequence}`
  used.add(id)

  return id
}
