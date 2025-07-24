import type { Listing, Review, Category } from '~/types'

// Base Schema.org types
interface SchemaBase {
  '@context': string
  '@type': string
}

interface LocalBusiness extends SchemaBase {
  '@type': 'LocalBusiness'
  name: string
  description: string
  url?: string
  image?: string[]
  address: {
    '@type': 'PostalAddress'
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
  geo?: {
    '@type': 'GeoCoordinates'
    latitude: number
    longitude: number
  }
  telephone?: string
  email?: string
  priceRange?: string
  openingHours?: string[]
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: number
    reviewCount: number
    bestRating: number
    worstRating: number
  }
  review?: ReviewSchema[]
  sameAs?: string[]
}

interface ReviewSchema extends SchemaBase {
  '@type': 'Review'
  author: {
    '@type': 'Person'
    name: string
  }
  reviewRating: {
    '@type': 'Rating'
    ratingValue: number
    bestRating: number
    worstRating: number
  }
  reviewBody?: string
  datePublished: string
}

interface BreadcrumbList extends SchemaBase {
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }>
}

interface ItemList extends SchemaBase {
  '@type': 'ItemList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    item: LocalBusiness
  }>
  numberOfItems: number
}

interface WebSite extends SchemaBase {
  '@type': 'WebSite'
  name: string
  url: string
  potentialAction?: {
    '@type': 'SearchAction'
    target: {
      '@type': 'EntryPoint'
      urlTemplate: string
    }
    'query-input': string
  }
}

interface Organization extends SchemaBase {
  '@type': 'Organization'
  name: string
  url: string
  logo?: string
  contactPoint?: {
    '@type': 'ContactPoint'
    telephone?: string
    contactType: string
    email?: string
  }
  sameAs?: string[]
}

// Utility functions to generate structured data

export const generateLocalBusinessSchema = (
  listing: Listing,
  reviews: Review[] = [],
  baseUrl: string = ''
): LocalBusiness => {
  const schema: LocalBusiness = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: listing.name,
    description: listing.description,
    url: `${baseUrl}/listings/${listing.slug || listing.id}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: listing.address.street,
      addressLocality: listing.address.city,
      addressRegion: listing.address.state,
      postalCode: listing.address.zipCode,
      addressCountry: listing.address.country,
    },
  }

  // Add images if available
  if (listing.images && listing.images.length > 0) {
    schema.image = listing.images
  }

  // Add geo coordinates
  if (listing.address.coordinates) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: listing.address.coordinates.latitude,
      longitude: listing.address.coordinates.longitude,
    }
  }

  // Add contact information
  if (listing.contactInfo.phone) {
    schema.telephone = listing.contactInfo.phone
  }
  if (listing.contactInfo.email) {
    schema.email = listing.contactInfo.email
  }

  // Add price range
  if (listing.pricingRange) {
    const priceRangeMap = {
      BUDGET: '$',
      MODERATE: '$$',
      EXPENSIVE: '$$$',
      LUXURY: '$$$$',
    }
    schema.priceRange = priceRangeMap[listing.pricingRange]
  }

  // Add opening hours
  if (listing.hoursOfOperation) {
    schema.openingHours = formatOpeningHours(listing.hoursOfOperation)
  }

  // Add aggregate rating if available
  if (listing.averageRating && listing.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: listing.averageRating,
      reviewCount: listing.reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  // Add reviews
  if (reviews.length > 0) {
    schema.review = reviews.map(review => generateReviewSchema(review))
  }

  // Add social media links
  const socialLinks = [
    listing.socialMedia.facebook,
    listing.socialMedia.twitter,
    listing.socialMedia.instagram,
    listing.socialMedia.linkedin,
    listing.contactInfo.website,
  ].filter(Boolean)

  if (socialLinks.length > 0) {
    schema.sameAs = socialLinks
  }

  return schema
}

export const generateReviewSchema = (review: Review): ReviewSchema => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    author: {
      '@type': 'Person',
      name: 'Anonymous User', // In a real app, you'd get the user's name
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.comment,
    datePublished: review.createdAt,
  }
}

export const generateBreadcrumbSchema = (
  breadcrumbs: Array<{ name: string; url: string }>,
  baseUrl: string = ''
): BreadcrumbList => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${baseUrl}${crumb.url}`,
    })),
  }
}

export const generateItemListSchema = (
  listings: Listing[],
  baseUrl: string = ''
): ItemList => {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: listings.map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: generateLocalBusinessSchema(listing, [], baseUrl),
    })),
    numberOfItems: listings.length,
  }
}

export const generateWebSiteSchema = (baseUrl: string): WebSite => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Local Business Directory',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export const generateOrganizationSchema = (baseUrl: string): Organization => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Local Business Directory',
    url: baseUrl,
    logo: `${baseUrl}/favicon.png`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@localdirectory.com',
    },
  }
}

// Helper function to format opening hours for Schema.org
const formatOpeningHours = (hours: any): string[] => {
  const dayMap = {
    monday: 'Mo',
    tuesday: 'Tu',
    wednesday: 'We',
    thursday: 'Th',
    friday: 'Fr',
    saturday: 'Sa',
    sunday: 'Su',
  }

  const openingHours: string[] = []

  Object.entries(hours).forEach(([day, dayHours]: [string, any]) => {
    if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
      const dayCode = dayMap[day as keyof typeof dayMap]
      if (dayCode) {
        openingHours.push(`${dayCode} ${dayHours.open}-${dayHours.close}`)
      }
    }
  })

  return openingHours
}

// Utility to inject structured data into HTML head
export const injectStructuredData = (data: any): { type: string; children: string } => {
  return {
    type: 'application/ld+json',
    children: JSON.stringify(data),
  }
}