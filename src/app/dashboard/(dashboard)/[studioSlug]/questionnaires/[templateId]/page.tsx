import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getAuthUserServer } from '@/lib/auth'
import { getTemplate, getResponses } from '@/lib/actions/questionnaires'
import { getClients } from '@/lib/actions/clients'
import { TemplateBuilder } from '@/components/questionnaires/TemplateBuilder'

interface TemplatePageProps {
  params: Promise<{ studioSlug: string; templateId: string }>
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { studioSlug } = await params
  return {
    title: `Questionnaire - ${studioSlug}`,
    description: 'Edit questionnaire fields and view responses',
  }
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { studioSlug, templateId } = await params
  const user = await getAuthUserServer()

  if (!user) {
    return null
  }

  const template = await getTemplate(studioSlug, templateId)
  if (!template) {
    notFound()
  }

  const [responses, { clients }] = await Promise.all([
    getResponses(studioSlug, templateId),
    getClients(studioSlug),
  ])

  return (
    <TemplateBuilder
      studioSlug={studioSlug}
      template={template}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      initialResponses={responses}
    />
  )
}
