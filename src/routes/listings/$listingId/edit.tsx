import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { listingOperations } from '~/lib/data';
import { useAuth } from '~/hooks/useAuth';
import { useFileUpload } from '~/hooks/useFileUpload';
import { validateListingInput, transformListingInput, canUserEditListing } from '~/utils/listing';
import type { UpdateListingInput, HoursOfOperation, PricingRange } from '~/types';

export const Route = createFileRoute('/listings/$listingId/edit')({
  component: EditListingPage,
  beforeLoad: ({ context }) => {
    // Redirect to login if not authenticated
    if (!context.auth?.user) {
      throw new Error('Authentication required');
    }
  },
});

const DEFAULT_HOURS: HoursOfOperation = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '', close: '', closed: true },
};

function EditListingPage() {
  const { listingId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { uploadFile, isUploading, uploadError } = useFileUpload();

  const { data: listingResponse, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingOperations.get(listingId),
  });

  const listing = listingResponse?.data;

  // Initialize form data from existing listing
  const [formData, setFormData] = useState<UpdateListingInput>(() => {
    if (!listing) return {};
    
    return {
      name: listing.name,
      description: listing.description,
      street: listing.street,
      city: listing.city,
      state: listing.state,
      zipCode: listing.zipCode,
      country: listing.country,
      latitude: listing.latitude,
      longitude: listing.longitude,
      phone: listing.phone || '',
      email: listing.email || '',
      website: listing.website || '',
      facebook: listing.facebook || '',
      twitter: listing.twitter || '',
      instagram: listing.instagram || '',
      linkedin: listing.linkedin || '',
      images: listing.images || [],
      hoursOfOperation: listing.hoursOfOperation || DEFAULT_HOURS,
      pricingRange: listing.pricingRange,
      categories: listing.categories || [],
      tags: listing.tags || [],
      features: listing.features || [],
      amenities: listing.amenities || [],
    };
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const updateListingMutation = useMutation({
    mutationFn: (input: UpdateListingInput) => 
      listingOperations.update(listingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      setHasChanges(false);
      alert('Listing updated successfully!');
      navigate({ to: '/listings/$listingId', params: { listingId } });
    },
    onError: (error) => {
      console.error('Error updating listing:', error);
      alert('Error updating listing. Please try again.');
    },
  });

  const handleInputChange = useCallback((field: keyof UpdateListingInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  }, [errors.length]);

  const handleImageUpload = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(file => 
      uploadFile(file, 'listings')
    );
    
    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...validUrls]
      }));
      setHasChanges(true);
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images. Please try again.');
    }
  }, [uploadFile]);

  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }));
    setHasChanges(true);
  }, []);

  const handleArrayInput = (field: keyof UpdateListingInput, value: string) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    handleInputChange(field, items);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const validationErrors: string[] = [];
    if (!formData.name?.trim()) validationErrors.push('Name is required');
    if (!formData.description?.trim()) validationErrors.push('Description is required');
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    updateListingMutation.mutate(formData);
  };

  // Check if user can edit this listing
  if (listing && !canUserEditListing(listing, user?.id)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-8">
            You don't have permission to edit this listing.
          </p>
          <button
            onClick={() => navigate({ to: '/listings/$listingId', params: { listingId } })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Listing
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Listing</h1>
          <button
            onClick={() => navigate({ to: '/listings/$listingId', params: { listingId } })}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {hasChanges && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                You have unsaved changes. Don't forget to save your updates!
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your business name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description *
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your business, services, and what makes you unique..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pricing Range
                  </label>
                  <select
                    value={formData.pricingRange || ''}
                    onChange={(e) => handleInputChange('pricingRange', e.target.value as PricingRange)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select pricing range</option>
                    <option value="BUDGET">Budget ($)</option>
                    <option value="MODERATE">Moderate ($$)</option>
                    <option value="EXPENSIVE">Expensive ($$$)</option>
                    <option value="LUXURY">Luxury ($$$$)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location & Contact */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location & Contact</h2>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={formData.street || ''}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode || ''}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="USA"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="contact@business.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.yourbusiness.com"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer ${isUploading ? 'opacity-50' : ''}`}
                >
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Click to upload images
                      </span>
                      {' '}or drag and drop
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                  </div>
                </label>
              </div>

              {isUploading && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading images...
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              {/* Image Preview Grid */}
              {formData.images && formData.images.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Current Images</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Business image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Main
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Categories & Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories & Details</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <input
                    type="text"
                    value={formData.categories?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('categories', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Restaurant, Italian, Fine Dining (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('tags', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., family-friendly, outdoor-seating, takeout (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Features
                  </label>
                  <input
                    type="text"
                    value={formData.features?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('features', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., WiFi, Parking, Wheelchair Accessible (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amenities
                  </label>
                  <input
                    type="text"
                    value={formData.amenities?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('amenities', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Air Conditioning, Pet Friendly, Credit Cards Accepted (comma-separated)"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate({ to: '/listings/$listingId', params: { listingId } })}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateListingMutation.isPending || !hasChanges}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateListingMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}