import { Metadata } from 'next'
import { getAuthUserServer } from '@/lib/auth'
import { getTemplates } from '@/lib/actions/questionnaires'
import { QuestionnaireList } from '@/components/questionnaires/QuestionnaireList'

interface QuestionnairesPageProps {
  params: Promise<{ studioSlug: string }>
}

export async function generateMetadata({
  params,
}: QuestionnairesPageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Questionnaires - ${studioSlug}`,
    description: 'Build client intake forms and collect responses',
  }
}

export default async function QuestionnairesPage({ params }: QuestionnairesPageProps) {
  const { studioSlug } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const templates = await getTemplates(studioSlug)

  return <QuestionnaireList studioSlug={studioSlug} initialTemplates={templates} />
}
