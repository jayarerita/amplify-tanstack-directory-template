/**
 * Generate SEO-friendly URL slugs
 */

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[\s\W-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if truncated
    .replace(/-+$/, '')
}

export const generateListingSlug = (name: string, city?: string, state?: string): string => {
  let slug = generateSlug(name)
  
  // Add location for uniqueness if provided
  if (city) {
    slug += `-${generateSlug(city)}`
  }
  if (state) {
    slug += `-${generateSlug(state)}`
  }
  
  return slug
}

export const generateCategorySlug = (name: string): string => {
  return generateSlug(name)
}

export const validateSlug = (slug: string): boolean => {
  // Check if slug matches SEO-friendly pattern
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return slugPattern.test(slug) && slug.length > 0 && slug.length <= 50
}

export const ensureUniqueSlug = async (
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let slug = baseSlug
  let counter = 1
  
  while (await checkExists(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}