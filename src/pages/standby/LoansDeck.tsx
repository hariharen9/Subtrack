/**
 * SUBTRACK // LOANS & EMIs STANDBY DECK
 *
 * The Loans & EMIs engine is planned but its core has not shipped. This is the
 * honest telemetry shell awaiting it — principal vs interest decay amortization,
 * debt runway and prepayment simulations, composed from the shared UI.
 */
import { StandbyDeck } from './StandbyDeck'
import { IconDebt } from '@/components/ui/Icons'

export default function LoansDeck() {
  return (
    <StandbyDeck
      code="DEBT"
      label="Loans & EMIs"
      tag="v0.3.0"
      headline="Principal decay, EMI run-rates, payoff simulators."
      manifest="Loans bring a different arithmetic than subscriptions: each EMI splits into principal and interest that decay along an amortization schedule, and every prepayment reshapes the curve. This deck will host the loans you track, their remaining principal vs interest, the amortization curve and payoff-impact simulators."
      instruments={[
        {
          code: 'AMR',
          title: 'Amortization Curve',
          blurb: 'Principal vs interest decay over the loan lifetime — a SpendableSignal trace.',
          icon: <IconDebt size={16} />,
        },
        {
          code: 'RUN',
          title: 'Debt Runway',
          blurb: 'Number of EMIs left and the true capital cost of each remaining payment.',
          icon: <IconDebt size={16} />,
        },
        {
          code: 'PAY',
          title: 'Prepayment Simulator',
          blurb: 'See exact months shaved and interest saved per extra rupee paid.',
          icon: <IconDebt size={16} />,
        },
      ]}
      roadmap={[
        { code: 'DEBT', label: 'Loan Registry', note: 'Loans with principal, rate, tenure and start date.' },
        { code: 'AMR', label: 'Amortization Engine', note: 'Deterministic principal/interest split via anchor math.' },
        { code: 'PAY', label: 'Payoff Simulator', note: 'What-if prepayment and balloon scenarios.' },
      ]}
    />
  )
}