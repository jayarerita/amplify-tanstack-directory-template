import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listingOperations } from '~/lib/data';
import { useAuth } from '~/hooks/useAuth';
import { formatAddress, isListingClaimable, canUserEditListing } from '~/utils/listing';
import { formatDate } from '~/utils/formatting';
import { VersionHistory } from '~/components/VersionHistory';
import { seo, generateListingSEO } from '~/utils/seo';
import { generateLocalBusinessSchema, injectStructuredData, generateBreadcrumbSchema } from '~/utils/structured-data';
import type { Listing } from '~/types';

export const Route = createFileRoute('/listings/$listingId')({
  component: ListingDetailPage,
  loader: async ({ params }) => {
    // Pre-fetch listing data for SSR
    const listing = await listingOperations.get(params.listingId);
    return { listing };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.listing?.data) {
      return {
        meta: [
          { title: 'Listing Not Found | Local Business Directory' },
          { name: 'description', content: 'The listing you are looking for could not be found.' },
          { name: 'robots', content: 'noindex, nofollow' },
        ],
      };
    }

    const listing = loaderData.listing.data as Listing;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
    
    // Generate SEO metadata
    const seoConfig = generateListingSEO(listing, baseUrl);
    const seoTags = seo(seoConfig);

    // Generate structured data
    const businessSchema = generateLocalBusinessSchema(listing, [], baseUrl);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Listings', url: '/listings' },
      { name: listing.name, url: `/listings/${listing.slug || listing.id}` },
    ], baseUrl);

    return {
      meta: seoTags,
      scripts: [
        injectStructuredData(businessSchema),
        injectStructuredData(breadcrumbSchema),
      ],
    };
  },
});

