import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { validateListingInput, transformListingInput } from '~/utils/listing';
import type { CreateListingInput } from '~/types';

// Mock the router
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => ({ component: () => null }),
  useNavigate: () => vi.fn(),
}));

// Mock the data operations
vi.mock('~/lib/data', () => ({
  listingOperations: {
    create: vi.fn(),
  },
}));

// Mock the file upload hook
vi.mock('~/hooks/useFileUpload', () => ({
  useFileUpload: () => ({
    uploadFile: vi.fn(),
    isUploading: false,
    uploadError: null,
  }),
}));

describe('Listing Utilities', () => {
  describe('validateListingInput', () => {
    it('should validate required fields', () => {
      const invalidInput: CreateListingInput = {
        name: '',
        description: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        latitude: 0,
        longitude: 0,
      };

      const errors = validateListingInput(invalidInput);
      
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Description is required');
      expect(errors).toContain('Street address is required');
      expect(errors).toContain('City is required');
      expect(errors).toContain('State is required');
      expect(errors).toContain('ZIP code is required');
      expect(errors).toContain('Country is required');
    });

    it('should validate email format', () => {
      const input: CreateListingInput = {
        name: 'Test Business',
        description: 'Test Description',
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        email: 'invalid-email',
      };

      const errors = validateListingInput(input);
      expect(errors).toContain('Invalid email format');
    });

    it('should validate website URL format', () => {
      const input: CreateListingInput = {
        name: 'Test Business',
        description: 'Test Description',
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        website: 'not-a-url',
      };

      const errors = validateListingInput(input);
      expect(errors).toContain('Invalid website URL format');
    });

    it('should pass validation for valid input', () => {
      const validInput: CreateListingInput = {
        name: 'Test Business',
        description: 'Test Description',
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        email: 'test@example.com',
        website: 'https://example.com',
        phone: '555-123-4567',
      };

      const errors = validateListingInput(validInput);
      expect(errors).toHaveLength(0);
    });
  });

  describe('transformListingInput', () => {
    it('should trim string fields', () => {
      const input: CreateListingInput = {
        name: '  Test Business  ',
        description: '  Test Description  ',
        street: '  123 Main St  ',
        city: '  Test City  ',
        state: '  Test State  ',
        zipCode: '  12345  ',
        country: '  USA  ',
        latitude: 40.7128,
        longitude: -74.0060,
        email: '  test@example.com  ',
        website: '  https://example.com  ',
      };

      const transformed = transformListingInput(input);

      expect(transformed.name).toBe('Test Business');
      expect(transformed.description).toBe('Test Description');
      expect(transformed.street).toBe('123 Main St');
      expect(transformed.city).toBe('Test City');
      expect(transformed.state).toBe('Test State');
      expect(transformed.zipCode).toBe('12345');
      expect(transformed.country).toBe('USA');
      expect(transformed.email).toBe('test@example.com');
      expect(transformed.website).toBe('https://example.com');
    });

    it('should handle undefined optional fields', () => {
      const input: CreateListingInput = {
        name: 'Test Business',
        description: 'Test Description',
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'USA',
        latitude: 40.7128,
        longitude: -74.0060,
        email: '',
        website: '',
      };

      const transformed = transformListingInput(input);

      expect(transformed.email).toBeUndefined();
      expect(transformed.website).toBeUndefined();
    });
  });
});