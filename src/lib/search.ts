import { client } from './data';
import type { Schema } from '../../amplify/data/resource';
import { demoListings, demoCategories, demoTags } from './demo-data';

export interface SearchFilters {
  query?: string;
  categories?: string[];
  tags?: string[];
  location?: {
    city?: string;
    state?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  pricingRange?: string[];
  features?: string[];
  amenities?: string[];
  minRating?: number;
  isSponsored?: boolean;
  sortBy?: 'relevance' | 'distance' | 'rating' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchSuggestion {
  id: string;
  name: string;
  type: 'listing' | 'category' | 'location';
  category?: string;
  location?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  slug: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  images: string[];
  categories: string[];
  tags: string[];
  features: string[];
  amenities: string[];
  pricingRange?: string;
  averageRating?: number;
  reviewCount: number;
  isSponsored: boolean;
  sponsoredRank?: number;
  sponsoredTier?: string;
  distance?: number; // in miles, calculated if location provided
  createdAt: string;
  updatedAt: string;
}

export interface SearchResults {
  listings: SearchResult[];
  totalCount: number;
  hasNextPage: boolean;
  nextToken?: string;
  facets?: {
    categories: Array<{ name: string; count: number }>;
    locations: Array<{ name: string; count: number }>;
    pricingRanges: Array<{ name: string; count: number }>;
    features: Array<{ name: string; count: number }>;
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Build filter conditions for DynamoDB query
function buildFilterConditions(filters: SearchFilters) {
  const conditions: any[] = [
    { status: { eq: 'PUBLISHED' } }
  ];

  // Text search - search in name, description, categories, tags
  if (filters.query) {
    const query = filters.query.toLowerCase();
    conditions.push({
      or: [
        { name: { contains: query } },
        { description: { contains: query } },
        { categories: { contains: query } },
        { tags: { contains: query } }
      ]
    });
  }

  // Category filter
  if (filters.categories && filters.categories.length > 0) {
    const categoryConditions = filters.categories.map(category => ({
      categories: { contains: category }
    }));
    conditions.push({ or: categoryConditions });
  }

  // Tags filter
  if (filters.tags && filters.tags.length > 0) {
    const tagConditions = filters.tags.map(tag => ({
      tags: { contains: tag }
    }));
    conditions.push({ or: tagConditions });
  }

  // Pricing range filter
  if (filters.pricingRange && filters.pricingRange.length > 0) {
    const priceConditions = filters.pricingRange.map(range => ({
      pricingRange: { eq: range }
    }));
    conditions.push({ or: priceConditions });
  }

  // Features filter
  if (filters.features && filters.features.length > 0) {
    const featureConditions = filters.features.map(feature => ({
      features: { contains: feature }
    }));
    conditions.push({ and: featureConditions });
  }

  // Amenities filter
  if (filters.amenities && filters.amenities.length > 0) {
    const amenityConditions = filters.amenities.map(amenity => ({
      amenities: { contains: amenity }
    }));
    conditions.push({ and: amenityConditions });
  }

  // Rating filter
  if (filters.minRating) {
    conditions.push({
      averageRating: { ge: filters.minRating }
    });
  }

  // Location filter (city/state)
  if (filters.location?.city || filters.location?.state) {
    const locationConditions: any[] = [];
    
    if (filters.location.city) {
      locationConditions.push({
        city: { contains: filters.location.city }
      });
    }
    
    if (filters.location.state) {
      locationConditions.push({
        state: { eq: filters.location.state }
      });
    }
    
    if (locationConditions.length > 0) {
      conditions.push({ and: locationConditions });
    }
  }

  return conditions.length > 1 ? { and: conditions } : conditions[0];
}

// Sort listings based on criteria
function sortListings(
  listings: any[],
  sortBy: string = 'relevance',
  sortOrder: string = 'desc',
  userLocation?: { latitude: number; longitude: number }
): SearchResult[] {
  const results = listings.map(listing => {
    const result: SearchResult = {
      id: listing.id,
      name: listing.name,
      description: listing.description,
      slug: listing.slug,
      street: listing.street,
      city: listing.city,
      state: listing.state,
      zipCode: listing.zipCode,
      latitude: listing.latitude,
      longitude: listing.longitude,
      phone: listing.phone,
      email: listing.email,
      website: listing.website,
      images: listing.images || [],
      categories: listing.categories || [],
      tags: listing.tags || [],
      features: listing.features || [],
      amenities: listing.amenities || [],
      pricingRange: listing.pricingRange,
      averageRating: listing.averageRating,
      reviewCount: listing.reviewCount || 0,
      isSponsored: listing.isSponsored || false,
      sponsoredRank: listing.sponsoredRank,
      sponsoredTier: listing.sponsoredTier,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };

    // Calculate distance if user location provided
    if (userLocation) {
      result.distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        listing.latitude,
        listing.longitude
      );
    }

    return result;
  });

  // Sort results
  results.sort((a, b) => {
    // Always prioritize sponsored listings first
    if (a.isSponsored && !b.isSponsored) return -1;
    if (!a.isSponsored && b.isSponsored) return 1;
    
    // If both are sponsored, sort by sponsored rank
    if (a.isSponsored && b.isSponsored) {
      const rankA = a.sponsoredRank || 0;
      const rankB = b.sponsoredRank || 0;
      if (rankA !== rankB) {
        return sortOrder === 'desc' ? rankB - rankA : rankA - rankB;
      }
    }

    // Then sort by the specified criteria
    let comparison = 0;
    
    switch (sortBy) {
      case 'distance':
        if (a.distance !== undefined && b.distance !== undefined) {
          comparison = a.distance - b.distance;
        }
        break;
      case 'rating':
        const ratingA = a.averageRating || 0;
        const ratingB = b.averageRating || 0;
        comparison = ratingB - ratingA; // Higher ratings first
        break;
      case 'date':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'relevance':
      default:
        // For relevance, we could implement a more sophisticated scoring algorithm
        // For now, we'll use a combination of rating and review count
        const scoreA = (a.averageRating || 0) * Math.log(a.reviewCount + 1);
        const scoreB = (b.averageRating || 0) * Math.log(b.reviewCount + 1);
        comparison = scoreB - scoreA;
        break;
    }

    return sortOrder === 'desc' ? comparison : -comparison;
  });

  return results;
}

// Filter by radius if location coordinates provided
function filterByRadius(
  listings: SearchResult[],
  userLocation: { latitude: number; longitude: number },
  radius: number
): SearchResult[] {
  return listings.filter(listing => {
    if (listing.distance === undefined) {
      listing.distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        listing.latitude,
        listing.longitude
      );
    }
    return listing.distance <= radius;
  });
}

export const searchOperations = {
  // Main search function
  async search(
    filters: SearchFilters,
    limit: number = 20,
    nextToken?: string
  ): Promise<SearchResults> {
    try {
      // Try to use real backend first, fall back to demo data
      let listings: any[] = [];
      
      try {
        const filterConditions = buildFilterConditions(filters);
        
        // Query listings
        const response = await client.models.Listing.list({
          filter: filterConditions,
          limit: Math.min(limit * 2, 100), // Get more results for better sorting
          nextToken,
        });

        listings = response.data || [];
      } catch (backendError) {
        console.log('Using demo data for search');
        // Use demo data and apply filters manually
        listings = demoListings.filter(listing => {
          // Text search
          if (filters.query) {
            const query = filters.query.toLowerCase();
            const searchableText = [
              listing.name,
              listing.description,
              ...listing.categories,
              ...listing.tags,
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(query)) {
              return false;
            }
          }

          // Category filter
          if (filters.categories?.length) {
            const hasMatchingCategory = filters.categories.some(category =>
              listing.categories.includes(category.toLowerCase())
            );
            if (!hasMatchingCategory) return false;
          }

          // Location filter (simplified - just check city/state)
          if (filters.location?.city) {
            if (!listing.city.toLowerCase().includes(filters.location.city.toLowerCase())) {
              return false;
            }
          }

          // Price range filter
          if (filters.pricingRange?.length) {
            if (!filters.pricingRange.includes(listing.pricingRange)) {
              return false;
            }
          }

          // Rating filter
          if (filters.minRating && listing.averageRating) {
            if (listing.averageRating < filters.minRating) {
              return false;
            }
          }

          // Features filter
          if (filters.features?.length) {
            const hasAllFeatures = filters.features.every(feature =>
              listing.features.includes(feature)
            );
            if (!hasAllFeatures) return false;
          }

          return true;
        });
      }

      // Apply radius filter if location coordinates provided
      if (filters.location?.coordinates && filters.location?.radius) {
        const resultsWithDistance = listings.map(listing => ({
          ...listing,
          distance: calculateDistance(
            filters.location!.coordinates!.latitude,
            filters.location!.coordinates!.longitude,
            listing.latitude,
            listing.longitude
          )
        }));
        
        listings = resultsWithDistance.filter(
          listing => listing.distance! <= filters.location!.radius!
        );
      }

      // Sort results
      const sortedResults = sortListings(
        listings,
        filters.sortBy,
        filters.sortOrder,
        filters.location?.coordinates
      );

      // Limit results to requested amount
      const finalResults = sortedResults.slice(0, limit);

      return {
        listings: finalResults,
        totalCount: finalResults.length,
        hasNextPage: finalResults.length === limit,
        nextToken: finalResults.length === limit ? 'demo-next' : undefined,
      };
    } catch (error) {
      console.error('Search error:', error);
      return {
        listings: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }
  },

  // Get search suggestions for auto-completion
  async getSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];
      const searchQuery = query.toLowerCase();

      try {
        // Try backend first
        const listingsResponse = await client.models.Listing.list({
          filter: {
            and: [
              { status: { eq: 'PUBLISHED' } },
              {
                or: [
                  { name: { contains: searchQuery } },
                  { description: { contains: searchQuery } }
                ]
              }
            ]
          },
          limit: 5,
        });

        listingsResponse.data?.forEach(listing => {
          suggestions.push({
            id: listing.id,
            name: listing.name,
            type: 'listing',
            location: `${listing.city}, ${listing.state}`,
          });
        });

        // Search categories
        const categoriesResponse = await client.models.Category.list({
          filter: {
            and: [
              { isActive: { eq: true } },
              { name: { contains: searchQuery } }
            ]
          },
          limit: 3,
        });

        categoriesResponse.data?.forEach(category => {
          suggestions.push({
            id: category.id,
            name: category.name,
            type: 'category',
            category: category.name,
          });
        });
      } catch (backendError) {
        // Use demo data
        console.log('Using demo data for suggestions');
        
        // Search demo listings
        demoListings
          .filter(listing => 
            listing.name.toLowerCase().includes(searchQuery) ||
            listing.description.toLowerCase().includes(searchQuery)
          )
          .slice(0, 5)
          .forEach(listing => {
            suggestions.push({
              id: listing.id,
              name: listing.name,
              type: 'listing',
              location: `${listing.city}, ${listing.state}`,
            });
          });

        // Search demo categories
        demoCategories
          .filter(category => 
            category.name.toLowerCase().includes(searchQuery)
          )
          .slice(0, 3)
          .forEach(category => {
            suggestions.push({
              id: category.id,
              name: category.name,
              type: 'category',
              category: category.name,
            });
          });
      }

      // Add location suggestions (simplified - in a real app, you'd use a geocoding service)
      if (searchQuery.length >= 2) {
        const locationSuggestions = await this.getLocationSuggestions(searchQuery);
        suggestions.push(...locationSuggestions);
      }

      return suggestions.slice(0, 8); // Limit total suggestions
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  },

  // Get location suggestions (simplified implementation)
  async getLocationSuggestions(query: string): Promise<SearchSuggestion[]> {
    // In a real implementation, you would use a geocoding service like Google Places API
    // For now, we'll return some common locations based on existing listings
    try {
      let listings: any[] = [];
      
      try {
        const response = await client.models.Listing.list({
          filter: {
            and: [
              { status: { eq: 'PUBLISHED' } },
              {
                or: [
                  { city: { contains: query } },
                  { state: { contains: query } }
                ]
              }
            ]
          },
          limit: 10,
        });
        listings = response.data || [];
      } catch (backendError) {
        // Use demo data
        listings = demoListings.filter(listing =>
          listing.city.toLowerCase().includes(query.toLowerCase()) ||
          listing.state.toLowerCase().includes(query.toLowerCase())
        );
      }

      const locationMap = new Map<string, number>();
      
      listings.forEach(listing => {
        const cityState = `${listing.city}, ${listing.state}`;
        locationMap.set(cityState, (locationMap.get(cityState) || 0) + 1);
      });

      return Array.from(locationMap.entries())
        .sort((a, b) => b[1] - a[1]) // Sort by frequency
        .slice(0, 3)
        .map(([location], index) => ({
          id: `location-${index}`,
          name: location,
          type: 'location' as const,
        }));
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      return [];
    }
  },

  // Get popular search terms
  async getPopularSearches(): Promise<string[]> {
    // In a real implementation, you would track search analytics
    // For now, return some common search terms
    return [
      'restaurants',
      'coffee shops',
      'hair salons',
      'auto repair',
      'dentist',
      'pizza',
      'grocery stores',
      'gyms',
    ];
  },

  // Get facets for filtering
  async getFacets(filters: SearchFilters): Promise<SearchResults['facets']> {
    try {
      let listings: any[] = [];
      
      try {
        // This is a simplified implementation
        // In a real app, you might use aggregation queries or a search service like OpenSearch
        
        const baseFilter = buildFilterConditions({ ...filters, categories: undefined });
        
        const response = await client.models.Listing.list({
          filter: baseFilter,
          limit: 1000, // Get more results for facet calculation
        });

        listings = response.data || [];
      } catch (backendError) {
        // Use demo data
        console.log('Using demo data for facets');
        listings = demoListings;
      }
      
      // Calculate category facets
      const categoryMap = new Map<string, number>();
      const locationMap = new Map<string, number>();
      const priceMap = new Map<string, number>();
      const featureMap = new Map<string, number>();

      listings.forEach(listing => {
        // Categories
        listing.categories?.forEach((category: string) => {
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });

        // Locations
        const location = `${listing.city}, ${listing.state}`;
        locationMap.set(location, (locationMap.get(location) || 0) + 1);

        // Pricing ranges
        if (listing.pricingRange) {
          priceMap.set(listing.pricingRange, (priceMap.get(listing.pricingRange) || 0) + 1);
        }

        // Features
        listing.features?.forEach((feature: string) => {
          featureMap.set(feature, (featureMap.get(feature) || 0) + 1);
        });
      });

      return {
        categories: Array.from(categoryMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        locations: Array.from(locationMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        pricingRanges: Array.from(priceMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => {
            const order = ['BUDGET', 'MODERATE', 'EXPENSIVE', 'LUXURY'];
            return order.indexOf(a.name) - order.indexOf(b.name);
          }),
        features: Array.from(featureMap.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 15),
      };
    } catch (error) {
      console.error('Error getting facets:', error);
      return {
        categories: [],
        locations: [],
        pricingRanges: [],
        features: [],
      };
    }
  },
};