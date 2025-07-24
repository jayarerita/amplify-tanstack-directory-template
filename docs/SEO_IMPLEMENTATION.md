# SEO Implementation Documentation

This document outlines the SEO optimization features implemented for the directory template.

## Features Implemented

### 1. Dynamic Metadata Generation ✅

**Location**: `src/utils/seo.ts`

- **Enhanced SEO utility** with comprehensive metadata generation
- **Page-specific metadata** for listings, categories, and search pages
- **Open Graph and Twitter Card** support
- **Canonical URL** support
- **Robots meta tags** for search engine guidance

**Usage Examples**:
```typescript
// Basic SEO metadata
const seoTags = seo({
  title: 'Page Title',
  description: 'Page description',
  keywords: 'keyword1, keyword2',
  url: 'https://example.com/page',
  canonical: 'https://example.com/page'
});

// Listing-specific SEO
const listingSEO = generateListingSEO(listing, baseUrl);

// Category-specific SEO
const categorySEO = generateCategorySEO(category, baseUrl);

// Search-specific SEO
const searchSEO = generateSearchSEO(query, location, baseUrl);
```

### 2. Schema.org JSON-LD Structured Data ✅

**Location**: `src/utils/structured-data.ts`

- **LocalBusiness schema** for individual listings
- **Review and AggregateRating** schemas for reviews
- **BreadcrumbList** for navigation hierarchy
- **ItemList** for category and search result pages
- **WebSite** schema with search functionality
- **Organization** schema for the directory itself

**Implemented Schemas**:
- `LocalBusiness` - Business listings with full contact info, hours, ratings
- `Review` - Individual user reviews
- `AggregateRating` - Overall business ratings
- `BreadcrumbList` - Navigation breadcrumbs
- `ItemList` - Lists of businesses (categories, search results)
- `WebSite` - Site-wide schema with search action
- `Organization` - Directory organization info

### 3. SEO-Friendly URL Structure ✅

**Location**: `src/utils/slug.ts`

- **Automatic slug generation** from business names and locations
- **URL-safe character handling** (spaces to hyphens, special character removal)
- **Unique slug enforcement** to prevent duplicates
- **Length optimization** (max 50 characters)
- **Hierarchical URL structure** support

**Features**:
```typescript
// Generate listing slug
generateListingSlug('Pizza Palace', 'New York', 'NY')
// Result: 'pizza-palace-new-york-ny'

// Generate category slug
generateCategorySlug('Restaurants & Food')
// Result: 'restaurants-food'

// Ensure uniqueness
ensureUniqueSlug('base-slug', checkExistsFunction)
// Result: 'base-slug' or 'base-slug-1', 'base-slug-2', etc.
```

### 4. Automated Sitemap Generation ✅

**Location**: `src/utils/sitemap.ts`, `src/lib/server-functions.ts`

- **Dynamic XML sitemap** generation
- **Automatic URL discovery** from published listings and categories
- **Priority and change frequency** optimization
- **Server-side generation** with caching
- **Route handlers** for `/sitemap.xml`

**Features**:
- Homepage (priority: 1.0, daily updates)
- Static pages (listings, categories, search)
- Category pages (priority: 0.8, weekly updates)
- Published listings (priority: 0.7-0.9 based on sponsorship)
- Proper XML formatting with lastmod dates

### 5. Robots.txt and Canonical URLs ✅

**Location**: `src/utils/sitemap.ts`, route handlers

- **Robots.txt generation** with proper directives
- **Canonical URL** support in all page metadata
- **Admin area protection** (disallow crawling)
- **Search parameter handling** to avoid duplicate content
- **Sitemap location** specification

**Robots.txt Features**:
```
User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /_authed/
Disallow: /api/

# Disallow search result pages with parameters
Disallow: /search?*

# Sitemap location
Sitemap: https://example.com/sitemap.xml
```

## Implementation Details

### Route-Level SEO Integration

All major routes now include dynamic SEO metadata:

1. **Listing Detail Pages** (`/listings/$listingId.tsx`):
   - Dynamic title with business name
   - Business description as meta description
   - LocalBusiness structured data
   - Breadcrumb navigation
   - Open Graph images from business photos

2. **Category Pages** (`/categories/$categorySlug.tsx`):
   - Category-specific titles and descriptions
   - Breadcrumb structured data
   - Canonical URLs

3. **Search Pages** (`/search.tsx`):
   - Dynamic titles based on search query and location
   - Search-specific descriptions
   - Breadcrumb navigation

4. **Homepage** (`/index.tsx`):
   - Site-wide SEO metadata
   - WebSite and Organization structured data

### Server Functions

- **Sitemap Generation**: `/sitemap.xml` endpoint
- **Robots.txt**: `/robots.txt` endpoint
- **Caching**: Appropriate cache headers for SEO resources

### Data Model Integration

- **Slug Support**: Listings and categories include SEO-friendly slugs
- **Automatic Slug Generation**: New listings get unique slugs
- **Slug-based Lookups**: Support for both ID and slug-based routing

## Testing

Comprehensive test suites have been created:

- `src/utils/__tests__/seo.test.ts` - SEO utility functions
- `src/utils/__tests__/structured-data.test.ts` - Schema.org generation
- `src/utils/__tests__/slug.test.ts` - Slug generation and validation

## Performance Considerations

- **Server-Side Rendering**: All SEO metadata generated server-side
- **Caching**: Sitemap and robots.txt cached appropriately
- **Efficient Queries**: Optimized database queries for sitemap generation
- **Lazy Loading**: Structured data injected without blocking page load

## Requirements Compliance

✅ **7.1**: Dynamic meta titles and descriptions for all pages
✅ **7.2**: Schema.org JSON-LD structured data for LocalBusiness, Review, AggregateRating
✅ **7.3**: Server-side rendering for optimal SEO performance
✅ **7.4**: Automated XML sitemap with all published listings
✅ **7.5**: Clean, hierarchical URL structure with SEO-friendly slugs

## Usage Instructions

### For New Listings
Slugs are automatically generated when creating listings:
```typescript
const listing = await listingOperations.create({
  name: 'My Business',
  city: 'New York',
  state: 'NY',
  // ... other fields
  // slug will be auto-generated as 'my-business-new-york-ny'
});
```

### For Custom SEO
Override default SEO on any route:
```typescript
export const Route = createFileRoute('/my-page')({
  head: () => {
    const seoTags = seo({
      title: 'Custom Page Title',
      description: 'Custom description',
      // ... other options
    });
    return { meta: seoTags };
  },
});
```

### For Structured Data
Add structured data to any page:
```typescript
const businessSchema = generateLocalBusinessSchema(listing);
return {
  scripts: [injectStructuredData(businessSchema)],
};
```

## Next Steps

1. **Monitor Performance**: Use Google Search Console to track SEO performance
2. **Rich Snippets**: Verify structured data appears correctly in search results
3. **Core Web Vitals**: Monitor and optimize page loading performance
4. **Local SEO**: Consider adding more location-specific optimizations
5. **Schema Extensions**: Add more specific schema types as needed (Restaurant, Store, etc.)