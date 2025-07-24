import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../../amplify/data/resource';
import { useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { AdDimensions, AdPlacements } from '../../../components/AdBanner';

const client = generateClient<Schema>();

export const Route = createFileRoute('/_authed/admin/ads')({
  component: AdManagement,
});

interface Ad {
  id: string;
  imageUrl: string;
  targetUrl: string;
  dimensions: string;
  placement: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

function AdManagement() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const { data } = await client.models.Ad.list();
      return data as Ad[];
    },
  });

  const createAdMutation = useMutation({
    mutationFn: async (adData: Omit<Ad, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks'>) => {
      const { data } = await client.models.Ad.create(adData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setShowCreateForm(false);
    },
  });

  const updateAdMutation = useMutation({
    mutationFn: async ({ id, ...adData }: Partial<Ad> & { id: string }) => {
      const { data } = await client.models.Ad.update({ id, ...adData });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
      setEditingAd(null);
    },
  });

  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      await client.models.Ad.delete({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
    },
  });

  const toggleAdStatus = (ad: Ad) => {
    updateAdMutation.mutate({
      id: ad.id,
      isActive: !ad.isActive,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00%';
    return ((clicks / impressions) * 100).toFixed(2) + '%';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ad Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Ad
        </button>
      </div>

      {/* Ad Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium">Total Ads</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{ads?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-600" />
            <h3 className="font-medium">Active Ads</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {ads?.filter(ad => ad.isActive).length || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium">Total Impressions</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {ads?.reduce((sum, ad) => sum + (ad.impressions || 0), 0) || 0}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h3 className="font-medium">Total Clicks</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {ads?.reduce((sum, ad) => sum + (ad.clicks || 0), 0) || 0}
          </p>
        </div>
      </div>

      {/* Ads Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Preview</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Placement</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Dimensions</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Duration</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Performance</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ads?.map((ad) => (
                <tr key={ad.id}>
                  <td className="px-4 py-3">
                    <img
                      src={ad.imageUrl}
                      alt="Ad preview"
                      className="w-16 h-10 object-cover rounded border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{ad.placement}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{ad.dimensions}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>
                      <div>Start: {formatDate(ad.startDate)}</div>
                      <div>End: {formatDate(ad.endDate)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>
                      <div>Impressions: {ad.impressions || 0}</div>
                      <div>Clicks: {ad.clicks || 0}</div>
                      <div>CTR: {calculateCTR(ad.clicks || 0, ad.impressions || 0)}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdStatus(ad)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                        ad.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ad.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingAd(ad)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this ad?')) {
                            deleteAdMutation.mutate(ad.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Ad Modal */}
      {(showCreateForm || editingAd) && (
        <AdForm
          ad={editingAd}
          onSubmit={(adData) => {
            if (editingAd) {
              updateAdMutation.mutate({ id: editingAd.id, ...adData });
            } else {
              createAdMutation.mutate(adData);
            }
          }}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingAd(null);
          }}
          isLoading={createAdMutation.isPending || updateAdMutation.isPending}
        />
      )}
    </div>
  );
}

interface AdFormProps {
  ad?: Ad | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AdForm({ ad, onSubmit, onCancel, isLoading }: AdFormProps) {
  const [formData, setFormData] = useState({
    imageUrl: ad?.imageUrl || '',
    targetUrl: ad?.targetUrl || '',
    dimensions: ad?.dimensions || AdDimensions.RECTANGLE,
    placement: ad?.placement || AdPlacements.HOMEPAGE_TOP,
    startDate: ad?.startDate ? ad.startDate.split('T')[0] : '',
    endDate: ad?.endDate ? ad.endDate.split('T')[0] : '',
    isActive: ad?.isActive ?? true,
    ownerId: ad?.ownerId || 'admin',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {ad ? 'Edit Ad' : 'Create New Ad'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target URL
            </label>
            <input
              type="url"
              value={formData.targetUrl}
              onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dimensions
            </label>
            <select
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(AdDimensions).map(([key, value]) => (
                <option key={key} value={value}>
                  {key.replace(/_/g, ' ')} ({value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placement
            </label>
            <select
              value={formData.placement}
              onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(AdPlacements).map(([key, value]) => (
                <option key={key} value={value}>
                  {key.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : ad ? 'Update Ad' : 'Create Ad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}