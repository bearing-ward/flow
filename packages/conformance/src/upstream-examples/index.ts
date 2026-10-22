import basic from './basic.ts'
import draghandle from './draghandle.ts'
import empty from './empty.ts'
import figma from './figma.ts'
import hidden from './hidden.ts'
import interaction from './interaction.ts'

export type { ExampleConfig } from './model.ts'

const examples = new Map([
  ['basic', basic],
  ['draghandle', draghandle],
  ['empty', empty],
  ['figma', figma],
  ['hidden', hidden],
  ['interaction', interaction],
])

export const upstreamExampleConfig = (name: string) => {
  const config = examples.get(name)

  if (config === undefined) {
    throw new Error(`Unknown upstream example: ${name}`)
  }

  return config
}
