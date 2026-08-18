import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'

const DOCS_DIR = path.join(process.cwd(), 'content', 'docs')

export interface DocMeta {
  slug: string
  title: string
  description: string
  section: 'Getting Started' | 'Features'
  order: number
}

export interface Doc extends DocMeta {
  content: string
}

export function getAllDocs(): DocMeta[] {
  const files = readdirSync(DOCS_DIR).filter((file) => file.endsWith('.md'))

  const docs = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const { data } = matter(readFileSync(path.join(DOCS_DIR, file), 'utf8'))
    return {
      slug,
      title: data['title'] as string,
      description: data['description'] as string,
      section: data['section'] as DocMeta['section'],
      order: data['order'] as number,
    }
  })

  return docs.sort((a, b) => a.order - b.order)
}

export function getDoc(slug: string): Doc | null {
  const filePath = path.join(DOCS_DIR, `${slug}.md`)
  let raw: string
  try {
    raw = readFileSync(filePath, 'utf8')
  } catch {
    return null
  }

  const { data, content } = matter(raw)
  return {
    slug,
    title: data['title'] as string,
    description: data['description'] as string,
    section: data['section'] as DocMeta['section'],
    order: data['order'] as number,
    content,
  }
}
