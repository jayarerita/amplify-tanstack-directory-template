import { createFileRoute } from '@tanstack/react-router'
import { UserProfile } from '~/components/UserProfile'

export const Route = createFileRoute('/_authed/profile')({
  component: ProfileComponent,
})

function ProfileComponent() {
  return <UserProfile />
}