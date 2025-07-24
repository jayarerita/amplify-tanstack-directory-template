import type { Listing, Category } from '~/types'

export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export const generateSitemap = (urls: SitemapUrl[]): string => {
  const urlElements = urls.map(url => {
    let urlElement = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`
    
    if (url.lastmod) {
      urlElement += `\n    <lastmod>${url.lastmod}</lastmod>`
    }
    
    if (url.changefreq) {
      urlElement += `\n    <changefreq>${url.changefreq}</changefreq>`
    }
    
    if (url.priority !== undefined) {
      urlElement += `\n    <priority>${url.priority}</priority>`
    }
    
    urlElement += '\n  </url>'
    return urlElement
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`
}

export const generateSitemapUrls = (
  listings: Listing[],
  categories: Category[],
  baseUrl: string
): SitemapUrl[] => {
  const urls: SitemapUrl[] = []

  // Homepage
  urls.push({
    loc: baseUrl,
    changefreq: 'daily',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0],
  })

  // Static pages
  const staticPages = [
    { path: '/listings', priority: 0.9, changefreq: 'daily' as const },
    { path: '/categories', priority: 0.8, changefreq: 'weekly' as const },
    { path: '/search', priority: 0.7, changefreq: 'daily' as const },
    { path: '/listings/submit', priority: 0.6, changefreq: 'monthly' as const },
  ]

  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: new Date().toISOString().split('T')[0],
    })
  })

  // Category pages
  categories
    .filter(category => category.isActive)
    .forEach(category => {
      urls.push({
        loc: `${baseUrl}/categories/${category.slug}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: category.updatedAt.split('T')[0],
      })
    })

  // Listing pages (only published listings)
  listings
    .filter(listing => listing.status === 'PUBLISHED')
    .forEach(listing => {
      urls.push({
        loc: `${baseUrl}/listings/${listing.slug || listing.id}`,
        changefreq: 'weekly',
        priority: listing.isSponsored ? 0.9 : 0.7,
        lastmod: listing.updatedAt.split('T')[0],
      })
    })

  return urls
}

export const generateRobotsTxt = (baseUrl: string): string => {
  return `User-agent: *
Allow: /

# Disallow admin and private areas
Disallow: /admin/
Disallow: /_authed/
Disallow: /api/

# Disallow search result pages with parameters to avoid duplicate content
Disallow: /search?*

# Allow specific search patterns
Allow: /search$

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (optional, adjust based on server capacity)
Crawl-delay: 1`
}

const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}