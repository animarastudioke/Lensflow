import { redirect } from 'next/navigation'

interface LegacyPageEditorRedirectProps {
  params: Promise<{ studioSlug: string; websiteId: string; pageId: string }>
}

// The per-page editor was folded into the single-screen builder. This route
// stays so bookmarks and old links open the same page in the new editor;
// the builder ignores an id that is not one of this website's pages.
export default async function LegacyPageEditorRedirect({ params }: LegacyPageEditorRedirectProps) {
  const { studioSlug, websiteId, pageId } = await params
  redirect(`/dashboard/${studioSlug}/website/${websiteId}/editor?page=${encodeURIComponent(pageId)}`)
}
