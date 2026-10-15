import { LEGAL_ENTITY } from '@/lib/constants'

// Server-rendered on purpose: the operator statement must be present in the
// static HTML so a reviewer (or crawler) fetching the page sees it without
// running any JavaScript.

/** "LensFlow is operated by Animara Studio (Business Name Registration No. …), a sole proprietorship registered in Kenya." */
export function OperatorStatement() {
  return (
    <>
      LensFlow is operated by {LEGAL_ENTITY.NAME} (Business Name Registration No.{' '}
      {/* nowrap, not a non-breaking hyphen: the number must stay exact, searchable text. */}
      <span className="whitespace-nowrap">{LEGAL_ENTITY.REGISTRATION_NUMBER}</span>), a sole proprietorship
      registered in Kenya.
    </>
  )
}

/** Postal address line for the legal entity. */
export function OperatorAddress() {
  return (
    <>
      {LEGAL_ENTITY.NAME}, {LEGAL_ENTITY.POSTAL_ADDRESS}
    </>
  )
}
