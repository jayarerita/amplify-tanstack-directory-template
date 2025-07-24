import React from 'react';
import { Link } from '@tanstack/react-router';
// Simple SVG icons to replace Heroicons
const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
  </svg>
);

const PhoneIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const GlobeAltIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 12h20" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
  </svg>
);

const StarIconSolid = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
  </svg>
);

const TagIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h.008v.008H6V6z" />
  </svg>
);

const MagnifyingGlassIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
  </svg>
);
import { SearchResult } from '~/lib/search';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  totalCount: number;
  sortBy: string;
  sortOrder: string;
  onSortChange: (sortBy: string, sortOrder: string) => void;
}

interface ListingCardProps {
  listing: SearchResult;
}

function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.images?.[0];
  const hasRating = listing.averageRating && listing.reviewCount > 0;

  const formatDistance = (distance?: number) => {
    if (!distance) return null;
    return distance < 1 
      ? `${(distance * 5280).toFixed(0)} ft`
      : `${distance.toFixed(1)} mi`;
  };

  const formatPriceRange = (range?: string) => {
    const ranges = {
      BUDGET: '$',
      MODERATE: '$$',
      EXPENSIVE: '$$$',
      LUXURY: '$$$$',
    };
    return ranges[range as keyof typeof ranges] || '';
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Sponsored Badge */}
      {listing.isSponsored && (
        <div className="bg-yellow-100 border-l-4 border-yellow-400 px-3 py-1">
          <div className="flex items-center">
            <TagIcon className="h-4 w-4 text-yellow-600 mr-1" />
            <span className="text-xs font-medium text-yellow-800">
              Sponsored
              {listing.sponsoredTier && ` • ${listing.sponsoredTier}`}
            </span>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Image */}
        <div className="flex-shrink-0 w-48 h-32">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={listing.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <Link
                  to="/listings/$listingId"
                  params={{ listingId: listing.id }}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {listing.name}
                </Link>
                {listing.pricingRange && (
                  <span className="text-sm text-gray-500 font-medium">
                    {formatPriceRange(listing.pricingRange)}
                  </span>
                )}
              </div>

              {/* Rating */}
              {hasRating && (
                <div className="flex items-center space-x-1 mb-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>
                        {i < Math.floor(listing.averageRating!) ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-400" />
                        ) : (
                          <StarIcon className="h-4 w-4 text-gray-300" />
                        )}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    {listing.averageRating?.toFixed(1)} ({listing.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Description */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {listing.description}
              </p>

              {/* Categories */}
              {listing.categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {listing.categories.slice(0, 3).map((category) => (
                    <span
                      key={category}
                      className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                  {listing.categories.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{listing.categories.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Location and Contact */}
              <div className="space-y-1">
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {listing.street}, {listing.city}, {listing.state} {listing.zipCode}
                  </span>
                  {listing.distance && (
                    <span className="ml-2 text-blue-600 font-medium">
                      {formatDistance(listing.distance)}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4 text-sm">
                  {listing.phone && (
                    <div className="flex items-center text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-1" />
                      <span>{listing.phone}</span>
                    </div>
                  )}
                  
                  {listing.website && (
                    <a
                      href={listing.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800"
                    >
                      <GlobeAltIcon className="h-4 w-4 mr-1" />
                      <span>Website</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchResults({
  results,
  isLoading,
  totalCount,
  sortBy,
  sortOrder,
  onSortChange,
}: SearchResultsProps) {
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'distance', label: 'Distance' },
    { value: 'rating', label: 'Rating' },
    { value: 'date', label: 'Newest' },
    { value: 'name', label: 'Name' },
  ];

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [newSortBy, newSortOrder] = e.target.value.split('-');
    onSortChange(newSortBy, newSortOrder || 'desc');
  };

  const getCurrentSortValue = () => {
    return sortOrder === 'asc' ? `${sortBy}-asc` : sortBy;
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="w-48 h-32 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Results Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-200">
        <div>
          <p className="text-gray-600">
            {totalCount === 0 ? 'No results found' : (
              <>
                <span className="font-semibold">{totalCount}</span>
                {totalCount === 1 ? ' result' : ' results'} found
              </>
            )}
          </p>
        </div>
        
        {totalCount > 0 && (
          <div className="flex items-center space-x-2">
            <label htmlFor="sort" className="text-sm text-gray-600">
              Sort by:
            </label>
            <select
              id="sort"
              value={getCurrentSortValue()}
              onChange={handleSortChange}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {/* Add ascending options for some sorts */}
              <option value="name-asc">Name (A-Z)</option>
              <option value="distance-asc">Distance (Near to Far)</option>
            </select>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="divide-y divide-gray-200">
        {results.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-600 mb-4">No listings found matching your criteria.</p>
            <p className="text-gray-500 text-sm">
              Try adjusting your search filters or browse our categories.
            </p>
          </div>
        ) : (
          results.map((listing) => (
            <div key={listing.id} className="p-6">
              <ListingCard listing={listing} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

