import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ProtectedRoute } from '~/components/ProtectedRoute'

export const Route = createFileRoute('/_authed')({
  component: AuthGuard,
})

function AuthGuard() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  )
}
