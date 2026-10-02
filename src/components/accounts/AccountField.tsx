/**
 * SPENDSTATE // ACCOUNT FIELD
 *
 * The account picker shared by every composer — subscriptions, spends, income,
 * loans and cards all post into an account. Optional: a record with no account
 * simply isn't attributed to one.
 */
import { useAccounts } from '@/hooks/useAccounts'
import { FieldShell, CyberSelect } from '@/components/ui/Controls'

export function AccountField({
  value,
  onChange,
  label = 'ACCOUNT',
  code = 'POSTS TO',
}: {
  value: string | undefined
  onChange: (id: string) => void
  label?: string
  code?: string
}) {
  const accounts = useAccounts()
  const options = [
    { value: '', label: '— None —' },
    ...accounts
      .filter((a) => a.status === 'active')
      .map((a) => ({ value: a.id, label: `${a.name} · ${a.institution || a.type}` })),
  ]
  return (
    <FieldShell label={label} code={code}>
      <CyberSelect ariaLabel={label} value={value ?? ''} onChange={onChange} options={options} />
    </FieldShell>
  )
}
