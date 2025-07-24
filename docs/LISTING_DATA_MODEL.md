# Listing Data Model and GraphQL Schema

This document describes the core listing data model and GraphQL schema implementation for the directory template.

## Overview

The listing data model is the core entity of the directory, supporting comprehensive business information, guest submissions, owner management, and efficient querying through Global Secondary Indexes (GSIs).

## Data Model Structure

### Core Listing Model

The `Listing` model includes the following fields:

#### Basic Information
- `name` (required): Business name
- `description` (required): Business description
- `slug` (required): URL-friendly identifier

#### Address Information
- `street` (required): Street address
- `city` (required): City
- `state` (required): State/Province
- `zipCode` (required): ZIP/Postal code
- `country` (required): Country
- `latitude` (required): Geographic latitude
- `longitude` (required): Geographic longitude

#### Contact Information
- `phone`: Phone number
- `email`: Email address
- `website`: Website URL

#### Social Media
- `facebook`: Facebook profile URL
- `twitter`: Twitter profile URL
- `instagram`: Instagram profile URL
- `linkedin`: LinkedIn profile URL

#### Business Details
- `images`: Array of S3 URLs for business images
- `hoursOfOperation`: JSON object containing operating hours
- `pricingRange`: Enum (BUDGET, MODERATE, EXPENSIVE, LUXURY)
- `categories`: Array of category strings
- `tags`: Array of tag strings
- `features`: Array of feature strings
- `amenities`: Array of amenity strings

#### Status and Ownership
- `status`: Enum (PENDING, PUBLISHED, DRAFT, ARCHIVED)
- `ownerId`: ID of the authenticated user who owns the listing

#### Sponsorship
- `isSponsored`: Boolean flag for sponsored listings
- `sponsoredRank`: Integer for sponsored listing priority
- `sponsoredTier`: Enum (BRONZE, SILVER, GOLD)

#### Aggregated Data
- `averageRating`: Calculated average rating from reviews
- `reviewCount`: Total number of approved reviews
- `version`: Version number for tracking updates

#### Composite Fields (for efficient querying)
- `cityState`: Composite field for location-based queries
- `categoryStatus`: Composite field for category + status queries

## Global Secondary Indexes (GSIs)

The following GSIs are implemented for efficient querying:

### 1. Status-based Queries (`listingsByStatus`)
- **Partition Key**: `status`
- **Sort Key**: `createdAt`
- **Use Case**: Admin moderation queue, filtering by publication status

### 2. Location-based Queries (`listingsByLocation`)
- **Partition Key**: `cityState`
- **Sort Key**: `createdAt`
- **Use Case**: Finding listings in specific cities/states

### 3. Category-based Queries (`listingsByCategory`)
- **Partition Key**: `categoryStatus`
- **Sort Key**: `sponsoredRank`, `createdAt`
- **Use Case**: Category pages with sponsored listing priority

### 4. Owner-based Queries (`listingsByOwner`)
- **Partition Key**: `ownerId`
- **Sort Key**: `status`, `createdAt`
- **Use Case**: User dashboard showing their listings

### 5. Sponsored Listings (`sponsoredListings`)
- **Partition Key**: `isSponsored`
- **Sort Key**: `sponsoredRank`
- **Use Case**: Retrieving sponsored listings in priority order

## Custom Mutations

### 1. createListing

Creates a new listing with enhanced logic for guest submissions.

**Arguments:**
- `input`: `CreateListingInput` object

**Features:**
- Automatic slug generation from business name
- Composite field creation for efficient querying
- Guest submission support (no authentication required)
- Automatic status assignment (PENDING for moderation)

**Authorization:**
- Public API key (guest submissions)
- Authenticated users

### 2. updateListing

Updates an existing listing with ownership validation.

**Arguments:**
- `id`: Listing ID
- `input`: `UpdateListingInput` object

**Features:**
- Ownership validation (only owner or admin can update)
- Version tracking
- Composite field updates when location/category changes
- Slug regeneration when name changes

**Authorization:**
- Authenticated users (must be owner)
- Admin group

### 3. claimListing

Associates an unauthenticated listing with an authenticated user.

**Arguments:**
- `listingId`: ID of the listing to claim
- `verificationData`: Optional verification data (JSON)

**Features:**
- Prevents claiming already-owned listings
- Associates listing with authenticated user
- Version tracking

**Authorization:**
- Authenticated users only

## Authorization Rules

### Listing Model Authorization
- **Read**: Public (published listings only)
- **Create**: Guest users and authenticated users
- **Update**: Owner and admin group
- **Delete**: Admin group only

### Custom Mutation Authorization
- **createListing**: Public API key, authenticated users
- **updateListing**: Authenticated users (with ownership validation)
- **claimListing**: Authenticated users only

## Usage Examples

### Creating a Listing (Guest Submission)
```typescript
import { listingOperations } from '~/lib/data';

const newListing = await listingOperations.create({
  name: "Joe's Pizza",
  description: "Best pizza in town",
  street: "123 Main St",
  city: "New York",
  state: "NY",
  zipCode: "10001",
  country: "USA",
  latitude: 40.7128,
  longitude: -74.0060,
  categories: ["Restaurant", "Pizza"],
  // ... other fields
});
```

### Querying Pending Listings (Admin)
```typescript
const pendingListings = await listingOperations.listByStatus('PENDING');
```

### Querying Listings by Location
```typescript
const nycListings = await listingOperations.listByLocation('New York, NY');
```

### Claiming a Listing
```typescript
const claimedListing = await listingOperations.claim('listing-id-123');
```

## Data Validation

Client-side validation is implemented in `src/utils/listing.ts`:

- Required field validation
- Email format validation
- URL format validation
- Phone number format validation
- Coordinate range validation

## Performance Considerations

1. **Composite Fields**: Used to enable efficient single-query operations instead of multiple queries or filters
2. **GSI Design**: Optimized for common access patterns (status, location, category, ownership)
3. **Batch Operations**: Custom resolvers prevent N+1 query problems
4. **Caching**: TanStack Query provides client-side caching for frequently accessed data

## Security Features

1. **Authorization Rules**: Fine-grained access control at the model level
2. **Ownership Validation**: Server-side validation in custom resolvers
3. **Guest Submissions**: Controlled through specific authorization rules
4. **Input Sanitization**: Implemented in custom resolvers and client-side validation

## Future Enhancements

1. **Full-text Search**: Integration with Amazon OpenSearch for advanced search capabilities
2. **Geospatial Queries**: Enhanced location-based search with radius filtering
3. **Bulk Operations**: Admin tools for bulk approval/rejection of listings
4. **Audit Trail**: Tracking of all changes to listings for compliance
5. **Advanced Moderation**: Integration with AWS AI services for automated content screening