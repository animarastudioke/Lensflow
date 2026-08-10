import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardRootPage() {
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = createClient()

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

  redirect('/dashboard/new')
}
