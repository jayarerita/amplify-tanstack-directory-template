import type { Listing, Review, User } from '~/types';

/**
 * Validation utilities for form data
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (US format)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate listing data
 */
export function validateListing(listing: Partial<Listing>): ValidationError[] {
  const errors: ValidationError[] = [];

  // Required fields
  if (!listing.name?.trim()) {
    errors.push({ field: 'name', message: 'Business name is required' });
  }

  if (!listing.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  if (!listing.address?.street?.trim()) {
    errors.push({ field: 'address.street', message: 'Street address is required' });
  }

  if (!listing.address?.city?.trim()) {
    errors.push({ field: 'address.city', message: 'City is required' });
  }

  if (!listing.address?.state?.trim()) {
    errors.push({ field: 'address.state', message: 'State is required' });
  }

  if (!listing.address?.zipCode?.trim()) {
    errors.push({ field: 'address.zipCode', message: 'ZIP code is required' });
  }

  // Optional field validation
  if (listing.contactInfo?.email && !isValidEmail(listing.contactInfo.email)) {
    errors.push({ field: 'contactInfo.email', message: 'Invalid email format' });
  }

  if (listing.contactInfo?.phone && !isValidPhone(listing.contactInfo.phone)) {
    errors.push({ field: 'contactInfo.phone', message: 'Invalid phone number format' });
  }

  if (listing.contactInfo?.website && !isValidUrl(listing.contactInfo?.website)) {
    errors.push({ field: 'contactInfo.website', message: 'Invalid website URL' });
  }

  // Social media URL validation
  const socialFields = ['facebook', 'twitter', 'instagram', 'linkedin'] as const;
  socialFields.forEach(field => {
    const url = listing.socialMedia?.[field];
    if (url && !isValidUrl(url)) {
      errors.push({ field: `socialMedia.${field}`, message: `Invalid ${field} URL` });
    }
  });

  // Categories validation
  if (!listing.categories || listing.categories.length === 0) {
    errors.push({ field: 'categories', message: 'At least one category is required' });
  }

  return errors;
}

/**
 * Validate review data
 */
export function validateReview(review: Partial<Review>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!review.rating || review.rating < 1 || review.rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be between 1 and 5' });
  }

  if (review.comment && review.comment.trim().length < 10) {
    errors.push({ field: 'comment', message: 'Comment must be at least 10 characters long' });
  }

  if (review.comment && review.comment.trim().length > 1000) {
    errors.push({ field: 'comment', message: 'Comment must be less than 1000 characters' });
  }

  return errors;
}

/**
 * Validate user profile data
 */
export function validateUserProfile(user: Partial<User>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!user.email?.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(user.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!user.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!user.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  if (user.profile?.bio && user.profile.bio.length > 500) {
    errors.push({ field: 'profile.bio', message: 'Bio must be less than 500 characters' });
  }

  return errors;
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - in production, use a proper library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Check for potential spam content
 */
export function detectSpam(text: string): boolean {
  const spamKeywords = [
    'viagra', 'casino', 'lottery', 'winner', 'congratulations',
    'click here', 'free money', 'make money fast', 'work from home',
    'guaranteed', 'no risk', 'limited time', 'act now'
  ];

  const lowerText = text.toLowerCase();
  const spamCount = spamKeywords.filter(keyword => lowerText.includes(keyword)).length;
  
  // Consider spam if contains multiple spam keywords or excessive caps/exclamation marks
  const excessiveCaps = (text.match(/[A-Z]/g) || []).length / text.length > 0.5;
  const excessiveExclamation = (text.match(/!/g) || []).length > 3;
  
  return spamCount >= 2 || excessiveCaps || excessiveExclamation;
}