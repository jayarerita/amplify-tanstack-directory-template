import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchOperations, SearchFilters, SearchResults } from '~/lib/search';
import { getCurrentLocation, GeolocationPosition } from '~/utils/geolocation';

export interface UseSearchOptions {
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  limit?: number;
}

export interface UseSearchReturn {
  // Search state
  filters: SearchFilters;
  results: SearchResults | undefined;
  isLoading: boolean;
  error: Error | null;
  
  // Search actions
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  search: (searchFilters?: SearchFilters) => void;
  
  // Location actions
  useCurrentLocation: () => Promise<void>;
  isGettingLocation: boolean;
  locationError: string | null;
  
  // Suggestions
  suggestions: any[];
  getSuggestions: (query: string) => Promise<void>;
  isSuggestionsLoading: boolean;
  
  // Facets
  facets: SearchResults['facets'];
  isFacetsLoading: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    initialFilters = {},
    autoSearch = true,
    limit = 20,
  } = options;

  const [filters, setFiltersState] = useState<SearchFilters>(initialFilters);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);

  // Main search query
  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['search', filters, limit],
    queryFn: () => searchOperations.search(filters, limit),
    enabled: autoSearch && (!!filters.query || Object.keys(filters).length > 1),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Facets query
  const {
    data: facets,
    isLoading: isFacetsLoading,
  } = useQuery({
    queryKey: ['search-facets', filters],
    queryFn: () => searchOperations.getFacets(filters),
    enabled: autoSearch,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Set filters completely
  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
  }, []);

  // Clear all filters except query
  const clearFilters = useCallback(() => {
    setFiltersState({ query: filters.query });
  }, [filters.query]);

  // Manual search
  const search = useCallback((searchFilters?: SearchFilters) => {
    if (searchFilters) {
      setFiltersState(searchFilters);
    }
    refetch();
  }, [refetch]);

  // Get current location
  const useCurrentLocation = useCallback(async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const position = await getCurrentLocation();
      
      updateFilters({
        location: {
          ...filters.location,
          coordinates: {
            latitude: position.latitude,
            longitude: position.longitude,
          },
          radius: filters.location?.radius || 10,
        },
      });
    } catch (error: any) {
      setLocationError(error.message || 'Failed to get location');
    } finally {
      setIsGettingLocation(false);
    }
  }, [filters.location, updateFilters]);

  // Get search suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSuggestionsLoading(true);
    try {
      const results = await searchOperations.getSuggestions(query);
      setSuggestions(results);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, []);

  return {
    // Search state
    filters,
    results,
    isLoading,
    error: error as Error | null,
    
    // Search actions
    updateFilters,
    setFilters,
    clearFilters,
    search,
    
    // Location actions
    useCurrentLocation,
    isGettingLocation,
    locationError,
    
    // Suggestions
    suggestions,
    getSuggestions,
    isSuggestionsLoading,
    
    // Facets
    facets,
    isFacetsLoading,
  };
}