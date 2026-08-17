import { readFileSync, readdirSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  pillar: string
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

export function getAllBlogPosts(): BlogPostMeta[] {
  const files = readdirSync(BLOG_DIR).filter((file) => file.endsWith('.md'))

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, '')
    const { data } = matter(readFileSync(path.join(BLOG_DIR, file), 'utf8'))
    return {
      slug,
      title: data['title'] as string,
      description: data['description'] as string,
      date: data['date'] as string,
      pillar: data['pillar'] as string,
    }
  })

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getBlogPost(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.md`)
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
    date: data['date'] as string,
    pillar: data['pillar'] as string,
    content,
  }
}
