// Core data model interfaces for the directory template

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

export interface SocialMedia {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

export interface HoursOfOperation {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export type PricingRange = 'BUDGET' | 'MODERATE' | 'EXPENSIVE' | 'LUXURY';
export type ListingStatus = 'PENDING' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
export type UserRole = 'USER' | 'BUSINESS_OWNER' | 'ADMIN';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type SubscriptionTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELED' | 'PAST_DUE';

export interface Listing {
  id: string;
  name: string;
  description: string;
  address: Address;
  contactInfo: ContactInfo;
  socialMedia: SocialMedia;
  images: string[]; // S3 URLs
  hoursOfOperation: HoursOfOperation;
  pricingRange: PricingRange;
  categories: string[];
  tags: string[];
  features: string[];
  amenities: string[];
  slug: string;
  status: ListingStatus;
  ownerId?: string;
  isSponsored: boolean;
  sponsoredRank?: number;
  sponsoredTier?: SubscriptionTier;
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  profile: {
    bio?: string;
    location?: string;
    preferences: {
      emailNotifications: boolean;
      marketingEmails: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  listingId: string;
  userId: string;
  rating: number; // 1-5
  comment?: string;
  status: ReviewStatus;
  response?: {
    text: string;
    respondedAt: string;
    respondedBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Ad {
  id: string;
  imageUrl: string;
  targetUrl: string;
  dimensions: string; // e.g., "728x90", "300x250"
  placement: string; // e.g., "homepage-top", "sidebar"
  startDate: string;
  endDate: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string; // For hierarchical categories
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Search and filtering interfaces
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
  pricingRange?: PricingRange[];
  features?: string[];
  amenities?: string[];
  minRating?: number;
  isSponsored?: boolean;
}

export interface SearchResults {
  listings: Listing[];
  totalCount: number;
  hasNextPage: boolean;
  nextToken?: string;
}

// Input types for mutations
export interface CreateListingInput {
  name: string;
  description: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  images?: string[];
  hoursOfOperation?: HoursOfOperation;
  pricingRange?: PricingRange;
  categories?: string[];
  tags?: string[];
  features?: string[];
  amenities?: string[];
}

export interface UpdateListingInput {
  name?: string;
  description?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  images?: string[];
  hoursOfOperation?: HoursOfOperation;
  pricingRange?: PricingRange;
  categories?: string[];
  tags?: string[];
  features?: string[];
  amenities?: string[];
  status?: ListingStatus;
}

export interface ClaimListingInput {
  listingId: string;
  verificationData?: any;
}

// API response interfaces
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  totalCount?: number;
}