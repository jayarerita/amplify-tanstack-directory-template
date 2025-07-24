import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { generateListingSlug, ensureUniqueSlug } from '~/utils/slug';

export const client = generateClient<Schema>();

// Helper function to check if a slug exists
const checkSlugExists = async (slug: string): Promise<boolean> => {
  const result = await client.models.Listing.list({
    filter: { slug: { eq: slug } },
    limit: 1,
  });
  return result.data && result.data.length > 0;
};

// Listing operations
export const listingOperations = {
  // Get all published listings
  list: async (limit = 20, nextToken?: string) => {
    return await client.models.Listing.list({
      filter: { status: { eq: 'PUBLISHED' } },
      limit,
      nextToken,
    });
  },

  // Get listings by status (for admin moderation)
  listByStatus: async (status: string, limit = 20, nextToken?: string) => {
    return await client.models.Listing.listingsByStatus({
      status,
      limit,
      nextToken,
    });
  },

  // Get listings by location
  listByLocation: async (cityState: string, limit = 20, nextToken?: string) => {
    return await client.models.Listing.listingsByLocation({
      cityState,
      limit,
      nextToken,
    });
  },

  // Get listings by category with sponsorship priority
  listByCategory: async (categoryStatus: string, limit = 20, nextToken?: string) => {
    return await client.models.Listing.listingsByCategory({
      categoryStatus,
      limit,
      nextToken,
    });
  },

  // Get listings by owner
  listByOwner: async (ownerId: string, limit = 20, nextToken?: string) => {
    return await client.models.Listing.listingsByOwner({
      ownerId,
      limit,
      nextToken,
    });
  },

  // Get sponsored listings
  listSponsored: async (limit = 10, nextToken?: string) => {
    return await client.models.Listing.sponsoredListings({
      isSponsored: true,
      limit,
      nextToken,
    });
  },

  // Get a single listing by ID or slug
  get: async (idOrSlug: string) => {
    // First try to get by ID
    try {
      const result = await client.models.Listing.get({ id: idOrSlug });
      if (result.data) {
        return result;
      }
    } catch (error) {
      // If ID lookup fails, try slug lookup
    }

    // Try to find by slug
    const slugResult = await client.models.Listing.list({
      filter: { slug: { eq: idOrSlug } },
      limit: 1,
    });

    if (slugResult.data && slugResult.data.length > 0) {
      return {
        data: slugResult.data[0],
        errors: slugResult.errors,
      };
    }

    // Return null if not found
    return { data: null, errors: [] };
  },

  // Create a new listing using custom mutation
  create: async (input: any) => {
    // Generate slug if not provided
    if (!input.slug) {
      const baseSlug = generateListingSlug(input.name, input.city, input.state);
      input.slug = await ensureUniqueSlug(baseSlug, checkSlugExists);
    }
    
    return await client.mutations.createListing({ input });
  },

  // Update a listing using custom mutation
  update: async (id: string, input: any) => {
    return await client.mutations.updateListing({ id, input });
  },

  // Claim a listing using custom mutation
  claim: async (listingId: string, verificationData?: any) => {
    return await client.mutations.claimListing({ listingId, verificationData });
  },

  // Legacy methods for backward compatibility
  createLegacy: async (listing: any) => {
    return await client.models.Listing.create({
      ...listing,
      status: 'PENDING', // All new submissions are pending
    });
  },

  updateLegacy: async (id: string, updates: any) => {
    return await client.models.Listing.update({
      id,
      ...updates,
    });
  },

  // Search listings by category (legacy method)
  listByCategoryLegacy: async (category: string, limit = 20) => {
    return await client.models.Listing.list({
      filter: {
        and: [
          { status: { eq: 'PUBLISHED' } },
          { categories: { contains: category } }
        ]
      },
      limit,
    });
  },
};

