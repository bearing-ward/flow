import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const markupReferences = (source: string): string[] => {
  const references: string[] = []

  for (const match of source.matchAll(
    /\b(?:href|src|poster)=["'](?<url>[^"']+)["']/gu
  )) {
    references.push(match.groups?.url ?? '')
  }

  for (const match of source.matchAll(/\bsrcset=["'](?<set>[^"']+)["']/gu)) {
    for (const candidate of (match.groups?.set ?? '').split(',')) {
      references.push(candidate.trim().split(/\s/u)[0] ?? '')
    }
  }

  return references
}

const siteReferences = (file: string, source: string): string[] => {
  const references: string[] = []

  if (file.endsWith('.html') || file.endsWith('.svg')) {
    references.push(...markupReferences(source))
  }

  if (file.endsWith('.js')) {
    const transpiler = new Bun.Transpiler({ loader: 'js' })

    for (const entry of transpiler.scanImports(source)) {
      references.push(entry.path)
    }

    for (const match of source.matchAll(
      /new URL\(\s*["'](?<url>[^"']+)["']/gu
    )) {
      references.push(match.groups?.url ?? '')
    }
  } else {
    for (const match of source.matchAll(
      /url\(\s*["']?(?<url>[^\s)"']+)["']?\s*\)|@import\s+["'](?<import>[^"']+)["']/gu
    )) {
      const reference = match.groups?.url ?? match.groups?.import ?? ''

      if (!reference.startsWith('#')) {
        references.push(reference)
      }
    }
  }

  return references
}

export const checkSiteLinks = (directory: string): void => {
  const origin = 'https://flow.invalid'
  const base = '/flow/'
  const failures: string[] = []

  const files = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  }).flatMap((entry) =>
    entry.isFile() ? [path.join(entry.parentPath, entry.name)] : []
  )

  const check = (file: string, reference: string) => {
    if (/^(?:data:|blob:|mailto:|tel:)/u.test(reference)) {
      return
    }

    const source = new URL(`${base}${path.relative(directory, file)}`, origin)
    const target = new URL(reference.replaceAll('&amp;', '&'), source)

    if (target.origin !== origin) {
      return
    }

    if (!target.pathname.startsWith(base)) {
      failures.push(`${file}: escapes /flow/: ${reference}`)

      return
    }

    const pathname = decodeURIComponent(target.pathname.slice(base.length))
    let destination = path.resolve(directory, pathname)

    if (existsSync(destination) && statSync(destination).isDirectory()) {
      destination = path.join(destination, 'index.html')
    }

    if (!existsSync(destination)) {
      failures.push(`${file}: missing ${reference}`)
    } else if (target.hash.length > 1 && destination.endsWith('.html')) {
      const fragment = decodeURIComponent(target.hash.slice(1))
      const html = readFileSync(destination, 'utf-8')

      if (
        ![...html.matchAll(/\bid=["'](?<id>[^"']+)["']/gu)].some(
          (match) => match.groups?.id === fragment
        )
      ) {
        failures.push(`${file}: missing fragment ${reference}`)
      }
    }
  }

  for (const file of files) {
    if (!/\.(?:html|css|js|svg)$/u.test(file)) {
      continue
    }

    for (const reference of siteReferences(file, readFileSync(file, 'utf-8'))) {
      check(file, reference)
    }
  }

  if (failures.length > 0) {
    throw new Error(`Broken site links:\n${failures.join('\n')}`)
  }

  console.log(`Checked local links and assets in ${files.length} site files`)
}
