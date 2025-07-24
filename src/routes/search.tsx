import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchInterface } from '~/components/SearchInterface';
import { SearchFilters } from '~/components/SearchFilters';
import { SearchResults } from '~/components/SearchResults';
import { searchOperations, SearchFilters as SearchFiltersType } from '~/lib/search';
import { seo, generateSearchSEO } from '~/utils/seo';
import { generateBreadcrumbSchema, injectStructuredData } from '~/utils/structured-data';

interface SearchParams {
  q?: string;
  category?: string;
  categories?: string[];
  location?: string;
  city?: string;
  state?: string;
  radius?: number;
  minRating?: number;
  pricingRange?: string[];
  features?: string[];
  amenities?: string[];
  tags?: string[];
  sortBy?: 'relevance' | 'distance' | 'rating' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
  lat?: number;
  lng?: number;
}

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): SearchParams => {
    return {
      q: search.q as string,
      category: search.category as string,
      categories: Array.isArray(search.categories) ? search.categories as string[] : 
                  search.categories ? [search.categories as string] : undefined,
      location: search.location as string,
      city: search.city as string,
      state: search.state as string,
      radius: search.radius ? Number(search.radius) : undefined,
      minRating: search.minRating ? Number(search.minRating) : undefined,
      pricingRange: Array.isArray(search.pricingRange) ? search.pricingRange as string[] :
                    search.pricingRange ? [search.pricingRange as string] : undefined,
      features: Array.isArray(search.features) ? search.features as string[] :
                search.features ? [search.features as string] : undefined,
      amenities: Array.isArray(search.amenities) ? search.amenities as string[] :
                 search.amenities ? [search.amenities as string] : undefined,
      tags: Array.isArray(search.tags) ? search.tags as string[] :
            search.tags ? [search.tags as string] : undefined,
      sortBy: (search.sortBy as any) || 'relevance',
      sortOrder: (search.sortOrder as any) || 'desc',
      lat: search.lat ? Number(search.lat) : undefined,
      lng: search.lng ? Number(search.lng) : undefined,
    };
  },
  component: SearchPage,
  head: ({ search }) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
    const query = search.q;
    const location = search.city || search.location;
    
    const seoConfig = generateSearchSEO(query, location, baseUrl);
    const seoTags = seo(seoConfig);

    // Generate breadcrumb structured data
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Search', url: '/search' },
    ], baseUrl);

    return {
      meta: seoTags,
      scripts: [
        injectStructuredData(breadcrumbSchema),
      ],
    };
  },
});

function SearchPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  
  // Convert URL params to search filters
  const [filters, setFilters] = useState<SearchFiltersType>(() => {
    const initialFilters: SearchFiltersType = {
      query: searchParams.q,
      sortBy: searchParams.sortBy || 'relevance',
      sortOrder: searchParams.sortOrder || 'desc',
    };

    // Handle categories
    if (searchParams.categories?.length) {
      initialFilters.categories = searchParams.categories;
    } else if (searchParams.category) {
      initialFilters.categories = [searchParams.category];
    }

    // Handle location
    if (searchParams.city || searchParams.state || searchParams.location || (searchParams.lat && searchParams.lng)) {
      initialFilters.location = {
        city: searchParams.city || searchParams.location,
        state: searchParams.state,
        radius: searchParams.radius || 10,
      };
      
      if (searchParams.lat && searchParams.lng) {
        initialFilters.location.coordinates = {
          latitude: searchParams.lat,
          longitude: searchParams.lng,
        };
      }
    }

    // Handle other filters
    if (searchParams.minRating) initialFilters.minRating = searchParams.minRating;
    if (searchParams.pricingRange?.length) initialFilters.pricingRange = searchParams.pricingRange;
    if (searchParams.features?.length) initialFilters.features = searchParams.features;
    if (searchParams.amenities?.length) initialFilters.amenities = searchParams.amenities;
    if (searchParams.tags?.length) initialFilters.tags = searchParams.tags;

    return initialFilters;
  });

  // Search results query
  const {
    data: searchResults,
    isLoading: isSearchLoading,
    error: searchError,
  } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => searchOperations.search(filters, 20),
    enabled: true,
  });

  // Facets query for filters
  const {
    data: facets,
    isLoading: isFacetsLoading,
  } = useQuery({
    queryKey: ['search-facets', filters],
    queryFn: () => searchOperations.getFacets(filters),
    enabled: true,
  });

  // Update URL when filters change
  const updateURL = (newFilters: SearchFiltersType) => {
    const searchParams: any = {};
    
    if (newFilters.query) searchParams.q = newFilters.query;
    if (newFilters.categories?.length) {
      if (newFilters.categories.length === 1) {
        searchParams.category = newFilters.categories[0];
      } else {
        searchParams.categories = newFilters.categories;
      }
    }
    if (newFilters.location?.city) searchParams.city = newFilters.location.city;
    if (newFilters.location?.state) searchParams.state = newFilters.location.state;
    if (newFilters.location?.radius && newFilters.location.radius !== 10) {
      searchParams.radius = newFilters.location.radius;
    }
    if (newFilters.location?.coordinates) {
      searchParams.lat = newFilters.location.coordinates.latitude;
      searchParams.lng = newFilters.location.coordinates.longitude;
    }
    if (newFilters.minRating) searchParams.minRating = newFilters.minRating;
    if (newFilters.pricingRange?.length) searchParams.pricingRange = newFilters.pricingRange;
    if (newFilters.features?.length) searchParams.features = newFilters.features;
    if (newFilters.amenities?.length) searchParams.amenities = newFilters.amenities;
    if (newFilters.tags?.length) searchParams.tags = newFilters.tags;
    if (newFilters.sortBy && newFilters.sortBy !== 'relevance') searchParams.sortBy = newFilters.sortBy;
    if (newFilters.sortOrder && newFilters.sortOrder !== 'desc') searchParams.sortOrder = newFilters.sortOrder;

    navigate({
      to: '/search',
      search: searchParams,
      replace: true,
    });
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const handleSortChange = (sortBy: string, sortOrder: string) => {
    const newFilters = { ...filters, sortBy: sortBy as any, sortOrder: sortOrder as any };
    handleFiltersChange(newFilters);
  };

  const handleSearch = (query: string) => {
    const newFilters = { ...filters, query };
    handleFiltersChange(newFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Search Directory</h1>
        
        {/* Search Interface */}
        <div className="mb-6">
          <SearchInterface
            initialQuery={filters.query || ''}
            onSearch={handleSearch}
            showFilters={false}
            className="max-w-2xl"
          />
        </div>

        {/* Search Summary */}
        {filters.query && (
          <p className="text-gray-600">
            Showing results for: <span className="font-semibold">"{filters.query}"</span>
          </p>
        )}
        {filters.categories?.length === 1 && (
          <p className="text-gray-600">
            Category: <span className="font-semibold">{filters.categories[0]}</span>
          </p>
        )}
        {filters.location?.city && (
          <p className="text-gray-600">
            Location: <span className="font-semibold">{filters.location.city}</span>
            {filters.location.radius && (
              <span className="text-gray-500"> (within {filters.location.radius} miles)</span>
            )}
          </p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <SearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            facets={facets}
            isLoading={isFacetsLoading}
          />
        </div>

        {/* Search Results */}
        <div className="lg:col-span-3">
          <SearchResults
            results={searchResults?.listings || []}
            isLoading={isSearchLoading}
            totalCount={searchResults?.totalCount || 0}
            sortBy={filters.sortBy || 'relevance'}
            sortOrder={filters.sortOrder || 'desc'}
            onSortChange={handleSortChange}
          />
          
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-red-800">
                An error occurred while searching. Please try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}