// Review operations
export const reviewOperations = {
  // Get reviews for a listing
  listByListing: async (listingId: string, limit = 20) => {
    return await client.models.Review.list({
      filter: {
        and: [
          { listingId: { eq: listingId } },
          { status: { eq: 'APPROVED' } }
        ]
      },
      limit,
    });
  },

  // Create a new review
  create: async (review: any) => {
    return await client.models.Review.create({
      ...review,
      status: 'PENDING', // All reviews need moderation
    });
  },

  // Update review (for business owner responses)
  addResponse: async (id: string, responseText: string, respondedBy: string) => {
    return await client.models.Review.update({
      id,
      responseText,
      responseDate: new Date().toISOString(),
      respondedBy,
    });
  },
};

// Category operations
export const categoryOperations = {
  // Get all active categories
  list: async () => {
    return await client.models.Category.list({
      filter: { isActive: { eq: true } },
    });
  },

  // Get category by slug
  getBySlug: async (slug: string) => {
    return await client.models.Category.list({
      filter: {
        and: [
          { slug: { eq: slug } },
          { isActive: { eq: true } }
        ]
      },
      limit: 1,
    });
  },
};

// User profile operations
export const userOperations = {
  // Get user profile
  get: async (id: string) => {
    return await client.models.UserProfile.get({ id });
  },

  // Create user profile
  create: async (profile: any) => {
    return await client.models.UserProfile.create(profile);
  },

  // Update user profile
  update: async (id: string, updates: any) => {
    return await client.models.UserProfile.update({
      id,
      ...updates,
    });
  },
};

// Ad operations
export const adOperations = {
  // Get active ads by placement
  getByPlacement: async (placement: string) => {
    const now = new Date().toISOString();
    return await client.models.Ad.list({
      filter: {
        and: [
          { placement: { eq: placement } },
          { isActive: { eq: true } },
          { startDate: { le: now } },
          { endDate: { ge: now } }
        ]
      },
    });
  },

  // Track ad impression
  trackImpression: async (id: string) => {
    // This would typically be handled by a server function
    // to prevent client-side manipulation
    console.log(`Tracking impression for ad ${id}`);
  },

  // Track ad click
  trackClick: async (id: string) => {
    // This would typically be handled by a server function
    // to prevent client-side manipulation
    console.log(`Tracking click for ad ${id}`);
  },
};

export interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt?: string;
}

export const dataService = {
  // Get all posts
  async getPosts(): Promise<Post[]> {
    try {
      const { data: posts } = await client.models.Post.list();
      return posts.map(post => ({
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: post.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
  },

  // Get a single post by ID
  async getPost(id: string): Promise<Post | null> {
    try {
      const { data: post } = await client.models.Post.get({ id });
      if (!post) return null;
      
      return {
        id: post.id,
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: post.createdAt,
      };
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  },

  // Create a new post
  async createPost(post: Omit<Post, 'id' | 'createdAt'>): Promise<Post | null> {
    try {
      const { data: newPost } = await client.models.Post.create({
        title: post.title,
        content: post.content,
        author: post.author,
        createdAt: new Date().toISOString(),
      });

      if (!newPost) return null;

      return {
        id: newPost.id,
        title: newPost.title,
        content: newPost.content,
        author: newPost.author,
        createdAt: newPost.createdAt,
      };
    } catch (error) {
      console.error('Error creating post:', error);
      return null;
    }
  },

  // Update a post
  async updatePost(id: string, updates: Partial<Omit<Post, 'id' | 'createdAt'>>): Promise<Post | null> {
    try {
      const { data: updatedPost } = await client.models.Post.update({
        id,
        ...updates,
      });

      if (!updatedPost) return null;

      return {
        id: updatedPost.id,
        title: updatedPost.title,
        content: updatedPost.content,
        author: updatedPost.author,
        createdAt: updatedPost.createdAt,
      };
    } catch (error) {
      console.error('Error updating post:', error);
      return null;
    }
  },

  // Delete a post
  async deletePost(id: string): Promise<boolean> {
    try {
      await client.models.Post.delete({ id });
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      return false;
    }
  },
};
