import type { CreateListingInput, UpdateListingInput } from '~/types';

/**
 * Utility functions for listing operations
 */

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

/**
 * Create composite field for city-state queries
 */
export function createCityStateComposite(city: string, state: string): string {
  return `${city}, ${state}`;
}

/**
 * Create composite field for category-status queries
 */
export function createCategoryStatusComposite(categories: string[], status: string): string {
  const primaryCategory = categories && categories.length > 0 ? categories[0] : 'UNCATEGORIZED';
  return `${primaryCategory}#${status}`;
}

/**
 * Validate listing input data
 */
export function validateListingInput(input: CreateListingInput): string[] {
  const errors: string[] = [];

  // Required fields validation
  if (!input.name?.trim()) {
    errors.push('Name is required');
  }

  if (!input.description?.trim()) {
    errors.push('Description is required');
  }

  if (!input.street?.trim()) {
    errors.push('Street address is required');
  }

  if (!input.city?.trim()) {
    errors.push('City is required');
  }

  if (!input.state?.trim()) {
    errors.push('State is required');
  }

  if (!input.zipCode?.trim()) {
    errors.push('ZIP code is required');
  }

  if (!input.country?.trim()) {
    errors.push('Country is required');
  }

  if (typeof input.latitude !== 'number' || input.latitude < -90 || input.latitude > 90) {
    errors.push('Valid latitude is required');
  }

  if (typeof input.longitude !== 'number' || input.longitude < -180 || input.longitude > 180) {
    errors.push('Valid longitude is required');
  }

  // Optional field validation
  if (input.email && !isValidEmail(input.email)) {
    errors.push('Invalid email format');
  }

  if (input.website && !isValidUrl(input.website)) {
    errors.push('Invalid website URL format');
  }

  if (input.phone && !isValidPhone(input.phone)) {
    errors.push('Invalid phone number format');
  }

  return errors;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number format (basic validation)
 */
function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Transform listing input for API submission
 */
export function transformListingInput(input: CreateListingInput): CreateListingInput {
  return {
    ...input,
    name: input.name.trim(),
    description: input.description.trim(),
    street: input.street.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    zipCode: input.zipCode.trim(),
    country: input.country.trim(),
    email: input.email?.trim() || undefined,
    website: input.website?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    facebook: input.facebook?.trim() || undefined,
    twitter: input.twitter?.trim() || undefined,
    instagram: input.instagram?.trim() || undefined,
    linkedin: input.linkedin?.trim() || undefined,
  };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format address for display
 */
export function formatAddress(listing: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}): string {
  const parts = [
    listing.street,
    listing.city,
    `${listing.state} ${listing.zipCode}`,
  ];
  
  if (listing.country && listing.country !== 'USA' && listing.country !== 'US') {
    parts.push(listing.country);
  }
  
  return parts.join(', ');
}

/**
 * Get primary category from categories array
 */
export function getPrimaryCategory(categories: string[]): string {
  return categories && categories.length > 0 ? categories[0] : 'Uncategorized';
}

/**
 * Check if listing is claimable (has no owner)
 */
export function isListingClaimable(listing: { ownerId?: string | null }): boolean {
  return !listing.ownerId;
}

/**
 * Check if user can edit listing
 */
export function canUserEditListing(listing: { ownerId?: string | null }, userId?: string): boolean {
  if (!userId) return false;
  return listing.ownerId === userId;
}