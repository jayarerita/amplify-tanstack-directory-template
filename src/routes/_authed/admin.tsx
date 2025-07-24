import { createFileRoute, Outlet } from '@tanstack/react-router';
import { ProtectedRoute } from '~/components/ProtectedRoute';

export const Route = createFileRoute('/_authed/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              <nav className="flex space-x-6">
                <a href="/admin" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </a>
                <a href="/admin/listings" className="text-gray-600 hover:text-gray-900">
                  Listings
                </a>
                <a href="/admin/reviews" className="text-gray-600 hover:text-gray-900">
                  Reviews
                </a>
                <a href="/admin/ads" className="text-gray-600 hover:text-gray-900">
                  Ads
                </a>
                <a href="/admin/users" className="text-gray-600 hover:text-gray-900">
                  Users
                </a>
              </nav>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Outlet />
        </div>
      </div>
    </ProtectedRoute>
  );
}