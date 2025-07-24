import React, { useState, useEffect } from 'react';
// Simple SVG icons to replace Heroicons
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m4.5 15.75 7.5-7.5 7.5 7.5" />
  </svg>
);

const MapPinIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
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
import { SearchFilters as SearchFiltersType } from '~/lib/search';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    locations: Array<{ name: string; count: number }>;
    pricingRanges: Array<{ name: string; count: number }>;
    features: Array<{ name: string; count: number }>;
  };
  isLoading?: boolean;
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-gray-700"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface LocationInputProps {
  value: SearchFiltersType['location'];
  onChange: (location: SearchFiltersType['location']) => void;
}

function LocationInput({ value, onChange }: LocationInputProps) {
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange({
          ...value,
          coordinates: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
        setUseCurrentLocation(true);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your current location. Please enter a location manually.');
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          type="text"
          placeholder="City, State or ZIP"
          value={value?.city || ''}
          onChange={(e) => onChange({
            ...value,
            city: e.target.value,
            coordinates: useCurrentLocation ? value?.coordinates : undefined,
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCurrentLocation}
          disabled={isGettingLocation}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          <MapPinIcon className="h-4 w-4" />
          <span>
            {isGettingLocation ? 'Getting location...' : 'Use current location'}
          </span>
        </button>
      </div>

      {(value?.coordinates || value?.city) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search radius
          </label>
          <select
            value={value?.radius || 10}
            onChange={(e) => onChange({
              ...value,
              radius: parseInt(e.target.value),
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value={5}>5 miles</option>
            <option value={10}>10 miles</option>
            <option value={25}>25 miles</option>
            <option value={50}>50 miles</option>
            <option value={100}>100 miles</option>
          </select>
        </div>
      )}
    </div>
  );
}

interface RatingFilterProps {
  value?: number;
  onChange: (rating?: number) => void;
}

function RatingFilter({ value, onChange }: RatingFilterProps) {
  const ratings = [5, 4, 3, 2, 1];

  return (
    <div className="space-y-2">
      <button
        onClick={() => onChange(undefined)}
        className={`flex items-center space-x-2 text-sm w-full text-left p-2 rounded hover:bg-gray-50 ${
          !value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
        }`}
      >
        <span>Any rating</span>
      </button>
      
      {ratings.map((rating) => (
        <button
          key={rating}
          onClick={() => onChange(rating)}
          className={`flex items-center space-x-2 text-sm w-full text-left p-2 rounded hover:bg-gray-50 ${
            value === rating ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
          }`}
        >
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <span key={i}>
                {i < rating ? (
                  <StarIconSolid className="h-4 w-4 text-yellow-400" />
                ) : (
                  <StarIcon className="h-4 w-4 text-gray-300" />
                )}
              </span>
            ))}
          </div>
          <span>& up</span>
        </button>
      ))}
    </div>
  );
}

export function SearchFilters({
  filters,
  onFiltersChange,
  facets,
  isLoading = false,
}: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<SearchFiltersType>(filters);

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleArrayFilter = (key: 'categories' | 'tags' | 'features' | 'amenities' | 'pricingRange', value: string) => {
    const currentArray = localFilters[key] || [];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  const clearAllFilters = () => {
    const clearedFilters: SearchFiltersType = {
      query: localFilters.query, // Keep the search query
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.keys(localFilters).some(
    key => key !== 'query' && key !== 'sortBy' && key !== 'sortOrder' && localFilters[key as keyof SearchFiltersType]
  );

  const pricingRangeLabels = {
    BUDGET: 'Budget ($)',
    MODERATE: 'Moderate ($$)',
    EXPENSIVE: 'Expensive ($$$)',
    LUXURY: 'Luxury ($$$$)',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      <div className="space-y-4">
        {/* Location Filter */}
        <FilterSection title="Location">
          <LocationInput
            value={localFilters.location}
            onChange={(location) => updateFilter('location', location)}
          />
        </FilterSection>

        {/* Categories Filter */}
        {facets?.categories && facets.categories.length > 0 && (
          <FilterSection title="Categories">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {facets.categories.map((category) => (
                <label key={category.name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.categories?.includes(category.name) || false}
                    onChange={() => toggleArrayFilter('categories', category.name)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{category.name}</span>
                  <span className="text-xs text-gray-500">({category.count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Price Range Filter */}
        <FilterSection title="Price Range">
          <div className="space-y-2">
            {Object.entries(pricingRangeLabels).map(([value, label]) => {
              const count = facets?.pricingRanges?.find(p => p.name === value)?.count || 0;
              return (
                <label key={value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.pricingRange?.includes(value) || false}
                    onChange={() => toggleArrayFilter('pricingRange', value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{label}</span>
                  {count > 0 && (
                    <span className="text-xs text-gray-500">({count})</span>
                  )}
                </label>
              );
            })}
          </div>
        </FilterSection>

        {/* Rating Filter */}
        <FilterSection title="Rating">
          <RatingFilter
            value={localFilters.minRating}
            onChange={(rating) => updateFilter('minRating', rating)}
          />
        </FilterSection>

        {/* Features Filter */}
        {facets?.features && facets.features.length > 0 && (
          <FilterSection title="Features" defaultOpen={false}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {facets.features.map((feature) => (
                <label key={feature.name} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localFilters.features?.includes(feature.name) || false}
                    onChange={() => toggleArrayFilter('features', feature.name)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{feature.name}</span>
                  <span className="text-xs text-gray-500">({feature.count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  );
}