function ListingDetailPage() {
  const { listingId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const { data: listingResponse, isLoading, error } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: () => listingOperations.get(listingId),
    initialData: Route.useLoaderData().listing,
  });

  const claimListingMutation = useMutation({
    mutationFn: (verificationData?: any) => 
      listingOperations.claim(listingId, verificationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      setShowClaimModal(false);
      alert('Listing claimed successfully! You can now manage this listing.');
    },
    onError: (error) => {
      console.error('Error claiming listing:', error);
      alert('Error claiming listing. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !listingResponse?.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing Not Found</h1>
          <p className="text-gray-600 mb-8">
            The listing you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/listings"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse All Listings
          </Link>
        </div>
      </div>
    );
  }

  const listing = listingResponse.data as Listing;
  const canClaim = isListingClaimable(listing);
  const canEdit = canUserEditListing(listing, user?.id);

  const handleClaimListing = () => {
    if (!user) {
      navigate({ to: '/login' });
      return;
    }
    setShowClaimModal(true);
  };

  const confirmClaim = () => {
    claimListingMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Image Gallery */}
        <ImageGallery 
          images={listing.images || []}
          businessName={listing.name}
          selectedIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
        />

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mt-8">
          <div className="p-8">
            {/* Header with Actions */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{listing.name}</h1>
                  {listing.isSponsored && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                      Sponsored
                    </span>
                  )}
                  {listing.status === 'PENDING' && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                      Pending Review
                    </span>
                  )}
                </div>
                
                {listing.categories && listing.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {listing.categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                {listing.pricingRange && (
                  <div className="mb-4">
                    <span className="text-lg font-medium text-green-600">
                      {getPricingDisplay(listing.pricingRange)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-4 md:mt-0">
                {canClaim && (
                  <button
                    onClick={handleClaimListing}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  >
                    Claim This Listing
                  </button>
                )}
                
                {canEdit && (
                  <Link
                    to="/listings/$listingId/edit"
                    params={{ listingId }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium text-center"
                  >
                    Edit Listing
                  </Link>
                )}
              </div>
            </div>

            <p className="text-gray-700 text-lg leading-relaxed mb-8">
              {listing.description}
            </p>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-700">{formatAddress(listing)}</span>
                  </div>
                  
                  {listing.phone && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${listing.phone}`} className="text-blue-600 hover:text-blue-800">
                        {listing.phone}
                      </a>
                    </div>
                  )}
                  
                  {listing.email && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${listing.email}`} className="text-blue-600 hover:text-blue-800">
                        {listing.email}
                      </a>
                    </div>
                  )}
                  
                  {listing.website && (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9" />
                      </svg>
                      <a 
                        href={listing.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {/* Social Media Links */}
                {(listing.facebook || listing.twitter || listing.instagram || listing.linkedin) && (
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Follow Us</h3>
                    <div className="flex space-x-4">
                      {listing.facebook && (
                        <a href={listing.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          Facebook
                        </a>
                      )}
                      {listing.twitter && (
                        <a href={listing.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                          Twitter
                        </a>
                      )}
                      {listing.instagram && (
                        <a href={listing.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
                          Instagram
                        </a>
                      )}
                      {listing.linkedin && (
                        <a href={listing.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-900">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Hours and Features */}
              <div>
                {/* Hours of Operation */}
                {listing.hoursOfOperation && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Hours of Operation</h2>
                    <HoursDisplay hours={listing.hoursOfOperation} />
                  </div>
                )}

                {/* Features and Amenities */}
                {((listing.features && listing.features.length > 0) || 
                  (listing.amenities && listing.amenities.length > 0) ||
                  (listing.tags && listing.tags.length > 0)) && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Features & Amenities</h2>
                    <div className="space-y-4">
                      {listing.features && listing.features.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Features</h4>
                          <div className="flex flex-wrap gap-2">
                            {listing.features.map((feature, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {listing.amenities && listing.amenities.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Amenities</h4>
                          <div className="flex flex-wrap gap-2">
                            {listing.amenities.map((amenity, index) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {listing.tags && listing.tags.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Tags</h4>
                          <div className="flex flex-wrap gap-2">
                            {listing.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-500">Interactive map coming soon</p>
                  <p className="text-sm text-gray-400 mt-1">{formatAddress(listing)}</p>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-600">Reviews and ratings coming soon</p>
                  <p className="text-sm text-gray-500 mt-1">Be the first to leave a review!</p>
                </div>
              </div>
            </div>

            {/* Listing Metadata */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>Listed: {formatDate(listing.createdAt)}</span>
                {listing.updatedAt !== listing.createdAt && (
                  <span>Updated: {formatDate(listing.updatedAt)}</span>
                )}
                <span>Version: {listing.version}</span>
              </div>
            </div>

            {/* Version History - Only show to listing owner or admin */}
            {(canEdit || user?.role === 'ADMIN') && (
              <VersionHistory 
                listingId={listing.id} 
                currentVersion={listing.version} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Claim Listing Modal */}
      {showClaimModal && (
        <ClaimListingModal
          listing={listing}
          onConfirm={confirmClaim}
          onCancel={() => setShowClaimModal(false)}
          isLoading={claimListingMutation.isPending}
        />
      )}
    </div>
  );
}

// Helper Components
interface ImageGalleryProps {
  images: string[];
  businessName: string;
  selectedIndex: number;
  onSelectImage: (index: number) => void;
}

function ImageGallery({ images, businessName, selectedIndex, onSelectImage }: ImageGalleryProps) {
  if (!images || images.length === 0) {
    return (
      <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative h-64 md:h-96 bg-gray-200 rounded-lg overflow-hidden">
        <img
          src={images[selectedIndex]}
          alt={`${businessName} - Image ${selectedIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => onSelectImage(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => onSelectImage(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
        
        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onSelectImage(index)}
              className={`relative h-16 rounded overflow-hidden border-2 ${
                selectedIndex === index ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img
                src={image}
                alt={`${businessName} thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface HoursDisplayProps {
  hours: any;
}

function HoursDisplay({ hours }: HoursDisplayProps) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-2">
      {days.map((day, index) => {
        const dayHours = hours[day];
        return (
          <div key={day} className="flex justify-between items-center">
            <span className="font-medium text-gray-700">{dayNames[index]}</span>
            <span className="text-gray-600">
              {dayHours?.closed ? 'Closed' : `${dayHours?.open || 'N/A'} - ${dayHours?.close || 'N/A'}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface ClaimListingModalProps {
  listing: Listing;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ClaimListingModal({ listing, onConfirm, onCancel, isLoading }: ClaimListingModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Claim This Listing</h3>
        <p className="text-gray-600 mb-6">
          Are you the owner of <strong>{listing.name}</strong>? By claiming this listing, you'll be able to:
        </p>
        <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
          <li>Edit business information and photos</li>
          <li>Respond to customer reviews</li>
          <li>Access premium features</li>
          <li>Manage your business presence</li>
        </ul>
        <div className="flex space-x-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Claiming...' : 'Claim Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPricingDisplay(pricingRange: string): string {
  switch (pricingRange) {
    case 'BUDGET': return '$';
    case 'MODERATE': return '$$';
    case 'EXPENSIVE': return '$$$';
    case 'LUXURY': return '$$$$';
    default: return '';
  }
}