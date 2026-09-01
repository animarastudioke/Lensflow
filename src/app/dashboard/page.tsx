import { redirect } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardRootPage() {
  const user = await getAuthUserServer()

  if (!user) {
    redirect('/auth/login')
  }

  const supabase = await createClient()

  // A user can belong to more than one studio; picking a deterministic one
  // (their oldest/first membership) rather than whatever Postgres happens
  // to return first avoids landing them in a different studio on every
  // visit. This is not a studio switcher -- just removing arbitrariness
  // from the single-studio entry redirect.
  const { data: membership } = await supabase
    .from('studio_members')
    .select('studio:studios(slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const studioRaw = membership?.studio as { slug: string } | { slug: string }[] | null | undefined
  const studio = Array.isArray(studioRaw) ? studioRaw[0] : studioRaw

  if (studio?.slug) {
    redirect(`/dashboard/${studio.slug}`)
  }

  redirect('/dashboard/new')
}
