/**
 * SUBTRACK // DAILY SPENDS STANDBY DECK
 *
 * The Daily Spends engine is planned but its core has not shipped. This is the
 * honest telemetry shell awaiting it — micro-transaction ingestion, discretionary
 * burn velocity and weekly limiters, composed from the shared UI.
 */
import { StandbyDeck } from './StandbyDeck'
import { IconSpends } from '@/components/ui/Icons'

export default function SpendsDeck() {
  return (
    <StandbyDeck
      code="SPND"
      label="Daily Spends"
      tag="v0.4.0"
      headline="Discretionary velocity, weekly burn limiters, live ledger."
      manifest="Daily spends are variable cash — a different creature from the recurring engines. This deck will hold a real-time transaction ingestion ledger with instant category auto-assignment, a velocity readout of discretionary burn, and weekly limit checks so variable spend stays inside its envelope."
      instruments={[
        {
          code: 'LDG',
          title: 'Transaction Ledger',
          blurb: 'Manual/file ingestion with instant category auto-assignment.',
          icon: <IconSpends size={16} />,
        },
        {
          code: 'VEL',
          title: 'Velocity',
          blurb: 'Variable expenditure rate vs the day/week envelope — signed live.',
          icon: <IconSpends size={16} />,
        },
        {
          code: 'LMT',
          title: 'Weekly Limiters',
          blurb: 'Discretionary cap tracking across food, fuel, tech and lifestyle.',
          icon: <IconSpends size={16} />,
        },
      ]}
      roadmap={[
        { code: 'SPND', label: 'Ingestion Ledger', note: 'Record spends with category inference.' },
        { code: 'VEL', label: 'Velocity Engine', note: 'Daily/weekly burn vs discretionary envelope.' },
        { code: 'LMT', label: 'Limiters & Alerts', note: 'Alert before the discretionary cap breaks.' },
      ]}
    />
  )
}