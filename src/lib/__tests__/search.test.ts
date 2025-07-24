import { describe, it, expect, vi } from 'vitest';
import { searchOperations } from '../search';

// Mock the data client
vi.mock('../data', () => ({
  client: {
    models: {
      Listing: {
        list: vi.fn(),
      },
      Category: {
        list: vi.fn(),
      },
    },
  },
}));

describe('searchOperations', () => {
  describe('search', () => {
    it('returns demo data when backend is unavailable', async () => {
      const result = await searchOperations.search({
        query: 'restaurant',
      });

      expect(result.listings).toBeDefined();
      expect(result.totalCount).toBeGreaterThan(0);
      expect(result.hasNextPage).toBeDefined();
    });

    it('filters by query text', async () => {
      const result = await searchOperations.search({
        query: 'pizza',
      });

      expect(result.listings.length).toBeGreaterThan(0);
      const pizzaListing = result.listings.find(listing => 
        listing.name.toLowerCase().includes('pizza') ||
        listing.categories.includes('pizza')
      );
      expect(pizzaListing).toBeDefined();
    });

    it('filters by category', async () => {
      const result = await searchOperations.search({
        categories: ['restaurants'],
      });

      expect(result.listings.length).toBeGreaterThan(0);
      result.listings.forEach(listing => {
        expect(listing.categories).toContain('restaurants');
      });
    });

    it('filters by price range', async () => {
      const result = await searchOperations.search({
        pricingRange: ['BUDGET'],
      });

      expect(result.listings.length).toBeGreaterThan(0);
      result.listings.forEach(listing => {
        expect(listing.pricingRange).toBe('BUDGET');
      });
    });

    it('filters by minimum rating', async () => {
      const result = await searchOperations.search({
        minRating: 4.5,
      });

      expect(result.listings.length).toBeGreaterThan(0);
      result.listings.forEach(listing => {
        expect(listing.averageRating).toBeGreaterThanOrEqual(4.5);
      });
    });

    it('sorts results correctly', async () => {
      const result = await searchOperations.search({
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      expect(result.listings.length).toBeGreaterThan(1);
      
      // Check that sponsored listings come first
      const sponsoredListings = result.listings.filter(l => l.isSponsored);
      const regularListings = result.listings.filter(l => !l.isSponsored);
      
      if (sponsoredListings.length > 0 && regularListings.length > 0) {
        const firstSponsoredIndex = result.listings.findIndex(l => l.isSponsored);
        const firstRegularIndex = result.listings.findIndex(l => !l.isSponsored);
        expect(firstSponsoredIndex).toBeLessThan(firstRegularIndex);
      }
    });
  });

  describe('getSuggestions', () => {
    it('returns suggestions for query', async () => {
      const suggestions = await searchOperations.getSuggestions('restaurant');

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      
      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('id');
        expect(suggestions[0]).toHaveProperty('name');
        expect(suggestions[0]).toHaveProperty('type');
      }
    });

    it('returns empty array for short queries', async () => {
      const suggestions = await searchOperations.getSuggestions('a');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getFacets', () => {
    it('returns facet data', async () => {
      const facets = await searchOperations.getFacets({});

      expect(facets).toBeDefined();
      expect(facets.categories).toBeDefined();
      expect(facets.locations).toBeDefined();
      expect(facets.pricingRanges).toBeDefined();
      expect(facets.features).toBeDefined();
    });
  });
});