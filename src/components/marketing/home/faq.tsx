import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { FAQ_ITEMS } from '@/lib/constants/homepage'
import { ScrollReveal } from './lib/scroll-reveal'

export function Faq() {
  return (
    <section className="page-section bg-background">
      <div className="container-wide">
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="label-caption text-primary">FAQ</span>
            <h2 className="mt-3 text-balance font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Frequently asked questions
            </h2>
          </div>
        </ScrollReveal>

        <Accordion type="single" collapsible className="mx-auto mt-12 max-w-2xl">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="w-full py-5 text-left text-base font-medium text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
