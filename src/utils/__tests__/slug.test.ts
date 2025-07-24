import { describe, it, expect } from 'vitest';
import {
  generateSlug,
  generateListingSlug,
  generateCategorySlug,
  validateSlug,
  ensureUniqueSlug,
} from '../slug';

describe('Slug Utils', () => {
  describe('generateSlug', () => {
    it('should convert text to lowercase slug', () => {
      expect(generateSlug('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Hello, World! & More')).toBe('hello-world-more');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(generateSlug('  -Hello World-  ')).toBe('hello-world');
    });

    it('should limit length to 50 characters', () => {
      const longText = 'a'.repeat(100);
      const slug = generateSlug(longText);
      expect(slug.length).toBeLessThanOrEqual(50);
    });

    it('should handle empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    it('should handle only special characters', () => {
      expect(generateSlug('!@#$%^&*()')).toBe('');
    });
  });

  describe('generateListingSlug', () => {
    it('should generate slug from name only', () => {
      expect(generateListingSlug('Pizza Palace')).toBe('pizza-palace');
    });

    it('should include city in slug', () => {
      expect(generateListingSlug('Pizza Palace', 'New York')).toBe('pizza-palace-new-york');
    });

    it('should include city and state in slug', () => {
      expect(generateListingSlug('Pizza Palace', 'New York', 'NY')).toBe('pizza-palace-new-york-ny');
    });

    it('should handle special characters in location', () => {
      expect(generateListingSlug('Pizza Palace', 'St. Louis', 'MO')).toBe('pizza-palace-st-louis-mo');
    });
  });

  describe('generateCategorySlug', () => {
    it('should generate category slug', () => {
      expect(generateCategorySlug('Restaurants & Food')).toBe('restaurants-food');
    });

    it('should handle complex category names', () => {
      expect(generateCategorySlug('Health & Medical Services')).toBe('health-medical-services');
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slugs', () => {
      expect(validateSlug('valid-slug')).toBe(true);
      expect(validateSlug('valid-slug-123')).toBe(true);
      expect(validateSlug('123-valid-slug')).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(validateSlug('Invalid Slug')).toBe(false); // spaces
      expect(validateSlug('invalid_slug')).toBe(false); // underscores
      expect(validateSlug('invalid-slug-')).toBe(false); // trailing hyphen
      expect(validateSlug('-invalid-slug')).toBe(false); // leading hyphen
      expect(validateSlug('')).toBe(false); // empty
      expect(validateSlug('a'.repeat(51))).toBe(false); // too long
    });
  });

  describe('ensureUniqueSlug', () => {
    it('should return original slug if unique', async () => {
      const checkExists = async (slug: string) => false;
      const result = await ensureUniqueSlug('test-slug', checkExists);
      expect(result).toBe('test-slug');
    });

    it('should append number if slug exists', async () => {
      const existingSlugs = new Set(['test-slug']);
      const checkExists = async (slug: string) => existingSlugs.has(slug);
      
      const result = await ensureUniqueSlug('test-slug', checkExists);
      expect(result).toBe('test-slug-1');
    });

    it('should increment number until unique', async () => {
      const existingSlugs = new Set(['test-slug', 'test-slug-1', 'test-slug-2']);
      const checkExists = async (slug: string) => existingSlugs.has(slug);
      
      const result = await ensureUniqueSlug('test-slug', checkExists);
      expect(result).toBe('test-slug-3');
    });
  });
});