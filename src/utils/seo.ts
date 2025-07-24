import type { Listing, Category } from '~/types'

export interface SEOConfig {
  title: string
  description?: string
  keywords?: string
  image?: string
  url?: string
  type?: 'website' | 'article' | 'business.business'
  siteName?: string
  locale?: string
  canonical?: string
}

export const seo = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  siteName = 'Local Business Directory',
  locale = 'en_US',
  canonical,
}: SEOConfig) => {
  const tags = [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: keywords },
    { name: 'robots', content: 'index, follow' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:site', content: '@localdirectory' },
    { name: 'twitter:creator', content: '@localdirectory' },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: locale },
    ...(url ? [{ property: 'og:url', content: url }] : []),
    ...(canonical ? [{ rel: 'canonical', href: canonical }] : []),
    ...(image
      ? [
          { name: 'twitter:image', content: image },
          { name: 'twitter:card', content: 'summary_large_image' },
          { property: 'og:image', content: image },
          { property: 'og:image:alt', content: title },
        ]
      : [
          { name: 'twitter:card', content: 'summary' },
        ]),
  ]

  return tags.filter(tag => tag.content || tag.href)
}

// Generate SEO metadata for listing pages
export const generateListingSEO = (listing: Listing, baseUrl: string = ''): SEOConfig => {
  const title = `${listing.name} | Local Business Directory`
  const description = listing.description.length > 160 
    ? `${listing.description.substring(0, 157)}...`
    : listing.description
  
  const keywords = [
    listing.name,
    ...listing.categories,
    ...listing.tags,
    listing.address.city,
    listing.address.state,
  ].join(', ')

  const image = listing.images?.[0]
  const url = `${baseUrl}/listings/${listing.slug || listing.id}`

  return {
    title,
    description,
    keywords,
    image,
    url,
    type: 'business.business',
    canonical: url,
  }
}

// Generate SEO metadata for category pages
export const generateCategorySEO = (category: Category, baseUrl: string = ''): SEOConfig => {
  const title = `${category.name} Businesses | Local Business Directory`
  const description = category.description || 
    `Find the best ${category.name.toLowerCase()} businesses in your area. Browse reviews, get directions, and connect with local ${category.name.toLowerCase()} services.`
  
  const keywords = `${category.name}, local ${category.name.toLowerCase()}, ${category.name.toLowerCase()} near me, business directory`
  const url = `${baseUrl}/categories/${category.slug}`

  return {
    title,
    description,
    keywords,
    url,
    canonical: url,
    image: category.imageUrl,
  }
}

// Generate SEO metadata for search pages
export const generateSearchSEO = (query?: string, location?: string, baseUrl: string = ''): SEOConfig => {
  let title = 'Search Results | Local Business Directory'
  let description = 'Find local businesses and services in your area.'
  
  if (query && location) {
    title = `${query} in ${location} | Local Business Directory`
    description = `Find ${query} businesses and services in ${location}. Browse reviews, get directions, and connect with local businesses.`
  } else if (query) {
    title = `${query} | Local Business Directory`
    description = `Find ${query} businesses and services. Browse reviews, get directions, and connect with local businesses.`
  } else if (location) {
    title = `Businesses in ${location} | Local Business Directory`
    description = `Find local businesses and services in ${location}. Browse reviews, get directions, and connect with local businesses.`
  }

  const keywords = [query, location, 'local business', 'directory', 'reviews'].filter(Boolean).join(', ')

  return {
    title,
    description,
    keywords,
    canonical: `${baseUrl}/search`,
  }
}
