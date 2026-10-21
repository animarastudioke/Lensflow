import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FAQ_ITEMS } from '@/lib/constants/homepage'
import { SectionHead } from './lib/section-head'

export function Faq() {
  return (
    <section className="page-section">
      <div className="container-wide">
        <SectionHead title="Frequently asked questions" caption="FAQ" />

        <Accordion type="single" collapsible className="mt-2 max-w-3xl">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="focus-ring w-full py-5 text-left font-display text-heading-md font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-body-sm text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
