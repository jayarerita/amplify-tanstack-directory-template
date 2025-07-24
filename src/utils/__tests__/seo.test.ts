import { describe, it, expect } from 'vitest';
import { seo, generateListingSEO, generateCategorySEO, generateSearchSEO } from '../seo';
import type { Listing, Category } from '~/types';

describe('SEO Utils', () => {
  describe('seo function', () => {
    it('should generate basic SEO tags', () => {
      const result = seo({
        title: 'Test Title',
        description: 'Test Description',
        keywords: 'test, keywords',
      });

      expect(result).toContainEqual({ title: 'Test Title' });
      expect(result).toContainEqual({ name: 'description', content: 'Test Description' });
      expect(result).toContainEqual({ name: 'keywords', content: 'test, keywords' });
      expect(result).toContainEqual({ name: 'robots', content: 'index, follow' });
    });

    it('should generate Open Graph tags', () => {
      const result = seo({
        title: 'Test Title',
        description: 'Test Description',
        url: 'https://example.com',
        image: 'https://example.com/image.jpg',
      });

      expect(result).toContainEqual({ property: 'og:title', content: 'Test Title' });
      expect(result).toContainEqual({ property: 'og:description', content: 'Test Description' });
      expect(result).toContainEqual({ property: 'og:url', content: 'https://example.com' });
      expect(result).toContainEqual({ property: 'og:image', content: 'https://example.com/image.jpg' });
    });

    it('should generate Twitter Card tags', () => {
      const result = seo({
        title: 'Test Title',
        description: 'Test Description',
        image: 'https://example.com/image.jpg',
      });

      expect(result).toContainEqual({ name: 'twitter:title', content: 'Test Title' });
      expect(result).toContainEqual({ name: 'twitter:description', content: 'Test Description' });
      expect(result).toContainEqual({ name: 'twitter:image', content: 'https://example.com/image.jpg' });
      expect(result).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' });
    });

    it('should include canonical URL when provided', () => {
      const result = seo({
        title: 'Test Title',
        canonical: 'https://example.com/canonical',
      });

      expect(result).toContainEqual({ rel: 'canonical', href: 'https://example.com/canonical' });
    });
  });

  describe('generateListingSEO', () => {
    const mockListing: Listing = {
      id: '1',
      name: 'Test Restaurant',
      description: 'A great restaurant serving delicious food with excellent service and atmosphere.',
      slug: 'test-restaurant-new-york-ny',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
      },
      contactInfo: { phone: '555-1234', email: 'info@test.com', website: 'https://test.com' },
      socialMedia: {},
      images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      hoursOfOperation: {},
      pricingRange: 'MODERATE',
      categories: ['Restaurant', 'Italian'],
      tags: ['pasta', 'pizza', 'wine'],
      features: ['outdoor seating'],
      amenities: ['wifi', 'parking'],
      status: 'PUBLISHED',
      isSponsored: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      version: 1,
    };

    it('should generate listing SEO metadata', () => {
      const result = generateListingSEO(mockListing, 'https://example.com');

      expect(result.title).toBe('Test Restaurant | Local Business Directory');
      expect(result.description).toBe('A great restaurant serving delicious food with excellent service and atmosphere.');
      expect(result.keywords).toContain('Test Restaurant');
      expect(result.keywords).toContain('Restaurant');
      expect(result.keywords).toContain('Italian');
      expect(result.keywords).toContain('New York');
      expect(result.keywords).toContain('NY');
      expect(result.url).toBe('https://example.com/listings/test-restaurant-new-york-ny');
      expect(result.image).toBe('https://example.com/image1.jpg');
      expect(result.type).toBe('business.business');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(200);
      const listingWithLongDesc = { ...mockListing, description: longDescription };
      
      const result = generateListingSEO(listingWithLongDesc);
      
      expect(result.description).toHaveLength(160);
      expect(result.description).toEndWith('...');
    });
  });

  describe('generateCategorySEO', () => {
    const mockCategory: Category = {
      id: '1',
      name: 'Restaurants',
      slug: 'restaurants',
      description: 'Find the best restaurants in your area',
      isActive: true,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should generate category SEO metadata', () => {
      const result = generateCategorySEO(mockCategory, 'https://example.com');

      expect(result.title).toBe('Restaurants Businesses | Local Business Directory');
      expect(result.description).toBe('Find the best restaurants in your area');
      expect(result.keywords).toContain('Restaurants');
      expect(result.keywords).toContain('local restaurants');
      expect(result.url).toBe('https://example.com/categories/restaurants');
    });

    it('should generate default description when none provided', () => {
      const categoryWithoutDesc = { ...mockCategory, description: undefined };
      
      const result = generateCategorySEO(categoryWithoutDesc);
      
      expect(result.description).toContain('Find the best restaurants businesses');
    });
  });

  describe('generateSearchSEO', () => {
    it('should generate search SEO with query and location', () => {
      const result = generateSearchSEO('pizza', 'New York', 'https://example.com');

      expect(result.title).toBe('pizza in New York | Local Business Directory');
      expect(result.description).toContain('Find pizza businesses and services in New York');
      expect(result.keywords).toContain('pizza');
      expect(result.keywords).toContain('New York');
    });

    it('should generate search SEO with query only', () => {
      const result = generateSearchSEO('pizza', undefined, 'https://example.com');

      expect(result.title).toBe('pizza | Local Business Directory');
      expect(result.description).toContain('Find pizza businesses and services');
    });

    it('should generate search SEO with location only', () => {
      const result = generateSearchSEO(undefined, 'New York', 'https://example.com');

      expect(result.title).toBe('Businesses in New York | Local Business Directory');
      expect(result.description).toContain('Find local businesses and services in New York');
    });

    it('should generate default search SEO', () => {
      const result = generateSearchSEO();

      expect(result.title).toBe('Search Results | Local Business Directory');
      expect(result.description).toBe('Find local businesses and services in your area.');
    });
  });
});