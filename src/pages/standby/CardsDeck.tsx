/**
 * SUBTRACK // CREDIT CARDS STANDBY DECK
 *
 * The Credit Cards engine is planned but its core has not shipped. This is the
 * honest telemetry shell awaiting it — statement cut-off mapping, 45-day grace
 * countdowns and aggregate limit utilisation, all composed from the shared UI.
 */
import { StandbyDeck } from './StandbyDeck'
import { IconCreditCard } from '@/components/ui/Icons'

export default function CardsDeck() {
  return (
    <StandbyDeck
      code="CRD"
      label="Credit Cards"
      tag="v0.2.0"
      headline="Statement cut-offs, grace countdowns, utilisation."
      manifest="Cards are their own financial engine: each card runs a statement cut-off to due-date cycle, carries a rolling 45-day zero-interest grace window, and plays against an aggregate credit limit. This deck will surface the cards you track, their next statement cut, days left in grace, and how much of the total limit is in play — straight from the local volume."
      instruments={[
        {
          code: 'STM',
          title: 'Statement Matrix',
          blurb: 'Statement cut-off and due dates per card, mapped on the shared calendar engine.',
          icon: <IconCreditCard size={16} />,
        },
        {
          code: 'GRC',
          title: 'Grace Countdown',
          blurb: 'Days until zero-interest window closes on each outstanding balance.',
          icon: <IconCreditCard size={16} />,
        },
        {
          code: 'UTL',
          title: 'Limit Utilisation',
          blurb: 'Aggregate credit limit vs outstanding — RadialGauge across every card.',
          icon: <IconCreditCard size={16} />,
        },
        {
          code: 'OPT',
          title: 'Settlement Order',
          blurb: 'Optimal payment ordering to eliminate interest charges entirely.',
          icon: <IconCreditCard size={16} />,
        },
      ]}
      roadmap={[
        { code: 'CRD', label: 'Card Registry', note: 'Add, edit and archive credit cards with limits and billing cycle.' },
        { code: 'STM', label: 'Statement Engine', note: 'Cut-off → due-date cycle derivation and grace tracking.' },
        { code: 'UTL', label: 'Utilisation Telemetry', note: 'Limit vs outstanding gauges and alerting before over-limit.' },
      ]}
    />
  )
}