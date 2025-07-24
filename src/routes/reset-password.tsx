import { createFileRoute } from '@tanstack/react-router'
import { PasswordReset } from '~/components/PasswordReset'

export const Route = createFileRoute('/reset-password')({
  component: PasswordResetComponent,
})

function PasswordResetComponent() {
  return <PasswordReset />
}