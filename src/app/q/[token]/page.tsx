import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicQuestionnaire } from '@/lib/actions/questionnaires'
import { QuestionnaireForm } from './QuestionnaireForm'

interface Props {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const questionnaire = await getPublicQuestionnaire(token)

  if (!questionnaire) {
    return { title: 'Questionnaire Not Found' }
  }

  return {
    title: `${questionnaire.templateName} - ${questionnaire.studioName}`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicQuestionnairePage({ params }: Props) {
  const { token } = await params
  const questionnaire = await getPublicQuestionnaire(token)

  if (!questionnaire) {
    notFound()
  }

  return <QuestionnaireForm token={token} questionnaire={questionnaire} />
}
