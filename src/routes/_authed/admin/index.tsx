import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listingOperations } from '~/lib/data';
import { formatAddress } from '~/utils/listing';

export const Route = createFileRoute('/_authed/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'pending'>('overview');
  const queryClient = useQueryClient();

  // Query for pending listings using the new GSI
  const { data: pendingListings, isLoading: loadingPending } = useQuery({
    queryKey: ['listings', 'status', 'PENDING'],
    queryFn: () => listingOperations.listByStatus('PENDING', 20),
  });

  // Query for published listings count
  const { data: publishedListings } = useQuery({
    queryKey: ['listings', 'status', 'PUBLISHED'],
    queryFn: () => listingOperations.listByStatus('PUBLISHED', 5),
  });

  // Mutation to approve a listing
  const approveMutation = useMutation({
    mutationFn: (listingId: string) => 
      listingOperations.update(listingId, { status: 'PUBLISHED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });

  // Mutation to reject a listing
  const rejectMutation = useMutation({
    mutationFn: (listingId: string) => 
      listingOperations.update(listingId, { status: 'ARCHIVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });

  const handleApprove = (listingId: string) => {
    if (confirm('Are you sure you want to approve this listing?')) {
      approveMutation.mutate(listingId);
    }
  };

  const handleReject = (listingId: string) => {
    if (confirm('Are you sure you want to reject this listing?')) {
      rejectMutation.mutate(listingId);
    }
  };

  const pendingCount = pendingListings?.data?.length || 0;
  const publishedCount = publishedListings?.data?.length || 0;

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Listings ({pendingCount})
          </button>
        </nav>
      </div>

      {selectedTab === 'overview' && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Published Listings</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{publishedCount}</p>
              <p className="text-sm text-gray-600 mt-1">Live on site</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Pending Reviews</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
              <p className="text-sm text-gray-600 mt-1">Awaiting moderation</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">0</p>
              <p className="text-sm text-gray-600 mt-1">+0 this month</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">Revenue</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">$0</p>
              <p className="text-sm text-gray-600 mt-1">This month</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {pendingCount > 0 ? (
                  <p className="text-gray-600">{pendingCount} listings awaiting review</p>
                ) : (
                  <p className="text-gray-600">No recent activity</p>
                )}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setSelectedTab('pending')}
                  className="w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
                >
                  Review Pending Listings ({pendingCount})
                </button>
                <Link 
                  to="/admin/moderation"
                  className="block w-full text-left px-4 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100"
                >
                  Content Moderation Queue
                </Link>
                <button className="w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100">
                  Manage Advertisements
                </button>
                <button className="w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100">
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'pending' && (
        <div>
          <h2 className="text-2xl font-bold mb-6">Pending Listings</h2>
          
          {loadingPending ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading pending listings...</p>
            </div>
          ) : pendingCount === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-600">No pending listings to review.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingListings?.data?.map((listing: any) => (
                <div key={listing.id} className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {listing.name}
                      </h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {listing.description}
                      </p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <p>📍 {formatAddress(listing)}</p>
                        {listing.phone && <p>📞 {listing.phone}</p>}
                        {listing.email && <p>✉️ {listing.email}</p>}
                        {listing.website && <p>🌐 {listing.website}</p>}
                        {listing.categories && listing.categories.length > 0 && (
                          <p>🏷️ {listing.categories.join(', ')}</p>
                        )}
                        <p>📅 Submitted: {new Date(listing.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="ml-6 flex flex-col space-y-2">
                      <button
                        onClick={() => handleApprove(listing.id)}
                        disabled={approveMutation.isPending}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(listing.id)}
                        disabled={rejectMutation.isPending}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}