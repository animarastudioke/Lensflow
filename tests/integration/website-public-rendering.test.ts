import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { getPublicWebsitePage } from '@/lib/actions/public-website'

/**
 * Phase 11 Step 11: before this step, no route anywhere in the app rendered
 * a website's saved pages for an unauthenticated visitor, even though the
 * "Public can view published websites" / "...published pages of published
 * websites" RLS policies (baseline schema) already described this data as
 * public. This proves getPublicWebsitePage() -- the resolver behind the new
 * `/portfolio/[subdomain]` route -- actually implements what those policies
 * always intended: published is visible, everything else (draft, archived,
 * unpublished pages, password-protected, nonexistent, wrong-website paths,
 * an unentitled studio) is not.
 */

const RUN_ID = crypto.randomUUID().slice(0, 8)
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY']!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('website-public-rendering.test.ts requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.local).')
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RUN_TAG = `zzz-lensflow-test-pubweb-${RUN_ID}`

let studioId: string
let unentitledStudioId: string
let publishedWebsiteSubdomain: string
let draftWebsiteSubdomain: string
let passwordProtectedSubdomain: string
let unentitledSubdomain: string

beforeAll(async () => {
  const { data: studio } = await admin.from('studios').insert({ name: RUN_TAG, slug: RUN_TAG, owner_id: null }).select('id').single()
  studioId = studio!.id

  const { data: unentitledStudio } = await admin
    .from('studios')
    .insert({ name: `${RUN_TAG}-unent`, slug: `${RUN_TAG}-unent`, owner_id: null })
    .select('id')
    .single()
  unentitledStudioId = unentitledStudio!.id

  const { data: studioPlan } = await admin.from('plans').select('id').eq('slug', 'studio').single()
  await admin.from('subscriptions').insert({ studio_id: studioId, plan_id: studioPlan!.id, status: 'active' })
  // unentitledStudioId deliberately gets no subscription row -> falls back to Free (no website_builder).

  publishedWebsiteSubdomain = `${RUN_TAG}-published`
  const { data: publishedWebsite } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: 'Published Site', subdomain: publishedWebsiteSubdomain, status: 'published', theme: { primaryColor: '#800020' }, seo: { title: 'My Studio', description: 'A test studio' } })
    .select('id')
    .single()
  await admin.from('website_pages').insert([
    { website_id: publishedWebsite!.id, name: 'Home', path: '/', is_published: true, content: { heading: 'Welcome', body: 'Hello world' }, order: 0 },
    { website_id: publishedWebsite!.id, name: 'About', path: '/about', is_published: false, content: { heading: 'About us' }, order: 1 },
  ])

  draftWebsiteSubdomain = `${RUN_TAG}-draft`
  const { data: draftWebsite } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: 'Draft Site', subdomain: draftWebsiteSubdomain, status: 'draft' })
    .select('id')
    .single()
  await admin.from('website_pages').insert({ website_id: draftWebsite!.id, name: 'Home', path: '/', is_published: true, content: {}, order: 0 })

  passwordProtectedSubdomain = `${RUN_TAG}-locked`
  const { data: lockedWebsite } = await admin
    .from('websites')
    .insert({ studio_id: studioId, name: 'Locked Site', subdomain: passwordProtectedSubdomain, status: 'published', password_protected: true })
    .select('id')
    .single()
  await admin.from('website_pages').insert({ website_id: lockedWebsite!.id, name: 'Home', path: '/', is_published: true, content: {}, order: 0 })

  unentitledSubdomain = `${RUN_TAG}-unentitled`
  const { data: unentitledWebsite } = await admin
    .from('websites')
    .insert({ studio_id: unentitledStudioId, name: 'Unentitled Site', subdomain: unentitledSubdomain, status: 'published' })
    .select('id')
    .single()
  await admin.from('website_pages').insert({ website_id: unentitledWebsite!.id, name: 'Home', path: '/', is_published: true, content: {}, order: 0 })
})

afterAll(async () => {
  if (studioId) await admin.from('studios').delete().eq('id', studioId)
  if (unentitledStudioId) await admin.from('studios').delete().eq('id', unentitledStudioId)
})

describe('getPublicWebsitePage: published content is publicly visible', () => {
  it('returns real saved data for a published page of a published website', async () => {
    const result = await getPublicWebsitePage(publishedWebsiteSubdomain, '/')
    expect(result).not.toBeNull()
    expect(result?.page.content.heading).toBe('Welcome')
    expect(result?.page.content.body).toBe('Hello world')
    expect(result?.primaryColor).toBe('#800020')
    expect(result?.seoTitle).toBe('My Studio')
  })

  it('only lists published pages in navigation, not the unpublished About page', async () => {
    const result = await getPublicWebsitePage(publishedWebsiteSubdomain, '/')
    expect(result?.navPages).toEqual([{ name: 'Home', path: '/' }])
  })
})

describe('getPublicWebsitePage: unpublished / protected content is not exposed', () => {
  it('returns null for a page on a draft (unpublished) website even if the page itself is is_published=true', async () => {
    const result = await getPublicWebsitePage(draftWebsiteSubdomain, '/')
    expect(result).toBeNull()
  })

  it('returns null for an unpublished page of an otherwise published website', async () => {
    const result = await getPublicWebsitePage(publishedWebsiteSubdomain, '/about')
    expect(result).toBeNull()
  })

  it('returns null for a password_protected website even though it is published (no real password verification exists yet)', async () => {
    const result = await getPublicWebsitePage(passwordProtectedSubdomain, '/')
    expect(result).toBeNull()
  })

  it('returns null when the owning studio is not entitled to the website builder (e.g. downgraded after publishing)', async () => {
    const result = await getPublicWebsitePage(unentitledSubdomain, '/')
    expect(result).toBeNull()
  })
})

describe('getPublicWebsitePage: not-found behavior', () => {
  it('returns null for a nonexistent subdomain', async () => {
    const result = await getPublicWebsitePage(`${RUN_TAG}-does-not-exist`, '/')
    expect(result).toBeNull()
  })

  it('returns null for a nonexistent page path on a real published website', async () => {
    const result = await getPublicWebsitePage(publishedWebsiteSubdomain, '/does-not-exist')
    expect(result).toBeNull()
  })
})
