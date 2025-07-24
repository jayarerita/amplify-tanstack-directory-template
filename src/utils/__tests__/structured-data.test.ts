import { describe, it, expect } from 'vitest';
import {
  generateLocalBusinessSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
  generateWebSiteSchema,
  generateOrganizationSchema,
  injectStructuredData,
} from '../structured-data';
import type { Listing } from '~/types';

describe('Structured Data Utils', () => {
  const mockListing: Listing = {
    id: '1',
    name: 'Test Restaurant',
    description: 'A great restaurant serving delicious food',
    slug: 'test-restaurant-new-york-ny',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      coordinates: { latitude: 40.7128, longitude: -74.0060 },
    },
    contactInfo: {
      phone: '555-1234',
      email: 'info@test.com',
      website: 'https://test.com',
    },
    socialMedia: {
      facebook: 'https://facebook.com/test',
      twitter: 'https://twitter.com/test',
    },
    images: ['https://example.com/image1.jpg'],
    hoursOfOperation: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '', close: '', closed: true },
    },
    pricingRange: 'MODERATE',
    categories: ['Restaurant'],
    tags: ['pasta'],
    features: ['outdoor seating'],
    amenities: ['wifi'],
    status: 'PUBLISHED',
    isSponsored: false,
    averageRating: 4.5,
    reviewCount: 10,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
  };

  describe('generateLocalBusinessSchema', () => {
    it('should generate valid LocalBusiness schema', () => {
      const schema = generateLocalBusinessSchema(mockListing, [], 'https://example.com');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('LocalBusiness');
      expect(schema.name).toBe('Test Restaurant');
      expect(schema.description).toBe('A great restaurant serving delicious food');
      expect(schema.url).toBe('https://example.com/listings/test-restaurant-new-york-ny');
    });

    it('should include address information', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.address).toEqual({
        '@type': 'PostalAddress',
        streetAddress: '123 Main St',
        addressLocality: 'New York',
        addressRegion: 'NY',
        postalCode: '10001',
        addressCountry: 'USA',
      });
    });

    it('should include geo coordinates', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.geo).toEqual({
        '@type': 'GeoCoordinates',
        latitude: 40.7128,
        longitude: -74.0060,
      });
    });

    it('should include contact information', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.telephone).toBe('555-1234');
      expect(schema.email).toBe('info@test.com');
    });

    it('should include price range', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.priceRange).toBe('$$');
    });

    it('should include opening hours', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.openingHours).toContain('Mo 09:00-17:00');
      expect(schema.openingHours).toContain('Tu 09:00-17:00');
      expect(schema.openingHours).not.toContain('We');
    });

    it('should include aggregate rating', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.aggregateRating).toEqual({
        '@type': 'AggregateRating',
        ratingValue: 4.5,
        reviewCount: 10,
        bestRating: 5,
        worstRating: 1,
      });
    });

    it('should include social media links', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.sameAs).toContain('https://facebook.com/test');
      expect(schema.sameAs).toContain('https://twitter.com/test');
      expect(schema.sameAs).toContain('https://test.com');
    });

    it('should include images', () => {
      const schema = generateLocalBusinessSchema(mockListing);

      expect(schema.image).toEqual(['https://example.com/image1.jpg']);
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid BreadcrumbList schema', () => {
      const breadcrumbs = [
        { name: 'Home', url: '/' },
        { name: 'Listings', url: '/listings' },
        { name: 'Test Restaurant', url: '/listings/test-restaurant' },
      ];

      const schema = generateBreadcrumbSchema(breadcrumbs, 'https://example.com');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
      expect(schema.itemListElement[0]).toEqual({
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://example.com/',
      });
    });
  });

  describe('generateItemListSchema', () => {
    it('should generate valid ItemList schema', () => {
      const listings = [mockListing];
      const schema = generateItemListSchema(listings, 'https://example.com');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('ItemList');
      expect(schema.numberOfItems).toBe(1);
      expect(schema.itemListElement).toHaveLength(1);
      expect(schema.itemListElement[0]['@type']).toBe('ListItem');
      expect(schema.itemListElement[0].position).toBe(1);
    });
  });

  describe('generateWebSiteSchema', () => {
    it('should generate valid WebSite schema', () => {
      const schema = generateWebSiteSchema('https://example.com');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Local Business Directory');
      expect(schema.url).toBe('https://example.com');
      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction?.target.urlTemplate).toBe('https://example.com/search?q={search_term_string}');
    });
  });

  describe('generateOrganizationSchema', () => {
    it('should generate valid Organization schema', () => {
      const schema = generateOrganizationSchema('https://example.com');

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('Local Business Directory');
      expect(schema.url).toBe('https://example.com');
      expect(schema.logo).toBe('https://example.com/favicon.png');
    });
  });

  describe('injectStructuredData', () => {
    it('should format structured data for HTML injection', () => {
      const data = { '@context': 'https://schema.org', '@type': 'Organization' };
      const result = injectStructuredData(data);

      expect(result.type).toBe('application/ld+json');
      expect(result.children).toBe(JSON.stringify(data));
    });
  });
});