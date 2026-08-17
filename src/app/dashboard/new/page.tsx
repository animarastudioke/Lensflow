import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NewStudioForm } from '@/components/onboarding/NewStudioForm'

export default async function NewStudioPage() {
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio:studios(slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  const studioRaw = membership?.studio as { slug: string } | { slug: string }[] | null | undefined
  const studio = Array.isArray(studioRaw) ? studioRaw[0] : studioRaw

  if (studio?.slug) {
    redirect(`/dashboard/${studio.slug}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <NewStudioForm defaultName={`${user.firstName}'s Studio`.trim()} />
    </div>
  )
}
